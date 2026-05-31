// site/src/english/byok/speech.ts
// Direct browser -> Anthropic speech-grading call. Raw fetch, no SDK. The key is
// obtained transiently via withKey. The speech-coach system prompt is prompt-cached.
// Input length cap bounds spend. Transcript is treated as STT output — punctuation
// and casing are intentionally ignored in the rubric.
import type { GradingResult, OutputTask } from "~/english/types";
import { parseGrading } from "./grading";
import { withKey as defaultWithKey } from "./index";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
export const MAX_INPUT_CHARS = 4000;

export type GradeModel = "claude-haiku-4-5" | "claude-sonnet-4-6";

export type SpeechGradeDeps = {
  fetch: typeof fetch;
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  model: GradeModel;
  now: () => number;
};

const SPEECH_SYSTEM = `You are a precise English speaking coach for software engineers (CEFR A2–C1).
The learner's text is a TRANSCRIPT of SPOKEN English produced by speech recognition.
Assess fluency, coherence, grammar and vocabulary. IGNORE punctuation, casing and obvious
recognition artifacts (homophones, dropped articles that are likely mis-hears).
Reply with ONLY a JSON object:
{"corrections":[{"before":"...","after":"...","why":"..."}],"betterVersion":"...","scoreBand":"A2|B1|B2|C1","noticingHints":["..."]}
Be specific and kind. Keep betterVersion natural and at or slightly above the learner's level.`;

function userBlock(task: OutputTask, transcript: string): string {
  return `TASK: ${task.prompt.en}\nRUBRIC: ${task.rubric.join("; ")}\n\nSPOKEN TRANSCRIPT:\n${transcript}`;
}

/** Testable core: deps injected. */
export async function gradeSpeechWithClient(task: OutputTask, transcript: string, deps: SpeechGradeDeps): Promise<GradingResult> {
  if (transcript.trim().length === 0) throw new Error("empty transcript");
  if (transcript.length > MAX_INPUT_CHARS) throw new Error(`Transcript too long (max ${MAX_INPUT_CHARS}).`);

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
        system: [{ type: "text", text: SPEECH_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userBlock(task, transcript) }],
      }),
    }),
  );

  if (!res.ok) throw new Error(`grading failed (HTTP ${res.status})`);
  const data = await res.json();
  const parsed = parseGrading(data?.content?.[0]?.text ?? "");
  if (!parsed) throw new Error("grading failed: could not parse model output");
  return parsed;
}

/** Production entry: uses the real fetch + the singleton withKey. */
export function gradeSpeech(task: OutputTask, transcript: string, model: GradeModel): Promise<GradingResult> {
  return gradeSpeechWithClient(task, transcript, { fetch: fetch.bind(globalThis), withKey: defaultWithKey, model, now: () => Date.now() });
}
