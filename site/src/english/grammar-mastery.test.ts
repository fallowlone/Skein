import { describe, it, expect } from "vitest";
import { migrateGrammarMastery, gradeGrammar, isTopicDue, type GrammarMastery } from "./grammar-mastery";

describe("migrateGrammarMastery", () => {
  it("turns a legacy grammarDone:true into a seeded mature card", () => {
    const m = migrateGrammarMastery({ "present-simple": true } as Record<string, true>, {});
    expect(m["present-simple"]).toBeTruthy();
    expect(isTopicDue(m["present-simple"], new Date("2020-01-01"))).toBe(false); // matured, not immediately due
  });
  it("ignores malformed legacy entries", () => {
    const m = migrateGrammarMastery({ "x": 1 as unknown as true, "ok": true }, {});
    expect(m["x"]).toBeFalsy();
    expect(m["ok"]).toBeTruthy();
  });
  it("preserves existing cards over legacy seeds", () => {
    const existing = migrateGrammarMastery({ "a": true }, {});
    const merged = migrateGrammarMastery({ "a": true }, existing);
    expect(merged["a"]).toEqual(existing["a"]);
  });
});

describe("gradeGrammar", () => {
  it("a fresh 'good' creates an advancing card; 'again' stays due soon", () => {
    const good = gradeGrammar({}, "present-simple", "good", new Date("2024-01-01"));
    expect(good["present-simple"]).toBeTruthy();
    const again = gradeGrammar({}, "present-simple", "again", new Date("2024-01-01"));
    expect(isTopicDue(again["present-simple"], new Date("2024-01-02"))).toBe(true);
  });
});
