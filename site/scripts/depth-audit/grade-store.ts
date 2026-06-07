import { readFile, writeFile } from "node:fs/promises";
import { DIMENSIONS, type UnitGradeResult } from "./types";

export type Valid = { ok: true; value: UnitGradeResult } | { ok: false; error: string };

// Trust-boundary validation: LLM output is untrusted JSON.
export function validateUnitGrade(x: unknown): Valid {
  if (typeof x !== "object" || x === null) return { ok: false, error: "not an object" };
  const o = x as Record<string, unknown>;
  if (typeof o.unitKey !== "string") return { ok: false, error: "unitKey" };
  if (typeof o.graderModel !== "string") return { ok: false, error: "graderModel" };
  if (!Array.isArray(o.grades)) return { ok: false, error: "grades not array" };
  if (o.grades.length === 0) return { ok: false, error: "grades is empty" };
  for (const g of o.grades) {
    if (typeof g !== "object" || g === null) return { ok: false, error: "grade not object" };
    const gg = g as Record<string, unknown>;
    if (typeof gg.lessonKey !== "string") return { ok: false, error: "lessonKey" };
    if (typeof gg.justification !== "string") return { ok: false, error: "justification" };
    if (typeof gg.scores !== "object" || gg.scores === null) return { ok: false, error: "scores" };
    const s = gg.scores as Record<string, unknown>;
    for (const d of DIMENSIONS) {
      const v = s[d];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 5) return { ok: false, error: `score ${d}` };
    }
  }
  return { ok: true, value: x as UnitGradeResult };
}

export async function writeGrades(path: string, grades: UnitGradeResult[]): Promise<void> {
  await writeFile(path, JSON.stringify(grades, null, 2));
}

/** Read + validate the grade-store; throws on the first invalid unit (fail loud). */
export async function readGrades(path: string): Promise<UnitGradeResult[]> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(raw)) throw new Error("grades.json is not an array");
  return raw.map((u, i) => {
    const v = validateUnitGrade(u);
    if (!v.ok) throw new Error(`grades.json[${i}] invalid: ${v.error}`);
    return v.value;
  });
}
