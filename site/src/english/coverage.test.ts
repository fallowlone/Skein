import { describe, it, expect } from "vitest";
import { computeCoverage, type CoverageEntry } from "./coverage";

const ENTRIES: CoverageEntry[] = [
  { id: "ngsl:1", band: "A2", domain: "general" },
  { id: "ngsl:2", band: "A2", domain: "general" },
  { id: "ngsl:3", band: "B1", domain: "general" },
  { id: "ngsl:4", band: "B2", domain: "general" },
  { id: "nawl:1", band: "B2", domain: "engineering" },
  { id: "nawl:2", band: "B2", domain: "engineering" },
];

describe("computeCoverage", () => {
  it("computes per-band and overall percent over the full bank", () => {
    const known = new Set(["ngsl:1", "ngsl:3", "nawl:1"]);
    const r = computeCoverage(ENTRIES, (id) => known.has(id), "everyday");
    // everyday = general subset (4 entries): known ngsl:1, ngsl:3 → 50%
    expect(r.overallPct).toBe(50);
    const a2 = r.bands.find((b) => b.band === "A2")!;
    expect(a2).toMatchObject({ known: 1, total: 2, pct: 50 });
    expect(r.corpusTotal).toBe(4);
  });

  it("engineering register includes the technical (nawl/engineering) entries", () => {
    const known = new Set(["nawl:1"]);
    const r = computeCoverage(ENTRIES, (id) => known.has(id), "engineering");
    // engineering = general + engineering (all 6): known nawl:1 → 1/6 ≈ 17%
    expect(r.corpusTotal).toBe(6);
    expect(r.overallPct).toBe(17);
  });

  it("handles zero-known and all-known cleanly", () => {
    expect(computeCoverage(ENTRIES, () => false, "everyday").overallPct).toBe(0);
    expect(computeCoverage(ENTRIES, () => true, "everyday").overallPct).toBe(100);
  });

  it("a band with no entries reports 0% not NaN", () => {
    const only = ENTRIES.filter((e) => e.band === "A2");
    const r = computeCoverage(only, () => false, "everyday");
    const b2 = r.bands.find((b) => b.band === "B2")!;
    expect(b2).toMatchObject({ known: 0, total: 0, pct: 0 });
  });
});
