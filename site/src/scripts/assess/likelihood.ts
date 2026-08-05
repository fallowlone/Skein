// P(response | level) for one item, as an unnormalised-then-normalised vector over LEVELS.
// Built from three multipliers (spec §4.2): item-facet alignment, item difficulty, hint ladder.
import { normalize } from "./ordinal";
import { LEVELS, type AssessItem, type AssessResponse, type Band, type Facet, type ItemKind, type Level, type Posterior } from "./types";

/** Ability on the logit scale, one notch per level. */
export const LEVEL_THETA: Record<Level, number> = { gap: -1.5, junior: -0.5, middle: 0.5, senior: 1.5 };

/** Item difficulty on the same scale. Mirrors BAND_DIFFICULTY in scripts/path/bayes.ts. */
const BAND_B: Record<Band, number> = { foundations: -1.0, surface: 0, middle: 0.8, advanced: 1.6 };

/**
 * Guess floor: probability of a correct response with zero ability. Writing working code
 * cannot happen by luck (0.02); free text checked against an `accept` list is close to it too —
 * `recall` items are fill-in-the-blank short answers (see content.config.ts's DiagnoseTask,
 * `grading.mode === "blanks"`), not real multiple-choice, so there is no ~1-in-4 blind-guess
 * rate to model here. This corpus has no item shape with a discrete option set and a real
 * chance floor above near-zero.
 */
const GUESS: Record<ItemKind, number> = { recall: 0.05, predict: 0.10, review: 0.15, debug: 0.05, exec: 0.02, explain: 0.05 };

/**
 * Curve sharpness. Tuned by the simulation harness (Task 10): with only up to
 * MAX_ITEMS_PER_CELL items available per cell, 1.2 left too much overlap between adjacent
 * levels for the band-recovery gate (`withinOne`) to clear — see the note atop verdict.ts.
 */
const DISCRIMINATION = 3.85;

/**
 * How much an item of kind K informs facet F. The diagonal is 1; everything else is capped
 * at 0.25 so a cheap item can never certify an expensive skill (spec §4.2a).
 */
export const FACET_ALIGN: Record<ItemKind, Record<Facet, number>> = {
  recall:  { recognition: 1.0, mechanism: 0.20, production: 0.05 },
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

// A knower occasionally says "don't know" instead of committing to a correct answer, so the
// correct branch is scaled down slightly to reflect that; a non-knower who guesses wrong is
// common, so the wrong branch is scaled up. Same constants as scripts/path/bayes.ts, kept in
// sync deliberately. `dont_know` itself is NOT built from these — see DK_ATTENUATION below.
const PDK_KNOWN = 0.04;
const PDK_UNKNOWN = 0.55;

/** Two-category base likelihoods at one level: correct vs wrong. */
function categories(p: number): { correct: number; wrong: number } {
  return {
    correct: p * (1 - PDK_KNOWN),
    wrong: (1 - p) * (1 - PDK_UNKNOWN),
  };
}

/**
 * All four outcomes live in one exponent family built from `correct` (c) and `wrong` (w):
 *   correct    -> c
 *   partial    -> c^0.5 . w^0.5     (geometric mean — unchanged in value)
 *   dont_know  -> w^DK_ATTENUATION  (an attenuated wrong, NOT a separate mixture)
 *   wrong      -> w
 *
 * This makes the ordering correct > partial > dont_know > wrong an algebraic identity, true
 * at every band/hints/kind — not just in the narrow range of p where the old three-branch
 * mixture happened to hold. Proof: let A = ln(c_senior/c_gap) > 0 and B = ln(w_senior/w_gap) < 0
 * (a higher-ability level is always more likely to be correct and less likely to be wrong,
 * whatever the band/hints/kind — pCorrect is monotone increasing in level). The multiplicative
 * PDK constants are level-independent so they cancel out of both ratios; they don't affect A or B.
 * The four outcomes' log-likelihood-ratios (senior vs gap) reduce to A, 0.5A+0.5B,
 * DK_ATTENUATION*B, and B. Then:
 *   A > 0.5A+0.5B                 <=> A > B                          (holds: A>0>B)
 *   0.5A+0.5B > DK_ATTENUATION*B  <=> 0.5A > (DK_ATTENUATION-0.5)*B  (holds for 0.6: 0.5A > 0.1B, A>0>B)
 *   DK_ATTENUATION*B > B          <=> DK_ATTENUATION < 1             (holds: 0.6<1)
 * The facet-alignment exponent (see likelihoodVector) multiplies every log-ratio by the same
 * positive constant, so it preserves this order too.
 */
function rawLikelihood(outcome: AssessResponse["outcome"], p: number): number {
  const c = categories(p);
  if (outcome === "correct") return c.correct;
  if (outcome === "wrong") return c.wrong;
  if (outcome === "dont_know") return Math.pow(c.wrong, DK_ATTENUATION);
  return Math.sqrt(c.correct * c.wrong);
}

/**
 * How much an honest "don't know" is softened relative to a confidently wrong answer: it is
 * treated as `wrong` raised to this power (0 < DK_ATTENUATION < 1), which reads as weaker
 * evidence against ability than committing to a wrong answer.
 */
const DK_ATTENUATION = 0.6;

export function likelihoodVector(item: AssessItem, response: AssessResponse, targetFacet: Facet): Posterior {
  const align = FACET_ALIGN[item.kind][targetFacet];
  const raw = LEVELS.map((level) =>
    rawLikelihood(response.outcome, pCorrect(level, item.band, response.hintsUsed, item.kind)),
  );
  // Flatten toward uniform by raising to a power ≤ 1: align=1 keeps the evidence intact,
  // align→0 (cross-facet leakage) makes the response uninformative for that facet.
  return normalize(raw.map((x) => Math.pow(x, align)));
}
