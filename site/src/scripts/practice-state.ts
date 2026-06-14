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
