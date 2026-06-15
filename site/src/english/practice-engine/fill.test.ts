import { describe, it, expect } from "vitest";
import { fillTemplate } from "./fill";
import type { Pool, Template } from "~/english/grammar-types";

const pools: Pool[] = [
  { id: "subj3", tags: { level: ["A1"] }, items: ["She", "He"] },
  { id: "verbs", tags: { level: ["A1"] }, items: ["work", "play"] },
];
const tpl: Template = {
  id: "ps-fill",
  type: "fill_in_blank",
  cefrMin: "A1", cefrMax: "A1",
  pattern: "{subj} ___ here every day.",
  slots: { subj: { pool: "subj3" }, verb: { pool: "verbs" } },
  deriveKey: "verb-agreement-present",
  rationale: { en: "{subj} is third person singular, so the verb takes -s.", ru: "{subj} — 3-е лицо ед. ч., глагол с -s." },
};

describe("fillTemplate", () => {
  it("fills slots, computes the blank, interpolates rationale — all seed-stable", () => {
    const a = fillTemplate(tpl, pools, "A1", 123);
    const b = fillTemplate(tpl, pools, "A1", 123);
    expect(a).toEqual(b);
    expect(a.prompt).toContain("___");
    expect(["She", "He"]).toContain(a.prompt.split(" ")[0]);
    expect(["works", "plays"]).toContain(a.answer);
    expect(a.rationale.en).not.toContain("{subj}");
    expect(a.type).toBe("fill_in_blank");
  });
  it("different seeds can produce different surfaces", () => {
    const surfaces = new Set<string>();
    for (let s = 0; s < 20; s++) surfaces.add(fillTemplate(tpl, pools, "A1", s).prompt);
    expect(surfaces.size).toBeGreaterThan(1);
  });
});
