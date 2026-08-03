// site/src/scripts/assess-io.ts
// The only place assessment session state touches localStorage. Mirrors
// review-state.ts: its own key, a defensive parse that drops anything malformed,
// and a silent degrade (private mode / quota) — a broken store never crashes the
// audit, it just means the session will not resume across a reload.
import { PHASES, type AssessState } from "./assess/session";
import { FACETS, type Cell, type CellKey, type Posterior } from "./assess/types";

export const ASSESS_KEY = "atlas.assess.v1";

interface Serialized {
  scope: string[];
  phase: AssessState["phase"];
  cells: [CellKey, Cell][];
  asked: string[];
  blockIndex: number;
  // Persisted so a reload mid-block still enforces BLOCK_MAX_ITEMS / BLOCK_MAX_MIN —
  // without these the budget silently stops binding for the rest of that block.
  blockItems: number;
  blockMinutes: number;
  startedAtMs: number;
  updatedAtMs: number;
}

// Shape-level check on the envelope: are the top-level fields even the right kind
// of thing (arrays where arrays are expected, a real phase literal, numbers where
// numbers are expected)? This is all-or-nothing — if `asked` isn't an array there
// is no coherent session to partially salvage, so the whole blob is dropped, same
// as review-state.ts's isCard() drops a whole malformed card.
//
// Cell *contents*, unlike a card, are not independent of each other, but a single
// bad cell is still cheap to lose and expensive to keep: see isValidCellEntry
// below, which is applied per-entry rather than rejecting the whole session over
// one corrupt cell.
function isSerialized(p: unknown): p is Serialized {
  if (!p || typeof p !== "object") return false;
  const s = p as Serialized;
  return (
    Array.isArray(s.scope) &&
    (PHASES as readonly string[]).includes(s.phase) &&
    Array.isArray(s.cells) &&
    Array.isArray(s.asked) &&
    typeof s.blockIndex === "number" &&
    typeof s.blockItems === "number" &&
    typeof s.blockMinutes === "number" &&
    typeof s.startedAtMs === "number" &&
    typeof s.updatedAtMs === "number"
  );
}

// A posterior that has been through JSON is still the same doubles it started as
// (JSON round-trips IEEE-754 losslessly), so the sum-to-1 check only needs enough
// slack to absorb normalize()'s own floating-point rounding, not storage noise.
const POSTERIOR_SUM_EPSILON = 1e-6;

function isValidPosterior(p: unknown): p is Posterior {
  return (
    Array.isArray(p) &&
    p.length === 4 &&
    p.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    Math.abs((p as number[]).reduce((a, b) => a + b, 0) - 1) <= POSTERIOR_SUM_EPSILON
  );
}

/**
 * Per-cell validation, the way review-state.ts's isCard() validates per-card:
 * the key is a string, the cell has a string conceptId, a real facet, a numeric
 * items count, an evidence array, and a posterior that is exactly a 4-tuple of
 * finite numbers summing to ~1. A cell failing any of this is dropped — one bad
 * cell is dropped, not the whole session — because a corrupt posterior fed
 * straight into the Bayes update or the report is a wrong measurement that looks
 * legitimate, the worst failure mode this engine has. Rejecting the entire blob
 * over one bad cell would also throw away everything else the learner answered
 * honestly; dropping just the bad entry keeps a smaller but still honest
 * measurement, which is the one this engine promises.
 */
function isValidCellEntry(entry: unknown): entry is [CellKey, Cell] {
  if (!Array.isArray(entry) || entry.length !== 2) return false;
  const [key, cell] = entry as [unknown, unknown];
  if (typeof key !== "string") return false;
  if (!cell || typeof cell !== "object") return false;
  const c = cell as Cell;
  return (
    typeof c.conceptId === "string" &&
    (FACETS as readonly string[]).includes(c.facet) &&
    typeof c.items === "number" &&
    Array.isArray(c.evidence) &&
    isValidPosterior(c.posterior)
  );
}

export function saveSession(state: AssessState): void {
  try {
    const payload: Serialized = {
      scope: state.scope,
      phase: state.phase,
      cells: [...state.cells.entries()],
      asked: [...state.asked],
      blockIndex: state.blockIndex,
      blockItems: state.blockItems,
      blockMinutes: state.blockMinutes,
      startedAtMs: state.startedAtMs,
      updatedAtMs: state.updatedAtMs,
    };
    localStorage.setItem(ASSESS_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota — the session still works, it just will not resume */
  }
}

/**
 * Reconstructs a session from storage. `current` always comes back `null`: a
 * reload cannot restore the exact question the learner was mid-way through (its
 * on-screen state — a half-typed answer, a revealed hint — never made it to
 * storage), so the flow must re-serve rather than pretend to resume it. Everything
 * that IS measurement — `cells`, the evidence inside them, and `asked` — survives,
 * filtered per-entry through `isValidCellEntry`. `blockItems`/`blockMinutes` are
 * restored too (not reset to 0): they are what keeps BLOCK_MAX_ITEMS/BLOCK_MAX_MIN
 * binding on the block a learner reloads mid-way through, rather than letting that
 * one block run unbounded.
 */
export function loadSession(): AssessState | null {
  try {
    const raw = localStorage.getItem(ASSESS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSerialized(parsed)) return null;
    return {
      scope: parsed.scope,
      phase: parsed.phase,
      cells: new Map(parsed.cells.filter(isValidCellEntry)),
      asked: new Set(parsed.asked),
      current: null,
      hintsUsed: 0,
      blockIndex: parsed.blockIndex,
      blockItems: parsed.blockItems,
      blockMinutes: parsed.blockMinutes,
      recentKinds: [],
      startedAtMs: parsed.startedAtMs,
      updatedAtMs: parsed.updatedAtMs,
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(ASSESS_KEY);
  } catch {
    /* nothing to clear */
  }
}
