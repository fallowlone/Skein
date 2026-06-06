import { describe, it, expect } from "vitest";
import { mergeIntraTrackEdges } from "./intra-track-merge.mjs";

// a,c,d in track x; b in track y. c already carries a base spine edge c->a.
const CONCEPTS = [
  { id: "a", track: "x", requires: [] },
  { id: "b", track: "y", requires: [] },
  { id: "c", track: "x", requires: ["a"] },
  { id: "d", track: "x", requires: [] },
];

describe("mergeIntraTrackEdges", () => {
  it("keeps a valid intra-track edge", () => {
    const r = mergeIntraTrackEdges([{ concept: "a", requires: "d" }], CONCEPTS);
    expect(r.addEdges).toEqual([{ concept: "a", requires: "d" }]);
    expect(r.skipped).toBe(0);
  });
  it("drops cross-track edges", () => {
    const r = mergeIntraTrackEdges([{ concept: "a", requires: "b" }], CONCEPTS);
    expect(r.addEdges).toEqual([]);
    expect(r.skipped).toBe(1);
  });
  it("skips unknown ids and self-loops", () => {
    const r = mergeIntraTrackEdges([{ concept: "a", requires: "ghost" }, { concept: "a", requires: "a" }], CONCEPTS);
    expect(r.addEdges).toEqual([]);
    expect(r.skipped).toBe(2);
  });
  it("drops a spine-dup (edge already in the concept's base requires)", () => {
    const r = mergeIntraTrackEdges([{ concept: "c", requires: "a" }], CONCEPTS);
    expect(r.addEdges).toEqual([]);
    expect(r.skipped).toBe(1);
  });
  it("dedupes repeated edges", () => {
    const r = mergeIntraTrackEdges([{ concept: "a", requires: "d" }, { concept: "a", requires: "d" }], CONCEPTS);
    expect(r.addEdges).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });
  it("tolerates non-array / junk elements", () => {
    expect(mergeIntraTrackEdges(null, CONCEPTS).addEdges).toEqual([]);
    expect(mergeIntraTrackEdges([null, "x", { concept: 5 }], CONCEPTS).addEdges).toEqual([]);
  });
});
