import { describe, it, expect } from "vitest";
import { SAMPLE_WORDS } from "./sample-words";

describe("placement sample-words", () => {
  it("has ~50 real words stratified across all three bands", () => {
    expect(SAMPLE_WORDS.length).toBeGreaterThanOrEqual(48);
    expect(SAMPLE_WORDS.length).toBeLessThanOrEqual(54);
    const byBand = (b: string) => SAMPLE_WORDS.filter((w) => w.band === b).length;
    expect(byBand("A2")).toBeGreaterThanOrEqual(12);
    expect(byBand("B1")).toBeGreaterThanOrEqual(12);
    expect(byBand("B2")).toBeGreaterThanOrEqual(12);
  });
  it("every item has a lemma, a positive rank, and a band", () => {
    for (const w of SAMPLE_WORDS) {
      expect(w.lemma.trim().length).toBeGreaterThan(0);
      expect(w.rank).toBeGreaterThan(0);
      expect(["A2", "B1", "B2"]).toContain(w.band);
    }
  });
  it("lemmas are unique", () => {
    const l = SAMPLE_WORDS.map((w) => w.lemma);
    expect(new Set(l).size).toBe(l.length);
  });
});
