import { describe, it, expect } from "vitest";
import { buildConceptGraph } from "./graph";
import { frontierCompleteness } from "./completeness";
import type { KnowledgeState } from "./types";

describe("frontierCompleteness", () => {
  it("buckets by source and sums to total", () => {
    const g = buildConceptGraph([
      { id: "a", label: { en: "", ru: "" }, track: "t", band: "surface", requires: [] },
      { id: "b", label: { en: "", ru: "" }, track: "t", band: "middle", requires: ["a"] },
      { id: "c", label: { en: "", ru: "" }, track: "t", band: "middle", requires: ["a"] },
    ] as any);
    const state: KnowledgeState = new Map([
      ["a", { confidence: 1, source: "diagnostic", lastAt: 0 }],
      ["b", { confidence: 0.8, source: "declared", lastAt: 0 }],
      // c absent → guessed
    ]);
    const r = frontierCompleteness(new Set(["a", "b", "c"]), state, new Set(["a"]), g);
    expect(r.measured).toBe(1);   // a
    expect(r.declared).toBe(1);   // b
    expect(r.guessed).toBe(1);    // c
    expect(r.measured + r.declared + r.propagated + r.guessed).toBe(r.total);
    expect(r.total).toBe(3);
  });

  it("counts assess as measured — a new Source member must not silently fall into guessed", () => {
    const g = buildConceptGraph([
      { id: "z", label: { en: "", ru: "" }, track: "t", band: "surface", requires: [] },
    ] as any);
    const state: KnowledgeState = new Map([["z", { confidence: 0.2, source: "assess", lastAt: 0 }]]);
    const r = frontierCompleteness(new Set(["z"]), state, new Set(), g);
    expect(r.measured).toBe(1);
    expect(r.guessed).toBe(0);
  });

  it("counts pretest as measured and activity as propagated", () => {
    const g = buildConceptGraph([
      { id: "x", label: { en: "", ru: "" }, track: "t", band: "surface", requires: [] },
      { id: "y", label: { en: "", ru: "" }, track: "t", band: "surface", requires: [] },
    ] as any);
    const state: KnowledgeState = new Map([
      ["x", { confidence: 0.9, source: "pretest", lastAt: 0 }],
      ["y", { confidence: 0.5, source: "activity", lastAt: 0 }],
    ]);
    const r = frontierCompleteness(new Set(["x", "y"]), state, new Set(), g);
    expect(r.measured).toBe(1);
    expect(r.propagated).toBe(1);
  });

  // Why currentCompleteness must use the effective (override-applied) graph, not the base one:
  // an added prerequisite edge pulls more concepts into the frontier closure, changing the buckets.
  it("is sensitive to prerequisite edges — an added edge widens the closure", () => {
    const nodes = [
      { id: "f", label: { en: "", ru: "" }, track: "t", band: "middle", requires: [] }, // the frontier concept
      { id: "p", label: { en: "", ru: "" }, track: "t", band: "surface", requires: [] }, // a potential prereq
    ] as any;
    const state: KnowledgeState = new Map([["f", { confidence: 1, source: "diagnostic", lastAt: 0 }]]);
    // base graph: f has no prereq → closure = {f}
    const base = frontierCompleteness(new Set(["f"]), state, new Set(), buildConceptGraph(nodes));
    expect(base.total).toBe(1);
    expect(base.guessed).toBe(0);
    // effective graph: an override adds f requires p → closure = {f, p}; p is unmeasured → guessed
    const withEdge = nodes.map((n: any) => (n.id === "f" ? { ...n, requires: ["p"] } : n));
    const eff = frontierCompleteness(new Set(["f"]), state, new Set(), buildConceptGraph(withEdge));
    expect(eff.total).toBe(2);
    expect(eff.guessed).toBe(1); // p entered the closure as an unmeasured prerequisite
  });
});
