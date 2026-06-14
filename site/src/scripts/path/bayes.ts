// Pure probabilistic placement model. No I/O, no Date.now(), no path-io imports.
import type { Band } from "./types";

export type SelfPlace = "never" | "basics" | "prod";
export type Response = "correct" | "wrong" | "dont_know";
export interface Irt { b: number; a: number; c: number } // difficulty, discrimination, guess

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
const slip = (a: number): number => clamp01(0.12 / Math.max(0.5, a));
const PDK_KNOWN = 0.04;   // a knower rarely says "don't know"
const PDK_UNKNOWN = 0.55; // a non-knower often does

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
