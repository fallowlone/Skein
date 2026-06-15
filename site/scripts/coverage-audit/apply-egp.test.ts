import { describe, it, expect } from "vitest";
import { applyEgp } from "./apply-egp";
import type { GrammarTopic } from "~/english/grammar-types";

function topic(egp: string[]): GrammarTopic {
  return { id: "present-simple", title: { en: "Present Simple", ru: "x" }, cefr: "A1",
    levels: ["A1"], family: "tenses", egp, archetype: "timeline", lessons: {}, related: [], crossTopic: [] };
}
const valid = new Set(["egp.a1.tenses-aspect.present-simple", "egp.a1.verbs.be"]);

describe("applyEgp", () => {
  it("replaces the placeholder with validated ids", () => {
    const t = applyEgp(topic(["EGP:best-effort"]), ["egp.a1.tenses-aspect.present-simple", "egp.x.bogus"], valid);
    expect(t.egp).toEqual(["egp.a1.tenses-aspect.present-simple"]);
  });
  it("treats an empty egp as a placeholder", () => {
    const t = applyEgp(topic([]), ["egp.a1.verbs.be"], valid);
    expect(t.egp).toEqual(["egp.a1.verbs.be"]);
  });
  it("does not overwrite already real-tagged topics", () => {
    const t = applyEgp(topic(["egp.a1.verbs.be"]), ["egp.a1.tenses-aspect.present-simple"], valid);
    expect(t.egp).toEqual(["egp.a1.verbs.be"]);
  });
  it("drops a patch that yields zero valid ids (keeps placeholder for the gate to flag)", () => {
    const t = applyEgp(topic(["EGP:best-effort"]), ["egp.x.bogus"], valid);
    expect(t.egp).toEqual(["EGP:best-effort"]);
  });
});
