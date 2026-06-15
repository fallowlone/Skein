import type { ExerciseType } from "~/english/grammar-types";
import type { Bi } from "~/english/types";
import type { GeneratedExercise } from "./types";
import { getStrategy } from "./derive";

export type ValidateCtx = {
  deriveKey: string;
  slots: Record<string, string>;   // the slot values used to build the item (raw == slots here)
  seen?: Set<string>;              // normalized prompts already shown
};
export type ValidateResult = { ok: boolean; reason?: string };

const norm = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();

export function validateExercise(ex: GeneratedExercise, ctx: ValidateCtx): ValidateResult {
  if (ctx.seen?.has(norm(ex.prompt))) return { ok: false, reason: "duplicate prompt" };
  // Tagged-context items carry an authored answer (no computable deriveKey); valid by construction.
  if (ctx.deriveKey === "context") {
    if (!ex.answer?.trim()) return { ok: false, reason: "empty answer" };
    return { ok: true };
  }
  const { primary, alternates } = getStrategy(ctx.deriveKey)({ slots: ctx.slots, raw: ctx.slots, level: ex.cefr });
  const accepted = new Set([primary, ...alternates]);
  if (!accepted.has(ex.answer)) {
    return { ok: false, reason: `answer "${ex.answer}" does not match re-derived "${primary}"` };
  }
  return { ok: true };
}

export type ProposedItem = {
  type: ExerciseType;
  prompt: string;
  answer: string;
  options?: string[];
  alts?: string[];
  rationale: Bi;
};

const VALID_TYPES: ExerciseType[] = [
  "fill_in_blank", "multiple_choice", "error_correction", "sentence_transformation", "word_order",
];

/** Structural gate for BYOK-proposed items. Correctness of a free-form LLM item cannot be
 *  re-derived from a deriveKey, so we enforce the structural invariants we CAN check and
 *  never show an item that fails. */
export function validateProposed(item: ProposedItem): ValidateResult {
  if (!VALID_TYPES.includes(item.type)) return { ok: false, reason: "bad type" };
  if (!item.prompt?.trim()) return { ok: false, reason: "empty prompt" };
  if (!item.answer?.trim()) return { ok: false, reason: "empty answer" };
  if (!item.rationale?.en?.trim() || !item.rationale?.ru?.trim()) return { ok: false, reason: "missing rationale" };
  if (item.type === "fill_in_blank" && !item.prompt.includes("___")) return { ok: false, reason: "no blank" };
  if (item.type === "multiple_choice") {
    if (!item.options || item.options.length < 2) return { ok: false, reason: "too few options" };
    if (!item.options.includes(item.answer)) return { ok: false, reason: "answer not in options" };
  }
  return { ok: true };
}
