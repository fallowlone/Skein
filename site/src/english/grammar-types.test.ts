import { describe, it, expect } from "vitest";
import {
  CEFR_ORDER,
  validateGrammarTopic,
  authoringErrors,
  type GrammarTopic,
  type TopicGenSpec,
  type Template,
  type TaggedContext,
} from "./grammar-types";

function minimalSkeleton(): GrammarTopic {
  return {
    id: "present-simple",
    title: { en: "", ru: "Present Simple" },
    cefr: "A1",
    levels: ["A1"],
    family: "unclassified",
    egp: [],
    archetype: "",
    lessons: {
      A1: {
        cefr: "A1",
        explain: { en: "", ru: "Время для привычек." },
        structure: { en: "", ru: "" },
        examples: [{ en: "I work.", ru: "Я работаю." }],
        tip: { en: "", ru: "Добавляй -s для he/she/it." },
      },
    },
    related: [],
    crossTopic: [],
  };
}

describe("CEFR_ORDER", () => {
  it("orders bands zero→C2", () => {
    expect(CEFR_ORDER).toEqual(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]);
  });
});

describe("validateGrammarTopic (structural)", () => {
  it("accepts a valid skeleton", () => {
    expect(validateGrammarTopic(minimalSkeleton())).toEqual([]);
  });
  it("flags a missing id", () => {
    const t = { ...minimalSkeleton(), id: "" };
    expect(validateGrammarTopic(t)).toContain("id is empty");
  });
  it("flags an empty levels list", () => {
    const t = { ...minimalSkeleton(), levels: [] };
    expect(validateGrammarTopic(t)).toContain("levels is empty");
  });
  it("flags a lesson missing ru explanation", () => {
    const t = minimalSkeleton();
    t.lessons.A1!.explain = { en: "", ru: "" };
    expect(validateGrammarTopic(t).some((e) => e.includes("explain.ru"))).toBe(true);
  });
});

describe("authoringErrors (completeness, post-authoring)", () => {
  it("flags an unclassified family and empty en prose on a skeleton", () => {
    const errs = authoringErrors(minimalSkeleton());
    expect(errs).toContain("family is unclassified");
    expect(errs.some((e) => e.includes("title.en"))).toBe(true);
  });
  it("passes a fully authored topic", () => {
    const t = minimalSkeleton();
    t.title.en = "Present Simple";
    t.family = "tenses";
    t.archetype = "timeline";
    t.lessons.A1!.explain.en = "Use it for habits and facts.";
    t.lessons.A1!.structure = { en: "subject + verb(+s)", ru: "подлежащее + глагол(+s)" };
    expect(authoringErrors(t)).toEqual([]);
  });
});

describe("tagged-context schema", () => {
  it("a TopicGenSpec accepts a contexts array and a usesContext template", () => {
    const ctx: TaggedContext = {
      stem: "I bought ___ apple at the market.",
      answer: "an",
      distractors: ["a", "the", "—"],
      cefr: "A1",
    };
    const tpl: Template = {
      id: "art-ctx",
      type: "fill_in_blank",
      cefrMin: "A1",
      cefrMax: "A2",
      pattern: "{context}",
      slots: {},
      deriveKey: "context",
      usesContext: true,
      framings: ["cloze", "mc"],
      rationale: { en: "Choose the article that fits.", ru: "Выберите подходящий артикль." },
    };
    const spec: TopicGenSpec = { pools: [], templates: [tpl], features: [], contexts: [ctx] };
    expect(spec.contexts?.[0].answer).toBe("an");
    expect(spec.templates[0].framings).toEqual(["cloze", "mc"]);
  });
});
