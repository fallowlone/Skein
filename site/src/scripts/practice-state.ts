export type TaskStatus = "seen" | "attempted" | "done";

export const PRACTICE_COMPETENCIES = ["recall", "explain", "predict", "produce", "debug", "discriminate", "transfer"] as const;
export type PracticeCompetency = typeof PRACTICE_COMPETENCIES[number];
export type PracticeMode = "closed-book" | "docs" | "ai";
export type PracticeEvaluator = "exec" | "self" | "ai";

export interface PracticeEvidence {
  version?: number;
  concepts?: string[];
  competency?: PracticeCompetency;
  mode: PracticeMode;
  hints: number;
  evaluator: PracticeEvaluator;
  independent: boolean;
}

const keyFor = (lessonKey: string) => `atlas.practice.${lessonKey}`;

export function readProgress(lessonKey: string): Record<string, TaskStatus> {
  try {
    const raw = localStorage.getItem(keyFor(lessonKey));
    return raw ? (JSON.parse(raw) as Record<string, TaskStatus>) : {};
  } catch {
    return {};
  }
}

export function setTaskStatus(lessonKey: string, taskId: string, status: TaskStatus, allowDowngrade = false): void {
  try {
    const cur = readProgress(lessonKey);
    const rank: Record<TaskStatus, number> = { seen: 0, attempted: 1, done: 2 };
    if (!allowDowngrade && cur[taskId] && rank[cur[taskId]] > rank[status]) return;
    cur[taskId] = status;
    localStorage.setItem(keyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}

// ── outcomes store (graded attempts; separate from the seen|attempted|done status above) ──
// Keyed independently so the existing status store is untouched: this records *how* a task
// went (counts + last result), feeding the downward practice-struggle knowledge signal and the
// fail→resurface SRS loop. See docs/superpowers/plans/2026-06-14-adaptive-path-engine.md §A.
export interface AttemptRec extends Partial<PracticeEvidence> {
  attempts: number;
  passes: number;
  lastResult: "pass" | "fail";
  lastAt: number;
}

const attemptsKeyFor = (lessonKey: string) => `atlas.practice-attempts.${lessonKey}`;

export function readAttempts(lessonKey: string): Record<string, AttemptRec> {
  try {
    const raw = localStorage.getItem(attemptsKeyFor(lessonKey));
    return raw ? (JSON.parse(raw) as Record<string, AttemptRec>) : {};
  } catch {
    return {};
  }
}

// ── committed responses + self-grades ─────────────────────────────────────────
// "Predict, then reveal" tasks (predict / design / diagnose-self / incident steps)
// used to hand out the model answer on one click, which made the generation effect
// optional and left the adaptive engine and the SRS loop with no signal at all —
// 39% of the 8096 practice tasks were ungraded this way.
//
// The flow is now: write your own answer (persisted, so it survives a reload and
// can sit next to the model answer) → reveal → say honestly how you did. The
// self-grade is what feeds recordAttempt / recordPracticeOutcome. Skipping is
// allowed and recorded as `skipped` — an honest "I did not know" is a better
// signal than a coerced fake answer, and it resurfaces the card either way.

/** Minimum characters before a response counts as committed. Low on purpose: the
 *  point is to force articulation, not to hit a word count. */
export const MIN_COMMIT_CHARS = 12;

export type SelfGrade = "hit" | "partial" | "miss" | "skipped";

export type SelfGradeRecord = {
  grade: SelfGrade;
  lastAt: number;
};

export function isCommitted(text: string): boolean {
  return (text ?? "").trim().length >= MIN_COMMIT_CHARS;
}

/** Only a full hit counts as a pass; partial/miss/skipped must resurface. */
export function selfGradeToPass(grade: SelfGrade): boolean {
  return grade === "hit";
}

const responsesKeyFor = (lessonKey: string) => `atlas.practice-responses.${lessonKey}`;

export function readResponses(lessonKey: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(responsesKeyFor(lessonKey));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeResponse(lessonKey: string, taskId: string, text: string): void {
  try {
    const cur = readResponses(lessonKey);
    cur[taskId] = text;
    localStorage.setItem(responsesKeyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}

export function deleteResponse(lessonKey: string, taskId: string): void {
  try {
    const cur = readResponses(lessonKey);
    delete cur[taskId];
    localStorage.setItem(responsesKeyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}

const gradesKeyFor = (lessonKey: string) => `atlas.practice-selfgrade.${lessonKey}`;

const isSelfGrade = (value: unknown): value is SelfGrade =>
  value === "hit" || value === "partial" || value === "miss" || value === "skipped";

export function readSelfGradeRecords(lessonKey: string): Record<string, SelfGradeRecord> {
  try {
    const raw = localStorage.getItem(gradesKeyFor(lessonKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const records: Record<string, SelfGradeRecord> = {};
    for (const [taskId, value] of Object.entries(parsed)) {
      if (isSelfGrade(value)) {
        records[taskId] = { grade: value, lastAt: 0 };
      } else if (value && typeof value === "object" && "grade" in value && isSelfGrade(value.grade)) {
        const lastAt = "lastAt" in value && typeof value.lastAt === "number" && Number.isFinite(value.lastAt) && value.lastAt >= 0 ? value.lastAt : 0;
        records[taskId] = { grade: value.grade, lastAt };
      }
    }
    return records;
  } catch {
    return {};
  }
}

export function readSelfGrades(lessonKey: string): Record<string, SelfGrade> {
  return Object.fromEntries(Object.entries(readSelfGradeRecords(lessonKey)).map(([taskId, record]) => [taskId, record.grade]));
}

export function setSelfGrade(lessonKey: string, taskId: string, grade: SelfGrade, now = Date.now()): void {
  try {
    const cur = readSelfGradeRecords(lessonKey);
    cur[taskId] = { grade, lastAt: now };
    localStorage.setItem(gradesKeyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}

export function recordAttempt(
  lessonKey: string,
  taskId: string,
  passed: boolean,
  now = Date.now(),
  evidence?: PracticeEvidence,
  correctLatest = false,
): void {
  try {
    const cur = readAttempts(lessonKey);
    const prev = cur[taskId] ?? { attempts: 0, passes: 0, lastResult: "fail", lastAt: 0 };
    const correction = correctLatest && prev.attempts > 0;
    const normalizedEvidence = evidence ? {
      ...evidence,
      concepts: evidence.concepts ? [...evidence.concepts] : undefined,
      independent: evidence.independent && evidence.evaluator === "exec" && evidence.mode !== "ai" && evidence.hints === 0,
    } : {};
    cur[taskId] = {
      ...prev,
      ...normalizedEvidence,
      attempts: prev.attempts + (correction ? 0 : 1),
      passes: correction
        ? Math.max(0, prev.passes - (prev.lastResult === "pass" ? 1 : 0) + (passed ? 1 : 0))
        : prev.passes + (passed ? 1 : 0),
      lastResult: passed ? "pass" : "fail",
      lastAt: now,
    };
    localStorage.setItem(attemptsKeyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}
