import { describe, it, expect } from "vitest";
import { resolveNextLesson, resolvePriorLesson } from "./next-lesson";

const units = [
  { slug: "01-a", order: 1, lessons: ["01-x", "02-y"] },
  { slug: "02-b", order: 2, lessons: ["01-p", "02-q", "03-r"] },
  { slug: "03-c", order: 3, lessons: ["01-z"] },
];

describe("resolveNextLesson", () => {
  it("returns the next lesson in the same unit", () => {
    expect(resolveNextLesson(units, "01-a", "01-x")).toEqual({ unit: "01-a", slug: "02-y" });
  });

  it("falls back to the first lesson of the next unit", () => {
    expect(resolveNextLesson(units, "01-a", "02-y")).toEqual({ unit: "02-b", slug: "01-p" });
  });

  it("returns null when the lesson is the last in the last unit", () => {
    expect(resolveNextLesson(units, "03-c", "01-z")).toBeNull();
  });

  it("returns null when the unit is unknown", () => {
    expect(resolveNextLesson(units, "99-unknown", "01-x")).toBeNull();
  });

  it("returns null when the lesson is not in the named unit", () => {
    expect(resolveNextLesson(units, "01-a", "03-r")).toBeNull();
  });
});

describe("resolvePriorLesson", () => {
  it("returns the previous lesson in the same unit", () => {
    expect(resolvePriorLesson(units, "01-a", "02-y")).toEqual({ unit: "01-a", slug: "01-x" });
  });

  it("falls back to the last lesson of the previous unit", () => {
    expect(resolvePriorLesson(units, "02-b", "01-p")).toEqual({ unit: "01-a", slug: "02-y" });
  });

  it("returns null when the lesson is the first in the first unit", () => {
    expect(resolvePriorLesson(units, "01-a", "01-x")).toBeNull();
  });

  it("returns null when the unit is unknown", () => {
    expect(resolvePriorLesson(units, "99-unknown", "01-x")).toBeNull();
  });

  it("returns null when the lesson is not in the named unit", () => {
    expect(resolvePriorLesson(units, "01-a", "03-r")).toBeNull();
  });
});
