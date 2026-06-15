import { describe, it, expect } from "vitest";
import { validateExercise, validateProposed } from "./validate";
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
  it("accepts a tagged-context item (deriveKey 'context') by construction", () => {
    const ctxItem: GeneratedExercise = { ...good, prompt: "I saw ___ owl.", answer: "an" };
    const r = validateExercise(ctxItem, { deriveKey: "context", slots: {} });
    expect(r.ok).toBe(true);
  });
});

describe("validateProposed (BYOK structural gate)", () => {
  it("accepts a well-formed fill item with a blank and an answer", () => {
    const r = validateProposed({ type: "fill_in_blank", prompt: "She ___ home.", answer: "goes", rationale: { en: "x", ru: "x" } });
    expect(r.ok).toBe(true);
  });
  it("rejects a fill item with no blank", () => {
    expect(validateProposed({ type: "fill_in_blank", prompt: "She goes home.", answer: "goes", rationale: { en: "x", ru: "x" } }).ok).toBe(false);
  });
  it("rejects an MC item whose options exclude the answer", () => {
    expect(validateProposed({ type: "multiple_choice", prompt: "She ___ home.", answer: "goes", options: ["go", "gone"], rationale: { en: "x", ru: "x" } }).ok).toBe(false);
  });
  it("rejects an empty answer", () => {
    expect(validateProposed({ type: "fill_in_blank", prompt: "She ___ home.", answer: "  ", rationale: { en: "x", ru: "x" } }).ok).toBe(false);
  });
});
