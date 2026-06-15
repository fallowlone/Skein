// Pure EGP coverage computation. See spec §7. No I/O, no barrels.
import type { Bi } from "./types";
import type { Cefr, GrammarTopic } from "./grammar-types";
import { CEFR_ORDER } from "./grammar-types";
import type { EgpEntry } from "./data/egp/types";

export type Waiver = { id: string; rationale: Bi };
export type BandCoverage = {
  cefr: Cefr; total: number; covered: number; waived: number; missing: string[]; pct: number;
};
export type GrammarCoverage = { bands: BandCoverage[]; overallPct: number; missingTotal: number };

export function computeGrammarCoverage(
  topics: GrammarTopic[],
  inventory: EgpEntry[],
  waivers: Waiver[],
): GrammarCoverage {
  const tagged = new Set<string>(topics.flatMap((t) => t.egp));
  const waived = new Set<string>(waivers.map((w) => w.id));
  const presentBands = CEFR_ORDER.filter((c) => inventory.some((e) => e.cefr === c));
  const bands: BandCoverage[] = presentBands.map((cefr) => {
    const entries = inventory.filter((e) => e.cefr === cefr);
    const missing = entries.filter((e) => !tagged.has(e.id) && !waived.has(e.id)).map((e) => e.id);
    const waivedCount = entries.filter((e) => !tagged.has(e.id) && waived.has(e.id)).length;
    const covered = entries.length - missing.length - waivedCount;
    const pct = entries.length === 0 ? 100 : Math.round((100 * (covered + waivedCount)) / entries.length);
    return { cefr, total: entries.length, covered, waived: waivedCount, missing, pct };
  });
  const missingTotal = bands.reduce((s, b) => s + b.missing.length, 0);
  const overallPct = inventory.length === 0 ? 100 : Math.round((100 * (inventory.length - missingTotal)) / inventory.length);
  return { bands, overallPct, missingTotal };
}
