export interface Streak { lastActiveDay: string; count: number; best: number; freezes?: number; }

const FREEZE_CAP = 2;
const FREEZE_EARN_EVERY = 7;

export function todayISO(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}
export function updateStreak(prev: Streak, today: string): Streak {
  if (prev.lastActiveDay === today) return prev;
  const freezes = prev.freezes ?? 0;
  if (!prev.lastActiveDay) return { lastActiveDay: today, count: 1, best: Math.max(1, prev.best), freezes };
  const gap = daysBetween(prev.lastActiveDay, today);
  if (gap === 1) {
    const count = prev.count + 1;
    const earned = count % FREEZE_EARN_EVERY === 0 ? Math.min(FREEZE_CAP, freezes + 1) : freezes;
    return { lastActiveDay: today, count, best: Math.max(prev.best, count), freezes: earned };
  }
  if (gap === 2 && freezes > 0) {
    // One missed day forgiven: the streak holds and one freeze is consumed.
    return { lastActiveDay: today, count: prev.count, best: prev.best, freezes: freezes - 1 };
  }
  return { lastActiveDay: today, count: 1, best: Math.max(prev.best, 1), freezes };
}
