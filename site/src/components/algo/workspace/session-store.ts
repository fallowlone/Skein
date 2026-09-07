import type { Attempt, PersistedSession, Scheme, SolveMode } from "./types";

const MAX_ATTEMPTS = 8;
const MAX_HISTORY = 64;

function keyFor(problemId: string): string {
  return `skein.algo-workspace.${problemId}.v1`;
}

function historyKeyFor(problemId: string): string {
  return `skein.algo-workspace.${problemId}.history.v1`;
}

function isSolveMode(v: unknown): v is SolveMode {
  return v === "timed" || v === "untimed" || v === "interview";
}
function isScheme(v: unknown): v is Scheme {
  return v === "ink" || v === "paper" || v === "slate";
}
function normalizeAttempt(v: unknown): Attempt | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (
    typeof a.code !== "string" ||
    typeof a.atLabel !== "string" ||
    !isSolveMode(a.mode) ||
    typeof a.mastery !== "number" || !Number.isFinite(a.mastery) ||
    typeof a.lines !== "number" || !Number.isInteger(a.lines) || a.lines < 0 ||
    typeof a.chars !== "number" || !Number.isInteger(a.chars) || a.chars < 0
  ) return null;

  if (a.createdAt !== undefined && (typeof a.createdAt !== "number" || !Number.isFinite(a.createdAt) || a.createdAt < 0)) return null;
  if (a.elapsedSeconds !== undefined && (typeof a.elapsedSeconds !== "number" || !Number.isFinite(a.elapsedSeconds) || a.elapsedSeconds < 0)) return null;
  if (a.hintsOpen !== undefined && (typeof a.hintsOpen !== "number" || !Number.isInteger(a.hintsOpen) || a.hintsOpen < 0)) return null;
  if (a.submitted !== undefined && typeof a.submitted !== "boolean") return null;

  let testsSummary: Attempt["testsSummary"];
  if (a.testsSummary !== undefined) {
    if (!a.testsSummary || typeof a.testsSummary !== "object") return null;
    const summary = a.testsSummary as Record<string, unknown>;
    if (
      typeof summary.passed !== "number" || !Number.isInteger(summary.passed) || summary.passed < 0 ||
      typeof summary.total !== "number" || !Number.isInteger(summary.total) || summary.total < 0 ||
      summary.passed > summary.total
    ) return null;
    testsSummary = { passed: summary.passed, total: summary.total };
  }

  let failures: Attempt["failures"];
  if (a.failures !== undefined) {
    if (!Array.isArray(a.failures)) return null;
    failures = [];
    for (const value of a.failures) {
      if (!value || typeof value !== "object") return null;
      const failure = value as Record<string, unknown>;
      if (typeof failure.args !== "string" || typeof failure.actual !== "string") return null;
      failures.push({ args: failure.args, actual: failure.actual });
    }
  }

  return {
    atLabel: a.atLabel,
    mode: a.mode,
    mastery: a.mastery,
    code: a.code,
    lines: a.lines,
    chars: a.chars,
    createdAt: a.createdAt as number | undefined,
    elapsedSeconds: a.elapsedSeconds as number | undefined,
    hintsOpen: a.hintsOpen as number | undefined,
    submitted: a.submitted as boolean | undefined,
    testsSummary,
    failures,
  };
}

/** Best-effort read of a prior session for one problem. Corrupted or missing storage yields null, never throws. */
export function loadSession(problemId: string): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(problemId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const session: PersistedSession = {
      code: typeof parsed.code === "string" ? parsed.code : "",
      mode: isSolveMode(parsed.mode) ? parsed.mode : "timed",
      scheme: isScheme(parsed.scheme) ? parsed.scheme : "ink",
      attempts: Array.isArray(parsed.attempts)
        ? parsed.attempts.map(normalizeAttempt).filter((attempt): attempt is Attempt => attempt !== null)
        : [],
    };
    if (typeof parsed.choice === "string" || parsed.choice === null) session.choice = parsed.choice;
    if (typeof parsed.committed === "string" || parsed.committed === null) session.committed = parsed.committed;
    if (typeof parsed.elapsedSeconds === "number" && Number.isInteger(parsed.elapsedSeconds) && parsed.elapsedSeconds >= 0) {
      session.elapsedSeconds = parsed.elapsedSeconds;
    }
    if (typeof parsed.sealedAtSeconds === "number" && Number.isInteger(parsed.sealedAtSeconds) && parsed.sealedAtSeconds >= 0) {
      session.sealedAtSeconds = parsed.sealedAtSeconds;
    }
    if (typeof parsed.hintsOpen === "number" && Number.isInteger(parsed.hintsOpen) && parsed.hintsOpen >= 0) {
      session.hintsOpen = parsed.hintsOpen;
    }
    return session;
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

export function loadAttemptHistory(problemId: string): Attempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyKeyFor(problemId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeAttempt).filter((attempt): attempt is Attempt => attempt !== null);
  } catch {
    return [];
  }
}

export function saveAttemptHistory(problemId: string, attempts: Attempt[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(historyKeyFor(problemId), JSON.stringify(attempts.slice(0, MAX_HISTORY)));
    return true;
  } catch {
    return false;
  }
}

export function appendAttemptHistory(problemId: string, entry: Attempt): boolean {
  return saveAttemptHistory(problemId, [entry, ...loadAttemptHistory(problemId)]);
}

/** Prepends a new attempt and caps history so storage never grows unbounded. */
export function withNewAttempt(attempts: Attempt[], entry: Attempt): Attempt[] {
  return [entry, ...attempts].slice(0, MAX_ATTEMPTS);
}
