// site/src/scripts/assess-io.test.ts
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { AssessState } from "./assess/session";
import type { Cell, CellKey } from "./assess/types";
import { ASSESS_KEY, clearSession, loadSession, saveSession } from "./assess-io";

// A minimal in-memory Storage — not jsdom's built-in localStorage — so this test
// proves the round-trip against the Storage contract itself, not a browser.
class FakeStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const realLocalStorage = globalThis.localStorage;

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new FakeStorage(), configurable: true });
});
afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: realLocalStorage, configurable: true });
});

const cell = (conceptId: string): Cell => ({
  conceptId,
  facet: "mechanism",
  posterior: [0.1, 0.2, 0.3, 0.4],
  items: 2,
  evidence: [
    {
      conceptId,
      facet: "mechanism",
      itemId: "l#t1",
      lessonKey: "l",
      kind: "predict",
      band: "surface",
      response: { outcome: "correct", hintsUsed: 1, elapsedMs: 900 },
      answerDigest: "chose B",
      atMs: 500,
    },
  ],
});

describe("assess-io round trip", () => {
  test("save then load preserves cells, evidence, and asked ids, and current comes back null", () => {
    const state: AssessState = {
      scope: ["backend"],
      phase: "asking",
      cells: new Map<CellKey, Cell>([["concept-a::mechanism" as CellKey, cell("concept-a")]]),
      asked: new Set(["l#t1"]),
      current: { // mid-question at save time — this must not survive the round trip
        id: "l#t2", lessonKey: "l", taskId: "t2", kind: "predict", facet: "mechanism",
        band: "surface", concepts: ["concept-a"], weight: 1, estMin: 4,
      },
      hintsUsed: 1,
      blockIndex: 2,
      blockItems: 3,
      blockMinutes: 12,
      recentKinds: ["predict", "mcq"],
      startedAtMs: 1000,
      updatedAtMs: 2000,
    };

    saveSession(state);
    const restored = loadSession();

    expect(restored).not.toBeNull();
    expect(restored!.current).toBeNull(); // a reload cannot restore the in-flight question
    expect(restored!.asked.has("l#t1")).toBe(true);
    expect(restored!.cells.size).toBe(1);
    const restoredCell = restored!.cells.get("concept-a::mechanism" as CellKey);
    expect(restoredCell?.evidence.length).toBe(1);
    expect(restoredCell?.evidence[0].response.hintsUsed).toBe(1);
    expect(restoredCell?.evidence[0].itemId).toBe("l#t1");
  });

  test("loadSession returns null when nothing was saved", () => {
    expect(loadSession()).toBeNull();
  });

  test("a session saved mid-block restores its block-budget counters, not zeroed", () => {
    const state: AssessState = {
      scope: ["backend"], phase: "asking", cells: new Map(), asked: new Set(["l#t1", "l#t2"]),
      current: null, hintsUsed: 0, blockIndex: 1, blockItems: 4, blockMinutes: 7,
      recentKinds: ["predict"], startedAtMs: 1000, updatedAtMs: 1500,
    };
    saveSession(state);
    const restored = loadSession();
    expect(restored?.blockItems).toBe(4);
    expect(restored?.blockMinutes).toBe(7);
    expect(restored?.current).toBeNull(); // still can't restore the in-flight question
  });

  test("a corrupt cell entry is dropped, not trusted whole, while sound cells survive", () => {
    const goodCell = cell("concept-a");
    // Three ways a stored cell can be corrupt: a posterior that doesn't sum to 1,
    // a posterior with the wrong arity, and an entry that isn't a [key, cell] pair
    // at all. Each must be dropped individually rather than poisoning the load.
    const badSumCell = { ...cell("concept-b"), posterior: [0, 0, 0, 0] };
    const badArityCell = { ...cell("concept-c"), posterior: [0.5, 0.5, 0] };
    const rawPayload = {
      scope: ["backend"],
      phase: "asking",
      cells: [
        ["concept-a::mechanism", goodCell],
        ["concept-b::mechanism", badSumCell],
        ["concept-c::mechanism", badArityCell],
        "not-a-pair",
      ],
      asked: ["l#t1"],
      blockIndex: 0,
      blockItems: 0,
      blockMinutes: 0,
      startedAtMs: 0,
      updatedAtMs: 0,
    };
    localStorage.setItem(ASSESS_KEY, JSON.stringify(rawPayload));

    const restored = loadSession();
    expect(restored).not.toBeNull();
    expect(restored!.cells.size).toBe(1);
    expect(restored!.cells.has("concept-a::mechanism" as CellKey)).toBe(true);
    expect(restored!.cells.has("concept-b::mechanism" as CellKey)).toBe(false);
    expect(restored!.cells.has("concept-c::mechanism" as CellKey)).toBe(false);
  });

  test("clearSession removes the stored blob", () => {
    const state: AssessState = {
      scope: [], phase: "report", cells: new Map(), asked: new Set(), current: null,
      hintsUsed: 0, blockIndex: 0, blockItems: 0, blockMinutes: 0, recentKinds: [],
      startedAtMs: 0, updatedAtMs: 0,
    };
    saveSession(state);
    expect(localStorage.getItem(ASSESS_KEY)).not.toBeNull();
    clearSession();
    expect(localStorage.getItem(ASSESS_KEY)).toBeNull();
  });
});
