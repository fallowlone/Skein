import { describe, it, expect } from "vitest";
import { vocabB1 } from "./vocab-b1";

const POS = ["noun", "verb", "adj", "adv", "phrase", "abbr", "other"];

describe("vocab-b1 dataset", () => {
  it("has the full B1 band enriched", () => {
    expect(vocabB1.length).toBeGreaterThan(1000);
  });
  it("every entry is well-formed and in band B1", () => {
    for (const e of vocabB1) {
      expect(e.band).toBe("B1");
      expect(e.id).toMatch(/^(ngsl|nawl):\d{4}$/);
      expect(e.lemma.trim().length).toBeGreaterThan(0);
      expect(POS).toContain(e.pos);
      expect(e.ru.trim().length).toBeGreaterThan(0);
      expect(e.gloss.trim().length).toBeGreaterThan(0);
      expect(e.examples.length).toBeGreaterThanOrEqual(1);
    }
  });
  it("ids are unique and disjoint from A2", async () => {
    const ids = vocabB1.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const { vocabA2 } = await import("./vocab-a2");
    const a2 = new Set(vocabA2.map((e) => e.id));
    expect(vocabB1.every((e) => !a2.has(e.id))).toBe(true);
  });
});
