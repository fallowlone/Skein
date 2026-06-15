// English-for-Engineers layer — shared types.
// A reading-first vocabulary trainer for A2→B1 engineers who must read real
// English engineering prose (PR reviews, docs, RFCs, standups) on the job.

export type { EnglishSummary } from "~/scripts/progression/types";

export type Bi = { en: string; ru: string };

export type Pos =
  | "noun"
  | "verb"
  | "adj"
  | "adv"
  | "phrase"
  | "abbr";

/** A single vocabulary item, keyed for spaced repetition. */
export type VocabWord = {
  /** Stable SRS key. Never reuse across different meanings. */
  id: string;
  /** Surface form shown to the reader (lemma). */
  w: string;
  /** Russian meaning, A2-friendly. */
  ru: string;
  /** Plain, short English definition a beginner can parse. */
  gloss: string;
  /** Pronunciation, IPA. Optional. */
  ipa?: string;
  pos?: Pos;
  /** One natural example sentence in engineering context. */
  example?: string;
};

/** One reading beat: an English sentence/paragraph with its translation. */
export type Passage = {
  en: string;
  ru: string;
  /** Vocab surfaced for this passage. */
  words?: VocabWord[];
};

/** A reusable engineering phrase (idiom / collocation) with usage note. */
export type Phrase = {
  id: string;
  en: string;
  ru: string;
  note?: Bi;
};

/**
 * A comprehension question. Extensive-reading meta-analyses show the learning
 * effect is larger when reading is paired with comprehension checks
 * (Nakanishi 2015; 2025). Retrieval, not recognition: keep options few.
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
  level: "A2" | "B1" | "B2";
  /** Broad-English vs engineering artifacts (PR/RFC/incident/docs). */
  stream: "general" | "engineering";
  title: Bi;
  blurb: Bi;
  /** What real-world text this mimics, shown as a tag. */
  source: Bi;
  passages: Passage[];
  phrases: Phrase[];
  /** Comprehension checks for the reading. */
  questions: Question[];
  /** VocabEntry ids (P1 deck) this text teaches; seeded into SRS when read. */
  targetWords?: string[];
};

export type GradingResult = {
  corrections: { before: string; after: string; why: string }[];
  betterVersion: string;
  scoreBand: "A2" | "B1" | "B2" | "C1";
  noticingHints: string[];
};

/** CEFR band, mapped from frequency rank. */
export type Band = "A2" | "B1" | "B2";

/** A frequency-ranked, enriched vocabulary entry (one word family). */
export type VocabEntry = {
  id: string;            // stable SRS key, e.g. "ngsl:0042" | "nawl:0107"
  lemma: string;         // surface form (from source CSV, never invented)
  rank: number;          // global frequency rank within its source list
  band: Band;            // CEFR band by rank cutoff
  pos: "noun" | "verb" | "adj" | "adv" | "phrase" | "abbr" | "other";
  ru: string;            // Russian meaning (A2-friendly)
  gloss: string;         // plain-English definition
  ipa?: string;          // pronunciation
  examples: string[];    // 1–2 natural sentences
  collocations?: string[];
  domain?: "general" | "engineering";
};

export type OutputTask = {
  id: string;
  band: "A2" | "B1" | "B2";
  type: "pr-comment" | "standup" | "design-rationale" | "bug-report"
      | "incident-summary" | "commit-message" | "rfc-summary" | "review-reply";
  prompt: Bi;
  rubric: string[];
  modelAnswer?: Bi;
  hint?: Bi;
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
  id: string;                 // "grammar:passive-engineering"
  band: "B1" | "B2";
  domain?: "general" | "engineering";
  title: Bi;
  structure: Bi;              // the rule named, e.g. "be + past participle"
  explain: Bi;                // short in-context explanation, bilingual scaffolding
  examples: { en: string; ru: string; note?: Bi }[];  // 2-3 in-context
  cloze: ClozeItem[];         // >=2 per point
  register?: Bi;              // when/why (engineering hedging, formality)
};

/** A single collocation / chunk, practiced as a gap-fill. */
export type Collocation = {
  id: string;
  chunk: string;        // full collocation, "raise an exception"
  ru: string;
  gap: string;          // drill prompt with a ___ gap, "raise an ___"
  answer: string;       // accepted fill, "exception"
  alts?: string[];
  example: string;      // natural sentence using the chunk
  note?: Bi;
};

/** A themed group of collocations (engineering or general/academic). */
export type CollocationSet = {
  id: string;
  title: Bi;
  domain: "general" | "engineering";
  items: Collocation[];
};

/** Normalized STT output, engine-agnostic. */
export type RecognitionResult = {
  transcript: string;
  words: { text: string; confidence?: number }[];
  confidence: number;
};

/** One Talk scenario. Content is English; titleRu is for the UI only. */
export type Scenario = {
  id: string;
  level: "A2" | "B1" | "B2";
  role: string;     // who Claude plays, e.g. "a senior engineer doing your code review"
  goal: string;     // what the learner is trying to do
  opening: string;  // Claude's first line (English)
  titleRu: string;  // UI label (Russian)
};

/** One turn of a Talk conversation. */
export type ConversationTurn = { role: "assistant" | "user"; text: string };

/** End-of-Talk structured review. */
export type SpeechReview = {
  wentWell: string[];
  errors: { said: string; better: string; why: string }[];
  scoreBand: "A2" | "B1" | "B2" | "C1";
  practiceNext: string[];
};

export type {
  Cefr, GrammarFamily, ExerciseType, GrammarLesson, GrammarTopic,
  TopicGenSpec, Pool, Template, Register,
} from "./grammar-types";
