import { describe, it, expect } from "vitest";
import { nextConcept, applyAsked, initState, MAX_PLACEMENT_ITEMS, type RunnerDeps } from "./placement-runner";
import type { Irt } from "./bayes";

const IRT: Irt = { b: 0, a: 1, c: 0.25 };

const mkDeps = (over: Partial<RunnerDeps> = {}): RunnerDeps => ({
  candidates: ["a", "b", "c"],
  bankSize: () => 3,
  familyOf: () => "fam",
  irtOf: () => IRT,
  express: false,
  expressPerFamily: 5,
  maxItems: MAX_PLACEMENT_ITEMS,
  ...over,
});

// Drive the runner to completion with a responder, returning the asked "concept#idx" log.
const drive = (deps: RunnerDeps, priors0: Map<string, number>, answer: (c: string) => number) => {
  let st = initState(deps, priors0);
  const asked: string[] = [];
  let steps = 0;
  for (;;) {
    const c = nextConcept(deps, st);
    if (c === null) break;
    const idx = st.cursor.get(c) ?? 0;
    asked.push(`${c}#${idx}`);
    st = applyAsked(deps, st, c, new Map(st.priors).set(c, answer(c)));
    if (++steps > 1000) throw new Error("runner did not terminate");
  }
  return { asked, steps, st };
};

describe("placement runner termination", () => {
  it("terminates even when no concept ever settles, never serving past a bank", () => {
    const deps = mkDeps();
    // adversarial responder: prior stays 0.5 forever → no concept can ever settle
    const { asked, steps } = drive(deps, new Map(deps.candidates.map((c) => [c, 0.5])), () => 0.5);

    // every served idx stayed within its bank → no item shown twice
    for (const key of asked) {
      const [c, idxStr] = key.split("#");
      expect(Number(idxStr)).toBeLessThan(deps.bankSize(c));
    }
    expect(new Set(asked).size).toBe(asked.length); // no duplicates
    expect(asked.length).toBe(deps.candidates.length * 3); // each bank exhausted exactly once
    expect(steps).toBeLessThanOrEqual(deps.maxItems);
  });

  it("drops a concept the moment it settles, even with bank items left", () => {
    const deps = mkDeps({ candidates: ["a"], bankSize: () => 10 });
    let st = initState(deps, new Map([["a", 0.5]]));
    st = applyAsked(deps, st, "a", new Map([["a", 0.98]])); // variance(0.98) < SETTLE_VAR
    expect(nextConcept(deps, st)).toBeNull();
  });

  it("enforces the global safety cap when nothing settles", () => {
    const many = Array.from({ length: 50 }, (_, i) => `k${i}`);
    const deps = mkDeps({ candidates: many, bankSize: () => 5, maxItems: 40 });
    const { steps } = drive(deps, new Map(many.map((c) => [c, 0.5])), () => 0.5);
    expect(steps).toBe(40);
  });

  it("respects the express per-family cap", () => {
    const deps = mkDeps({ express: true, expressPerFamily: 2, candidates: ["a", "b", "c", "d"], bankSize: () => 10 });
    const { steps } = drive(deps, new Map(deps.candidates.map((c) => [c, 0.5])), () => 0.5);
    expect(steps).toBe(2); // one family, capped at 2 items total
  });
});
