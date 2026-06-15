import { describe, it, expect } from "vitest";
import { BatchDedup } from "./dedup";
import { DERIVE, getStrategy } from "./derive";

describe("BatchDedup", () => {
  it("rejects exact and whitespace-variant duplicates", () => {
    const d = new BatchDedup();
    expect(d.accept("She works here.")).toBe(true);
    expect(d.accept("She works here.")).toBe(false);
    expect(d.accept("  She   works here. ")).toBe(false);
    expect(d.accept("He works here.")).toBe(true);
  });
});

describe("deriveKey registry", () => {
  it("verb-agreement-present derives 3sg from subject+verb", () => {
    const s = getStrategy("verb-agreement-present");
    expect(s({ slots: { subj: "She", verb: "work" }, raw: { subj: "She", verb: "work" }, level: "A1" }).primary).toBe("works");
    expect(s({ slots: { subj: "They", verb: "work" }, raw: { subj: "They", verb: "work" }, level: "A1" }).primary).toBe("work");
  });
  it("comparative-form derives the comparative of the adjective", () => {
    const s = getStrategy("comparative-form");
    const r = s({ slots: { adj: "big" }, raw: { adj: "big" }, level: "A2" });
    expect(r.primary).toBe("bigger");
  });
  it("passive-be-participle derives 'is/are + V3'", () => {
    const s = getStrategy("passive-be-participle");
    expect(s({ slots: { subj: "The bug", verb: "fix" }, raw: { subj: "The bug", verb: "fix", num: "sg" }, level: "B1" }).primary).toBe("is fixed");
  });
  it("getStrategy throws on an unknown key", () => {
    expect(() => getStrategy("nope")).toThrow();
  });
});
