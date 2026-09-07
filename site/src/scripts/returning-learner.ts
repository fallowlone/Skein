const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

type HistoryEntry = { lastAt?: unknown };

export function isReturningLearner(
  history: Record<string, HistoryEntry> | null | undefined,
  lessonKey: string,
  now = Date.now(),
  inactivityMs = THIRTY_DAYS,
): boolean {
  const lastAt = history?.[lessonKey]?.lastAt;
  return typeof lastAt === "number"
    && Number.isFinite(lastAt)
    && lastAt > 0
    && now - lastAt >= inactivityMs;
}
