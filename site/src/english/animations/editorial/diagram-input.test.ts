// site/src/english/animations/editorial/diagram-input.test.ts
import { describe, it, expect } from "vitest";
import { toDiagramInput } from "./diagram-input";
import type { GrammarTopic } from "~/english/grammar-types";

const base = {
  id: "present-perfect-simple", title: { en: "Present Perfect Simple", ru: "Present Perfect Simple" },
  cefr: "A2", levels: ["A2"], family: "tenses", egp: [], archetype: "timeline",
  archetypeParams: { labels: ["past", "now", "future"] },
  lessons: { A2: { cefr: "A2", explain: { en: "x", ru: "x" }, structure: { en: "subject + have/has + past participle", ru: "..." },
    examples: [{ en: "I have visited Paris twice.", ru: "Я был в Париже.", note: { en: "experience", ru: "опыт" } }], tip: { en: "t", ru: "t" } } },
  related: [], crossTopic: [],
} as unknown as GrammarTopic;

describe("toDiagramInput", () => {
  it("pulls genre, formula, caption, labels", () => {
    const d = toDiagramInput(base, "en");
    expect(d.genre).toBe("Present Perfect Simple");
    expect(d.formula).toBe("subject + have/has + past participle");
    expect(d.caption).toBe("experience");
    expect(d.labels).toEqual(["past", "now", "future"]);
  });
  it("hero skips stopwords", () => {
    expect(toDiagramInput(base, "en").hero?.toLowerCase()).toBe("visited");
  });
  it("never throws on an empty topic", () => {
    const empty = { id: "x", title: { en: "X" }, cefr: "A1", levels: [], family: "unclassified", archetype: "timeline", lessons: {}, related: [], crossTopic: [], egp: [] } as unknown as GrammarTopic;
    expect(() => toDiagramInput(empty, "en")).not.toThrow();
  });
  it("maps archetypeParams.focus (number) to d.focus", () => {
    const withFocus = { ...base, archetypeParams: { labels: ["a", "b", "c"], focus: 2 } } as unknown as GrammarTopic;
    expect(toDiagramInput(withFocus, "en").focus).toBe(2);
  });
  it("maps archetypeParams.focus (string '1') to d.focus", () => {
    const withFocusStr = { ...base, archetypeParams: { labels: ["a", "b", "c"], focus: "1" } } as unknown as GrammarTopic;
    expect(toDiagramInput(withFocusStr, "en").focus).toBe(1);
  });
  it("leaves focus undefined when archetypeParams has no focus", () => {
    const noFocus = { ...base, archetypeParams: { labels: ["a", "b"] } } as unknown as GrammarTopic;
    expect(toDiagramInput(noFocus, "en").focus).toBeUndefined();
  });
});
