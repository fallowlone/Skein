import { describe, it, expect } from "vitest";
import { vocabA2 } from "./vocab-a2";

const POS = ["noun", "verb", "adj", "adv", "phrase", "abbr", "other"];

describe("vocab-a2 dataset", () => {
  it("has the full A2 band enriched", () => {
    expect(vocabA2.length).toBeGreaterThan(700);
  });
  it("every entry is well-formed", () => {
    for (const e of vocabA2) {
      expect(e.band).toBe("A2");
      expect(e.id).toMatch(/^(ngsl|nawl):\d{4}$/);
      expect(e.lemma.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(e.rank)).toBe(true);
      expect(POS).toContain(e.pos);
      expect(e.ru.trim().length).toBeGreaterThan(0);
      expect(e.gloss.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(e.examples) && e.examples.length >= 1).toBe(true);
    }
  });
  it("ids are unique", () => {
    const ids = vocabA2.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
