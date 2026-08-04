// site/src/scripts/assess/report.test.ts
import { describe, expect, test } from "vitest";
import { buildReport, toKnowledgeWrites } from "./report";
import { toRetestCards } from "./retest";
import { emptyCell } from "./update";
import { expectedLevel } from "./ordinal";
import { conceptVerdict } from "./verdict";
import { cellKey, type Cell, type CellKey } from "./types";

const measured = (conceptId: string, facet: "recognition" | "mechanism" | "production", posterior: readonly number[], outcome: "correct" | "wrong" | "dont_know" = "correct"): [CellKey, Cell] => [
  cellKey(conceptId, facet),
  {
    ...emptyCell(conceptId, facet, "surface"),
    posterior: posterior as never,
    items: 2,
    evidence: [{
      conceptId, facet, itemId: `${conceptId}#i`, lessonKey: `${conceptId}-lesson`, kind: "predict", band: "surface",
      response: { outcome, hintsUsed: 0, elapsedMs: 1 },
      answerDigest: "…", failureNote: outcome === "wrong" ? "off-by-one in the loop bound" : undefined, atMs: 1,
    }],
  },
];

describe("buildReport", () => {
  test("untested concepts are listed separately and never counted as gaps", () => {
    const cells = new Map([measured("promises", "mechanism", [0, 0, 0.9, 0.1])]);
    const r = buildReport(cells, { scopeConcepts: ["promises", "streams"], goalConcepts: [] });
    expect(r.rows.map((x) => x.conceptId)).toEqual(["promises"]);
    expect(r.untested).toEqual(["streams"]);
    expect(r.topGaps.some((g) => g.conceptId === "streams")).toBe(false);
  });

  test("top gaps are ranked by goal impact, not alphabetically", () => {
    const cells = new Map([
      measured("aaa-irrelevant", "mechanism", [0.9, 0.1, 0, 0], "wrong"),
      measured("zzz-on-goal", "mechanism", [0.9, 0.1, 0, 0], "wrong"),
    ]);
    const r = buildReport(cells, { scopeConcepts: ["aaa-irrelevant", "zzz-on-goal"], goalConcepts: ["zzz-on-goal"] });
    expect(r.topGaps[0].conceptId).toBe("zzz-on-goal");
  });

  test("a row carries its evidence and the grader's failure note", () => {
    const cells = new Map([measured("promises", "mechanism", [0.8, 0.2, 0, 0], "wrong")]);
    const r = buildReport(cells, { scopeConcepts: ["promises"], goalConcepts: [] });
    expect(r.rows[0].evidence[0].failureNote).toBe("off-by-one in the loop bound");
  });

  // Ruling 2: GAP_LEVEL / STRONG_LEVEL are integer level-index cutoffs (LEVELS.indexOf), not
  // expectedLevel means. A "middle" concept (index 2) sits strictly between <=1 and >=3, so it
  // must land in neither bucket — this pins the exact cutoff behaviour the brief's numeric
  // thresholds (1.0 / 2.2) produced, now under names that say what they are.
  test("thresholds are level-index cutoffs: a middle-band concept is neither a gap nor a hidden strength", () => {
    const cells = new Map([measured("streams", "mechanism", [0, 0.1, 0.8, 0.1])]); // mode "middle"
    const r = buildReport(cells, { scopeConcepts: ["streams"], goalConcepts: [] });
    expect(r.rows[0].verdict.band?.level).toBe("middle");
    expect(r.topGaps.some((g) => g.conceptId === "streams")).toBe(false);
    expect(r.hiddenStrengths.some((g) => g.conceptId === "streams")).toBe(false);
  });
});

describe("toKnowledgeWrites", () => {
  test("writes a confidence for measured concepts only", () => {
    const cells = new Map([
      measured("promises", "mechanism", [0, 0, 0.9, 0.1]),
      [cellKey("streams", "mechanism"), emptyCell("streams", "mechanism", "surface")],
    ]);
    const writes = toKnowledgeWrites(cells, 1000);
    expect(writes.map((w) => w.conceptId)).toEqual(["promises"]);
    expect(writes[0].source).toBe("assess");
    expect(writes[0].confidence).toBeGreaterThan(0.5);
  });

  test("a gap writes a low confidence rather than nothing — it is a measurement too", () => {
    const cells = new Map([measured("promises", "mechanism", [0.9, 0.1, 0, 0], "wrong")]);
    expect(toKnowledgeWrites(cells, 1)[0].confidence).toBeLessThan(0.3);
  });

  // Ruling 1: an earlier defect on this branch let the reported band and the persisted
  // confidence come from two different statistics. Here the min-by-LEVELS.indexOf facet
  // ("recognition", mode "junior") and the min-by-expectedLevel facet ("mechanism", a lower
  // continuous mean despite a higher mode) are deliberately DIFFERENT facets, so a write that
  // re-derives its own minimum independently of conceptVerdict would pick "mechanism" and this
  // test would fail. It must track whichever facet conceptVerdict actually chose to govern the
  // band ("recognition").
  test("writes track the SAME governing facet conceptVerdict used for the band, not an independent min-by-expectedLevel", () => {
    const RECOGNITION = [0.05, 0.85, 0.05, 0.05] as const; // mode "junior" (idx 1) — governs, per LEVELS.indexOf
    const MECHANISM = [0.49, 0, 0.5, 0.01] as const;        // mode "middle" (idx 2), but a LOWER expectedLevel

    const cells = new Map([
      measured("promises", "recognition", RECOGNITION),
      measured("promises", "mechanism", MECHANISM),
    ]);

    const verdict = conceptVerdict(cells, "promises");
    expect(verdict.band?.level).toBe("junior"); // sanity: recognition is the governing facet

    const correctStat = expectedLevel(RECOGNITION) / 3;
    const wrongStat = expectedLevel(MECHANISM) / 3; // what the old independent-min code would write
    expect(correctStat).not.toBeCloseTo(wrongStat, 2); // the two statistics must actually differ here

    const writes = toKnowledgeWrites(cells, 1);
    expect(writes[0].confidence).toBeCloseTo(correctStat, 5);
    expect(writes[0].confidence).not.toBeCloseTo(wrongStat, 2);
  });
});

describe("toRetestCards", () => {
  test("a confirmed gap becomes a card carrying the verbatim prompt", () => {
    const cells = new Map([measured("promises", "mechanism", [0.9, 0.1, 0, 0], "wrong")]);
    const cards = toRetestCards(cells, "ru", 1000, (id) => `Объясни: ${id}`);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Объясни: promises");
    expect(cards[0].source).toBe("assess");
  });

  test("a confidently known concept produces no card", () => {
    const cells = new Map([measured("promises", "mechanism", [0, 0, 0.1, 0.9])]);
    expect(toRetestCards(cells, "en", 1, (id) => id)).toEqual([]);
  });

  // Ruling 3: bilingual or it does not ship. The fallback text (no failureNote on the
  // evidence — here outcome is "dont_know", which never sets one) must be a real EN/RU label
  // pair, not the raw internal Level identifier ("gap") leaking to a Russian learner.
  test("the fallback back-text is a real bilingual label, not the raw English level id", () => {
    const cells = new Map([measured("promises", "mechanism", [0.9, 0.1, 0, 0], "dont_know")]);
    const en = toRetestCards(cells, "en", 1, (id) => id);
    const ru = toRetestCards(cells, "ru", 1, (id) => id);
    expect(en).toHaveLength(1);
    expect(ru).toHaveLength(1);
    expect(en[0].back).not.toBe("gap");
    expect(ru[0].back).not.toBe("gap");
    expect(ru[0].back).not.toBe(en[0].back); // genuinely translated, not the same string reused
    expect(/[а-яё]/i.test(ru[0].back)).toBe(true); // real Cyrillic, not transliteration
  });

  // Ruling 4: cardKey must NOT embed atMs, or every re-run of the assessment mints a brand
  // new card for the same concept+facet gap instead of updating the existing one through
  // review-state.ts's addCard() (idempotent on cardKey: an existing card keeps its SRS
  // schedule and only its content refreshes). Embedding atMs would silently reset that
  // schedule on every re-assessment.
  test("cardKey is stable across re-assessment — a repeat session updates, not duplicates, the card", () => {
    const cells = new Map([measured("promises", "mechanism", [0.9, 0.1, 0, 0], "wrong")]);
    const first = toRetestCards(cells, "en", 1000, (id) => id)[0];
    const second = toRetestCards(cells, "en", 5000, (id) => id)[0];
    expect(first.cardKey).toBe(second.cardKey);
  });
});
