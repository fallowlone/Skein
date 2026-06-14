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

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

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

// slip = chance a knower fails an item; shrinks with discrimination a.
const slip = (a: number): number => clamp01(0.12 / Math.max(0.5, a)); // slip ceiling ~0.12 at a=1; halves at a=2. Empirically calibrated.
const PDK_KNOWN = 0.04;   // knower rarely says "don't know"
const PDK_UNKNOWN = 0.55; // non-knower often says "don't know" rather than guessing

// P(response | state). dont_know deliberately has NO guess floor c.
export function likelihood(r: Response, irt: Irt): { known: number; unknown: number } {
  const s = slip(irt.a);
  const c = clamp01(irt.c);
  if (r === "correct") return { known: 1 - s, unknown: c };
  if (r === "dont_know") return { known: s * PDK_KNOWN, unknown: (1 - c) * PDK_UNKNOWN };
  return { known: s * (1 - PDK_KNOWN), unknown: (1 - c) * (1 - PDK_UNKNOWN) }; // wrong
}

// Bayes step: posterior P(known | response).
export function posterior(prior: number, r: Response, irt: Irt): number {
  const L = likelihood(r, irt);
  const num = L.known * prior;
  const den = num + L.unknown * (1 - prior);
  return den <= 0 ? prior : clamp01(num / den);
}

export const variance = (p: number): number => p * (1 - p);

// Binary entropy in bits. 0 at p∈{0,1}, 1 at p=0.5.
export function entropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
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
