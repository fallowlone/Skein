// site/src/scripts/assess/session.ts
// The session as a pure reducer: state in, action in, new state out. The island owns
// timing, storage, and item selection; this file owns the rules — block budgets, hint
// tracking, and the state machine that lets a half-finished audit stop cleanly.
import type { ConceptGraph } from "~/scripts/path/graph";
import type { PoolIndex } from "./select";
import { applyResponse, propagate, type ResponseMeta } from "./update";
import type { AssessItem, AssessResponse, Band, Cell, CellKey, ItemKind } from "./types";

export const BLOCK_MAX_ITEMS = 10;
export const BLOCK_MAX_MIN = 15;

export const PHASES = ["scope", "asking", "block-verdict", "report"] as const;
export type Phase = (typeof PHASES)[number];

export interface AssessState {
  scope: string[];
  phase: Phase;
  cells: Map<CellKey, Cell>;
  asked: Set<string>;
  current: AssessItem | null;
  hintsUsed: 0 | 1 | 2;
  blockIndex: number;
  blockItems: number;
  blockMinutes: number;
  /** Kinds of the last two answered items, newest last — mirrors select.ts's fatigue rule. */
  recentKinds: ItemKind[];
  startedAtMs: number;
  updatedAtMs: number;
}

export type AssessAction =
  | { type: "serve"; item: AssessItem; atMs: number }
  | { type: "hint"; atMs: number }
  | { type: "answer"; response: AssessResponse; meta?: ResponseMeta; atMs: number }
  | { type: "next-block"; atMs: number }
  | { type: "stop"; atMs: number };

/**
 * Everything held constant for the life of a session, as opposed to `AssessState`,
 * which is what changes on every dispatch. `index` and `candidates` are not touched
 * by `reduce` itself — they exist here so the island can call select.ts's `nextItem`
 * with this same bag plus the mutable state fields it needs (`cells`, `asked` as
 * `askedIds`, `recentKinds`), and so `indexPool(pool)` runs exactly once per session
 * (on the ~6.5k-item corpus) rather than being rebuilt before every question.
 */
export interface SessionDeps {
  index: PoolIndex;
  candidates: readonly string[];
  bandOf: (conceptId: string) => Band;
  graph: ConceptGraph;
}

export function startSession(scope: string[], atMs: number): AssessState {
  return {
    scope,
    phase: "asking",
    cells: new Map(),
    asked: new Set(),
    current: null,
    hintsUsed: 0,
    blockIndex: 0,
    blockItems: 0,
    blockMinutes: 0,
    recentKinds: [],
    startedAtMs: atMs,
    updatedAtMs: atMs,
  };
}

export function reduce(state: AssessState, action: AssessAction, deps: SessionDeps): AssessState {
  switch (action.type) {
    case "serve":
      return { ...state, current: action.item, hintsUsed: 0, phase: "asking", updatedAtMs: action.atMs };

    case "hint":
      return { ...state, hintsUsed: Math.min(2, state.hintsUsed + 1) as 0 | 1 | 2, updatedAtMs: action.atMs };

    case "answer": {
      const item = state.current;
      if (!item) return state;

      let cells = applyResponse(state.cells, item, action.response, deps.bandOf, action.atMs, action.meta);
      for (const conceptId of item.concepts) {
        cells = propagate(cells, deps.graph, conceptId, item.facet, deps.bandOf);
      }

      const blockItems = state.blockItems + 1;
      const blockMinutes = state.blockMinutes + item.estMin;
      // A block ends at the item cap OR the minute budget, whichever comes first, and
      // only ever after a completed answer — never mid-question.
      const blockDone = blockItems >= BLOCK_MAX_ITEMS || blockMinutes >= BLOCK_MAX_MIN;

      return {
        ...state,
        cells,
        asked: new Set(state.asked).add(item.id),
        current: null,
        hintsUsed: 0,
        blockItems,
        blockMinutes,
        recentKinds: [...state.recentKinds, item.kind].slice(-2),
        phase: blockDone ? "block-verdict" : "asking",
        updatedAtMs: action.atMs,
      };
    }

    case "next-block":
      return {
        ...state,
        phase: "asking",
        blockIndex: state.blockIndex + 1,
        blockItems: 0,
        blockMinutes: 0,
        recentKinds: [],
        updatedAtMs: action.atMs,
      };

    case "stop":
      // Stopping mid-session moves straight to the report phase. It never invents
      // cells for concepts that were never asked — those simply do not exist in
      // `state.cells`, so the report can tell "measured" from "untested" apart.
      return { ...state, phase: "report", current: null, updatedAtMs: action.atMs };
  }
}
