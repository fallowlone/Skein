import { describe, it, expect } from "vitest";
import { buildTimeline } from "./timeline";
import { buildSlotFill } from "./slot-fill";
import { buildContrastPair } from "./contrast-pair";
import { buildTransformation } from "./transformation";
import { buildScale } from "./scale";
import { buildBranch } from "./branch";
import { buildSwap } from "./swap";
import { buildMap } from "./map";
import { buildHighlight } from "./highlight";
import type { LottieDoc } from "../lottie-types";

const GENS: Array<[string, (p: { labels: string[]; items?: string[] }) => LottieDoc]> = [
  ["timeline", buildTimeline],
  ["slot-fill", buildSlotFill],
  ["contrast-pair", buildContrastPair],
  ["transformation", buildTransformation],
  ["scale", buildScale],
  ["branch", buildBranch],
  ["swap", buildSwap],
  ["map", buildMap],
  ["highlight", buildHighlight],
];

const LABELS = ["alpha", "bravo", "charlie", "delta"];

function valid(d: LottieDoc): boolean {
  return d.v === "5.7.0" && d.op > d.ip && d.w > 0 && d.h > 0 &&
    d.layers.length > 0 && d.layers.every((l) => l.op > l.ip) &&
    JSON.parse(JSON.stringify(d)) != null;
}

describe("archetype generators", () => {
  for (const [name, gen] of GENS) {
    it(`${name}: emits valid Bodymovin`, () => {
      expect(valid(gen({ labels: LABELS, items: LABELS }))).toBe(true);
    });
    it(`${name}: renders at least one label as text`, () => {
      const d = gen({ labels: LABELS, items: LABELS });
      const texts = d.layers.filter((l) => l.ty === 5).map((l) => l.t!.d.k[0].s.t);
      expect(texts.some((t) => LABELS.includes(t))).toBe(true);
    });
    it(`${name}: no empty text layer`, () => {
      const d = gen({ labels: LABELS, items: LABELS });
      expect(d.layers.filter((l) => l.ty === 5 && !l.t!.d.k[0].s.t.trim()).length).toBe(0);
    });
    it(`${name}: deterministic`, () => {
      expect(gen({ labels: LABELS })).toEqual(gen({ labels: LABELS }));
    });
    it(`${name}: survives n=1 and n=2`, () => {
      expect(valid(gen({ labels: ["solo"] }))).toBe(true);
      expect(valid(gen({ labels: ["a", "b"] }))).toBe(true);
    });
  }
});
