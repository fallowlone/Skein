// BYOK live layer: an injected proposer (a user-keyed LLM in production, a mock in tests)
// suggests extra exercises; EVERY proposed item passes the structural validator before it
// is shown. The proposer never decides correctness — it only suggests.
import type { GrammarTopic } from "~/english/grammar-types";
import type { GeneratedExercise } from "./types";
import { validateProposed, type ProposedItem } from "./validate";

export type LiveProposer = (topic: GrammarTopic, n: number) => Promise<ProposedItem[]>;

export async function proposeLiveExercises(
  topic: GrammarTopic,
  proposer: LiveProposer,
  n: number,
): Promise<GeneratedExercise[]> {
  let raw: ProposedItem[];
  try {
    raw = await proposer(topic, n);
  } catch {
    return []; // a failing proposer must never break the session
  }
  const out: GeneratedExercise[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!validateProposed(item).ok) continue;
    out.push({
      id: `${topic.id}:live:${i}`,
      topicId: topic.id,
      cefr: topic.cefr ?? "B1",
      type: item.type,
      prompt: item.prompt,
      answer: item.answer,
      alts: item.alts ?? [],
      options: item.options,
      rationale: item.rationale,
    });
  }
  return out;
}
