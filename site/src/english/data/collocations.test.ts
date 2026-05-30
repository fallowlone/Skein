import { describe, it, expect } from "vitest";
import { collocationSets } from "./collocations";

describe("collocation sets", () => {
  it("has at least 8 sets", () => {
    expect(collocationSets.length).toBeGreaterThanOrEqual(8);
  });

  it("has at least 80 items total", () => {
    const total = collocationSets.reduce((n, s) => n + s.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(80);
  });

  it("set ids and item ids are unique", () => {
    const setIds = collocationSets.map((s) => s.id);
    expect(new Set(setIds).size).toBe(setIds.length);
    const itemIds = collocationSets.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
  });

  it("every set and item is well-formed", () => {
    for (const s of collocationSets) {
      expect(["general", "engineering"]).toContain(s.domain);
      expect(typeof s.title.en === "string" && s.title.en.length > 0).toBe(true);
      expect(typeof s.title.ru === "string" && s.title.ru.length > 0).toBe(true);
      for (const it of s.items) {
        expect(it.chunk.length).toBeGreaterThan(0);
        expect(it.ru.trim().length).toBeGreaterThan(0);
        expect(it.gap).toContain("___");
        expect(it.answer.trim().length).toBeGreaterThan(0);
        expect(it.example.length).toBeGreaterThan(0);
      }
    }
  });
});
