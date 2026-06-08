// Pure: reading-depth tier → effort multiplier on a unit's canonical estMin.
// estMin is authored at the "middle" tier, so middle === 1.0. Junior skims (cheaper),
// senior deep-reads (dearer). Used by schedule.ts to budget deadline minutes by depth.
import type { Tier } from "~/types";

const EFFORT: Record<Tier, number> = { junior: 0.65, middle: 1.0, senior: 1.25 };

export function tierEffort(tier: Tier): number {
  return EFFORT[tier] ?? 1.0;
}
