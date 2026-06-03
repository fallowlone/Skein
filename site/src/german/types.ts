// German-for-Engineers layer — shared types.
// A reading-first vocabulary trainer for absolute→A2/B1 engineers who want to
// read everyday + engineering German. Mirrors site/src/english/types.ts but with
// a German band scale (A1/A2/B1) and German-side passage text ({ de, ru }).
//
// The SRS scheduler and the BYOK grading shape are SHARED with the English layer
// (imported, never copied), so German code has one import site for them.

export type { GermanSummary } from "./stats";

export type Bi = { en: string; ru: string };

/** CEFR band for the German layer (lower entry point than English). */
export type GerBand = "A1" | "A2" | "B1";

export type Pos =
  | "noun"
  | "verb"
  | "adj"
  | "adv"
  | "phrase"
  | "abbr"
  | "other";

/** A frequency-ranked, enriched vocabulary entry (one word family). */
export type VocabEntry = {
  id: string;            // stable SRS key, e.g. "de:0042"
  lemma: string;         // surface form; nouns carry their article ("die Datei")
  rank: number;          // frequency rank within the German list
  band: GerBand;         // CEFR band by rank cutoff
  pos: Pos;
  ru: string;            // Russian meaning (beginner-friendly)
  gloss: string;         // plain-English definition
  ipa?: string;          // pronunciation
  examples: string[];    // 1–2 natural sentences
  collocations?: string[];
  domain?: "general" | "engineering";
};

/** One reading beat: a German sentence/paragraph with its translation. */
export type Passage = {
  de: string;
  ru: string;
};

/** A reusable engineering phrase (idiom / collocation) with usage note. */
export type Phrase = {
  id: string;
  en: string;
  ru: string;
  note?: Bi;
};

/**
 * A comprehension question. Retrieval, not recognition: keep options few.
 * Mirrors the English Question shape.
 */
export type Question = {
  id: string;
  q: Bi;
  options: Bi[];
  /** Index into options. */
  answer: number;
  /** Optional why-shown after answering. */
  explain?: Bi;
};

export type ReadingUnit = {
  id: string;
  level: GerBand;
  /** Broad-German vs engineering artifacts (PR/RFC/incident/docs). */
  stream: "general" | "engineering";
  title: Bi;
  blurb: Bi;
  /** What real-world text this mimics, shown as a tag. */
  source: Bi;
  passages: Passage[];
  phrases: Phrase[];
  /** Comprehension checks for the reading. */
  questions: Question[];
  /** VocabEntry ids this text teaches; seeded into SRS when read. */
  targetWords?: string[];
};

/** One fill-in-the-gap practice item for a grammar point. */
export type ClozeItem = {
  id: string;
  before: string;       // sentence fragment before the gap
  after?: string;       // fragment after the gap (gap rendered between)
  answer: string;       // primary accepted fill
  alts?: string[];      // other accepted fills (compared case-insensitively, trimmed)
  hint: Bi;             // bilingual nudge
  explain?: Bi;         // why this form, shown after answering
};

/** A grammar-in-context micro-lesson: explanation + examples + cloze practice. */
export type GrammarPoint = {
  id: string;                 // "grammar:nominativ-akkusativ"
  band: GerBand;
  domain?: "general" | "engineering";
  title: Bi;
  structure: Bi;              // the rule named
  explain: Bi;                // short in-context explanation, bilingual scaffolding
  examples: { de: string; ru: string; note?: Bi }[];  // 2-3 in-context
  cloze: ClozeItem[];         // >=2 per point
  register?: Bi;              // when/why (formality, separable verbs, etc.)
};

export type OutputTask = {
  id: string;
  band: GerBand;
  type: "pr-comment" | "standup" | "design-rationale" | "bug-report"
      | "incident-summary" | "commit-message" | "rfc-summary" | "review-reply";
  prompt: Bi;
  rubric: string[];
  modelAnswer?: { de: string; ru: string };
  hint?: Bi;
};

// Shared building blocks — imported from the English layer so the German code has
// a single import site and never diverges from the scheduler / grading contract.
export type { Grade, CardState } from "~/english/scheduler/types";
export type { GradingResult } from "~/english/types";
