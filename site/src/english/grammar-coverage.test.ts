import { describe, it, expect } from "vitest";
import { computeGrammarCoverage, type Waiver } from "./grammar-coverage";
import type { EgpEntry } from "./data/egp/types";
import type { GrammarTopic } from "./grammar-types";

const inv: EgpEntry[] = [
  { id: "egp.a1.verbs.be", cefr: "A1", category: "verbs", can_do: { en: "", ru: "" } },
  { id: "egp.a1.tenses-aspect.present-simple", cefr: "A1", category: "tenses-aspect", can_do: { en: "", ru: "" } },
  { id: "egp.b2.clauses.relative", cefr: "B2", category: "clauses", can_do: { en: "", ru: "" } },
];

function topic(id: string, egp: string[]): GrammarTopic {
  return { id, title: { en: id, ru: id }, cefr: "A1", levels: ["A1"], family: "tenses",
    egp, archetype: "x", lessons: {}, related: [], crossTopic: [] };
}

describe("computeGrammarCoverage", () => {
  it("marks covered, missing, and waived per band", () => {
    const topics = [topic("t1", ["egp.a1.verbs.be", "egp.a1.tenses-aspect.present-simple"])];
    const waivers: Waiver[] = [{ id: "egp.b2.clauses.relative", rationale: { en: "later", ru: "позже" } }];
    const cov = computeGrammarCoverage(topics, inv, waivers);
    const a1 = cov.bands.find((b) => b.cefr === "A1")!;
    expect(a1.covered).toBe(2);
    expect(a1.missing).toEqual([]);
    expect(a1.pct).toBe(100);
    const b2 = cov.bands.find((b) => b.cefr === "B2")!;
    expect(b2.covered).toBe(0);
    expect(b2.waived).toBe(1);
    expect(b2.missing).toEqual([]);
    expect(cov.missingTotal).toBe(0);
    expect(cov.overallPct).toBe(100);
  });
  it("reports a true gap when neither tagged nor waived", () => {
    const cov = computeGrammarCoverage([topic("t1", ["egp.a1.verbs.be"])], inv, []);
    expect(cov.missingTotal).toBe(2);
    expect(cov.bands.find((b) => b.cefr === "B2")!.missing).toEqual(["egp.b2.clauses.relative"]);
  });
});
