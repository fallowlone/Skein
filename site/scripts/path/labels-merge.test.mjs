import { describe, it, expect } from "vitest";
import { mergeLabels } from "./labels-merge.mjs";

const CONCEPTS = [
  { id: "a", label: { en: "A", ru: "A" }, track: "x", band: "middle", requires: [] },
  { id: "b", label: { en: "B", ru: "Б" }, track: "x", band: "middle", requires: [] },
];

describe("mergeLabels", () => {
  it("sets ru from the map, leaving en untouched", () => {
    const { concepts, applied } = mergeLabels(CONCEPTS, { a: "Эй" });
    const a = concepts.find((c) => c.id === "a");
    expect(a.label.ru).toBe("Эй");
    expect(a.label.en).toBe("A");
    expect(applied).toBe(1);
  });
  it("warns and skips an unknown id (concepts unchanged for it)", () => {
    const { concepts, skipped, warnings } = mergeLabels(CONCEPTS, { ghost: "Призрак" });
    expect(skipped).toBe(1);
    expect(warnings.some((w) => w.includes("ghost"))).toBe(true);
    expect(concepts.find((c) => c.id === "a").label.ru).toBe("A");
  });
  it("skips empty / whitespace ru (leaves label unchanged)", () => {
    const { concepts, applied } = mergeLabels(CONCEPTS, { a: "   ", b: "" });
    expect(applied).toBe(0);
    expect(concepts.find((c) => c.id === "a").label.ru).toBe("A");
  });
  it("trims the ru value", () => {
    const { concepts } = mergeLabels(CONCEPTS, { a: "  Эй  " });
    expect(concepts.find((c) => c.id === "a").label.ru).toBe("Эй");
  });
  it("does not mutate the input array/objects", () => {
    const input = [{ id: "a", label: { en: "A", ru: "A" }, track: "x", band: "middle", requires: [] }];
    mergeLabels(input, { a: "Эй" });
    expect(input[0].label.ru).toBe("A");
  });
});
