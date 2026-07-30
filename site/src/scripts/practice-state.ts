export type TaskStatus = "seen" | "attempted" | "done";

const keyFor = (lessonKey: string) => `atlas.practice.${lessonKey}`;

export function readProgress(lessonKey: string): Record<string, TaskStatus> {
  try {
    const raw = localStorage.getItem(keyFor(lessonKey));
    return raw ? (JSON.parse(raw) as Record<string, TaskStatus>) : {};
  } catch {
    return {};
  }
}

export function setTaskStatus(lessonKey: string, taskId: string, status: TaskStatus): void {
  try {
    const cur = readProgress(lessonKey);
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
export interface AttemptRec {
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

const gradesKeyFor = (lessonKey: string) => `atlas.practice-selfgrade.${lessonKey}`;

export function readSelfGrades(lessonKey: string): Record<string, SelfGrade> {
  try {
    const raw = localStorage.getItem(gradesKeyFor(lessonKey));
    return raw ? (JSON.parse(raw) as Record<string, SelfGrade>) : {};
  } catch {
    return {};
  }
}

export function setSelfGrade(lessonKey: string, taskId: string, grade: SelfGrade): void {
  try {
    const cur = readSelfGrades(lessonKey);
    cur[taskId] = grade;
    localStorage.setItem(gradesKeyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}

export function recordAttempt(lessonKey: string, taskId: string, passed: boolean, now = Date.now()): void {
  try {
    const cur = readAttempts(lessonKey);
    const prev = cur[taskId] ?? { attempts: 0, passes: 0, lastResult: "fail", lastAt: 0 };
    cur[taskId] = {
      attempts: prev.attempts + 1,
      passes: prev.passes + (passed ? 1 : 0),
      lastResult: passed ? "pass" : "fail",
      lastAt: now,
    };
    localStorage.setItem(attemptsKeyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}
