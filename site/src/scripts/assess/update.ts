// Bayes update of one cell + ordinal propagation across the concept DAG. Pure.
import type { ConceptGraph } from "~/scripts/path/graph";
import { likelihoodVector } from "./likelihood";
import { expectedLevel, normalize, priorFromBand } from "./ordinal";
import { cellKey, type AssessItem, type AssessResponse, type Band, type Cell, type CellKey, type Facet, type Posterior } from "./types";

export function emptyCell(conceptId: string, facet: Facet, band: Band): Cell {
  return { conceptId, facet, posterior: priorFromBand(band, facet), items: 0, evidence: [] };
}

const DIGEST_MAX = 240;
const digest = (s: string) => (s.length > DIGEST_MAX ? s.slice(0, DIGEST_MAX) + "…" : s);

export interface ResponseMeta {
  answerDigest?: string;
  failureNote?: string;
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
      // item.weight < 1 (multi-concept attribution or a partly-contaminated item) flattens
      // the evidence the same way cross-facet damping does.
      const w = Math.max(0, Math.min(1, item.weight));
      const posterior = normalize(
        prior.posterior.map((p, i) => p * Math.pow(lik[i], w)),
      );
      const isTarget = facet === item.facet;
      next.set(key, {
        ...prior,
        posterior,
        items: prior.items + (isTarget ? 1 : 0),
        evidence: isTarget
          ? [...prior.evidence, {
              conceptId, facet, itemId: item.id, lessonKey: item.lessonKey, kind: item.kind, band: item.band,
              response, answerDigest: digest(meta.answerDigest ?? ""), failureNote: meta.failureNote, atMs,
            }]
          : prior.evidence,
      });
    }
  }
  return next;
}

/** Below this mass on the top two levels there is nothing worth propagating. */
const PROPAGATE_MIN_LEVEL = 1.8;
/** Propagated evidence is a rumour, not a measurement — it moves a prior by at most this. */
const PROPAGATE_DAMP = 0.35;

/**
 * Push a settled result to prerequisites. Only mechanism and production propagate:
 * recognising a term says nothing about the machinery underneath it (spec §4.3).
 * Cells with their own evidence are never overwritten.
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

  const node = graph.nodes.get(conceptId);
  for (const prereqId of node?.requires ?? []) {
    const key = cellKey(prereqId, facet);
    const existing = next.get(key);
    if (existing && existing.evidence.length > 0) continue; // measured beats inferred
    const base = existing ?? emptyCell(prereqId, facet, bandOf(prereqId));
    next.set(key, { ...base, posterior: blendToward(base.posterior, source.posterior, PROPAGATE_DAMP) });
  }
  return next;
}

function blendToward(base: Posterior, toward: Posterior, weight: number): Posterior {
  return normalize(base.map((p, i) => p * (1 - weight) + toward[i] * weight));
}
