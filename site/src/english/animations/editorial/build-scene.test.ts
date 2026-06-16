// site/src/english/animations/editorial/build-scene.test.ts
import { describe, it, expect } from "vitest";
import { buildTimelineScene, buildContrastScene, buildTransformScene, buildMapScene, buildBranchScene, buildScaleScene, buildSwapScene, buildHighlightScene, buildSlotFillScene } from "./build-scene";
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

describe("buildContrastScene", () => {
  it("has a divider + 2 chips", () => {
    const s = buildContrastScene(inp({ labels: ["with", "without"], formula: "S + have + V3" }));
    expect(s.prims.some((p) => p.k === "divider")).toBe(true);
    expect(s.prims.filter((p) => p.k === "chip")).toHaveLength(2);
  });
  it("empty-safe: no throw, has header", () => {
    const s = buildContrastScene(inp({}));
    expect(s.prims.some((p) => p.k === "genre")).toBe(true);
  });
  it("all coords inside viewBox", () => {
    const s = buildContrastScene(inp({ labels: ["A", "B"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
      if ("y" in p) { expect((p as { y: number }).y).toBeGreaterThanOrEqual(0); expect((p as { y: number }).y).toBeLessThanOrEqual(VIEW.H); }
    }
  });
});

describe("buildTransformScene", () => {
  it("has an arrow between two chips", () => {
    const s = buildTransformScene(inp({ labels: ["simple", "perfect"] }));
    const chips = s.prims.filter((p) => p.k === "chip");
    const arrows = s.prims.filter((p) => p.k === "arrow");
    expect(chips).toHaveLength(2);
    expect(arrows).toHaveLength(1);
  });
  it("empty-safe: no throw, has header", () => {
    const s = buildTransformScene(inp({}));
    expect(s.prims.some((p) => p.k === "genre")).toBe(true);
  });
  it("all coords inside viewBox", () => {
    const s = buildTransformScene(inp({ labels: ["before", "after"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
    }
  });
});

describe("buildMapScene", () => {
  it("parses arrow-separated pairs into row chips + arrows", () => {
    const s = buildMapScene(inp({ items: ["eat→ate", "go→went", "see→saw"] }));
    expect(s.prims.filter((p) => p.k === "chip")).toHaveLength(6); // 3 rows × 2 chips
    expect(s.prims.filter((p) => p.k === "arrow")).toHaveLength(3);
  });
  it("caps at 4 rows and emits overflow caption", () => {
    const s = buildMapScene(inp({ items: ["a→b", "c→d", "e→f", "g→h", "i→j"] }));
    expect(s.prims.filter((p) => p.k === "chip")).toHaveLength(8); // 4 visible rows
    expect(s.prims.some((p) => p.k === "caption" && "text" in p && (p as { text: string }).text.startsWith("+"))).toBe(true);
  });
  it("empty-safe: no throw, has header", () => {
    const s = buildMapScene(inp({}));
    expect(s.prims.some((p) => p.k === "genre")).toBe(true);
  });
  it("all coords inside viewBox", () => {
    const s = buildMapScene(inp({ items: ["a→b", "c→d"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
      if ("y" in p) { expect((p as { y: number }).y).toBeGreaterThanOrEqual(0); expect((p as { y: number }).y).toBeLessThanOrEqual(VIEW.H); }
    }
  });
});

describe("buildBranchScene", () => {
  it("has one arrow per branch", () => {
    const s = buildBranchScene(inp({ labels: ["noun", "verb", "adjective"] }));
    expect(s.prims.filter((p) => p.k === "arrow")).toHaveLength(3);
    expect(s.prims.filter((p) => p.k === "chip")).toHaveLength(4); // root + 3 branches
  });
  it("empty-safe: no throw, has header + root chip", () => {
    const s = buildBranchScene(inp({}));
    expect(s.prims.some((p) => p.k === "genre")).toBe(true);
    expect(s.prims.some((p) => p.k === "chip")).toBe(true);
  });
  it("all coords inside viewBox", () => {
    const s = buildBranchScene(inp({ labels: ["A", "B", "C", "D"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
      if ("y" in p) { expect((p as { y: number }).y).toBeGreaterThanOrEqual(0); expect((p as { y: number }).y).toBeLessThanOrEqual(VIEW.H); }
    }
  });
});

describe("buildScaleScene", () => {
  it("has ≥2 chips ordered by y (base lower than top)", () => {
    const s = buildScaleScene(inp({ labels: ["low", "mid", "high"] }));
    const chips = s.prims.filter((p) => p.k === "chip");
    expect(chips.length).toBeGreaterThanOrEqual(2);
    // chips should have y values; the last chip (top) has a smaller y than the first (base)
    const ys = chips.map((p) => (p as { y: number }).y);
    expect(ys[0]).toBeGreaterThan(ys[ys.length - 1]!);
  });
  it("top chip is accent-toned", () => {
    const s = buildScaleScene(inp({ labels: ["a", "b", "c"] }));
    const chips = s.prims.filter((p) => p.k === "chip");
    const top = chips[chips.length - 1] as { tone?: string };
    expect(top.tone).toBe("accent");
  });
  it("empty-safe: no throw, has header", () => {
    const s = buildScaleScene(inp({}));
    expect(s.prims.some((p) => p.k === "genre")).toBe(true);
  });
  it("all coords inside viewBox", () => {
    const s = buildScaleScene(inp({ labels: ["a", "b", "c", "d"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
      if ("y" in p) { expect((p as { y: number }).y).toBeGreaterThanOrEqual(0); expect((p as { y: number }).y).toBeLessThanOrEqual(VIEW.H); }
    }
  });
});

describe("buildSwapScene", () => {
  it("has exactly 2 chips with distinct order values", () => {
    const s = buildSwapScene(inp({ labels: ["active", "passive"] }));
    const chips = s.prims.filter((p) => p.k === "chip");
    expect(chips).toHaveLength(2);
    const orders = chips.map((p) => (p as { order?: number }).order);
    expect(orders[0]).not.toBe(orders[1]);
  });
  it("texts come from labels[0] and labels[1]", () => {
    const s = buildSwapScene(inp({ labels: ["before", "after"] }));
    const chips = s.prims.filter((p) => p.k === "chip") as Array<{ text: string }>;
    expect(chips.some((c) => c.text === "before")).toBe(true);
    expect(chips.some((c) => c.text === "after")).toBe(true);
  });
  it("empty-safe: no throw, has header", () => {
    const s = buildSwapScene(inp({}));
    expect(s.prims.some((p) => p.k === "genre")).toBe(true);
  });
  it("all coords inside viewBox", () => {
    const s = buildSwapScene(inp({ labels: ["X", "Y"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
      if ("y" in p) { expect((p as { y: number }).y).toBeGreaterThanOrEqual(0); expect((p as { y: number }).y).toBeLessThanOrEqual(VIEW.H); }
    }
  });
});

describe("buildHighlightScene", () => {
  it("has exactly one pulse prim", () => {
    const s = buildHighlightScene(inp({ labels: ["I", "have", "eaten", "it"] }));
    expect(s.prims.filter((p) => p.k === "pulse")).toHaveLength(1);
  });
  it("pulse is under the middle token by default", () => {
    const s = buildHighlightScene(inp({ labels: ["a", "b", "c"] }));
    const pulses = s.prims.filter((p) => p.k === "pulse") as Array<{ x: number }>;
    const labels = s.prims.filter((p) => p.k === "label") as Array<{ text: string; x: number }>;
    const midLabel = labels[1];
    expect(pulses[0]?.x).toBe(midLabel?.x);
  });
  it("empty-safe: no throw, has header", () => {
    const s = buildHighlightScene(inp({}));
    expect(s.prims.some((p) => p.k === "genre")).toBe(true);
  });
  it("all coords inside viewBox", () => {
    const s = buildHighlightScene(inp({ labels: ["She", "has", "gone"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
      if ("y" in p) { expect((p as { y: number }).y).toBeGreaterThanOrEqual(0); expect((p as { y: number }).y).toBeLessThanOrEqual(VIEW.H); }
    }
  });
});

describe("buildSlotFillScene", () => {
  it("renders the blank slot as a hollow node", () => {
    const s = buildSlotFillScene(inp({ labels: ["I", "___", "eaten"] }));
    expect(s.prims.some((p) => p.k === "node" && (p as { fill: string }).fill === "hollow")).toBe(true);
  });
  it("non-blank slots are chips", () => {
    const s = buildSlotFillScene(inp({ labels: ["I", "___", "eaten"] }));
    expect(s.prims.filter((p) => p.k === "chip").length).toBeGreaterThanOrEqual(2);
  });
  it("empty-safe: no throw, has header", () => {
    const s = buildSlotFillScene(inp({}));
    expect(s.prims.some((p) => p.k === "genre")).toBe(true);
  });
  it("all coords inside viewBox", () => {
    const s = buildSlotFillScene(inp({ labels: ["have", "___", "V3"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
      if ("y" in p) { expect((p as { y: number }).y).toBeGreaterThanOrEqual(0); expect((p as { y: number }).y).toBeLessThanOrEqual(VIEW.H); }
    }
  });
});
