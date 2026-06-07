import { describe, it, expect } from "vitest";
import { rankPosition, ladderRows } from "./ladder";
import { RANKS, ratingToRank } from "./ranks";

describe("ladder", () => {
  it("rankPosition gives a 1-based index of 25 and a top%", () => {
    const first = rankPosition(RANKS[0]);
    expect(first.index).toBe(1); expect(first.total).toBe(25);
    const last = rankPosition(RANKS[RANKS.length - 1]);
    expect(last.index).toBe(25); expect(last.topPct).toBe(4); // top 4% at the apex
  });
  it("ladderRows flags reached + current from rating", () => {
    const rating = 460; // Engineer tier
    const rows = ladderRows(rating);
    expect(rows).toHaveLength(25);
    expect(rows.filter((r) => r.current)).toHaveLength(1);
    expect(rows.find((r) => r.current)!.rank.id).toBe(ratingToRank(rating).id);
    expect(rows[0].reached).toBe(true); // floor 0 always reached
    expect(rows[rows.length - 1].reached).toBe(false); // apex (min 990) not reached at 460
  });
});
