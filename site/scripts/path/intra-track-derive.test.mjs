import { describe, it, expect } from "vitest";
import { deriveIntraTrackEdges } from "./intra-track-derive.mjs";

// One databases unit, three lessons. 01 introduces b-tree+page; 02 introduces index-scan (reuses
// b-tree) and prereqs 01; 03 introduces hash-join (reuses index-scan) and prereqs 02 + a missing slug.
const UNITS = [{
  id: "databases/01-x", track: "databases", order: 1, unitSlug: "01-x",
  lessons: [
    { slug: "01-basics", concepts: ["b-tree", "page"], prereqs: [] },
    { slug: "02-index", concepts: ["index-scan", "b-tree"], prereqs: ["01-basics"] },
    { slug: "03-join", concepts: ["hash-join", "index-scan"], prereqs: ["02-index", "99-missing"] },
  ],
}];

describe("deriveIntraTrackEdges", () => {
  it("links each lesson's new concepts to the prereq lesson's anchor; skips reused concepts", () => {
    const { edges } = deriveIntraTrackEdges(UNITS);
    const pairs = edges.map((e) => `${e.concept}->${e.requires}`).sort();
    // 02-index new=[index-scan] → anchor(01-basics)=b-tree ; 03-join new=[hash-join] → anchor(02-index)=index-scan
    expect(pairs).toEqual(["hash-join->index-scan", "index-scan->b-tree"]);
    // a reused concept (b-tree in 02) never becomes a NEW edge source
    expect(edges.find((e) => e.concept === "b-tree")).toBeUndefined();
    // `via` provenance: "<consumerLesson.slug><-<prereqLesson.slug>"
    expect(edges.find((e) => e.concept === "index-scan")?.via).toBe("02-index<-01-basics");
  });

  it("tags edges with the lesson track and warns on an unresolved sibling prereq", () => {
    const { edges, warnings } = deriveIntraTrackEdges(UNITS);
    expect(edges.every((e) => e.track === "databases")).toBe(true);
    expect(warnings.some((w) => w.includes("99-missing"))).toBe(true);
  });

  it("drops a forward (cycle-forming) prereq — anchor must be strictly earlier", () => {
    const FWD = [{
      id: "t/01", track: "t", order: 1, unitSlug: "01",
      lessons: [
        { slug: "01-a", concepts: ["a"], prereqs: ["02-b"] }, // forward: 01 declares 02 as prereq
        { slug: "02-b", concepts: ["b"], prereqs: [] },
      ],
    }];
    expect(deriveIntraTrackEdges(FWD).edges).toEqual([]);
  });

  it("dedupes identical (concept, anchor) pairs arising from multiple prereqs", () => {
    const U = [{
      id: "t/01", track: "t", order: 1, unitSlug: "01",
      lessons: [
        { slug: "01-a", concepts: ["a"], prereqs: [] },
        { slug: "02-b", concepts: ["b"], prereqs: ["01-a"] }, // anchor = a (b is new, a is anchor of 01-a)
        { slug: "03-c", concepts: ["c"], prereqs: ["01-a", "02-b"] }, // 01-a anchor=a, 02-b anchor=b → c->a, c->b
      ],
    }];
    const { edges } = deriveIntraTrackEdges(U);
    const pairs = edges.map((e) => `${e.concept}->${e.requires}`).sort();
    // c->a (via 01-a) and c->b (via 02-b); b->a (02-b new b → anchor of 01-a = a)
    expect(pairs).toEqual(["b->a", "c->a", "c->b"]);
    // no duplicate edges
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("falls back to the first listed concept when a prereq lesson introduces nothing new", () => {
    const FB = [{
      id: "t/01", track: "t", order: 1, unitSlug: "01",
      lessons: [
        { slug: "01-a", concepts: ["x"], prereqs: [] },
        { slug: "02-b", concepts: ["x"], prereqs: [] },        // reuses x, introduces nothing new
        { slug: "03-c", concepts: ["y"], prereqs: ["02-b"] },  // anchor(02-b) falls back to x
      ],
    }];
    expect(deriveIntraTrackEdges(FB).edges.map((e) => `${e.concept}->${e.requires}`)).toEqual(["y->x"]);
  });

  it("resolves a fully-qualified cross-unit path prereq to the target lesson's anchor", () => {
    const XUNIT = [
      { id: "db/01-basics", track: "db", order: 1, unitSlug: "01-basics",
        lessons: [{ slug: "01-intro", concepts: ["b-tree"], prereqs: [] }] },
      { id: "db/02-adv", track: "db", order: 2, unitSlug: "02-adv",
        lessons: [{ slug: "01-deep", concepts: ["lsm-tree"], prereqs: ["db/01-basics/01-intro"] }] },
    ];
    const { edges } = deriveIntraTrackEdges(XUNIT);
    expect(edges.map((e) => `${e.concept}->${e.requires}`)).toEqual(["lsm-tree->b-tree"]);
    // cross-unit `via` carries the target unit for provenance
    expect(edges[0].via).toBe("01-deep<-db/01-basics/01-intro");
    expect(edges[0].track).toBe("db");
  });

  it("skips a cross-track path prereq (out of scope; handled by cross-track curation)", () => {
    const XTRACK = [
      { id: "net/01", track: "net", order: 1, unitSlug: "01",
        lessons: [{ slug: "01-tcp", concepts: ["tcp"], prereqs: [] }] },
      // db unit ordered AFTER net so the ref is cycle-valid; it must still be skipped for being cross-track.
      { id: "db/01", track: "db", order: 2, unitSlug: "01",
        lessons: [{ slug: "01-q", concepts: ["query"], prereqs: ["net/01/01-tcp"] }] },
    ];
    const { edges, warnings } = deriveIntraTrackEdges(XTRACK);
    expect(edges).toEqual([]);
    expect(warnings.some((w) => w.includes("cross-track"))).toBe(true);
  });

  it("skips a bare cross-unit slug that is not a sibling", () => {
    const BARE = [
      { id: "t/01", track: "t", order: 1, unitSlug: "01",
        lessons: [{ slug: "01-a", concepts: ["a"], prereqs: [] }] },
      { id: "t/02", track: "t", order: 2, unitSlug: "02",
        lessons: [{ slug: "05-b", concepts: ["b"], prereqs: ["01-a"] }] }, // bare "01-a" lives in unit 01, not a sibling
    ];
    const { edges, warnings } = deriveIntraTrackEdges(BARE);
    expect(edges).toEqual([]);
    expect(warnings.some((w) => w.includes("01-a"))).toBe(true);
  });
});
