import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { emptyState, applyDiagnostic } from "./knowledge";
import { pickProbe, gradeMcq, gradeBlanks, fracOf } from "./calibration";

const g = buildConceptGraph(CONCEPTS);
const frontier = ["consensus", "tls", "mvcc"];

describe("pickProbe", () => {
  it("only picks concepts that have a diagnostic (the diagnosed set)", () => {
    const diagnosed = new Set(["tls", "mvcc"]);
    const picked = pickProbe(emptyState(), g, frontier, diagnosed, 0.6);
    expect(["tls", "mvcc"]).toContain(picked);
    expect(picked).not.toBe("consensus");
  });

  it("returns null when every diagnosable concept is already known", () => {
    const diagnosed = new Set(["tls", "mvcc"]);
    let s = emptyState();
    for (const c of [...diagnosed, ...CONCEPTS.map((x) => x.id)]) s = applyDiagnostic(s, g, c, 1, 0);
    expect(pickProbe(s, g, frontier, diagnosed, 0.6)).toBeNull();
  });

  it("is deterministic under ties", () => {
    const d = new Set(["tls", "mvcc"]);
    expect(pickProbe(emptyState(), g, ["tls", "mvcc"], d, 0.6)).toBe(pickProbe(emptyState(), g, ["mvcc", "tls"], d, 0.6));
  });
});

describe("grading", () => {
  it("gradeMcq is true only for the answer index", () => {
    const item = { type: "mcq", answer: 2 } as any;
    expect(gradeMcq(item, 2)).toBe(true);
    expect(gradeMcq(item, 1)).toBe(false);
  });
  it("gradeBlanks matches case/space-insensitively against the accepted set", () => {
    const item = { type: "blanks", answer: ["zero", "0"] } as any;
    expect(gradeBlanks(item, " Zero ")).toBe(true);
    expect(gradeBlanks(item, "one")).toBe(false);
  });
  it("fracOf is correct/total", () => {
    expect(fracOf([true, false, true])).toBeCloseTo(2 / 3, 5);
    expect(fracOf([])).toBe(0);
  });
});
