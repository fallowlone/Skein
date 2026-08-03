// site/src/scripts/assess/session.test.ts
import { describe, expect, test } from "vitest";
import type { ConceptGraph } from "~/scripts/path/graph";
import { indexPool } from "./select";
import { reduce, startSession, BLOCK_MAX_ITEMS, BLOCK_MAX_MIN } from "./session";
import type { AssessItem } from "./types";

const item = (id: string, estMin = 4): AssessItem => ({
  id, lessonKey: "l", taskId: id, kind: "predict", facet: "mechanism",
  band: "surface", concepts: ["c"], weight: 1, estMin,
});

// Real ConceptGraph shape (nodes/requires/requiredBy) — the brief's sample used a
// stale `byId` field that does not exist on this type.
const graph: ConceptGraph = { nodes: new Map(), requires: new Map(), requiredBy: new Map() };

const deps = {
  index: indexPool([item("a"), item("b"), item("c2"), item("d"), item("e"), item("f"), item("g"), item("h")]),
  candidates: ["c"],
  bandOf: () => "surface" as const,
  graph,
};

describe("session", () => {
  test("a fresh session has no evidence and no verdicts", () => {
    const s = startSession(["backend"], 1000);
    expect(s.cells.size).toBe(0);
    expect(s.blockIndex).toBe(0);
    expect(s.asked.size).toBe(0);
  });

  test("answering records evidence and advances the block", () => {
    let s = startSession(["backend"], 1000);
    s = reduce(s, { type: "serve", item: item("a"), atMs: 1001 }, deps);
    s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: 0, elapsedMs: 500 }, atMs: 1002 }, deps);
    expect(s.asked.has("a")).toBe(true);
    expect(s.blockItems).toBe(1);
    expect([...s.cells.values()].some((c) => c.evidence.length === 1)).toBe(true);
  });

  test("a block closes at the item cap", () => {
    let s = startSession(["backend"], 0);
    for (let i = 0; i < BLOCK_MAX_ITEMS; i++) {
      s = reduce(s, { type: "serve", item: item(`i${i}`, 1), atMs: i }, deps);
      s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: 0, elapsedMs: 1 }, atMs: i }, deps);
    }
    expect(s.phase).toBe("block-verdict");
  });

  test("a block closes at the minute budget even with items left", () => {
    let s = startSession(["backend"], 0);
    s = reduce(s, { type: "serve", item: item("big", BLOCK_MAX_MIN + 1), atMs: 0 }, deps);
    s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: 0, elapsedMs: 1 }, atMs: 1 }, deps);
    expect(s.phase).toBe("block-verdict");
  });

  test("hints are recorded on the response, not swallowed", () => {
    let s = startSession(["backend"], 0);
    s = reduce(s, { type: "serve", item: item("a"), atMs: 0 }, deps);
    s = reduce(s, { type: "hint", atMs: 1 }, deps);
    s = reduce(s, { type: "hint", atMs: 2 }, deps);
    s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: s.hintsUsed, elapsedMs: 5 }, atMs: 3 }, deps);
    const ev = [...s.cells.values()].flatMap((c) => c.evidence);
    expect(ev[0].response.hintsUsed).toBe(2);
  });

  test("a third hint does not push hintsUsed past its 0|1|2 cap", () => {
    let s = startSession(["backend"], 0);
    s = reduce(s, { type: "serve", item: item("a"), atMs: 0 }, deps);
    s = reduce(s, { type: "hint", atMs: 1 }, deps);
    s = reduce(s, { type: "hint", atMs: 2 }, deps);
    s = reduce(s, { type: "hint", atMs: 3 }, deps); // third hint — must clamp, not overflow to 3
    expect(s.hintsUsed).toBe(2);
    s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: s.hintsUsed, elapsedMs: 5 }, atMs: 4 }, deps);
    const ev = [...s.cells.values()].flatMap((c) => c.evidence);
    expect(ev[0].response.hintsUsed).toBe(2);
  });

  test("abandoning leaves unasked concepts untested, not failed", () => {
    let s = startSession(["backend"], 0);
    s = reduce(s, { type: "serve", item: item("a"), atMs: 0 }, deps);
    s = reduce(s, { type: "answer", response: { outcome: "wrong", hintsUsed: 0, elapsedMs: 1 }, atMs: 1 }, deps);
    s = reduce(s, { type: "stop", atMs: 2 }, deps);
    expect(s.phase).toBe("report");
    expect(s.cells.has("never-asked::mechanism" as never)).toBe(false);
  });
});
