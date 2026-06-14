// site/src/scripts/path/practice-signal.test.ts
import { describe, it, expect } from "vitest";
import { unitStruggleFractions, type AttemptRec } from "./practice-signal";

const rec = (attempts: number, passes: number, lastResult: "pass" | "fail"): AttemptRec =>
  ({ attempts, passes, lastResult, lastAt: 0 });

describe("unitStruggleFractions", () => {
  const counts = new Map([["docker/01-images", 4], ["go/02-slices", 2]]);

  it("flags a lesson as struggled when a task has attempts>0 && passes===0", () => {
    const attempts = new Map<string, Record<string, AttemptRec>>([
      ["docker/01-images/01-intro", { t1: rec(3, 0, "fail") }],         // struggled (never passed)
      ["docker/01-images/02-layers", { t1: rec(2, 2, "pass") }],        // passed clean
    ]);
    const f = unitStruggleFractions(attempts, counts);
    // 1 of 4 lessons struggled, 1 of 4 lessons done (≥1 passed task)
    expect(f.get("docker/01-images")).toEqual({ doneFrac: 0.25, struggleFrac: 0.25 });
  });

  it("flags a lesson as struggled when a task's lastResult is 'fail' even after a prior pass", () => {
    const attempts = new Map<string, Record<string, AttemptRec>>([
      ["go/02-slices/01-intro", { t1: rec(2, 1, "fail") }],            // passed once, then flunked
    ]);
    const f = unitStruggleFractions(attempts, counts);
    expect(f.get("go/02-slices")).toEqual({ doneFrac: 0.5, struggleFrac: 0.5 }); // 1/2 done, 1/2 struggled
  });

  it("a lesson whose tasks all currently pass does not count as struggled", () => {
    const attempts = new Map<string, Record<string, AttemptRec>>([
      ["go/02-slices/01-intro", { t1: rec(1, 1, "pass"), t2: rec(2, 2, "pass") }],
    ]);
    const f = unitStruggleFractions(attempts, counts);
    expect(f.get("go/02-slices")).toEqual({ doneFrac: 0.5, struggleFrac: 0 });
  });

  it("ignores malformed keys, empty task maps, and unknown units", () => {
    const attempts = new Map<string, Record<string, AttemptRec>>([
      ["docker-lab-senior", { t1: rec(2, 0, "fail") }],          // lab key — not <track>/<unit>/<lesson>
      ["docker/01-images/03-x", {}],                              // no tasks recorded
      ["ghost/99-unit/01-lesson", { t1: rec(1, 0, "fail") }],     // unit absent from the bundle
    ]);
    expect(unitStruggleFractions(attempts, counts).size).toBe(0);
  });

  it("caps fractions at 1 even with more struggled lessons than the unit count", () => {
    const small = new Map([["go/02-slices", 1]]);
    const attempts = new Map<string, Record<string, AttemptRec>>([
      ["go/02-slices/01-a", { t1: rec(1, 0, "fail") }],
      ["go/02-slices/02-b", { t1: rec(1, 0, "fail") }],
    ]);
    const f = unitStruggleFractions(attempts, small);
    expect(f.get("go/02-slices")).toEqual({ doneFrac: 0, struggleFrac: 1 });
  });
});
