import { describe, it, expect } from "vitest";
import { grammarTopics, grammarById } from "./index";
import { FAMILIES } from "./families";
import { validateGrammarTopic } from "~/english/grammar-types";

describe("grammar corpus", () => {
  it("loads at least 122 topics", () => {
    expect(grammarTopics.length).toBeGreaterThanOrEqual(122);
  });
  it("has unique ids and a matching byId map", () => {
    const ids = grammarTopics.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(grammarById.get("present-simple")?.id).toBe("present-simple");
  });
  it("every topic is structurally valid", () => {
    const broken = grammarTopics
      .map((t) => ({ id: t.id, errs: validateGrammarTopic(t) }))
      .filter((r) => r.errs.length > 0);
    expect(broken).toEqual([]);
  });
  it("every topic family is a known family (incl. the import sentinel)", () => {
    const known = new Set<string>([...FAMILIES.map((f) => f.id), "unclassified"]);
    const bad = grammarTopics.filter((t) => !known.has(t.family));
    expect(bad.map((t) => t.id)).toEqual([]);
  });
});
