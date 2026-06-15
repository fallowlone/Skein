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
  const { primary, alternates } = getStrategy(ctx.deriveKey)({ slots: ctx.slots, raw: ctx.slots, level: ex.cefr });
  const accepted = new Set([primary, ...alternates]);
  if (!accepted.has(ex.answer)) {
    return { ok: false, reason: `answer "${ex.answer}" does not match re-derived "${primary}"` };
  }
  return { ok: true };
}
