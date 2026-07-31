// Shared vocabulary for the audit engine. Pure types only — no runtime imports beyond Band.
import type { Band } from "~/components/atlas/track-band";

export type { Band };

/** Ordered ability levels. Index order is meaningful: comparisons and the ± qualifier rely on it. */
export const LEVELS = ["gap", "junior", "middle", "senior"] as const;
export type Level = (typeof LEVELS)[number];

/** Probability mass over LEVELS, in LEVELS order. Always normalised to sum 1. */
export type Posterior = readonly [number, number, number, number];

/**
 * What is being measured. Not nested: production without mechanism is a real state
 * ("copies the pattern, cannot explain it") and the report names it rather than averaging.
 */
export const FACETS = ["recognition", "mechanism", "production"] as const;
export type Facet = (typeof FACETS)[number];

export type ItemKind = "mcq" | "predict" | "debug" | "review" | "exec" | "explain";

export type Outcome = "correct" | "partial" | "wrong" | "dont_know";

export interface AssessResponse {
  outcome: Outcome;
  hintsUsed: 0 | 1 | 2;
  /** Recorded for the report only — deliberately NOT an input to the likelihood (spec §11). */
  elapsedMs: number;
}

export interface AssessItem {
  /** Stable id: `${lessonKey}#${taskId}`. */
  id: string;
  lessonKey: string;
  taskId: string;
  kind: ItemKind;
  /** The facet this item's likelihood targets. Other facets get damped evidence. */
  facet: Facet;
  band: Band;
  /** Concepts this item speaks to. Multi-concept attribution is handled by `weight`. */
  concepts: string[];
  /** 1 / number-of-attributed-concepts, times any contamination discount. */
  weight: number;
  estMin: number;
}

export interface Evidence {
  conceptId: string;
  facet: Facet;
  itemId: string;
  /** Carried so a re-test card can point back at the lesson the item came from. */
  lessonKey: string;
  kind: ItemKind;
  band: Band;
  response: AssessResponse;
  /** What the learner actually chose or wrote, truncated to 240 chars for the report. */
  answerDigest: string;
  /** Grader-supplied specifics, e.g. "map keyed on target - nums[i] instead of nums[i]". */
  failureNote?: string;
  atMs: number;
}

export interface Cell {
  conceptId: string;
  facet: Facet;
  posterior: Posterior;
  items: number;
  evidence: Evidence[];
}

export type CellKey = `${string}::${Facet}`;
export const cellKey = (conceptId: string, facet: Facet): CellKey => `${conceptId}::${facet}`;
