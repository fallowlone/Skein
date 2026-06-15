import { describe, it, expect } from "vitest";
import { compositeFromSpecs } from "./cross-topic";
import type { TopicGenSpec } from "~/english/grammar-types";

const primary: TopicGenSpec = {
  features: ["present-perfect"],
  pools: [
    { id: "subj", tags: { level: ["B1"] }, items: ["The bug", "The feature", "The test"] },
    { id: "verbs", tags: { level: ["B1"] }, items: ["fix", "deploy", "merge"] },
  ],
  templates: [
    { id: "pp", type: "fill_in_blank", cefrMin: "B1", cefrMax: "B1",
      pattern: "{subj} has ___ already.", slots: { subj: { pool: "subj" }, verb: { pool: "verbs", feature: "passive" } },
      deriveKey: "present-participle-form", rationale: { en: "passive perfect", ru: "пассивный перфект" } },
  ],
};
const secondary: TopicGenSpec = { features: ["passive"], pools: [], templates: [] };

describe("compositeFromSpecs", () => {
  it("only composes when the secondary feature is exercised by a primary slot", () => {
    const items = compositeFromSpecs("present-perfect", primary, "passive", secondary, { count: 5, seed: 2 });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((e) => e.topicId === "present-perfect+passive")).toBe(true);
  });
  it("returns [] when no shared feature", () => {
    const noShare: TopicGenSpec = { features: ["articles"], pools: [], templates: [] };
    expect(compositeFromSpecs("present-perfect", primary, "articles", noShare, { count: 5, seed: 2 })).toEqual([]);
  });
});
