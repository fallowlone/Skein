// site/src/english/grammar-types.ts
// Typed, bilingual, CEFR-leveled grammar corpus model. See
// docs/superpowers/specs/2026-06-15-english-grammar-system-design.md §4–§5.
import type { Bi } from "./types";

export type Cefr = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const CEFR_ORDER: Cefr[] = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
export const cefrIndex = (c: Cefr): number => CEFR_ORDER.indexOf(c);

export type GrammarFamily =
  | "tenses" | "aspect" | "modals" | "conditionals" | "passive"
  | "articles" | "nouns" | "pronouns" | "adjectives" | "adverbs"
  | "prepositions" | "relative-clauses" | "reported-speech"
  | "questions" | "verb-patterns" | "phrasal-verbs" | "conjunctions"
  | "word-order" | "discourse"
  | "unclassified"; // import-time sentinel; authoring replaces it

export type ExerciseType =
  | "fill_in_blank" | "multiple_choice" | "error_correction"
  | "sentence_transformation" | "word_order";

// --- Generative practice spec (typed now; DATA authored in Phase 3 / engine) ---
export type Register = "neutral" | "engineering" | "academic";
export type Pool = {
  id: string;
  tags: { level: Cefr[]; register?: Register[] };
  items: string[];
};
export type Template = {
  id: string;
  type: ExerciseType;
  cefrMin: Cefr;
  cefrMax: Cefr;
  pattern: string;
  slots: Record<string, { pool: string; feature?: string }>;
  deriveKey: string;
  rationale: Bi;
  contrast?: { wrong: string; why: Bi }[];
};
export type TopicGenSpec = {
  pools: Pool[];
  templates: Template[];
  features: string[];
};

export type GrammarLesson = {
  cefr: Cefr;
  explain: Bi;     // RU verbatim from steep; EN authored
  structure: Bi;   // the rule named
  examples: { en: string; ru: string; note?: Bi }[];
  tip: Bi;         // steep "tip"
  pitfalls?: { wrong: string; right: string; why: Bi }[];
};

export type GrammarTopic = {
  id: string;                 // kebab from steep topicId, e.g. "present-simple"
  title: Bi;
  cefr: Cefr;                 // entry level (lowest authored)
  levels: Cefr[];             // levels with authored lessons, low→high
  family: GrammarFamily;
  egp: string[];              // English Grammar Profile competency ids (Phase 2)
  archetype: string;          // key into the animation archetype map (Phase 4)
  archetypeParams?: Record<string, string | string[]>;
  lessons: Partial<Record<Cefr, GrammarLesson>>;
  gen?: TopicGenSpec;         // authored in Phase 3
  related: string[];          // confusable/sibling topic ids
  crossTopic: string[];       // topic ids this composes with
};

const nonEmpty = (s: unknown): boolean => typeof s === "string" && s.trim().length > 0;

/** Structural invariants — must hold the moment the importer writes a skeleton. */
export function validateGrammarTopic(t: GrammarTopic): string[] {
  const errs: string[] = [];
  if (!nonEmpty(t.id)) errs.push("id is empty");
  if (!nonEmpty(t.title?.ru)) errs.push("title.ru is empty");
  if (!Array.isArray(t.levels) || t.levels.length === 0) errs.push("levels is empty");
  for (const lv of t.levels ?? []) {
    const lesson = t.lessons?.[lv];
    if (!lesson) { errs.push(`lessons.${lv} missing`); continue; }
    if (!nonEmpty(lesson.explain?.ru)) errs.push(`lessons.${lv}.explain.ru is empty`);
    if (!nonEmpty(lesson.tip?.ru)) errs.push(`lessons.${lv}.tip.ru is empty`);
    if (!Array.isArray(lesson.examples) || lesson.examples.length === 0)
      errs.push(`lessons.${lv}.examples is empty`);
  }
  return errs;
}

/** Completeness invariants — must hold AFTER the authoring pass (Phase 1, Task 8). */
export function authoringErrors(t: GrammarTopic): string[] {
  const errs = validateGrammarTopic(t);
  if (t.family === "unclassified") errs.push("family is unclassified");
  if (!nonEmpty(t.title?.en)) errs.push("title.en is empty");
  if (!nonEmpty(t.archetype)) errs.push("archetype is empty");
  for (const lv of t.levels ?? []) {
    const lesson = t.lessons?.[lv];
    if (lesson && !nonEmpty(lesson.explain?.en)) errs.push(`lessons.${lv}.explain.en is empty`);
  }
  return errs;
}
