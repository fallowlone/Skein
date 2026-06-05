// site/src/scripts/path/diagnostic-select.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { emptyState, applyDiagnostic } from "./knowledge";
import { nextProbe } from "./diagnostic-select";

const g = buildConceptGraph(CONCEPTS);

describe("nextProbe", () => {
  const frontier = ["consensus", "tls", "mvcc"];

  it("picks the unknown concept that prunes the most graph", () => {
    // consensus sits atop the deepest chain -> highest |ancestors|+|descendants|.
    expect(nextProbe(emptyState(), g, frontier, 0.6)).toBe("consensus");
  });

  it("returns null once the frontier is calibrated (no ambiguous concepts left)", () => {
    let s = emptyState();
    for (const c of [...frontier, ...CONCEPTS.map((x) => x.id)]) s = applyDiagnostic(s, g, c, 1, 0);
    expect(nextProbe(s, g, frontier, 0.6)).toBeNull();
  });

  it("is deterministic under ties (sorted id tie-break)", () => {
    const a = nextProbe(emptyState(), g, ["tls", "mvcc"], 0.6);
    const b = nextProbe(emptyState(), g, ["mvcc", "tls"], 0.6);
    expect(a).toBe(b);
  });
});
