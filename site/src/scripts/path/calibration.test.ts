import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { emptyState, applyDiagnostic } from "./knowledge";
import { pickProbe, placementPlan, gradeMcq, gradeBlanks, fracOf } from "./calibration";

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

describe("placementPlan", () => {
  const fams = [
    { key: "net", tracks: ["networking"] },
    { key: "db", tracks: ["databases"] },
  ];
  it("picks up to perFamily diagnosable, unsettled concepts per family, highest gain first", () => {
    const diagnosed = new Set(["tcp-handshake", "ip-addressing", "indexing", "mvcc"]);
    const plan = placementPlan(emptyState(), g, diagnosed, fams, 1, new Set());
    expect(plan.map((p) => p.family)).toEqual(["net", "db"]);
    for (const p of plan) expect(p.concepts.length).toBe(1);
    // within a family, the higher-closure-gain concept wins the single slot
  });
  it("skips concepts already settled (confident) or session-excluded", () => {
    const diagnosed = new Set(["tcp-handshake"]);
    const settled = applyDiagnostic(emptyState(), g, "tcp-handshake", 1, 0);
    expect(placementPlan(settled, g, diagnosed, fams, 2, new Set())).toEqual([]);
    expect(placementPlan(emptyState(), g, diagnosed, fams, 2, new Set(["tcp-handshake"]))).toEqual([]);
  });
});
