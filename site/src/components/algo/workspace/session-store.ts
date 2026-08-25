import type { Attempt, PersistedSession, Scheme, SolveMode } from "./types";

const MAX_ATTEMPTS = 8;

function keyFor(problemId: string): string {
  return `awesome.algo-workspace.${problemId}.v1`;
}

function isSolveMode(v: unknown): v is SolveMode {
  return v === "timed" || v === "untimed" || v === "interview";
}
function isScheme(v: unknown): v is Scheme {
  return v === "ink" || v === "paper" || v === "slate";
}
function isAttempt(v: unknown): v is Attempt {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return typeof a.code === "string" && typeof a.atLabel === "string" && typeof a.mastery === "number";
}

/** Best-effort read of a prior session for one problem. Corrupted or missing storage yields null, never throws. */
export function loadSession(problemId: string): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(problemId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      code: typeof parsed.code === "string" ? parsed.code : "",
      mode: isSolveMode(parsed.mode) ? parsed.mode : "timed",
      scheme: isScheme(parsed.scheme) ? parsed.scheme : "ink",
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter(isAttempt) : [],
    };
  } catch {
    return null;
  }
}

/** Returns false when storage is unavailable (private mode, quota) so the UI can say so. */
export function saveSession(problemId: string, session: PersistedSession): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(keyFor(problemId), JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

/** Prepends a new attempt and caps history so storage never grows unbounded. */
export function withNewAttempt(attempts: Attempt[], entry: Attempt): Attempt[] {
  return [entry, ...attempts].slice(0, MAX_ATTEMPTS);
}
