import { describe, it, expect } from "vitest";
import { RANKS, ratingToRank, nextRank } from "./ranks";

describe("ranks", () => {
  it("has 25 ranks covering 0–1000 contiguously with no gap/overlap", () => {
    expect(RANKS).toHaveLength(25);
    let prev = 0;
    for (const r of RANKS) { expect(r.min).toBe(prev); prev = r.max; }
    expect(prev).toBe(1000);
  });
  it("maps boundary ratings to the right rank", () => {
    expect(ratingToRank(0).id).toBe("initiate-3");
    expect(ratingToRank(1000).id).toBe("distinguished");
    expect(ratingToRank(750).tier).toBe("Staff");
    expect(ratingToRank(749).contentTier).not.toBe("senior");
  });
  it("nextRank returns the rank above, null at the apex", () => {
    expect(nextRank(ratingToRank(0)).id).toBe("initiate-2");
    expect(nextRank(ratingToRank(1000))).toBeNull();
  });
});
