// site/src/scripts/assess-apply-knowledge.test.ts
// C1/C2 (task-12-report.md fix round 1): coverage for the precedence rule
// documented at the top of assess-apply-knowledge.ts. localStorage is the real
// jsdom-polyfilled global (src/test-setup.ts) — each test clears it first so
// they stay independent.
import { describe, it, expect, beforeEach } from "vitest";
import { applyKnowledgeWrites, mayOverwrite } from "./assess-apply-knowledge";
import { applyStudyEvidence } from "./path/knowledge";
import type { KnowledgeState } from "./path/types";
import { emptyCell } from "./assess/update";
import { cellKey, type Cell, type CellKey, type Facet, type Posterior } from "./assess/types";
import type { KnowledgeWrite } from "./assess/report";

const KEY = "awesome.path-knowledge.v1";
const NOW = 1_000_000_000_000;

function seedStored(entries: [string, { confidence: number; source: string; lastAt: number }][]): void {
  localStorage.setItem(KEY, JSON.stringify(entries));
}
function readStored(): Map<string, { confidence: number; source: string; lastAt: number }> {
  return new Map(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
}

/** One evidence-bearing cell for `conceptId`/facet, `items` pieces of evidence,
 *  posterior controlling the resulting band confidence. */
function cellWith(conceptId: string, facet: Facet, posterior: Posterior, items: number): Cell {
  return {
    ...emptyCell(conceptId, facet, "surface"),
    posterior,
    items,
    evidence: Array.from({ length: items }, (_, i) => ({
      conceptId, facet, itemId: `i${i}`, lessonKey: "databases/01-x/01-y", kind: "recall" as const, band: "surface" as const,
      response: { outcome: "wrong" as const, hintsUsed: 0 as const, elapsedMs: 1 },
      answerDigest: "", atMs: NOW,
    })),
  };
}

// Weak: 1 item, flat/undecided posterior (band confidence well under 0.4) — the
// real failure mode: one dont_know on a multi-concept item.
const weakCell = (conceptId: string): Map<CellKey, Cell> =>
  new Map([[cellKey(conceptId, "mechanism"), cellWith(conceptId, "mechanism", [0.36, 0.3, 0.22, 0.12], 1)]]);

// Strong: 3 items, a decisive posterior (band confidence well over 0.4).
const strongCell = (conceptId: string): Map<CellKey, Cell> =>
  new Map([[cellKey(conceptId, "mechanism"), cellWith(conceptId, "mechanism", [0.05, 0.1, 0.15, 0.7], 3)]]);

const write = (conceptId: string, confidence = 0.429): KnowledgeWrite => ({
  conceptId, confidence, source: "assess", lastAt: NOW,
});

beforeEach(() => {
  localStorage.clear();
});

describe("mayOverwrite (pure precedence check)", () => {
  it("always allows landing on no prior entry", () => {
    expect(mayOverwrite(undefined, new Map(), "x")).toBe(true);
  });
  it("always allows landing on activity/review/pretest", () => {
    for (const source of ["activity", "review", "pretest"]) {
      expect(mayOverwrite({ source }, new Map(), "x")).toBe(true);
    }
  });
  it("always allows landing on a prior assess entry (same instrument, fresher wins)", () => {
    expect(mayOverwrite({ source: "assess" }, new Map(), "x")).toBe(true);
  });
  it("blocks declared/diagnostic when the new measurement is weak", () => {
    expect(mayOverwrite({ source: "declared" }, weakCell("x"), "x")).toBe(false);
    expect(mayOverwrite({ source: "diagnostic" }, weakCell("x"), "x")).toBe(false);
  });
  it("allows declared/diagnostic to be overwritten when the new measurement is strong enough", () => {
    expect(mayOverwrite({ source: "declared" }, strongCell("x"), "x")).toBe(true);
    expect(mayOverwrite({ source: "diagnostic" }, strongCell("x"), "x")).toBe(true);
  });
});

describe("applyKnowledgeWrites", () => {
  it("writes a concept with no prior entry", () => {
    const n = applyKnowledgeWrites([write("mvcc")], weakCell("mvcc"), ["mvcc"]);
    expect(n).toBe(1);
    expect(readStored().get("mvcc")).toMatchObject({ source: "assess" });
  });

  it("rule 1 — an out-of-scope concept is never written", () => {
    seedStored([["mvcc", { confidence: 0.5, source: "activity", lastAt: 0 }]]);
    const n = applyKnowledgeWrites([write("mvcc")], weakCell("mvcc"), ["some-other-concept"]);
    expect(n).toBe(0);
    expect(readStored().get("mvcc")).toMatchObject({ confidence: 0.5, source: "activity" });
  });

  it("rule 2 — freely overwrites activity/review/pretest", () => {
    seedStored([["mvcc", { confidence: 0.7, source: "activity", lastAt: 0 }]]);
    const n = applyKnowledgeWrites([write("mvcc", 0.1)], weakCell("mvcc"), ["mvcc"]);
    expect(n).toBe(1);
    expect(readStored().get("mvcc")).toMatchObject({ confidence: 0.1, source: "assess" });
  });

  it("rule 3 — a repeat assess run always supersedes the prior one, weak or not", () => {
    seedStored([["mvcc", { confidence: 0.9, source: "assess", lastAt: 0 }]]);
    const n = applyKnowledgeWrites([write("mvcc", 0.05)], weakCell("mvcc"), ["mvcc"]);
    expect(n).toBe(1);
    expect(readStored().get("mvcc")).toMatchObject({ confidence: 0.05, source: "assess" });
  });

  it("rule 4 — a weak write does not overwrite a stronger prior signal (declared)", () => {
    seedStored([["mvcc", { confidence: 1, source: "declared", lastAt: 0 }]]);
    const n = applyKnowledgeWrites([write("mvcc")], weakCell("mvcc"), ["mvcc"]);
    expect(n).toBe(0);
    expect(readStored().get("mvcc")).toMatchObject({ confidence: 1, source: "declared" });
  });

  it("rule 4 — a weak write does not overwrite a stronger prior signal (diagnostic)", () => {
    seedStored([["mvcc", { confidence: 0.9, source: "diagnostic", lastAt: 0 }]]);
    const n = applyKnowledgeWrites([write("mvcc")], weakCell("mvcc"), ["mvcc"]);
    expect(n).toBe(0);
    expect(readStored().get("mvcc")).toMatchObject({ confidence: 0.9, source: "diagnostic" });
  });

  it("rule 4 — a genuinely strong write DOES overwrite declared/diagnostic", () => {
    seedStored([
      ["mvcc", { confidence: 1, source: "declared", lastAt: 0 }],
      ["indexing", { confidence: 0.9, source: "diagnostic", lastAt: 0 }],
    ]);
    const cells = new Map([...strongCell("mvcc"), ...strongCell("indexing")]);
    const n = applyKnowledgeWrites([write("mvcc", 0.1), write("indexing", 0.1)], cells, ["mvcc", "indexing"]);
    expect(n).toBe(2);
    expect(readStored().get("mvcc")).toMatchObject({ confidence: 0.1, source: "assess" });
    expect(readStored().get("indexing")).toMatchObject({ confidence: 0.1, source: "assess" });
  });

  // The reported failure mode: one `dont_know` on a 6-concept item (weight 1/6)
  // produces six writes, each backed by only 1 item of weak evidence. None of
  // them should be able to overwrite a `declared` 1.0 across the six concepts
  // it happens to touch — the write must not fan out authority it has not earned.
  it("multi-concept low-weight write does not fan out authority across all six concepts", () => {
    const conceptIds = ["a", "b", "c", "d", "e", "f"];
    seedStored(conceptIds.map((id) => [id, { confidence: 1, source: "declared", lastAt: 0 }] as const));
    const cells = new Map(conceptIds.flatMap((id) => [...weakCell(id)]));
    const writes = conceptIds.map((id) => write(id, 0.429));
    const n = applyKnowledgeWrites(writes, cells, conceptIds);
    expect(n).toBe(0);
    for (const id of conceptIds) {
      expect(readStored().get(id)).toMatchObject({ confidence: 1, source: "declared" });
    }
  });

  // C3 (REPLAN-BRIEF.md): STUDY_PROTECTED no longer includes "assess" — a
  // permanently-stuck false gap (only fixable by re-running /assess or
  // /calibrate) was worse than letting genuine higher study evidence raise it.
  it("an assess gap is raised by a subsequent study touch that exceeds it (integration with knowledge.ts)", () => {
    const n = applyKnowledgeWrites([write("indexing", 0.1)], weakCell("indexing"), ["indexing"]);
    expect(n).toBe(1);

    // Load the written state into a KnowledgeState the way path-io.ts would,
    // then run the SAME activity-evidence function real lesson-touch/practice
    // triggers, and confirm it raises and relabels the assess entry.
    const stored = readStored();
    let knowledge: KnowledgeState = new Map(
      [...stored.entries()].map(([id, m]) => [id, { confidence: m.confidence, source: m.source as never, lastAt: m.lastAt }]),
    );
    knowledge = applyStudyEvidence(knowledge, ["indexing"], 1, 1, 0.35, 0.4, NOW); // sets 0.75
    expect(knowledge.get("indexing")!.confidence).toBeCloseTo(0.75, 5);
    expect(knowledge.get("indexing")!.source).toBe("activity");
  });

  it("no-op on an empty write list", () => {
    expect(applyKnowledgeWrites([], new Map(), [])).toBe(0);
  });
});
