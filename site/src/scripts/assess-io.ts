// site/src/scripts/assess-io.ts
// The only place assessment session state touches localStorage. Mirrors
// review-state.ts: its own key, a defensive parse that drops anything malformed,
// and a silent degrade (private mode / quota) — a broken store never crashes the
// audit, it just means the session will not resume across a reload.
import { PHASES, type AssessState } from "./assess/session";
import type { Cell, CellKey } from "./assess/types";

export const ASSESS_KEY = "atlas.assess.v1";

interface Serialized {
  scope: string[];
  phase: AssessState["phase"];
  cells: [CellKey, Cell][];
  asked: string[];
  blockIndex: number;
  startedAtMs: number;
  updatedAtMs: number;
}

// The measurement is `cells` and `asked` — everything else here is bookkeeping to
// resume the right block. A malformed or legacy blob (missing arrays) is dropped
// rather than half-trusted, the same call review-state.ts's isCard() makes.
function isSerialized(p: unknown): p is Serialized {
  if (!p || typeof p !== "object") return false;
  const s = p as Serialized;
  return (
    Array.isArray(s.scope) &&
    (PHASES as readonly string[]).includes(s.phase) &&
    Array.isArray(s.cells) &&
    Array.isArray(s.asked) &&
    typeof s.blockIndex === "number" &&
    typeof s.startedAtMs === "number" &&
    typeof s.updatedAtMs === "number"
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
 * that IS measurement — `cells`, the evidence inside them, and `asked` — survives.
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
      cells: new Map(parsed.cells),
      asked: new Set(parsed.asked),
      current: null,
      hintsUsed: 0,
      blockIndex: parsed.blockIndex,
      blockItems: 0,
      blockMinutes: 0,
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
