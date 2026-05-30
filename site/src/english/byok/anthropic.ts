// site/src/english/byok/anthropic.ts
// Direct browser -> Anthropic grading. Raw fetch, no SDK. The key is obtained
// transiently via withKey and sent as x-api-key for a single request. The strict
// rubric system prompt is prompt-cached. Input length cap bounds spend.
import type { GradingResult, OutputTask } from "~/english/types";
import { parseGrading } from "./grading";
import { withKey as defaultWithKey } from "./index";

export const MAX_INPUT_CHARS = 4000;
const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export type GradeModel = "claude-haiku-4-5" | "claude-sonnet-4-6";

export type GradeDeps = {
  fetch: typeof fetch;
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  model: GradeModel;
  now: () => number;
};

const SYSTEM = `You are a precise English writing coach for software engineers (CEFR A2–C1).
Grade the learner's response to the task against the rubric. Reply with ONLY a JSON object:
{"corrections":[{"before":"...","after":"...","why":"..."}],"betterVersion":"...","scoreBand":"A2|B1|B2|C1","noticingHints":["..."]}
Be specific and kind. Keep betterVersion natural and at or slightly above the learner's level.`;

function userBlock(task: OutputTask, text: string): string {
  return `TASK: ${task.prompt.en}\nRUBRIC: ${task.rubric.join("; ")}\n\nLEARNER RESPONSE:\n${text}`;
}

/** Testable core: deps injected. */
export async function gradeWithClient(task: OutputTask, text: string, deps: GradeDeps): Promise<GradingResult> {
  if (text.trim().length === 0) throw new Error("empty response");
  if (text.length > MAX_INPUT_CHARS) throw new Error(`Response too long (max ${MAX_INPUT_CHARS} characters).`);

  const res = await deps.withKey(async (key) =>
    deps.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: deps.model,
        max_tokens: 1024,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userBlock(task, text) }],
      }),
    }),
  );

  if (!res.ok) throw new Error(`grading failed (HTTP ${res.status})`);
  const data = await res.json();
  const out = data?.content?.[0]?.text ?? "";
  const parsed = parseGrading(out);
  if (!parsed) throw new Error("grading failed: could not parse model output");
  return parsed;
}

/** Production entry: uses the real fetch + the singleton withKey. */
export function gradeOutput(task: OutputTask, text: string, model: GradeModel): Promise<GradingResult> {
  return gradeWithClient(task, text, { fetch: fetch.bind(globalThis), withKey: defaultWithKey, model, now: () => Date.now() });
}
