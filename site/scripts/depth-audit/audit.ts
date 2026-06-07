import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateUnitGrade } from "./grade-store";
import { aggregateAll } from "./aggregate";
import { calibrateBar, type Label, type LabeledScore } from "./calibrate";
import { buildReport } from "./report";
import type { UnitGradeResult } from "./types";

export function runAudit(input: { grades: unknown[]; labels: { unitKey: string; label: Label }[] }) {
  const units: UnitGradeResult[] = input.grades.map((g, i) => {
    const v = validateUnitGrade(g);
    if (!v.ok) throw new Error(`grades[${i}] invalid: ${v.error}`);
    return v.value;
  });
  const scores = aggregateAll(units);
  const byKey = new Map(scores.map((s) => [s.unitKey, s.overall]));
  const labeled: LabeledScore[] = input.labels
    .filter((l) => byKey.has(l.unitKey))
    .map((l) => ({ unitKey: l.unitKey, label: l.label, overall: byKey.get(l.unitKey)! }));
  if (labeled.length < 2) throw new Error(`only ${labeled.length} labeled units present in grades — need >=2 to calibrate`);
  const cal = calibrateBar(labeled);
  return buildReport(scores, cal);
}

// CLI
if (import.meta.main) {
  const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const grades = JSON.parse(await readFile(here("./grades.json"), "utf8"));
  const cal = JSON.parse(await readFile(here("./calibration-set.json"), "utf8"));
  const { json, markdown } = runAudit({ grades, labels: cal.labels });
  const outDir = here("../../../docs/audit"); // site/scripts/depth-audit -> repo docs/audit
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/depth-scores.json`, JSON.stringify(json, null, 2));
  await writeFile(`${outDir}/depth-report.md`, markdown);
  console.log(`audit: bar=${json.bar} f1=${json.calibrationF1} failing=${json.summary.failing}/${json.summary.total} -> docs/audit/`);
}
