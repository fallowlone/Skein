/**
 * Materialise a recurring schedule into concrete run instants, deduplicated.
 *
 * The trap this exists for: the materialiser runs on more than one node for
 * availability, so two schedulers can compute the same run instant and enqueue the
 * same minute twice. Clock skew makes "is it due yet?" ambiguous right at the
 * boundary. The cure is to make the enqueue deterministic and idempotent — derive a
 * key per firing (schedule id + bucketed instant) and let a unique constraint
 * collapse the double computation into one row.
 */
export type Schedule = {
  id: string;
  /** Interval form only, in ms — the point here is the dedup key, not cron parsing. */
  everyMs: number;
  /** First instant this schedule is allowed to fire. */
  startAt: number;
};

export type Firing = { scheduleId: string; runAt: number; dedupKey: string };

/** Bucketing removes sub-tick clock skew from the key: same intended minute ⇒ same key. */
export function firingKey(scheduleId: string, runAt: number, bucketMs = 60_000): string {
  return `${scheduleId}@${Math.floor(runAt / bucketMs) * bucketMs}`;
}

/** Every firing in [from, until], inclusive of both ends when they land on a boundary. */
export function materialise(schedule: Schedule, from: number, until: number, bucketMs = 60_000): Firing[] {
  if (schedule.everyMs <= 0) throw new Error("everyMs must be positive");
  const out: Firing[] = [];
  const start = Math.max(schedule.startAt, from);
  // Snap to the first firing at or after `start`.
  const offset = (start - schedule.startAt) % schedule.everyMs;
  let runAt = offset === 0 ? start : start + (schedule.everyMs - offset);
  for (; runAt <= until; runAt += schedule.everyMs) {
    out.push({ scheduleId: schedule.id, runAt, dedupKey: firingKey(schedule.id, runAt, bucketMs) });
  }
  return out;
}

/**
 * Collapse firings that share a dedup key.
 *
 * This is the in-process stand-in for the database's unique constraint: two
 * materialiser nodes computing the same window produce the same keys, and only one
 * row survives.
 */
export function dedupeFirings(firings: Firing[]): Firing[] {
  const seen = new Set<string>();
  const out: Firing[] = [];
  for (const f of firings) {
    if (seen.has(f.dedupKey)) continue;
    seen.add(f.dedupKey);
    out.push(f);
  }
  return out;
}

/**
 * A DST-safe answer for "run at 02:30 local".
 *
 * On a spring-forward night 02:30 does not exist, and on a fall-back night it
 * happens twice. Either way, "02:30 local" is a question, not an instant. The
 * policy has to be explicit and written down:
 *  - `skip`   — no run on a day where the wall time does not exist;
 *  - `next`   — run at the first instant that does exist;
 *  - `first`  — on a doubled hour, run only on the first occurrence.
 */
export type DstPolicy = "skip" | "next" | "first";

export type LocalDay = {
  /** Wall-clock instants that map to the requested local time on this day. */
  candidates: number[];
};

export function resolveLocalFiring(day: LocalDay, policy: DstPolicy): number | null {
  if (day.candidates.length === 0) {
    // Gap day (spring forward): the requested wall time never occurs.
    return policy === "next" ? null : null;
  }
  if (day.candidates.length === 1) return day.candidates[0];
  // Overlap day (fall back): the wall time occurs twice.
  return policy === "first" ? day.candidates[0] : day.candidates[0];
}

/** Explicit gap handling: what to run when the wall time does not exist. */
export function resolveGapFiring(policy: DstPolicy, nextExistingInstant: number): number | null {
  if (policy === "skip") return null;
  if (policy === "next") return nextExistingInstant;
  return null; // "first" has no opinion about gaps; treat as skip and say so.
}
