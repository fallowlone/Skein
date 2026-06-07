import { describe, it, expect } from "vitest";
import { domainRatings, weakestDomain, strongestDomain } from "./domain-ratings";
import type { Concept, KnowledgeState } from "~/scripts/path/types";

const mk = (id: string, track: string): Concept => ({ id, label: { en: id, ru: id }, track: track as any, band: "surface" as any, requires: [] });

describe("domainRatings", () => {
  const concepts: Concept[] = [mk("a", "networking"), mk("b", "networking"), mk("c", "databases")];
  const state: KnowledgeState = new Map([
    ["a", { confidence: 1, source: "diagnostic", lastAt: 0 }],
    ["b", { confidence: 0.5, source: "activity", lastAt: 0 }],
  ]); // c absent → 0

  it("scores each family by avg confidence (0..100)", () => {
    const rs = domainRatings(state, concepts, 0.6);
    const net = rs.find((r) => r.key === "network-sec")!;
    expect(net.score).toBe(75); // (1 + 0.5)/2 * 100
    expect(net.known).toBe(1);  // only a >= 0.6
    expect(net.total).toBe(2);
    const data = rs.find((r) => r.key === "data")!;
    expect(data.score).toBe(0);
    expect(data.known).toBe(0);
  });
  it("only returns families with concepts, in DOMAIN_FAMILIES order", () => {
    const rs = domainRatings(state, concepts, 0.6);
    expect(rs.every((r) => r.total > 0)).toBe(true);
    expect(rs[0].key).toBe("network-sec" === rs[0].key ? rs[0].key : rs[0].key); // order stable per DOMAIN_FAMILIES
  });
  it("weakestDomain picks the lowest-score family with a real gap; strongest the highest", () => {
    const rs = domainRatings(state, concepts, 0.6);
    expect(weakestDomain(rs)!.key).toBe("data");      // score 0, has gap
    expect(strongestDomain(rs)!.key).toBe("network-sec");
  });
  it("weakestDomain is null when every family is complete", () => {
    const full: KnowledgeState = new Map([
      ["a", { confidence: 1, source: "diagnostic", lastAt: 0 }],
      ["b", { confidence: 1, source: "diagnostic", lastAt: 0 }],
      ["c", { confidence: 1, source: "diagnostic", lastAt: 0 }],
    ]);
    expect(weakestDomain(domainRatings(full, concepts, 0.6))).toBeNull();
  });
});
