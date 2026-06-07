// Generate practice exercises from a BYO source via the learner's own Anthropic key (BYOK).
// Mirrors byok/anthropic.ts: an injectable core (deps) + a thin live wrapper. NEVER stores the key;
// reuses the audited withKey() so egress + CSP are unchanged. Without a key the caller skips this
// entirely (cards are still created in cards.ts) and shows an "add key" affordance.
import { withKey as liveWithKey } from "../byok";
import { getGradingModel } from "../state";

export type GenExercises = {
  cloze: { sentence: string; answer: string }[];
  comprehension: { q: string; a: string }[];
  retell: string;
};
export type ExerciseDeps = {
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  fetch: typeof fetch;
  model: string;
};

const PROMPT = (text: string) =>
  `From the English passage below, produce STRICT JSON {cloze:[{sentence,answer}],comprehension:[{q,a}],retell} ` +
  `with 6 cloze gaps on useful words, 4 comprehension questions, and one one-sentence retell task. ` +
  `No prose outside the JSON.\n\nPASSAGE:\n${text.slice(0, 6000)}`;

export async function generateExercisesWith(text: string, deps: ExerciseDeps): Promise<GenExercises> {
  return deps.withKey(async (key) => {
    const res = await deps.fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: deps.model,
        max_tokens: 1500,
        messages: [{ role: "user", content: PROMPT(text) }],
      }),
    });
    if (!res.ok) throw new Error(`exercise generation failed: ${res.status}`);
    const data = await res.json();
    const raw: string = data?.content?.[0]?.text ?? "{}";
    const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    return {
      cloze: Array.isArray(json.cloze) ? json.cloze : [],
      comprehension: Array.isArray(json.comprehension) ? json.comprehension : [],
      retell: typeof json.retell === "string" ? json.retell : "",
    };
  });
}

export function generateExercises(text: string): Promise<GenExercises> {
  return generateExercisesWith(text, {
    withKey: liveWithKey,
    fetch: fetch.bind(globalThis),
    model: getGradingModel(),
  });
}
