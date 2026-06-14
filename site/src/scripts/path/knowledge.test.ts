// site/src/scripts/path/knowledge.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import {
  emptyState, masteryOf, isKnown, applyDiagnostic, applyStudyEvidence, applySelfDeclare, decay,
  applyPracticeStruggle, PROP_UP_FACTOR,
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

  it("applyStudyEvidence: reading alone stays shaky; reading + graded practice crosses the threshold", () => {
    let s = applyStudyEvidence(emptyState(), ["indexing"], 1, 0, 0.35, 0.4, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.35, 5);   // touched only → below 0.6
    s = applyStudyEvidence(s, ["indexing"], 1, 1, 0.35, 0.4, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.75, 5);   // touched + done → known
  });

  it("applyStudyEvidence never lowers and never overrides diagnostic/declared evidence", () => {
    let s = applyDiagnostic(emptyState(), g, "indexing", 0.2, NOW); // failed quick-check
    s = applyStudyEvidence(s, ["indexing"], 1, 1, 0.35, 0.4, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.2, 5);          // diagnostic wins
    let s2 = applyStudyEvidence(emptyState(), ["mvcc"], 1, 1, 0.35, 0.4, NOW);
    s2 = applyStudyEvidence(s2, ["mvcc"], 0.5, 0, 0.35, 0.4, NOW); // weaker later evidence
    expect(masteryOf(s2, "mvcc")).toBeCloseTo(0.75, 5);            // never lowered
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

  it("an ambiguous diagnostic score in [FAIL_LOW, PASS_HIGH) propagates nothing", () => {
    const s = applyDiagnostic(emptyState(), g, "replication", 0.5, NOW);
    expect(masteryOf(s, "replication")).toBeCloseTo(0.5, 5);
    expect(masteryOf(s, "mvcc")).toBe(0);       // no ancestor lift
    expect(masteryOf(s, "consensus")).toBe(0);  // no descendant change
  });

  it("a passing diagnostic never lowers an ancestor already above the lift", () => {
    let s = applyDiagnostic(emptyState(), g, "mvcc", 1, NOW);   // mvcc = 1
    s = applyDiagnostic(s, g, "replication", 0.8, NOW);          // lift = 0.8*0.8 = 0.64 < 1
    expect(masteryOf(s, "mvcc")).toBe(1);                        // untouched, not lowered
  });

  it("declared knowledge also decays with age (uniform decay model)", () => {
    const s = applySelfDeclare(emptyState(), "mvcc", true, NOW); // confidence 1, source declared
    const stale = decay(s, g, NOW + 200 * 86_400_000, 0.85);
    expect(masteryOf(stale, "mvcc")).toBeCloseTo(0.85, 5);       // declared=1 fades to floor
  });
});

describe("applyPracticeStruggle (downward, bounded, activity-only)", () => {
  // floor=0.3, weight=0.25 throughout — mirrors path-io's refreshPracticeSignal constants.
  it("lowers an activity-sourced concept toward the floor by struggleFrac*weight", () => {
    let s = applyStudyEvidence(emptyState(), ["indexing"], 1, 1, 0.35, 0.4, NOW); // activity, 0.75
    s = applyPracticeStruggle(s, ["indexing"], 1, 0.3, 0.25, NOW);                // 0.75 - 1*0.25
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.5, 5);
    expect(s.get("indexing")!.source).toBe("activity");
  });

  it("never drops below the floor however high the struggle", () => {
    let s = applyStudyEvidence(emptyState(), ["indexing"], 1, 0, 0.35, 0.4, NOW); // activity, 0.35
    s = applyPracticeStruggle(s, ["indexing"], 1, 0.3, 0.25, NOW);                // 0.35 - 0.25 = 0.10 < floor
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.3, 5);                         // clamped to floor
  });

  it("never raises a concept that is already at or below the target", () => {
    let s = applyStudyEvidence(emptyState(), ["indexing"], 1, 0, 0.35, 0.4, NOW); // activity, 0.35
    const before = masteryOf(s, "indexing");
    s = applyPracticeStruggle(s, ["indexing"], 0.1, 0.3, 0.25, NOW);              // target 0.325 > floor; 0.35-0.025=0.325
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.325, 5);
    expect(masteryOf(s, "indexing")).toBeLessThanOrEqual(before);
  });

  it("leaves an absent concept untouched (never lifts 0 → floor)", () => {
    const s = applyPracticeStruggle(emptyState(), ["indexing"], 1, 0.3, 0.25, NOW);
    expect(s.has("indexing")).toBe(false);
    expect(masteryOf(s, "indexing")).toBe(0);
  });

  it("never touches diagnostic or declared evidence", () => {
    let s = applyDiagnostic(emptyState(), g, "indexing", 0.9, NOW);   // diagnostic
    s = applySelfDeclare(s, "mvcc", true, NOW);                       // declared
    s = applyPracticeStruggle(s, ["indexing", "mvcc"], 1, 0.3, 0.25, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.9, 5);
    expect(masteryOf(s, "mvcc")).toBeCloseTo(1, 5);
  });

  it("struggleFrac 0 is a no-op (returns the same reference)", () => {
    const base = applyStudyEvidence(emptyState(), ["indexing"], 1, 1, 0.35, 0.4, NOW);
    const after = applyPracticeStruggle(base, ["indexing"], 0, 0.3, 0.25, NOW);
    expect(after).toBe(base);
    expect(masteryOf(after, "indexing")).toBeCloseTo(0.75, 5);
  });
});
