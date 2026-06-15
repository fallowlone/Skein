import { describe, it, expect } from "vitest";
import { applyPatch, type Patch } from "./apply-authoring";
import type { GrammarTopic } from "~/english/grammar-types";

function skeleton(): GrammarTopic {
  return {
    id: "present-simple",
    title: { en: "", ru: "Present Simple" },
    cefr: "A1", levels: ["A1"], family: "unclassified", egp: [], archetype: "",
    lessons: { A1: { cefr: "A1", explain: { en: "", ru: "RU объяснение" }, structure: { en: "", ru: "" },
      examples: [{ en: "I work.", ru: "Я работаю." }], tip: { en: "", ru: "RU совет" } } },
    related: [], crossTopic: [],
  };
}
const validIds = new Set(["present-simple", "present-continuous", "past-simple"]);

describe("applyPatch", () => {
  it("fills only-empty fields and keeps RU verbatim", () => {
    const patch: Patch = {
      id: "present-simple", title_en: "Present Simple", family: "tenses", archetype: "timeline",
      egp: ["EGP:1.1"], related: ["present-continuous", "nonexistent"], crossTopic: ["past-simple", "present-simple"],
      levels: { A1: { explain_en: "Habits and facts.", structure_en: "subj + verb(+s)", structure_ru: "подл + глагол(+s)",
        example_notes: { "0": { en: "habit", ru: "привычка" } },
        pitfalls: [{ wrong: "She work.", right: "She works.", why_en: "3rd-person -s.", why_ru: "-s в 3 лице." }] } },
    };
    const t = applyPatch(skeleton(), patch, validIds);
    expect(t.title.en).toBe("Present Simple");
    expect(t.title.ru).toBe("Present Simple");
    expect(t.family).toBe("tenses");
    expect(t.archetype).toBe("timeline");
    expect(t.egp).toEqual(["EGP:1.1"]);
    expect(t.related).toEqual(["present-continuous"]);
    expect(t.crossTopic).toEqual(["past-simple"]);
    expect(t.lessons.A1!.explain.en).toBe("Habits and facts.");
    expect(t.lessons.A1!.explain.ru).toBe("RU объяснение");
    expect(t.lessons.A1!.structure).toEqual({ en: "subj + verb(+s)", ru: "подл + глагол(+s)" });
    expect(t.lessons.A1!.examples[0].note).toEqual({ en: "habit", ru: "привычка" });
    expect(t.lessons.A1!.examples[0].en).toBe("I work.");
    expect(t.lessons.A1!.pitfalls).toEqual([{ wrong: "She work.", right: "She works.", why: { en: "3rd-person -s.", ru: "-s в 3 лице." } }]);
  });
  it("keeps family unclassified when patch family is unknown", () => {
    const t = applyPatch(skeleton(), { id: "present-simple", family: "made-up" } as Patch, validIds);
    expect(t.family).toBe("unclassified");
  });
  it("does not overwrite already-authored fields", () => {
    const s = skeleton(); s.title.en = "Already"; s.family = "tenses";
    const t = applyPatch(s, { id: "present-simple", title_en: "New", family: "modals" } as Patch, validIds);
    expect(t.title.en).toBe("Already");
    expect(t.family).toBe("tenses");
  });
});
