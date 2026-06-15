import { describe, it, expect } from "vitest";
import { kebab, mapSteepTopic, type SteepTopic } from "./map";
import { validateGrammarTopic } from "~/english/grammar-types";

const fixture: SteepTopic = {
  topicId: "present_simple",
  levels: {
    B1: {
      content: "**Present Simple** — время для привычек.",
      examples: ["She likes cats. (Она любит кошек.)"],
      tip: "Добавляй -s для he/she/it.",
    },
    A1: {
      content: "Простое время.",
      examples: ["I work. (Я работаю.)"],
      tip: "Не забывай -s.",
    },
  },
};

describe("kebab", () => {
  it("converts snake_case to kebab-case", () => {
    expect(kebab("article_with_proper_nouns")).toBe("article-with-proper-nouns");
  });
});

describe("mapSteepTopic", () => {
  const t = mapSteepTopic(fixture);

  it("produces a structurally valid skeleton", () => {
    expect(validateGrammarTopic(t)).toEqual([]);
  });
  it("kebabs the id and sorts levels low→high", () => {
    expect(t.id).toBe("present-simple");
    expect(t.levels).toEqual(["A1", "B1"]);
    expect(t.cefr).toBe("A1");
  });
  it("copies RU prose verbatim and parses examples", () => {
    expect(t.lessons.A1!.explain.ru).toBe("Простое время.");
    expect(t.lessons.B1!.tip.ru).toBe("Добавляй -s для he/she/it.");
    expect(t.lessons.B1!.examples[0]).toEqual({ en: "She likes cats.", ru: "Она любит кошек." });
  });
  it("leaves EN prose and taxonomy empty for the authoring pass", () => {
    expect(t.lessons.A1!.explain.en).toBe("");
    expect(t.family).toBe("unclassified");
    expect(t.archetype).toBe("");
  });
});
