import { describe, it, expect } from "vitest";
import {
  computeDomainScore,
  domainConfidenceOf,
  rankGaps,
  recommendNextUnit,
  WEIGHTS,
  RECENCY,
  SENIOR_WEIGHT,
  type DomainInputs,
  type DomainScore,
} from "./competency";
import type { Track } from "~/types";
import type { Band } from "~/components/atlas/track-band";

const DAY = 86_400_000;
const NOW = Date.parse("2026-06-05T00:00:00Z");

function inputs(over: Partial<DomainInputs> = {}): DomainInputs {
  return {
    track: "networking" as Track,
    priorWeights: [],
    globalRating: 600,
    readyLessonsTotal: 0,
    readyLessonsOpened: 0,
    practice: { objDone: 0, subjEngaged: 0, totalTasks: 0 },
    lastTouchedMs: null,
    nowMs: NOW,
    ...over,
  };
}

describe("computeDomainScore", () => {
  it("cold start: score = prior term only, never 0 when rating > 0, confidence none", () => {
    const r = computeDomainScore(inputs());
    expect(r.parts.prior).toBeCloseTo(0.6); // globalRating 600 / 1000
    expect(r.score).toBeCloseTo(WEIGHTS.prior * 0.6); // only the prior term contributes
    expect(r.score).toBeGreaterThan(0);
    expect(r.confidence).toBe("none");
  });

  it("a mapped pretest question raises the prior term over the global fallback", () => {
    const withQ = computeDomainScore(inputs({ priorWeights: [3, 3], globalRating: 300 }));
    expect(withQ.parts.prior).toBeCloseTo(1.0); // mean(3/3, 3/3)
    const fallback = computeDomainScore(inputs({ priorWeights: [], globalRating: 300 }));
    expect(withQ.parts.prior).toBeGreaterThan(fallback.parts.prior);
  });

  it("full lesson coverage + objective practice scores far above cold start", () => {
    const cold = computeDomainScore(inputs());
    const full = computeDomainScore(
      inputs({
        readyLessonsTotal: 10,
        readyLessonsOpened: 10,
        practice: { objDone: 10, subjEngaged: 0, totalTasks: 10 },
        lastTouchedMs: NOW,
      }),
    );
    expect(full.parts.lessons).toBeCloseTo(1);
    expect(full.parts.practice).toBeCloseTo(1);
    expect(full.score).toBeGreaterThan(cold.score);
    expect(full.score).toBeCloseTo(WEIGHTS.prior * 0.6 + WEIGHTS.lessons + WEIGHTS.practice);
  });

  it("a subjective 'done' counts half of an objective 'done'", () => {
    const obj = computeDomainScore(inputs({ practice: { objDone: 10, subjEngaged: 0, totalTasks: 10 }, lastTouchedMs: NOW }));
    const subj = computeDomainScore(inputs({ practice: { objDone: 0, subjEngaged: 10, totalTasks: 10 }, lastTouchedMs: NOW }));
    expect(subj.parts.practice).toBeCloseTo(0.5);
    expect(obj.score).toBeGreaterThan(subj.score);
  });

  it("recency decays toward the floor but never below it; no penalty when just touched", () => {
    const base = { readyLessonsTotal: 10, readyLessonsOpened: 10, practice: { objDone: 10, subjEngaged: 0, totalTasks: 10 } };
    const fresh = computeDomainScore(inputs({ ...base, lastTouchedMs: NOW }));
    const stale = computeDomainScore(inputs({ ...base, lastTouchedMs: NOW - 200 * DAY }));
    expect(fresh.parts.recencyMul).toBe(1);
    expect(stale.parts.recencyMul).toBe(RECENCY.FLOOR);
    expect(stale.score).toBeLessThan(fresh.score);
    expect(stale.score).toBeGreaterThanOrEqual(fresh.score * RECENCY.FLOOR - 1e-9);
  });

  it("clamps score into [0,1] under extreme inputs", () => {
    const r = computeDomainScore(inputs({ globalRating: 99999, readyLessonsTotal: 1, readyLessonsOpened: 5, practice: { objDone: 99, subjEngaged: 99, totalTasks: 1 }, lastTouchedMs: NOW }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });
});

describe("domainConfidenceOf", () => {
  it("buckets by evidence count: 0 none, 3 low, 8 medium, 20 high", () => {
    expect(domainConfidenceOf(0)).toBe("none");
    expect(domainConfidenceOf(3)).toBe("low");
    expect(domainConfidenceOf(8)).toBe("medium");
    expect(domainConfidenceOf(20)).toBe("high");
  });
});

describe("rankGaps", () => {
  const bandOf = (t: Track): Band =>
    t === "distributed" ? "middle" : t === "math" ? "foundations" : "surface";

  function ds(track: string, score: number): DomainScore {
    return { track: track as Track, score, confidence: "medium", parts: { prior: 0, lessons: 0, practice: 0, recencyMul: 1 } };
  }

  it("orders by gapScore = (1 - score) * SENIOR_WEIGHT[band], descending", () => {
    const ranked = rankGaps([ds("frontend", 0.9), ds("distributed", 0.5)], bandOf);
    expect(ranked[0].track).toBe("distributed"); // (1-.5)*1.0 = .5 > (1-.9)*.9 = .09
    expect(ranked[0].gapScore).toBeCloseTo(0.5);
  });

  it("a low middle-band track outranks an equally-low foundations track", () => {
    const ranked = rankGaps([ds("math", 0.2), ds("distributed", 0.2)], bandOf);
    expect(ranked[0].track).toBe("distributed"); // .8*1.0 > .8*0.4
  });

  it("tie-breaks equal gapScore by track slug (deterministic)", () => {
    const ranked = rankGaps([ds("frontend", 0.5), ds("backend", 0.5)], bandOf);
    expect(ranked.map((r) => r.track)).toEqual(["backend", "frontend"]); // same band+score → slug asc
  });

  it("empty input → empty output", () => {
    expect(rankGaps([], bandOf)).toEqual([]);
  });
});

describe("recommendNextUnit", () => {
  const units = [
    { id: "node/01", slug: "01-a", order: 1, lessons: ["node/01/x", "node/01/y"] },
    { id: "node/02", slug: "02-b", order: 2, lessons: ["node/02/x"] },
    { id: "node/03", slug: "03-c", order: 3, lessons: ["node/03/x"] },
  ];

  it("recommends the first not-fully-opened unit whose prereqs are satisfied", () => {
    const opened = ["node/01/x", "node/01/y"]; // unit 01 done, 02 next
    const rec = recommendNextUnit("node" as Track, opened, units, () => []);
    expect(rec).toEqual({ track: "node", unit: "02-b", lessonSlug: "node/02/x" });
  });

  it("skips a unit with an unmet prereq in favor of the prereq unit", () => {
    // 02 requires 03, but 03 is not opened → recommend 03, not 02
    const opened = ["node/01/x", "node/01/y"];
    const prereqsOf = (id: string) => (id === "node/02" ? ["node/03"] : []);
    const rec = recommendNextUnit("node" as Track, opened, units, prereqsOf);
    expect(rec?.unit).toBe("03-c");
  });

  it("points at the first unopened lesson in the chosen unit", () => {
    const opened: string[] = []; // nothing opened → unit 01, first lesson
    const rec = recommendNextUnit("node" as Track, opened, units, () => []);
    expect(rec).toEqual({ track: "node", unit: "01-a", lessonSlug: "node/01/x" });
  });

  it("a fully-completed track → null", () => {
    const opened = ["node/01/x", "node/01/y", "node/02/x", "node/03/x"];
    expect(recommendNextUnit("node" as Track, opened, units, () => [])).toBeNull();
  });
});
