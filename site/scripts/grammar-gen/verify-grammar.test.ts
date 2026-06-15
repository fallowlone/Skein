import { describe, it, expect } from "vitest";
import { verifyGenSpec } from "./verify-grammar";
import type { TopicGenSpec } from "~/english/grammar-types";

const ok: TopicGenSpec = {
  features: [], pools: [{ id: "s", tags: { level: ["A1"] }, items: ["She","He"] }, { id: "v", tags: { level: ["A1"] }, items: ["work","go"] }],
  templates: [{ id: "t", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A1", pattern: "{subj} ___ here.", slots: { subj: { pool: "s" }, verb: { pool: "v" } }, deriveKey: "verb-agreement-present", rationale: { en: "x", ru: "x" } }],
};

describe("verifyGenSpec", () => {
  it("passes a coherent spec (every sample item has a non-empty derivable answer)", () => {
    expect(verifyGenSpec("present-simple", ok).problems).toEqual([]);
  });
  it("flags a template whose deriveKey strategy is unknown", () => {
    const bad: TopicGenSpec = { ...ok, templates: [{ ...ok.templates[0], deriveKey: "nonexistent" }] };
    const r = verifyGenSpec("x", bad);
    expect(r.problems.length).toBeGreaterThan(0);
    expect(r.problems[0]).toContain("nonexistent");
  });
});
