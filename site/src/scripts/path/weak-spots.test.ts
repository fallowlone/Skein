import { describe, it, expect } from "vitest";
import type { KnowledgeState } from "./types";
import { buildConceptGraph } from "./graph";
import { rankWeakSpots, remediationScope, type WeakSpotInputs } from "./weak-spots";

const K = (pairs: Record<string, number>): KnowledgeState =>
  new Map(Object.entries(pairs).map(([id, confidence]) => [id, { confidence, source: "activity" as const, lastAt: 0 }]));

const base = (over: Partial<WeakSpotInputs> = {}): WeakSpotInputs => ({
  frontier: new Set(["paxos", "mvcc"]),
  knowledge: K({ paxos: 0.2, mvcc: 0.2 }),
  masteryThreshold: 0.6,
  teachesByUnit: new Map([["distributed/01", ["paxos"]], ["databases/01", ["mvcc"]]]),
  struggleByUnit: new Map(),
  struggleByConcept: new Map(),
  healthByUnit: new Map(),
  ...over,
});

describe("rankWeakSpots", () => {
  it("surfaces a unit teaching a below-mastery frontier concept WITH struggle evidence", () => {
    const r = rankWeakSpots(base({ struggleByUnit: new Map([["distributed/01", { struggleFrac: 0.5, doneFrac: 1 }]]) }));
    expect(r.map((w) => w.unitId)).toEqual(["distributed/01"]);
    expect(r[0].weakConceptCount).toBe(1);
    expect(r[0].score).toBeGreaterThan(0);
  });
  it("excludes a unit whose frontier concept is already mastered, even with struggle", () => {
    const r = rankWeakSpots(base({ knowledge: K({ paxos: 0.9, mvcc: 0.2 }), struggleByUnit: new Map([["distributed/01", { struggleFrac: 0.9, doneFrac: 1 }]]) }));
    expect(r.map((w) => w.unitId)).not.toContain("distributed/01");
  });
  it("excludes a unit teaching only off-frontier concepts", () => {
    const r = rankWeakSpots(base({ teachesByUnit: new Map([["react/01", ["hooks"]]]), struggleByUnit: new Map([["react/01", { struggleFrac: 0.9, doneFrac: 1 }]]) }));
    expect(r).toHaveLength(0);
  });
  it("excludes a below-mastery frontier unit with NO failure signal (just unlearned)", () => {
    const r = rankWeakSpots(base()); // no struggle, no lapses
    expect(r).toHaveLength(0);
  });
  it("counts SRS lapses (low health) as failure evidence", () => {
    const r = rankWeakSpots(base({ healthByUnit: new Map([["databases/01", 0.25]]) })); // lapseFrac 0.75
    expect(r.map((w) => w.unitId)).toEqual(["databases/01"]);
    expect(r[0].lapseFrac).toBeCloseTo(0.75);
  });
  it("ranks by struggle×weakCount desc and caps at topK", () => {
    const inp = base({
      frontier: new Set(["paxos", "mvcc", "raft"]),
      knowledge: K({ paxos: 0.1, mvcc: 0.1, raft: 0.1 }),
      teachesByUnit: new Map([["distributed/01", ["paxos", "raft"]], ["databases/01", ["mvcc"]]]),
      struggleByUnit: new Map([["distributed/01", { struggleFrac: 0.4, doneFrac: 1 }], ["databases/01", { struggleFrac: 0.9, doneFrac: 1 }]]),
    });
    const r = rankWeakSpots(inp, { topK: 1 });
    expect(r).toHaveLength(1);
    // distributed/01: 0.4 * 2 weak concepts = 0.8 ; databases/01: 0.9 * 1 = 0.9 → databases first
    expect(r[0].unitId).toBe("databases/01");
  });

  it("maps explicit concept failure to the unit that teaches that concept", () => {
    const r = rankWeakSpots(base({
      frontier: new Set(["paxos", "mvcc"]),
      struggleByConcept: new Map([["mvcc", { doneFrac: 0, struggleFrac: 1 }]]),
    }));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ unitId: "databases/01", conceptId: "mvcc", conceptStruggleFrac: 1 });
  });

  it("shows one corrective unit when the same failed concept is taught in several units", () => {
    const r = rankWeakSpots(base({
      frontier: new Set(["mvcc"]),
      teachesByUnit: new Map([["databases/01", ["mvcc"]], ["databases/02", ["mvcc"]]]),
      struggleByConcept: new Map([["mvcc", { doneFrac: 0, struggleFrac: 1 }]]),
    }));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ unitId: "databases/01", conceptId: "mvcc" });
  });
});

describe("remediationScope", () => {
  it("includes prerequisite concepts even when only the dependent concept is a goal target", () => {
    const graph = buildConceptGraph([
      { id: "tcp", label: { en: "TCP", ru: "TCP" }, track: "networking", band: "surface", requires: [] },
      { id: "tls", label: { en: "TLS", ru: "TLS" }, track: "networking", band: "middle", requires: ["tcp"] },
    ] as any);
    expect(remediationScope(["tls"], graph)).toEqual(new Set(["tls", "tcp"]));
  });

  it("turns failure on an explicit prerequisite concept into its corrective unit", () => {
    const graph = buildConceptGraph([
      { id: "tcp", label: { en: "TCP", ru: "TCP" }, track: "networking", band: "surface", requires: [] },
      { id: "tls", label: { en: "TLS", ru: "TLS" }, track: "networking", band: "middle", requires: ["tcp"] },
    ] as any);
    const r = rankWeakSpots({
      frontier: remediationScope(["tls"], graph),
      knowledge: K({ tcp: 0.2, tls: 0.2 }),
      masteryThreshold: 0.6,
      teachesByUnit: new Map([["networking/03-tcp", ["tcp"]], ["networking/05-tls", ["tls"]]]),
      struggleByUnit: new Map(),
      struggleByConcept: new Map([["tcp", { doneFrac: 0, struggleFrac: 1 }]]),
      healthByUnit: new Map(),
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ unitId: "networking/03-tcp", conceptId: "tcp" });
  });
});
