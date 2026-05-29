import { describe, it, expect } from "vitest";
import { rankToTier } from "./rank-tier";
import { ratingToRank, RANKS } from "./ranks";
import type { Tier } from "~/types";

describe("rank-tier", () => {
  it("derives the content tier from a rank id", () => {
    expect(rankToTier("initiate-3")).toBe("junior");
    expect(rankToTier("engineer-1")).toBe("middle");
    expect(rankToTier("staff-3")).toBe("senior");
    expect(rankToTier("distinguished")).toBe("senior");
  });
  it("is monotonic: rising rating never lowers the tier", () => {
    const order: Tier[] = ["junior", "middle", "senior"];
    let max = 0;
    for (const r of RANKS) {
      const idx = order.indexOf(rankToTier(r.id));
      expect(idx).toBeGreaterThanOrEqual(max);
      max = idx;
    }
  });
  it("no rank at or below the stage-1 ceiling (750) is senior", () => {
    expect(rankToTier(ratingToRank(749).id)).not.toBe("senior");
    expect(rankToTier(ratingToRank(750).id)).toBe("senior");
  });
});
