// site/src/scripts/progression/ladder.ts
//
// Pure helpers over the 25-rank ladder (ranks.ts) for the Progression screen:
// where the learner sits (index/top%) and the full ladder with reached/current flags.
import type { RankDef } from "./types";
import { RANKS, ratingToRank } from "./ranks";

export function rankPosition(rank: RankDef): { index: number; total: number; topPct: number } {
  const i = RANKS.findIndex((r) => r.id === rank.id);
  const index = (i < 0 ? 0 : i) + 1; // 1-based
  const total = RANKS.length;
  // top% = how high you sit: apex (index=total) → smallest %. round(100*(total-index+1)/total).
  const topPct = Math.round((100 * (total - index + 1)) / total);
  return { index, total, topPct };
}

export function ladderRows(currentRating: number): { rank: RankDef; reached: boolean; current: boolean }[] {
  const cur = ratingToRank(currentRating);
  return RANKS.map((r) => ({ rank: r, reached: currentRating >= r.min, current: r.id === cur.id }));
}
