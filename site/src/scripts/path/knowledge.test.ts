// site/src/scripts/path/knowledge.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import {
  emptyState, masteryOf, isKnown, applyDiagnostic, applyActivity, applySelfDeclare, decay,
  ACTIVITY_CAP, PROP_UP_FACTOR,
} from "./knowledge";

const g = buildConceptGraph(CONCEPTS);
const NOW = 1_000_000_000_000;

describe("knowledge", () => {
  it("masteryOf is 0 for an untouched concept", () => {
    expect(masteryOf(emptyState(), "tcp-handshake")).toBe(0);
  });

  it("applyDiagnostic sets confidence and lifts prereqs (down the closure)", () => {
    const s = applyDiagnostic(emptyState(), g, "replication", 1, NOW);
    expect(masteryOf(s, "replication")).toBe(1);
    // passing an advanced concept lifts every prereq to >= correctFrac*PROP_UP_FACTOR
    expect(masteryOf(s, "tcp-handshake")).toBeCloseTo(PROP_UP_FACTOR, 5);
    expect(masteryOf(s, "mvcc")).toBeCloseTo(PROP_UP_FACTOR, 5);
    expect(masteryOf(s, "ip-addressing")).toBeCloseTo(PROP_UP_FACTOR, 5);
  });

  it("a failed basic concept lowers its dependents (up the closure)", () => {
    let s = applyDiagnostic(emptyState(), g, "tls", 0.9, NOW); // tls high
    s = applyDiagnostic(s, g, "tcp-handshake", 0.1, NOW);       // but fail the prereq
    expect(masteryOf(s, "tls")).toBeLessThanOrEqual(0.1);       // dependent dragged down
  });

  it("applyActivity bumps taught concepts but never above ACTIVITY_CAP nor over diagnostic evidence", () => {
    let s = applyActivity(emptyState(), ["indexing"], 1, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(ACTIVITY_CAP, 5);
    s = applyDiagnostic(s, g, "indexing", 0.95, NOW);   // stronger evidence wins
    s = applyActivity(s, ["indexing"], 1, NOW);          // activity must not lower it
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.95, 5);
  });

  it("applySelfDeclare marks known/unknown", () => {
    const s = applySelfDeclare(emptyState(), "mvcc", true, NOW);
    expect(isKnown(s, "mvcc", 0.6)).toBe(true);
    const s2 = applySelfDeclare(s, "mvcc", false, NOW);
    expect(isKnown(s2, "mvcc", 0.6)).toBe(false);
  });

  it("decay erodes stale confidence toward the floor, fresh is untouched", () => {
    const s = applyDiagnostic(emptyState(), g, "indexing", 1, NOW);
    const fresh = decay(s, g, NOW + 10 * 86_400_000, 0.85);
    expect(masteryOf(fresh, "indexing")).toBe(1);                 // < 30d: no decay
    const stale = decay(s, g, NOW + 200 * 86_400_000, 0.85);
    expect(masteryOf(stale, "indexing")).toBeCloseTo(0.85, 5);    // >= 120d: floor
  });
});
