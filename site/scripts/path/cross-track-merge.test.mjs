import { describe, it, expect } from "vitest";
import { mergeCrossTrackEdges } from "./cross-track-merge.mjs";

const CONCEPTS = [{ id: "a", track: "x" }, { id: "b", track: "y" }, { id: "c", track: "x" }];

describe("mergeCrossTrackEdges", () => {
  it("keeps a valid cross-track edge", () => {
    const r = mergeCrossTrackEdges([{ concept: "a", requires: "b" }], CONCEPTS);
    expect(r.addEdges).toEqual([{ concept: "a", requires: "b" }]);
    expect(r.skipped).toBe(0);
  });
  it("skips unknown ids", () => {
    const r = mergeCrossTrackEdges([{ concept: "a", requires: "ghost" }], CONCEPTS);
    expect(r.addEdges).toEqual([]);
    expect(r.skipped).toBe(1);
  });
  it("skips intra-track and self-loop", () => {
    const r = mergeCrossTrackEdges([{ concept: "a", requires: "c" }, { concept: "a", requires: "a" }], CONCEPTS);
    expect(r.addEdges).toEqual([]);
    expect(r.skipped).toBe(2);
  });
  it("dedupes repeated edges (with a warning)", () => {
    const r = mergeCrossTrackEdges([{ concept: "a", requires: "b" }, { concept: "a", requires: "b" }], CONCEPTS);
    expect(r.addEdges).toHaveLength(1);
    expect(r.skipped).toBe(1);
    expect(r.warnings.some((w) => w.includes("duplicate"))).toBe(true);
  });
  it("tolerates non-array / junk elements", () => {
    const nonArray = mergeCrossTrackEdges(null, CONCEPTS);
    expect(nonArray.addEdges).toEqual([]);
    expect(nonArray.skipped).toBe(1);
    expect(mergeCrossTrackEdges([null, "x", { concept: 5 }], CONCEPTS).addEdges).toEqual([]);
  });
});
