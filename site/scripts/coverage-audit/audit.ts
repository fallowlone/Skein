// Map the corpus' EGP tags onto the EGP inventory, write dist/coverage-report.json,
// print a per-band table, and (with --gate) exit 1 if any band has uncovered,
// un-waived areas. Mirrors scripts/scenario-audit/audit.ts. Avoids Vite barrels.
import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeGrammarCoverage, type GrammarCoverage } from "~/english/grammar-coverage";
import { COVERAGE_WAIVERS } from "~/english/data/egp/waivers";
import type { EgpEntry } from "~/english/data/egp/types";
import type { GrammarTopic } from "~/english/grammar-types";

export function gateExitCode(cov: GrammarCoverage): number {
  return cov.missingTotal > 0 ? 1 : 0;
}

export function renderReport(cov: GrammarCoverage): string {
  let r = `# Grammar coverage (EGP)\n\nOverall: ${cov.overallPct}% | missing: ${cov.missingTotal}\n\n`;
  r += `| band | covered | waived | total | pct |\n|---|---|---|---|---|\n`;
  for (const b of cov.bands) r += `| ${b.cefr} | ${b.covered} | ${b.waived} | ${b.total} | ${b.pct}% |\n`;
  const gaps = cov.bands.filter((b) => b.missing.length);
  if (gaps.length) {
    r += `\n## Missing areas\n`;
    for (const b of gaps) r += `\n**${b.cefr}** (${b.missing.length}):\n${b.missing.map((m) => `- ${m}`).join("\n")}\n`;
  }
  return r;
}

async function loadKeyed<T>(dir: string, exclude: RegExp, key: "topic" | "entries"): Promise<T[]> {
  const files = readdirSync(dir).filter((f) => /\.ts$/.test(f) && !exclude.test(f) && !f.includes(".test."));
  const out: T[] = [];
  for (const f of files) {
    const mod = (await import(join(dir, f))) as Record<string, unknown>;
    const v = mod[key];
    if (Array.isArray(v)) out.push(...(v as T[]));
    else if (v) out.push(v as T);
  }
  return out;
}

async function main(): Promise<void> {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const topics = await loadKeyed<GrammarTopic>(
    join(root, "src/english/data/grammar"), /(index|families)\.ts$/, "topic",
  );
  const inventory = await loadKeyed<EgpEntry>(
    join(root, "src/english/data/egp"), /(index|types|waivers)\.ts$/, "entries",
  );
  const cov = computeGrammarCoverage(topics, inventory, COVERAGE_WAIVERS);
  const report = renderReport(cov);
  console.log(report);
  const distDir = join(root, "dist");
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "coverage-report.json"), JSON.stringify(cov, null, 2));
  if (process.argv.includes("--gate")) {
    const code = gateExitCode(cov);
    if (code) console.error(`coverage gate: ${cov.missingTotal} area(s) uncovered and un-waived.`);
    else console.log("coverage gate: OK — every band covered or waived.");
    process.exit(code);
  }
}

if (import.meta.main) main();
