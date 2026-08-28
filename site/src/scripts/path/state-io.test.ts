import { describe, it, expect } from "vitest";
import { serializeStateBundle, parseStateBundle, STATE_BUNDLE_VERSION } from "./state-io";

const parts = {
  knowledge: new Map([["tcp-handshake", { confidence: 1, source: "diagnostic" as const, lastAt: 5 }]]),
  config: { goals: [{ id: "senior-fullstack", priority: 1 }], weights: { masteryThreshold: 0.6 } },
  overrides: { addEdges: [], removeEdges: [{ concept: "a", requires: "b" }] },
  userState: { tier: "middle", progression: { xp: 10 } },
};

describe("state-io", () => {
  it("serialize → parse round-trips", () => {
    const b = serializeStateBundle(parts, 123);
    const r = parseStateBundle(JSON.stringify(b));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bundle.version).toBe(STATE_BUNDLE_VERSION);
      expect(r.bundle.exportedAt).toBe(123);
      expect(r.bundle.pathKnowledge).toEqual([["tcp-handshake", { confidence: 1, source: "diagnostic", lastAt: 5 }]]);
      expect(r.bundle.pathOverrides!.removeEdges).toEqual([{ concept: "a", requires: "b" }]);
    }
  });

  it("rejects a wrong version", () => {
    const r = parseStateBundle(JSON.stringify({ version: 99 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/version/i);
  });

  it("rejects non-JSON", () => {
    expect(parseStateBundle("not json").ok).toBe(false);
  });

  it("rejects a present-but-malformed pathKnowledge", () => {
    const r = parseStateBundle(JSON.stringify({ version: STATE_BUNDLE_VERSION, pathKnowledge: [["x", { nope: 1 }]] }));
    expect(r.ok).toBe(false);
  });

  it.each([
    { confidence: 2, source: "diagnostic", lastAt: 1 },
    { confidence: -0.1, source: "diagnostic", lastAt: 1 },
    { confidence: 0.5, source: "invented", lastAt: 1 },
    { confidence: 0.5, source: "diagnostic", lastAt: -1 },
  ])("rejects unsafe mastery records: $source/$confidence/$lastAt", (mastery) => {
    expect(parseStateBundle(JSON.stringify({ version: STATE_BUNDLE_VERSION, pathKnowledge: [["x", mastery]] })).ok).toBe(false);
  });

  it("rejects duplicate concept ids instead of silently taking the last value", () => {
    const mastery = { confidence: 0.5, source: "diagnostic", lastAt: 1 };
    expect(parseStateBundle(JSON.stringify({ version: STATE_BUNDLE_VERSION, pathKnowledge: [["x", mastery], ["x", mastery]] })).ok).toBe(false);
  });

  it("rejects malformed config and override collections", () => {
    expect(parseStateBundle(JSON.stringify({ version: STATE_BUNDLE_VERSION, pathConfig: { goals: "all" } })).ok).toBe(false);
    expect(parseStateBundle(JSON.stringify({ version: STATE_BUNDLE_VERSION, pathOverrides: { addEdges: [{ concept: 1, requires: "b" }] } })).ok).toBe(false);
  });

  it("tolerates a missing section", () => {
    const r = parseStateBundle(JSON.stringify({ version: STATE_BUNDLE_VERSION, pathOverrides: { addEdges: [], removeEdges: [] } }));
    expect(r.ok).toBe(true);
  });
});
