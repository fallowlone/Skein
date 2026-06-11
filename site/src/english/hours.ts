// site/src/english/hours.ts
// Input-hours log — the methodology's PRIMARY metric (hours of comprehensible input decide
// progress; in-app counters and streaks only proxy effort). Pure: state.ts owns persistence.
export type HourKind = "input-active" | "input-passive" | "srs" | "output";
export type HourEntry = { date: string; min: number; kind: HourKind; src?: string };

const CAP = 5000; // ~13 years of daily entries; trim oldest beyond this

// Same-day same-kind entries merge (quick-log buttons fire repeatedly within a day).
export function appendHours(log: HourEntry[], entry: HourEntry): HourEntry[] {
  if (!(entry.min > 0)) return log;
  const i = log.findIndex((x) => x.date === entry.date && x.kind === entry.kind);
  const next = i >= 0
    ? log.map((x, j) => (j === i ? { ...x, min: x.min + entry.min } : x))
    : [...log, entry];
  return next.length > CAP ? next.slice(next.length - CAP) : next;
}

export interface HoursSummary {
  totalMin: number; weekMin: number; todayMin: number;
  byKind: Record<HourKind, number>;
  todayByKind: Record<HourKind, number>;
}

export function summarize(log: HourEntry[], todayISO: string, weekStartISO: string): HoursSummary {
  const byKind: Record<HourKind, number> = { "input-active": 0, "input-passive": 0, srs: 0, output: 0 };
  const todayByKind: Record<HourKind, number> = { "input-active": 0, "input-passive": 0, srs: 0, output: 0 };
  let totalMin = 0, weekMin = 0, todayMin = 0;
  for (const x of log) {
    totalMin += x.min;
    byKind[x.kind] += x.min;
    if (x.date >= weekStartISO && x.date <= todayISO) weekMin += x.min;
    if (x.date === todayISO) { todayMin += x.min; todayByKind[x.kind] += x.min; }
  }
  return { totalMin, weekMin, todayMin, byKind, todayByKind };
}
