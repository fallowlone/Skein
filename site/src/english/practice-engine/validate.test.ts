import { describe, it, expect } from "vitest";
import { validateExercise } from "./validate";
import type { GeneratedExercise } from "./types";

const good: GeneratedExercise = {
  id: "x", topicId: "present-simple", cefr: "A1", type: "fill_in_blank",
  prompt: "She ___ here.", answer: "works", alts: [], rationale: { en: "3sg", ru: "3л" },
};

describe("validateExercise", () => {
  it("accepts an item whose answer re-derives from its slots+deriveKey", () => {
    const r = validateExercise(good, { deriveKey: "verb-agreement-present", slots: { subj: "She", verb: "work" } });
    expect(r.ok).toBe(true);
  });
  it("rejects an item whose claimed answer is wrong", () => {
    const r = validateExercise({ ...good, answer: "work" }, { deriveKey: "verb-agreement-present", slots: { subj: "She", verb: "work" } });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("answer");
  });
  it("rejects a duplicate against a seen set", () => {
    const seen = new Set(["she ___ here."]);
    const r = validateExercise(good, { deriveKey: "verb-agreement-present", slots: { subj: "She", verb: "work" }, seen });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("duplicate");
  });
});
