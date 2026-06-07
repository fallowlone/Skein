import { describe, it, expect } from "vitest";
import { DOMAIN_FAMILIES, conceptState, masteryField, topGaps, topShaky } from "./mastery-field";
import type { Concept, KnowledgeState } from "./types";

const ALL_TRACKS = [
  "math", "algorithms", "base-cs", "networking", "browser", "frontend", "backend", "apis", "databases",
  "caching", "queues", "distributed", "security", "observability", "deployment", "performance",
  "data-engineering", "ai-llm", "engineering-practice", "sql-postgres", "js-engine", "typescript",
  "system-design", "system-design-cases", "aws", "python", "ci-cd", "node", "nest",
] as const;

describe("DOMAIN_FAMILIES", () => {
  it("covers every one of the 29 tracks exactly once", () => {
    const mapped = DOMAIN_FAMILIES.flatMap((f) => f.tracks);
    expect(new Set(mapped).size).toBe(mapped.length); // no dupes
    expect(new Set(mapped)).toEqual(new Set(ALL_TRACKS));
    expect(mapped.length).toBe(29);
  });
  it("every family has en+ru label and a hue token", () => {
    for (const f of DOMAIN_FAMILIES) {
      expect(f.label.en.length).toBeGreaterThan(0);
      expect(f.label.ru.length).toBeGreaterThan(0);
      expect(f.hue).toMatch(/^--d-/);
    }
  });
});

describe("conceptState", () => {
  const T = 0.6;
  it("known at/above threshold", () => { expect(conceptState(0.6, T)).toBe("known"); expect(conceptState(1, T)).toBe("known"); });
  it("shaky strictly between 0 and threshold", () => { expect(conceptState(0.59, T)).toBe("shaky"); expect(conceptState(0.01, T)).toBe("shaky"); });
  it("unknown at zero", () => { expect(conceptState(0, T)).toBe("unknown"); });
});

function mk(id: string, track: string): Concept {
  return { id, label: { en: id, ru: id }, track: track as any, band: "surface" as any, requires: [] };
}

describe("masteryField", () => {
  const concepts: Concept[] = [mk("a", "networking"), mk("b", "networking"), mk("c", "databases")];
  const state: KnowledgeState = new Map([
    ["a", { confidence: 0.9, source: "diagnostic", lastAt: 0 }],
    ["b", { confidence: 0.3, source: "activity", lastAt: 0 }],
  ]); // c absent → unknown

  it("groups by family with correct counts", () => {
    const field = masteryField(state, concepts, 0.6);
    const net = field.find((f) => f.tracks.includes("networking" as any))!;
    expect(net.known).toBe(1); expect(net.shaky).toBe(1); expect(net.unknown).toBe(0); expect(net.total).toBe(2);
    const data = field.find((f) => f.tracks.includes("databases" as any))!;
    expect(data.known).toBe(0); expect(data.unknown).toBe(1); expect(data.total).toBe(1);
  });
  it("only returns families that have concepts", () => {
    const field = masteryField(state, concepts, 0.6);
    expect(field.every((f) => f.total > 0)).toBe(true);
  });
  it("orders nodes known → shaky → unknown", () => {
    const field = masteryField(state, concepts, 0.6);
    const net = field.find((f) => f.tracks.includes("networking" as any))!;
    expect(net.nodes.map((n) => n.state)).toEqual(["known", "shaky"]);
  });
  it("keeps families in DOMAIN_FAMILIES order", () => {
    const cs = [mk("x", "ai-llm"), mk("y", "math")]; // ai is last family, foundations is first
    const field = masteryField(new Map(), cs, 0.6);
    expect(field[0].key).toBe("foundations");
    expect(field[field.length - 1].key).toBe("ai");
  });
});

describe("topGaps / topShaky", () => {
  const concepts: Concept[] = [mk("raft", "distributed"), mk("paxos", "distributed"), mk("idx", "databases")];
  const state: KnowledgeState = new Map([["idx", { confidence: 0.3, source: "activity", lastAt: 0 }]]);
  it("topGaps returns unknown concept labels", () => {
    const field = masteryField(state, concepts, 0.6);
    expect(topGaps(field, "en", 5)).toEqual(expect.arrayContaining(["raft", "paxos"]));
  });
  it("topShaky returns shaky concept labels", () => {
    const field = masteryField(state, concepts, 0.6);
    expect(topShaky(field, "en", 5)).toEqual(["idx"]);
  });
  it("respects the limit", () => {
    const field = masteryField(state, concepts, 0.6);
    expect(topGaps(field, "en", 1).length).toBe(1);
  });
});
