// P(response | level) for one item, as an unnormalised-then-normalised vector over LEVELS.
// Built from three multipliers (spec §4.2): item-facet alignment, item difficulty, hint ladder.
import { normalize } from "./ordinal";
import { LEVELS, type AssessItem, type AssessResponse, type Band, type Facet, type ItemKind, type Level, type Posterior } from "./types";

/** Ability on the logit scale, one notch per level. */
export const LEVEL_THETA: Record<Level, number> = { gap: -1.5, junior: -0.5, middle: 0.5, senior: 1.5 };

/** Item difficulty on the same scale. Mirrors BAND_DIFFICULTY in scripts/path/bayes.ts. */
const BAND_B: Record<Band, number> = { foundations: -1.0, surface: 0, middle: 0.8, advanced: 1.6 };

/** Guess floor: an MCQ can be right by luck; writing working code cannot. */
const GUESS: Record<ItemKind, number> = { mcq: 0.25, predict: 0.10, review: 0.15, debug: 0.05, exec: 0.02, explain: 0.05 };

const DISCRIMINATION = 1.2;

/**
 * How much an item of kind K informs facet F. The diagonal is 1; everything else is capped
 * at 0.25 so a cheap item can never certify an expensive skill (spec §4.2a).
 */
export const FACET_ALIGN: Record<ItemKind, Record<Facet, number>> = {
  mcq:     { recognition: 1.0, mechanism: 0.20, production: 0.05 },
  predict: { recognition: 0.25, mechanism: 1.0, production: 0.15 },
  debug:   { recognition: 0.15, mechanism: 1.0, production: 0.25 },
  review:  { recognition: 0.20, mechanism: 1.0, production: 0.10 },
  exec:    { recognition: 0.10, mechanism: 0.25, production: 1.0 },
  explain: { recognition: 0.25, mechanism: 1.0, production: 0.05 },
};

/** Each hint makes the item effectively easier, so being right proves less. */
const HINT_STEP = 0.9;

/** P(correct | level) under a 3PL curve with the hint-adjusted difficulty. */
export function pCorrect(level: Level, band: Band, hintsUsed: number, kind: ItemKind = "exec"): number {
  const b = BAND_B[band] - HINT_STEP * hintsUsed;
  const c = GUESS[kind];
  const z = DISCRIMINATION * (LEVEL_THETA[level] - b);
  return c + (1 - c) / (1 + Math.exp(-z));
}

// A knower occasionally says "don't know"; a non-knower says it often rather than guessing.
// Same constants as scripts/path/bayes.ts, kept in sync deliberately.
const PDK_KNOWN = 0.04;
const PDK_UNKNOWN = 0.55;

/** Three-category base likelihoods at one level; they sum to 1 by construction. */
function categories(p: number): { correct: number; wrong: number; dont_know: number } {
  return {
    correct: p * (1 - PDK_KNOWN),
    dont_know: p * PDK_KNOWN + (1 - p) * PDK_UNKNOWN,
    wrong: (1 - p) * (1 - PDK_UNKNOWN),
  };
}

/**
 * `partial` sits between correct and wrong — geometric mean, which keeps it strictly
 * between the two in likelihood-ratio terms whatever the level.
 */
function rawLikelihood(outcome: AssessResponse["outcome"], p: number): number {
  const c = categories(p);
  if (outcome === "correct") return c.correct;
  if (outcome === "wrong") return c.wrong;
  if (outcome === "dont_know") return c.dont_know;
  return Math.sqrt(c.correct * c.wrong);
}

/**
 * Damping applied to the log-likelihood ratio. Below 1 flattens the evidence:
 *  - cross-facet leakage uses FACET_ALIGN;
 *  - an honest "don't know" is attenuated so it is gentler than a wrong answer (spec §4.2).
 */
const DK_ATTENUATION = 0.6;

export function likelihoodVector(item: AssessItem, response: AssessResponse, targetFacet: Facet): Posterior {
  const align = FACET_ALIGN[item.kind][targetFacet];
  const damp = align * (response.outcome === "dont_know" ? DK_ATTENUATION : 1);
  const raw = LEVELS.map((level) =>
    rawLikelihood(response.outcome, pCorrect(level, item.band, response.hintsUsed, item.kind)),
  );
  // Flatten toward uniform by raising to a power ≤ 1: damp=1 keeps the evidence intact,
  // damp→0 makes the response uninformative.
  return normalize(raw.map((x) => Math.pow(x, damp)));
}
