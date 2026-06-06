import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PRETEST_CONCEPT_MAP, seedFromPretest } from "./pretest-seed";
import { buildConceptGraph } from "./graph";
import { emptyState, masteryOf } from "./knowledge";
import type { Concept } from "./types";

const C = (id: string, requires: string[] = []): Concept =>
  ({ id, label: { en: id, ru: id }, track: "networking", band: "middle", requires });
const concepts = [C("ports-sockets"), C("tcp-handshake", ["ports-sockets"]), C("b-tree-index")];
const g = buildConceptGraph(concepts);
const Q = (id: string) => ({ id, prompt: { en: "", ru: "" }, choices: [
  { label: { en: "", ru: "" }, weight: 0 as const }, { label: { en: "", ru: "" }, weight: 1 as const },
  { label: { en: "", ru: "" }, weight: 2 as const }, { label: { en: "", ru: "" }, weight: 3 as const }] });
const stage1 = [Q("tcp"), Q("db-index")];
const stage2: ReturnType<typeof Q>[] = [];

describe("pretest-seed", () => {
  it("PRETEST_CONCEPT_MAP targets all exist in concepts.json", () => {
    const ids = new Set((JSON.parse(readFileSync("src/content/path/concepts.json", "utf8")) as { id: string }[]).map((c) => c.id));
    for (const targets of Object.values(PRETEST_CONCEPT_MAP)) for (const t of targets) expect(ids.has(t)).toBe(true);
  });

  it("a weight-3 answer seeds high confidence and lifts prereqs", () => {
    const pretest = { takenAt: 0, stage1: { score: 0, answers: [3, 0] }, rating: 0, rank: "x", confidence: "high" as const };
    const s = seedFromPretest(emptyState(), g, pretest, stage1, stage2, 0);
    expect(masteryOf(s, "tcp-handshake")).toBeCloseTo(0.85, 5);
    expect(masteryOf(s, "ports-sockets")).toBeGreaterThan(0);
  });

  it("a weight-0 answer seeds nothing", () => {
    const pretest = { takenAt: 0, stage1: { score: 0, answers: [0, 0] }, rating: 0, rank: "x", confidence: "high" as const };
    const s = seedFromPretest(emptyState(), g, pretest, stage1, stage2, 0);
    expect(s.size).toBe(0);
  });

  it("maps db-index to b-tree-index", () => {
    const pretest = { takenAt: 0, stage1: { score: 0, answers: [0, 2] }, rating: 0, rank: "x", confidence: "high" as const };
    const s = seedFromPretest(emptyState(), g, pretest, stage1, stage2, 0);
    expect(masteryOf(s, "b-tree-index")).toBeCloseTo(0.6, 5);
  });
});
