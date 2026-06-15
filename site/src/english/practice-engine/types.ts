// Engine-local types. The corpus' TopicGenSpec/Pool/Template live in grammar-types.ts;
// these describe the engine's OUTPUT and the deriveKey strategy contract.
import type { Bi } from "~/english/types";
import type { Cefr, ExerciseType } from "~/english/grammar-types";

/** A generated, ready-to-serve exercise. Answer/alts are COMPUTED, never authored per-item. */
export type GeneratedExercise = {
  id: string;            // stable: `${topicId}:${templateId}:${seed}`
  topicId: string;
  cefr: Cefr;
  type: ExerciseType;
  prompt: string;        // the surface shown (sentence with a ___ blank, MC stem, scrambled words, etc.)
  answer: string;        // canonical correct answer
  alts: string[];        // other accepted answers
  options?: string[];    // multiple_choice only
  rationale: Bi;         // slot-interpolated explanation
};

/** Context passed to a deriveKey strategy: the filled slot values + the template. */
export type DeriveCtx = {
  slots: Record<string, string>;   // slotName → chosen surface (already feature-transformed)
  raw: Record<string, string>;     // slotName → raw pool token (pre-transform), for strategies that need the lemma
  level: Cefr;
};
export type DeriveResult = { primary: string; alternates: string[] };
export type DeriveStrategy = (ctx: DeriveCtx) => DeriveResult;
