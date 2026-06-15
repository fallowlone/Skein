import { describe, it, expect } from "vitest";
import { generateFromSpec, generateSetFromSpec } from "./generate";
import type { TopicGenSpec } from "~/english/grammar-types";

// Patterns include {subj} AND {verb} so each (subj,verb) combo produces a unique prompt.
// subj3 (4) × verbs (8) + subjPl (3) × verbs (8) = 56 unique prompts — enough for count=30 and count=100 (>56? no, 56 < 100).
// For count=100 we need 4×8 + 3×8 = 56 prompts, but test asserts >=100... so we need bigger pools.
// We enlarge verbs to 14 items: 4×14 + 3×14 = 56+42 = 98... still < 100.
// Use 4 subj3 + 4 subjPl + 14 verbs = (4+4)×14 = 112 > 100.
const spec: TopicGenSpec = {
  features: ["present-agreement"],
  pools: [
    { id: "subj3", tags: { level: ["A1"] }, items: ["She", "He", "The teacher", "My friend"] },
    { id: "subjPl", tags: { level: ["A1"] }, items: ["They", "We", "The students", "My parents"] },
    { id: "verbs", tags: { level: ["A1"] }, items: ["work", "play", "study", "live", "teach", "watch", "go", "read", "run", "fix", "build", "ship", "review", "deploy"] },
  ],
  templates: [
    { id: "ps-3sg", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A1",
      pattern: "{subj} ___ here (hint: {verb}).", slots: { subj: { pool: "subj3" }, verb: { pool: "verbs" } },
      deriveKey: "verb-agreement-present", rationale: { en: "3sg → -s.", ru: "3 л. ед. → -s." } },
    { id: "ps-pl", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A1",
      pattern: "{subj} ___ here (hint: {verb}).", slots: { subj: { pool: "subjPl" }, verb: { pool: "verbs" } },
      deriveKey: "verb-agreement-present", rationale: { en: "plural → base.", ru: "мн. → база." } },
  ],
};

describe("generateFromSpec", () => {
  it("produces the requested count of unique, seed-stable items", () => {
    const a = generateFromSpec("present-simple", spec, { level: "A1", count: 30, seed: 1 });
    const b = generateFromSpec("present-simple", spec, { level: "A1", count: 30, seed: 1 });
    expect(a).toEqual(b);
    expect(a.length).toBe(30);
    expect(new Set(a.map((e) => e.prompt)).size).toBe(30);
    expect(a.every((e) => e.topicId === "present-simple")).toBe(true);
    expect(a.every((e) => e.answer.length > 0)).toBe(true);
  });
  it("reaches >=100 unique across enough seeds", () => {
    const items = generateFromSpec("present-simple", spec, { level: "A1", count: 100, seed: 7 });
    expect(items.length).toBeGreaterThanOrEqual(100);
    expect(new Set(items.map((e) => e.prompt)).size).toBe(items.length);
  });
});

const selSpec: TopicGenSpec = {
  pools: [], features: [],
  contexts: Array.from({ length: 30 }, (_, i) => ({
    stem: `Context number ${i} needs ___ here.`,
    answer: i % 2 === 0 ? "an" : "a",
    distractors: ["the", "—"],
    cefr: "A1" as const,
  })),
  templates: [{
    id: "sel", type: "fill_in_blank", cefrMin: "A1", cefrMax: "B2",
    pattern: "{context}", slots: {}, deriveKey: "context",
    usesContext: true, framings: ["cloze", "mc"],
    rationale: { en: "Pick {answer}.", ru: "Выберите {answer}." },
  }],
};

describe("context generation", () => {
  it("30 stems x 2 framings yields >=60 unique items", () => {
    const out = generateFromSpec("articles", selSpec, { count: 100, seed: 1 });
    expect(out.length).toBeGreaterThanOrEqual(60);
    const keys = new Set(out.map((e) => `${e.type}|${e.prompt}`));
    expect(keys.size).toBe(out.length); // all unique
  });
});

describe("generateSetFromSpec", () => {
  it("reaches the requested count using composites when native is short", () => {
    const composites = Array.from({ length: 50 }, (_, i) => ({
      id: `comp:${i}`, topicId: "articles", cefr: "A2" as const,
      type: "fill_in_blank" as const, prompt: `Composite ${i}: ___ thing.`,
      answer: "the", alts: [], rationale: { en: "x", ru: "x" },
    }));
    const out = generateSetFromSpec("articles", selSpec, { count: 100, seed: 1 }, () => composites);
    expect(out.length).toBeGreaterThanOrEqual(100);
  });
});
