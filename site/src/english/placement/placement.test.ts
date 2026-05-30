import { describe, it, expect } from "vitest";
import { buildPlacement, scorePlacement, type PlacementItem } from "./placement";

// Deterministic LCG so item order + assertions are stable.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
}

const items = buildPlacement(seeded(7));
const real = items.filter((i) => !i.isPseudo);
const pseudo = items.filter((i) => i.isPseudo);
const idxYes = (pred: (i: PlacementItem) => boolean) =>
  new Set(items.map((it, n) => (pred(it) ? n : -1)).filter((n) => n >= 0));

describe("buildPlacement", () => {
  it("combines the real sample with pseudowords", () => {
    expect(real.length).toBeGreaterThanOrEqual(48);
    expect(pseudo.length).toBeGreaterThanOrEqual(15);
  });
});

describe("scorePlacement", () => {
  it("knowing nothing yields a low estimate and the A2 starting band", () => {
    const r = scorePlacement(items, new Set());
    expect(r.estimatedKnown).toBeLessThan(400);
    expect(r.band).toBe("A2");
  });

  it("knowing every real word (no false alarms) maxes the estimate and starts at B2", () => {
    const yes = idxYes((i) => !i.isPseudo);
    const r = scorePlacement(items, yes);
    expect(r.band).toBe("B2");
    expect(r.estimatedKnown).toBeGreaterThan(3000);
    expect(r.knownLemmas.length).toBe(real.length);
  });

  it("guess-correction discounts a yes-on-everything responder", () => {
    const allYes = idxYes(() => true); // says yes to reals AND pseudowords
    const honestAll = idxYes((i) => !i.isPseudo);
    const guesser = scorePlacement(items, allYes);
    const honest = scorePlacement(items, honestAll);
    expect(guesser.estimatedKnown).toBeLessThan(honest.estimatedKnown);
  });

  it("mastering only A2 starts the learner at B1", () => {
    const yes = idxYes((i) => !i.isPseudo && i.band === "A2");
    const r = scorePlacement(items, yes);
    expect(r.band).toBe("B1");
  });
});
