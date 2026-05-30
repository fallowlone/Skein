// English-for-Engineers layer — shared types.
// A reading-first vocabulary trainer for A2→B1 engineers who must read real
// English engineering prose (PR reviews, docs, RFCs, standups) on the job.

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
