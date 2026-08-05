// Bayes update of one cell + ordinal propagation across the concept DAG. Pure.
import type { ConceptGraph } from "~/scripts/path/graph";
import { likelihoodVector, llmVerdictLikelihood } from "./likelihood";
import { expectedLevel, normalize, priorFromBand } from "./ordinal";
import { cellKey, type AssessItem, type AssessResponse, type Band, type Cell, type CellKey, type Facet, type Level, type Posterior } from "./types";

export function emptyCell(conceptId: string, facet: Facet, band: Band): Cell {
  return { conceptId, facet, posterior: priorFromBand(band, facet), items: 0, evidence: [] };
}

const DIGEST_MAX = 240;
const digest = (s: string) => (s.length > DIGEST_MAX ? s.slice(0, DIGEST_MAX) + "…" : s);

export interface ResponseMeta {
  answerDigest?: string;
  failureNote?: string;
  /** Task 13: threaded straight into Evidence.llmGraded — see its own doc comment. */
  llmGraded?: boolean;
  /**
   * Task 13 fix round 1 (Critical), keyed per-concept in fix round 2: clamped
   * LLM verdict Levels for an `explain` item's target facet, when the BYOK
   * layer graded one — one entry per `item.concepts` id, each ALREADY
   * clamped (by `llm-grade.ts`'s `gradeExplainVerdict`) against THAT
   * concept's own deterministic anchor, never a single shared one.
   *
   * Fix round 1 shipped this as a single `Level` and `applyResponse`
   * multiplied it into every concept's target-facet cell — bounding only
   * `item.concepts[0]` while broadcasting the same, unbounded-for-them
   * likelihood factor to the rest (99.7% of `explain` items touch 2+
   * concepts). This map fixes that: `applyResponse`'s per-concept loop below
   * looks up `llmVerdictLevels[conceptId]`, never a single item-wide value,
   * so a cell can only ever move relative to ITS OWN anchor.
   *
   * `update.ts` performs no clamping — every value in this map already
   * passed through `gradeExplainVerdict` before `applyResponse` ever sees it
   * (Ruling 2's bypass-proof entry point, called once per concept in
   * ItemView.tsx's `gradeExplainAnswer`).
   *
   * Absent (`undefined`), or missing an entry for a given `conceptId`, is the
   * no-op default for that cell — every other item kind, every explain
   * answer with no key, and the entire simulation harness (which never
   * constructs this field at all) leave `applyResponse` byte-identical to
   * pre-Task-13 behaviour (proved in update.test.ts).
   */
  llmVerdictLevels?: Record<string, Level>;
  /**
   * Task 13 fix round 1: the FULL, untruncated draft an explain item's
   * self-grade was made against — read only by ItemView.tsx (to send to the
   * LLM under its own MAX_INPUT_CHARS bound) and deliberately NOT destructured
   * anywhere below. `applyResponse` only ever stores `digest(meta.answerDigest)`
   * (240 chars, DIGEST_MAX) into Evidence; this field must never reach it, so
   * there is intentionally no code path here that reads `meta.rawAnswer` at
   * all — ItemView.tsx strips it before the response reaches `onAnswer`.
   */
  rawAnswer?: string;
}

/**
 * Apply one response to every (concept, facet) cell it speaks to. Returns a NEW map —
 * callers hold the previous state for undo and for the report's before/after.
 */
export function applyResponse(
  cells: ReadonlyMap<CellKey, Cell>,
  item: AssessItem,
  response: AssessResponse,
  bandOf: (conceptId: string) => Band,
  atMs: number,
  meta: ResponseMeta = {},
): Map<CellKey, Cell> {
  const next = new Map(cells);
  for (const conceptId of item.concepts) {
    for (const facet of ["recognition", "mechanism", "production"] as const) {
      const key = cellKey(conceptId, facet);
      const prior = next.get(key) ?? emptyCell(conceptId, facet, bandOf(conceptId));
      const lik = likelihoodVector(item, response, facet);
      const isTarget = facet === item.facet;
      // Task 13 fix round 2: looked up PER CONCEPT (`llmVerdictLevels[conceptId]`,
      // not a single item-wide value — fix round 1's Critical finding) and
      // multiplied in ONLY on the target facet (isTarget) and ONLY when this
      // concept has its own entry. Undefined on every path except a
      // successfully-graded `explain` answer, so this branch is unreachable
      // for every other item kind, for every no-key explain answer, and for
      // the entire simulation harness — the multiplication below is a true
      // no-op (verdictLik === null) in all of those cases.
      const verdictLevel = isTarget ? meta.llmVerdictLevels?.[conceptId] : undefined;
      const verdictLik = verdictLevel ? llmVerdictLikelihood(verdictLevel) : null;
      // item.weight < 1 (multi-concept attribution or a partly-contaminated item) flattens
      // the evidence the same way cross-facet damping does.
      const w = Math.max(0, Math.min(1, item.weight));
      const posterior = normalize(
        prior.posterior.map((p, i) => {
          const base = p * Math.pow(lik[i], w);
          return verdictLik ? base * Math.pow(verdictLik[i], w) : base;
        }),
      );
      next.set(key, {
        ...prior,
        posterior,
        items: prior.items + (isTarget ? 1 : 0),
        evidence: isTarget
          ? [...prior.evidence, {
              conceptId, facet, itemId: item.id, lessonKey: item.lessonKey, kind: item.kind, band: item.band,
              response, answerDigest: digest(meta.answerDigest ?? ""), failureNote: meta.failureNote,
              llmGraded: meta.llmGraded, atMs,
            }]
          : prior.evidence,
      });
    }
  }
  return next;
}

/**
 * Below this expected-level index (the mass-weighted mean over LEVELS computed by
 * `expectedLevel`, 0 = certainly gap .. 3 = certainly senior) a result is not settled enough
 * toward the top to say anything about prerequisites.
 */
const PROPAGATE_MIN_LEVEL = 1.8;
/**
 * Per-hop decay base for propagated evidence — it is a rumour, not a measurement. A direct
 * prerequisite is blended at this weight; each hop further out is damped by another factor
 * of it: PROPAGATE_DAMP ** hop, i.e. 0.35, 0.1225, 0.042875, ...
 */
const PROPAGATE_DAMP = 0.35;
/**
 * Stop the transitive walk once the per-hop blend weight drops below this. Beyond it the
 * update is noise, and walking further is wasted work on a graph with thousands of concepts.
 */
const PROPAGATE_MIN_WEIGHT = 0.02;

/**
 * Push a settled result to prerequisites, walking the transitive closure of `requires` with
 * per-hop decay — a direct prereq is blended at PROPAGATE_DAMP, two hops out at
 * PROPAGATE_DAMP**2, and so on until the weight drops below PROPAGATE_MIN_WEIGHT. Only
 * mechanism and production propagate: recognising a term says nothing about the machinery
 * underneath it (spec §4.3). Cells that already hold their own direct evidence are never
 * overwritten, though the walk still passes through them to reach their own prerequisites.
 *
 * `ancestors()` in path/graph.ts returns a flat Set with no hop distance — not enough to
 * compute per-hop decay or bound the walk — so hops are tracked here via a breadth-first
 * walk over `graph.requires`, the same override-aware edge map `ancestors` itself closes
 * over (unlike the raw, override-blind `Concept.requires` field on each node). The graph is
 * meant to be acyclic, but user-editable prerequisite overrides can introduce a cycle, so a
 * visited-set guards against a walk that would otherwise hang the tab.
 */
export function propagate(
  cells: ReadonlyMap<CellKey, Cell>,
  graph: ConceptGraph,
  conceptId: string,
  facet: Facet,
  bandOf: (conceptId: string) => Band,
): Map<CellKey, Cell> {
  const next = new Map(cells);
  if (facet === "recognition") return next;

  const source = next.get(cellKey(conceptId, facet));
  if (!source || source.items === 0) return next;
  const level = expectedLevel(source.posterior);
  if (level < PROPAGATE_MIN_LEVEL) return next;

  const visited = new Set<string>([conceptId]);
  let frontier = [conceptId];
  let hop = 1;
  let weight = PROPAGATE_DAMP ** hop;
  while (frontier.length > 0 && weight >= PROPAGATE_MIN_WEIGHT) {
    const nextFrontier: string[] = [];
    for (const id of frontier) {
      for (const prereqId of graph.requires.get(id) ?? []) {
        if (visited.has(prereqId)) continue;
        visited.add(prereqId);
        nextFrontier.push(prereqId);

        const key = cellKey(prereqId, facet);
        const existing = next.get(key);
        if (existing && existing.evidence.length > 0) continue; // measured beats inferred
        const base = existing ?? emptyCell(prereqId, facet, bandOf(prereqId));
        next.set(key, { ...base, posterior: blendToward(base.posterior, source.posterior, weight) });
      }
    }
    frontier = nextFrontier;
    hop += 1;
    weight = PROPAGATE_DAMP ** hop;
  }
  return next;
}

function blendToward(base: Posterior, toward: Posterior, weight: number): Posterior {
  return normalize(base.map((p, i) => p * (1 - weight) + toward[i] * weight));
}
