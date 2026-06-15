import { describe, it, expect } from "vitest";
import { auditTopicGen, type GenAuditResult } from "./audit-grammar";
import type { TopicGenSpec } from "~/english/grammar-types";

const morphSpec: TopicGenSpec = {
  features: [], contexts: [],
  pools: [
    { id: "subj3", tags: { level: ["A1"] }, items: ["She", "He", "The teacher", "My brother", "Our manager", "The intern", "Our lead", "The client", "My sister", "The bot", "Her colleague", "The vendor"] },
    { id: "verbs", tags: { level: ["A1"] }, items: ["work", "play", "study", "teach", "go", "read", "fix", "run", "build", "ship"] },
  ],
  templates: [{
    id: "ps", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A2",
    pattern: "{subj} ___ ({verb}) every day.", slots: { subj: { pool: "subj3" }, verb: { pool: "verbs" } },
    deriveKey: "verb-agreement-present", rationale: { en: "3sg adds -s.", ru: "3 л. ед. ч. + -s." },
  }],
};

describe("auditTopicGen", () => {
  it("passes a morphology spec that yields >=100 unique with non-empty answers", () => {
    const r: GenAuditResult = auditTopicGen("present-simple", morphSpec);
    expect(r.unique).toBeGreaterThanOrEqual(100);
    expect(r.emptyAnswers).toBe(0);
    expect(r.ok).toBe(true);
  });

  it("flags a context spec below the >=100 native floor", () => {
    const thin: TopicGenSpec = {
      pools: [], features: [],
      contexts: Array.from({ length: 5 }, (_, i) => ({ stem: `S${i} ___ x.`, answer: "a", distractors: ["the"], cefr: "A1" as const })),
      templates: [{ id: "c", type: "fill_in_blank", cefrMin: "A1", cefrMax: "B2", pattern: "{context}", slots: {}, deriveKey: "context", usesContext: true, framings: ["cloze", "mc"], rationale: { en: "x", ru: "y" } }],
    };
    const r = auditTopicGen("articles", thin);
    expect(r.ok).toBe(false);
    expect(r.unique).toBeLessThan(100);
  });
});
