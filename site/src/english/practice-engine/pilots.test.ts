import { describe, it, expect } from "vitest";
import { grammarById } from "~/english/data/grammar/index";
import { generate } from "./generate";

const PILOTS = ["present-simple", "comparative-adjectives", "past-simple"];

describe("pilot gen specs", () => {
  for (const id of PILOTS) {
    it(`${id} has a gen spec`, () => {
      expect(grammarById.get(id)?.gen).toBeTruthy();
    });
    it(`${id} generates >=100 unique items with non-empty answers`, () => {
      const items = generate(id, { count: 100, seed: 1 });
      expect(items.length).toBeGreaterThanOrEqual(100);
      expect(new Set(items.map((e) => e.prompt)).size).toBe(items.length);
      expect(items.every((e) => e.answer.trim().length > 0)).toBe(true);
    });
  }
});
