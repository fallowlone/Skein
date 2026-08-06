// site/src/scripts/assess-apply-knowledge.ts
// The one place AssessReport.tsx's "save results" action touches storage OUTSIDE
// the assess session itself: merging report.ts's `toKnowledgeWrites()` output into
// the same KnowledgeState store path-io.ts owns (localStorage key below,
// `[conceptId, ConceptMastery][]` — identical shape to path-io.ts's own
// `serializeKnowledge`/`deserializeKnowledge`).
//
// This does NOT import path-io.ts: that module bundles `~/content/path/concepts.json`
// (1.1 MB) and several other content files as top-level imports with side effects
// (signals, effects), so importing anything from it — even just a key constant —
// would pull the whole module into /assess's chunk, exactly what Ruling 3
// (task-12-brief) says not to do. The key string below is a deliberate, commented
// mirror of path-io.ts's `K_KEY`, not a re-declaration of a shared constant,
// because sharing it would require exporting from path-io.ts and inheriting the
// same cost.
//
// Writing this key directly is safe: the next time any path-io.ts-backed screen
// (Roadmap, Readiness) loads, its own `loadKnowledge()` reads this same key from
// scratch — there is no in-memory signal here to keep in sync, only durable
// storage two independent modules happen to agree on the shape of.
//
// ── Precedence rule (C1/C2, task-12-report.md fix round 1) ─────────────────
// A /assess result is a deliberate, multi-item measurement — knowledge.ts now
// carries "assess" in STRONG/STUDY_PROTECTED so incidental activity/review/
// struggle signals can never silently overwrite or relabel it (see knowledge.ts).
// But the reverse direction — an assess WRITE landing on top of an EXISTING
// stronger signal — is this file's job, because only this file sees the assess
// side's own evidential strength (report.ts's KnowledgeWrite carries a value but
// not how much evidence backs it).
//
// The rule, in plain language:
//   1. Only write concepts the report the learner is looking at actually
//      accounted for (`scopeConcepts`) — a concept never shown in the results
//      must never be silently rewritten behind the Save button.
//   2. A write may always land on top of activity / review / pretest / no prior
//      entry: even one targeted, graded question beats an inferred heuristic.
//   3. A write may always land on top of a PRIOR assess entry for the same
//      concept: same instrument, fresher run wins (mirrors applyDiagnostic's
//      "a new diagnostic always supersedes the old one").
//   4. A write may overwrite `declared` (the learner's own claim) or `diagnostic`
//      (a dedicated placement instrument) ONLY if the NEW measurement clears a
//      minimum evidence bar — otherwise it is skipped, leaving the stronger
//      signal in place. This is what stops the real failure mode: a single
//      `dont_know` on a 6-concept item (evidenceCount 1, band confidence ~0.36)
//      must not be able to overwrite a `declared` 1.0 or a `diagnostic` 0.9
//      across all six concepts it happens to touch.
import type { Cell, CellKey } from "./assess/types";
import { conceptVerdict, posteriorMovement } from "./assess/verdict";
import type { KnowledgeWrite } from "./assess/report";
import type { Source } from "./path/types";
import type { Band } from "./assess/types";

const KNOWLEDGE_KEY = "awesome.path-knowledge.v1"; // mirrors path-io.ts's K_KEY

/** Sources strong enough that a new assess write must earn its way past them
 *  rather than overwrite on sight. NOT "assess" itself — a repeat assess run on
 *  the same concept always supersedes the prior one (rule 3 above). */
const REQUIRES_STRONG_EVIDENCE: ReadonlySet<Source> = new Set(["declared", "diagnostic"]);

/** Minimum total items (across facets) the concept's cells must carry, AND
 *  minimum expectedLevel shift (away from the band prior) the posterior must
 *  have undergone, before an assess write is allowed to overturn a declared/
 *  diagnostic signal. Both must hold — either alone (many items but a flat,
 *  undecided posterior; or one confident-looking item) is not enough to
 *  overturn a deliberate prior signal.
 *
 *  D4: band.confidence is mass on the modal level, which at the prior is already
 *  0.45 (middle/mechanism) to 0.62 (advanced) — the bar clears before any
 *  evidence exists. Using |Δ expectedLevel| instead ties the bar to actual
 *  movement, not starting position. 0.5 means the posterior shifted by at
 *  least half a level on its weakest facet. */
const MIN_EVIDENCE_ITEMS = 2;
const MIN_POSTERIOR_SHIFT = 0.5;

interface StoredMastery {
  confidence: number;
  source: string;
  lastAt: number;
}

function isEntry(e: unknown): e is [string, StoredMastery] {
  if (!Array.isArray(e) || e.length !== 2) return false;
  const [id, m] = e as [unknown, unknown];
  return (
    typeof id === "string" &&
    !!m &&
    typeof m === "object" &&
    typeof (m as StoredMastery).confidence === "number" &&
    typeof (m as StoredMastery).source === "string" &&
    typeof (m as StoredMastery).lastAt === "number"
  );
}

function readStoredKnowledge(): [string, StoredMastery][] {
  try {
    const raw = localStorage.getItem(KNOWLEDGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

/** Whether a new assess write is allowed to land on top of `existing` (undefined
 *  = no prior entry for this concept). Pure — exported for tests.
 *  `bandOf` is required for the movement check (D4); pass an identity when
 *  testing in isolation so prior=band prior is used. */
export function mayOverwrite(
  existing: { source: string } | undefined,
  cells: ReadonlyMap<CellKey, Cell>,
  conceptId: string,
  bandOf: (conceptId: string) => Band = (_id: string) => "surface" as Band,
): boolean {
  if (!existing) return true; // rule 2: nothing there yet
  if (!REQUIRES_STRONG_EVIDENCE.has(existing.source as Source)) return true; // rule 2/3: activity/review/pretest/assess
  const verdict = conceptVerdict(cells, conceptId); // rule 4: earn it
  return (
    verdict.evidenceCount >= MIN_EVIDENCE_ITEMS &&
    posteriorMovement(cells, conceptId, bandOf) >= MIN_POSTERIOR_SHIFT
  );
}

/**
 * Merges assess results into the durable KnowledgeState store, applying the
 * precedence rule documented at the top of this file. `scopeConcepts` should be
 * the exact set the report the learner is looking at was built over (every
 * concept in `AssessReportModel.rows` ∪ `.untested`) — writes for anything
 * outside it are dropped. Returns how many concepts were actually written
 * (after both the scope filter and the precedence check), 0 on any storage
 * failure (private mode / quota — degrades silently, same convention as
 * assess-io.ts and path-io.ts).
 */
export function applyKnowledgeWrites(
  writes: readonly KnowledgeWrite[],
  cells: ReadonlyMap<CellKey, Cell>,
  scopeConcepts: readonly string[],
): number {
  if (!writes.length) return 0;
  const scope = new Set(scopeConcepts);
  try {
    const map = new Map(readStoredKnowledge());
    let written = 0;
    for (const w of writes) {
      if (!scope.has(w.conceptId)) continue; // rule 1
      if (!mayOverwrite(map.get(w.conceptId), cells, w.conceptId)) continue; // rule 4
      map.set(w.conceptId, { confidence: w.confidence, source: w.source, lastAt: w.lastAt });
      written++;
    }
    if (written > 0) localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify([...map.entries()]));
    return written;
  } catch {
    return 0;
  }
}
