// scripts/depth-audit/audit.ts
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateUnitGrade } from "./grade-store";
import { aggregateAll } from "./aggregate";
import { buildReport } from "./report";
import { isFoundation } from "./classify";
import type { UnitGradeResult } from "./types";

export const DEFAULT_BAR = 3.5;

export function barFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const v = Number(env.DEPTH_BAR);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_BAR;
}

function validateAll(grades: unknown[]): UnitGradeResult[] {
  return grades.map((g, i) => {
    const v = validateUnitGrade(g);
    if (!v.ok) throw new Error(`grades[${i}] invalid: ${v.error}`);
    return v.value;
  });
}

export function runAudit(grades: unknown[], bar: number) {
  return buildReport(aggregateAll(validateAll(grades)), bar);
}

/** Re-grade gate: among the named units, the failing spine unitKeys (foundations ignored). */
export function gate(grades: unknown[], unitKeys: string[], bar: number): { failing: string[]; checked: string[] } {
  const want = new Set(unitKeys);
  const scores = aggregateAll(validateAll(grades).filter((u) => want.has(u.unitKey)));
  const failing = scores
    .filter((s) => !isFoundation(s.unitKey) && s.scored && !s.passes(bar))
    .map((s) => s.unitKey);
  return { failing, checked: scores.map((s) => s.unitKey) };
}

// CLI
if (import.meta.main) {
  const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const argv = process.argv.slice(2);
  const grades = JSON.parse(await readFile(here("./grades.json"), "utf8"));
  const bar = barFromEnv();

  if (argv.includes("--gate")) {
    const idx = argv.indexOf("--units");
    const keys = idx >= 0 ? (argv[idx + 1] ?? "").split(",").filter(Boolean) : [];
    if (keys.length === 0) { console.error("--gate requires --units a/b,c/d"); process.exit(2); }
    const { failing, checked } = gate(grades, keys, bar);
    console.log(`gate: bar=${bar} checked ${checked.length}/${keys.length} requested; ${failing.length} below bar`);
    if (failing.length) { console.error("FAIL: " + failing.join(", ")); process.exit(1); }
    console.log("PASS");
    process.exit(0);
  }

  const { json, markdown } = runAudit(grades, bar);
  const outDir = here("../../../docs/audit");
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/depth-scores.json`, JSON.stringify(json, null, 2));
  await writeFile(`${outDir}/depth-report.md`, markdown);
  console.log(`audit: bar=${bar} spine-failing=${json.summary.spineFailing}/${json.summary.spineTotal} foundations=${json.summary.foundationsCount} -> docs/audit/`);
}
