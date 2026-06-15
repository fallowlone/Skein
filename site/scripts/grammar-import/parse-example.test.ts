import { describe, it, expect } from "vitest";
import { parseExample } from "./parse-example";

describe("parseExample", () => {
  it("splits a simple EN (RU) example", () => {
    expect(parseExample("I live in Moscow. (Я живу в Москве.)")).toEqual({
      en: "I live in Moscow.",
      ru: "Я живу в Москве.",
    });
  });
  it("uses the LAST Cyrillic parenthetical when EN has its own parens", () => {
    expect(parseExample("Use 'the' (definite article). (Используй 'the'.)")).toEqual({
      en: "Use 'the' (definite article).",
      ru: "Используй 'the'.",
    });
  });
  it("falls back to en-only when no Cyrillic parenthetical exists", () => {
    expect(parseExample("He works.")).toEqual({ en: "He works.", ru: "" });
  });
});
