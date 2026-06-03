import { describe, it, expect } from "vitest";
import { vocabA1 } from "./vocab-a1";

const POS = ["noun", "verb", "adj", "adv", "phrase", "abbr", "other"];

describe("vocab-a1 dataset", () => {
  it("has a meaningful A1 seed", () => {
    expect(vocabA1.length).toBeGreaterThanOrEqual(50);
  });
  it("every entry is well-formed and band A1", () => {
    for (const e of vocabA1) {
      expect(e.band).toBe("A1");
      expect(e.id).toMatch(/^de:\d{4}$/);
      expect(e.lemma.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(e.rank)).toBe(true);
      expect(POS).toContain(e.pos);
      expect(e.ru.trim().length).toBeGreaterThan(0);
      expect(e.gloss.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(e.examples) && e.examples.length >= 1).toBe(true);
    }
  });
  it("ids and ranks are unique and ascending", () => {
    const ids = vocabA1.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const ranks = vocabA1.map((e) => e.rank);
    expect(new Set(ranks).size).toBe(ranks.length);
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeGreaterThan(ranks[i - 1]);
  });
  it("nouns carry their definite article in the lemma", () => {
    const nouns = vocabA1.filter((e) => e.pos === "noun");
    expect(nouns.length).toBeGreaterThan(0);
    for (const n of nouns) {
      expect(n.lemma).toMatch(/^(der|die|das) /);
    }
  });
});
