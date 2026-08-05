// Deterministic grading. Reuses the practice graders rather than reimplementing them,
// and adds the one thing the report needs: a specific failureNote instead of "wrong".
import { applyExecCheck, checkBlank, type ExecCheck, type ExecResult } from "~/scripts/practice-grade";
import type { Outcome } from "../types";

export interface GradeResult {
  outcome: Outcome;
  failureNote?: string;
}

export function gradeBlanks(blanks: readonly { accept: string[] }[], answers: readonly string[]): GradeResult {
  const hits = blanks.filter((b, i) => checkBlank(b.accept, answers[i] ?? "")).length;
  if (hits === blanks.length) return { outcome: "correct" };
  if (hits === 0) return { outcome: "wrong", failureNote: `0 of ${blanks.length} blanks correct` };
  return { outcome: "partial", failureNote: `${hits} of ${blanks.length} blanks correct` };
}

export function gradeReview(
  findings: readonly { id: string; planted: boolean }[],
  picked: readonly string[],
): GradeResult {
  const planted = findings.filter((f) => f.planted).map((f) => f.id);
  const found = planted.filter((id) => picked.includes(id));
  const decoys = picked.filter((id) => !planted.includes(id));
  if (found.length === planted.length && decoys.length === 0) return { outcome: "correct" };
  const decoyNote = decoys.length ? `${decoys.length} decoy(s) selected` : "";
  if (found.length === 0) {
    const note = [`missed all ${planted.length} planted findings`, decoyNote].filter(Boolean).join("; ");
    return { outcome: "wrong", failureNote: note };
  }
  const note = [`found ${found.length}/${planted.length}`, decoyNote].filter(Boolean).join("; ");
  return { outcome: "partial", failureNote: note };
}

export function gradeExec(check: ExecCheck, result: ExecResult): GradeResult {
  if (result.error) return { outcome: "wrong", failureNote: result.error.slice(0, 200) };
  return applyExecCheck(check, result)
    ? { outcome: "correct" }
    : { outcome: "wrong", failureNote: `output did not satisfy ${check.kind}` };
}
