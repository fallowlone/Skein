// Pure probabilistic placement model. No I/O, no Date.now(), no path-io imports.
import type { Band } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";

export type SelfPlace = "never" | "basics" | "prod";
export type Response = "correct" | "wrong" | "dont_know";
export interface Irt {
  /** Difficulty (logit scale). Higher = harder. */
  b: number;
  /** Discrimination. Higher = more informative. */
  a: number;
  /** Guess probability (lower asymptote). */
  c: number;
}

const clamp01 = (x: number) => Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0.5;
const logistic = (x: number): number => 1 / (1 + Math.exp(-x));

// Prior P(known) by self-placement × concept band. One source of truth.
const PRIOR: Record<SelfPlace, Record<Band, number>> = {
  never:  { foundations: 0.15, surface: 0.08, middle: 0.04, advanced: 0.02 },
  basics: { foundations: 0.75, surface: 0.45, middle: 0.20, advanced: 0.08 },
  prod:   { foundations: 0.92, surface: 0.80, middle: 0.55, advanced: 0.30 },
};
export const priorFor = (self: SelfPlace, band: Band): number => PRIOR[self][band];

// Deterministic fallback params when an item carries no authored irt.
const BAND_DIFFICULTY: Record<Band, number> = { foundations: -1.0, surface: 0, middle: 0.8, advanced: 1.6 };
export function fallbackIrt(band: Band, type: "mcq" | "blanks", choices: number): Irt {
  const c = type === "mcq" && choices > 0 ? 1 / choices : 0.05;
  return { b: BAND_DIFFICULTY[band], a: 1.0, c };
}

// Two-point 3PL observation model. The latent binary states are represented by ability points
// θ=+3 (knows the concept) and θ=-2 (does not). Unlike the previous slip-only approximation,
// this actually uses authored item difficulty `b`: a correct answer to a hard item is stronger
// evidence than a correct answer to an easy one, while missing an easy item is stronger negative
// evidence. The three response probabilities sum to one for each latent state.
const THETA_KNOWN = 3;
const THETA_UNKNOWN = -2;
const PDK_KNOWN = 0.04;   // share of a knower's non-correct outcomes reported as "don't know"
const PDK_UNKNOWN = 0.55; // non-knowers often abstain rather than guess

function correctChance(theta: number, irt: Irt): number {
  const a = Number.isFinite(irt.a) && irt.a > 0 ? irt.a : 1;
  const b = Number.isFinite(irt.b) ? irt.b : 0;
  const c = Number.isFinite(irt.c) ? Math.min(0.99, Math.max(0, irt.c)) : 0.05;
  return c + (1 - c) * logistic(a * (theta - b));
}

export function likelihood(r: Response, irt: Irt): { known: number; unknown: number } {
  const pk = correctChance(THETA_KNOWN, irt);
  const pu = correctChance(THETA_UNKNOWN, irt);
  if (r === "correct") return { known: pk, unknown: pu };
  if (r === "dont_know") return { known: (1 - pk) * PDK_KNOWN, unknown: (1 - pu) * PDK_UNKNOWN };
  return { known: (1 - pk) * (1 - PDK_KNOWN), unknown: (1 - pu) * (1 - PDK_UNKNOWN) };
}

// Bayes step: posterior P(known | response).
export function posterior(prior: number, r: Response, irt: Irt): number {
  const p0 = clamp01(prior);
  const L = likelihood(r, irt);
  const num = L.known * p0;
  const den = num + L.unknown * (1 - p0);
  return den <= 0 || !Number.isFinite(den) ? p0 : clamp01(num / den);
}

export const variance = (p: number): number => {
  const safe = clamp01(p);
  return safe * (1 - safe);
};

// Binary entropy in bits. 0 at p∈{0,1}, 1 at p=0.5.
export function entropy(p: number): number {
  const safe = clamp01(p);
  if (safe <= 0 || safe >= 1) return 0;
  return -(safe * Math.log2(safe) + (1 - safe) * Math.log2(1 - safe));
}

// Expected entropy reduction from answering one item at this prior.
export function expectedInfoGain(prior: number, irt: Irt): number {
  const responses: Response[] = ["correct", "wrong", "dont_know"];
  let expected = 0;
  for (const r of responses) {
    const L = likelihood(r, irt);
    const pr = L.known * prior + L.unknown * (1 - prior); // marginal P(response)
    if (pr <= 0) continue;
    expected += pr * entropy(posterior(prior, r, irt));
  }
  return entropy(prior) - expected;
}

// Concept settled once its Bernoulli variance falls below this (|p-0.5| > ~0.38).
export const SETTLE_VAR = 0.10;

export function collapse(p: number): { confidence: number; shaky: boolean } {
  return { confidence: clamp01(p), shaky: variance(p) > SETTLE_VAR };
}

export const PASS = 0.7;     // focal posterior ≥ PASS ⇒ confident known
export const FAIL = 0.3;     // focal posterior ≤ FAIL ⇒ confident not-known
const PROP_UP_FACTOR = 0.8;  // share of focal confidence granted to prereqs
const DK_CASCADE_DAMP = 0.5; // dont_know down-cascade is half-strength vs wrong

// Resolve IRT params: use authored params if provided, otherwise fall back to band/type defaults.
export function resolveIrt(
  authored: Irt | undefined, band: Band, type: "mcq" | "blanks", choices: number,
): Irt {
  if (authored && Number.isFinite(authored.b) && Number.isFinite(authored.a) && authored.a > 0 &&
      Number.isFinite(authored.c) && authored.c >= 0 && authored.c < 1) return authored;
  return fallbackIrt(band, type, choices);
}

// Returns a NEW prior map with unobserved ancestors/descendants nudged after a focal update.
export function propagatePriors(
  priors: Map<string, number>, g: ConceptGraph, concept: string, p: number, via: Response,
): Map<string, number> {
  const next = new Map(priors);
  if (p >= PASS) {
    const lift = p * PROP_UP_FACTOR;
    for (const a of ancestors(g, concept)) if ((next.get(a) ?? 0) < lift) next.set(a, lift);
  } else if (p <= FAIL) {
    const damp = via === "dont_know" ? DK_CASCADE_DAMP : 1;
    for (const d of descendants(g, concept)) {
      const cur = next.get(d) ?? 0.5;
      if (cur > p) next.set(d, cur + (p - cur) * damp);
    }
  }
  return next;
}
