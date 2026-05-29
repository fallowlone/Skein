export interface Streak { lastActiveDay: string; count: number; best: number; }

export function todayISO(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}
export function updateStreak(prev: Streak, today: string): Streak {
  if (prev.lastActiveDay === today) return prev;
  if (!prev.lastActiveDay) return { lastActiveDay: today, count: 1, best: Math.max(1, prev.best) };
  const gap = daysBetween(prev.lastActiveDay, today);
  const count = gap === 1 ? prev.count + 1 : 1;
  return { lastActiveDay: today, count, best: Math.max(prev.best, count) };
}
