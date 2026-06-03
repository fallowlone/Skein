// site/src/german/byok/grade.ts
// Direct browser -> Anthropic grading for German output tasks. Mirrors
// site/src/english/byok/anthropic.ts but with a German-coach system prompt.
// The transport (postMessages) and the JSON parser (parseGrading) are SHARED
// with the English layer — imported, never copied — so the grading contract
// never diverges. The key is obtained transiently inside postMessages and sent
// as x-api-key for a single request. Input length is capped to bound spend.
import type { OutputTask, GradingResult } from "~/german/types";
import { postMessages, type GradeModel } from "~/english/byok/converse";
import { parseGrading } from "~/english/byok/grading";
import { withKey as defaultWithKey } from "~/english/byok";

export const MAX_INPUT_CHARS = 4000;

export type { GradeModel };

// parseGrading validates scoreBand against ["A2","B1","B2","C1"], so we ask the
// model to emit one of those even though the German layer's own bands are
// A1/A2/B1: A1-level work is graded against the "A2" floor of the shared scale.
const SYSTEM = `You are a precise German writing coach for software engineers (CEFR A1–B1).
Grade the learner's German response to the task against the rubric. The learner's first language is Russian/English; the task and rubric are about producing professional German engineering text.
Reply with ONLY a JSON object:
{"corrections":[{"before":"...","after":"...","why":"..."}],"betterVersion":"...","scoreBand":"A2|B1|B2|C1","noticingHints":["..."]}
Corrections target real German errors (gender/case, word order V2 and verb-final, separable verbs, agreement). "why" is a short, kind explanation. "betterVersion" is natural German at or slightly above the learner's level. "scoreBand" must be one of A2, B1, B2, C1 (use A2 as the floor for very basic A1-level work). "noticingHints" are 1–3 short German features to watch next time.`;

function userBlock(task: OutputTask, text: string): string {
  return `TASK: ${task.prompt.en}\nRUBRIC: ${task.rubric.join("; ")}\n\nLEARNER RESPONSE (German):\n${text}`;
}

export type GradeDeps = {
  fetch: typeof fetch;
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  model: GradeModel;
};

/** Testable core: deps injected. */
export async function gradeGermanWithClient(task: OutputTask, text: string, deps: GradeDeps): Promise<GradingResult> {
  if (text.trim().length === 0) throw new Error("empty response");
  if (text.length > MAX_INPUT_CHARS) throw new Error(`Response too long (max ${MAX_INPUT_CHARS} characters).`);

  const data = await postMessages({
    model: deps.model,
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userBlock(task, text) }],
  }, deps);

  const out = data?.content?.[0]?.text ?? "";
  const parsed = parseGrading(out);
  if (!parsed) throw new Error("grading failed: could not parse model output");
  return parsed;
}

/** Production entry: real fetch + the shared singleton withKey. */
export function gradeGermanOutput(task: OutputTask, text: string, model: GradeModel): Promise<GradingResult> {
  return gradeGermanWithClient(task, text, {
    fetch: fetch.bind(globalThis),
    withKey: defaultWithKey,
    model,
  });
}
