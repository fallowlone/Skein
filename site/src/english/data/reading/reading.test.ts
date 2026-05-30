import { describe, it, expect } from "vitest";
import { readingUnits } from "./index";
import { vocabA2 } from "../vocab-a2";
import { vocabB1 } from "../vocab-b1";

const vocabIds = new Set([...vocabA2, ...vocabB1].map((e) => e.id));
const LEVELS = ["A2", "B1", "B2"];
const STREAMS = ["general", "engineering"];
const bi = (b: unknown) =>
  !!b && typeof b === "object" && typeof (b as any).en === "string" && (b as any).en.length > 0
  && typeof (b as any).ru === "string" && (b as any).ru.length > 0;

describe("reading corpus validity", () => {
  it("has unique ids", () => {
    const ids = readingUnits.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every unit is well-formed and bilingual", () => {
    for (const u of readingUnits) {
      expect(LEVELS).toContain(u.level);
      expect(STREAMS).toContain(u.stream);
      expect(bi(u.title) && bi(u.blurb) && bi(u.source)).toBe(true);
      expect(u.passages.length).toBeGreaterThanOrEqual(2);
      for (const p of u.passages) {
        expect(p.en.length).toBeGreaterThan(0);
        expect(p.ru.length).toBeGreaterThan(0);
      }
      expect(u.questions.length).toBeGreaterThanOrEqual(3);
      for (const q of u.questions) {
        expect(bi(q.q)).toBe(true);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.every(bi)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    }
  });

  it("targetWords are bounded and resolve to real vocab ids", () => {
    for (const u of readingUnits) {
      const tw = u.targetWords ?? [];
      expect(tw.length).toBeLessThanOrEqual(12);
      for (const id of tw) expect(vocabIds.has(id)).toBe(true);
    }
  });
});
