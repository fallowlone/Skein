import { describe, it, expect } from "vitest";
import { grammarPoints } from "./grammar";

const bi = (b: unknown) =>
  !!b && typeof b === "object" && typeof (b as any).en === "string" && (b as any).en.length > 0
  && typeof (b as any).ru === "string" && (b as any).ru.length > 0;

describe("grammar dataset", () => {
  it("has at least 18 points", () => {
    expect(grammarPoints.length).toBeGreaterThanOrEqual(18);
  });

  it("ids are unique", () => {
    const ids = grammarPoints.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every point is well-formed and bilingual", () => {
    for (const p of grammarPoints) {
      expect(["B1", "B2"]).toContain(p.band);
      expect(bi(p.title) && bi(p.structure) && bi(p.explain)).toBe(true);
      expect(p.examples.length).toBeGreaterThanOrEqual(2);
      for (const ex of p.examples) {
        expect(ex.en.length).toBeGreaterThan(0);
        expect(ex.ru.length).toBeGreaterThan(0);
      }
      expect(p.cloze.length).toBeGreaterThanOrEqual(2);
      for (const c of p.cloze) {
        expect(c.before.length).toBeGreaterThan(0);
        expect(c.answer.trim().length).toBeGreaterThan(0);
        expect(bi(c.hint)).toBe(true);
      }
    }
  });

  it("covers both B1 and B2", () => {
    expect(grammarPoints.some((p) => p.band === "B1")).toBe(true);
    expect(grammarPoints.some((p) => p.band === "B2")).toBe(true);
  });
});
