// src/scripts/path/optimize.ts
// Pure: turn precomputed lever deltas into ordered, quantified fix suggestions. All calendar
// and what-if math is done by the caller (schedule.ts / optimize-deltas.ts) and passed in as
// numbers, so this module stays a deterministic assembler + ranker with no graph/clock access.
import type { Tier } from "./types";

export type FixKind = "raise-hours" | "extend-date" | "lower-depth" | "drop-goal" | "exclude-track";

export interface Fix {
  kind: FixKind;
  deltaMin: number;                 // minutes added to availability OR removed from required
  closesGap: boolean;               // does this single lever cover the deficit?
  patch: Record<string, unknown>;   // descriptor the adapter applies via existing mutators
}

export interface LeverInputs {
  deficitMin: number;                                   // budget deficit (or pace catch-up minutes when behind)
  raiseHours: { hours: number; deltaMin: number }[];    // e.g. +0.5h, +1h on each active weekday
  extendDate: { days: number; deltaMin: number }[];     // e.g. +7d, +14d
  lowerDepth?: { tier: Tier; deltaMin: number };        // present only if a lower tier exists
  dropGoal?: { goalId: string; label: string; deltaMin: number };
  excludeTrack?: { track: string; deltaMin: number };
  behind: boolean;                                      // pace status → offer catch-up even if budget fits
}

// Disruption order: tweak availability first, cut scope last.
const ORDER: FixKind[] = ["raise-hours", "extend-date", "lower-depth", "exclude-track", "drop-goal"];
const SCOPE_CUTS = new Set<FixKind>(["exclude-track", "drop-goal"]);

export function suggestFixes(inp: LeverInputs): Fix[] {
  const deficit = inp.deficitMin;
  if (deficit <= 0 && !inp.behind) return [];

  const mk = (kind: FixKind, deltaMin: number, patch: Record<string, unknown>): Fix =>
    ({ kind, deltaMin, closesGap: deltaMin >= deficit && deficit > 0, patch });

  const fixes: Fix[] = [];
  for (const r of inp.raiseHours) fixes.push(mk("raise-hours", r.deltaMin, { hours: r.hours }));
  for (const e of inp.extendDate) fixes.push(mk("extend-date", e.deltaMin, { days: e.days }));
  if (inp.lowerDepth) fixes.push(mk("lower-depth", inp.lowerDepth.deltaMin, { tier: inp.lowerDepth.tier }));
  if (inp.excludeTrack) fixes.push(mk("exclude-track", inp.excludeTrack.deltaMin, { track: inp.excludeTrack.track }));
  if (inp.dropGoal) fixes.push(mk("drop-goal", inp.dropGoal.deltaMin, { goalId: inp.dropGoal.goalId, label: inp.dropGoal.label }));

  // When only "behind" (budget fits), offer catch-up levers but not scope cuts.
  const visible = deficit > 0 ? fixes : fixes.filter((f) => !SCOPE_CUTS.has(f.kind));

  return visible.sort((a, b) =>
    ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.deltaMin - b.deltaMin);
}

// Minimal in-order prefix whose summed delta covers the deficit (greedy on the disruption order).
export function bestCombo(fixes: Fix[], deficitMin: number): Fix[] {
  if (deficitMin <= 0) return [];
  // Prefer a single lever that closes the gap (least disruptive first).
  const single = fixes.find((f) => f.closesGap);
  if (single) return [single];
  const combo: Fix[] = [];
  let sum = 0;
  for (const f of fixes) {
    if (sum >= deficitMin) break;
    combo.push(f);
    sum += f.deltaMin;
  }
  return combo;
}
