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
});
