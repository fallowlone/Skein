import { describe, it, expect } from "vitest";
import { EGP_CATEGORIES, isEgpCategory, makeEgpId, type EgpEntry } from "./types";

describe("EGP categories", () => {
  it("exposes a stable, non-empty category list", () => {
    expect(EGP_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(EGP_CATEGORIES).size).toBe(EGP_CATEGORIES.length);
  });
  it("narrows known/unknown categories", () => {
    expect(isEgpCategory("tenses-aspect")).toBe(true);
    expect(isEgpCategory("made-up")).toBe(false);
  });
});

describe("makeEgpId", () => {
  it("builds a stable namespaced id", () => {
    expect(makeEgpId("A1", "tenses-aspect", "present-simple-states"))
      .toBe("egp.a1.tenses-aspect.present-simple-states");
  });
  it("kebab-collapses the slug", () => {
    expect(makeEgpId("B2", "clauses", "Reduced Relative Clauses"))
      .toBe("egp.b2.clauses.reduced-relative-clauses");
  });
});

it("EgpEntry shape compiles", () => {
  const e: EgpEntry = {
    id: makeEgpId("A1", "verbs", "be-present"),
    cefr: "A1",
    category: "verbs",
    can_do: { en: "Can use 'be' in the present.", ru: "Умеет использовать 'be' в настоящем." },
  };
  expect(e.cefr).toBe("A1");
});
