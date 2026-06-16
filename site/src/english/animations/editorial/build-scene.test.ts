// site/src/english/animations/editorial/build-scene.test.ts
import { describe, it, expect } from "vitest";
import { buildTimelineScene } from "./build-scene";
import { VIEW } from "./scene-types";
import type { DiagramInput } from "./diagram-input";

const inp = (o: Partial<DiagramInput>): DiagramInput => ({ archetype: "timeline", family: "tenses", genre: "X", labels: [], items: [], ...o });

describe("buildTimelineScene", () => {
  it("present-perfect-like → arc + hollow past + solid now", () => {
    const s = buildTimelineScene(inp({ family: "tenses", labels: ["past", "now", "future"], formula: "have + V3" }));
    expect(s.prims.some((p) => p.k === "arc")).toBe(true);
    expect(s.prims.some((p) => p.k === "node" && p.fill === "hollow")).toBe(true);
    expect(s.prims.some((p) => p.k === "node" && p.fill === "solid")).toBe(true);
  });
  it("sequence labels → flat axis, no arc", () => {
    const s = buildTimelineScene(inp({ family: "conjunctions", labels: ["before", "when", "while", "after", "until"] }));
    expect(s.prims.some((p) => p.k === "arc")).toBe(false);
    expect(s.prims.filter((p) => p.k === "tick")).toHaveLength(5);
  });
  it("all coords inside viewBox", () => {
    const s = buildTimelineScene(inp({ labels: ["past", "now", "future"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
    }
  });
});
