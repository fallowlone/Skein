import type { KnowledgeState } from "./types";
import type { ConceptGraph } from "./graph";
import { applyDiagnostic } from "./knowledge";

// questionId → concept ids. Every target verified to exist in concepts.json (asserted in tests).
export const PRETEST_CONCEPT_MAP: Record<string, string[]> = {
  tcp:              ["tcp-handshake"],
  "db-index":       ["b-tree-index"],
  react:            ["reconciliation"],
  http:             ["http"],
  "adv-mvcc":       ["mvcc"],
  "adv-consensus":  ["consensus"],
  "adv-http-cache": ["cache-aside", "stale-while-revalidate"],
  "adv-event-loop": ["event-loop"],
  "adv-tls-0rtt":   ["0-rtt", "tls"],
  "adv-cap":        ["eventual-consistency"],
};

// chosen choice weight (0..3) → seeded confidence; weight 0 = no signal.
const WEIGHT_FRAC = [0, 0.3, 0.6, 0.85];

type Question = { id: string; choices: { weight: number }[] };
interface PretestLike { stage1: { answers: number[] }; stage2?: { answers: number[] } }

export function seedFromPretest(
  state: KnowledgeState, graph: ConceptGraph, pretest: PretestLike,
  stage1Questions: Question[], stage2Questions: Question[], now: number,
): KnowledgeState {
  let s = state;
  const fold = (questions: Question[], answers: number[]) => {
    answers.forEach((choiceIdx, i) => {
      const q = questions[i];
      if (!q) return;
      const weight = q.choices[choiceIdx]?.weight ?? 0;
      const frac = WEIGHT_FRAC[weight] ?? 0;
      if (frac <= 0) return;
      for (const concept of PRETEST_CONCEPT_MAP[q.id] ?? []) s = applyDiagnostic(s, graph, concept, frac, now);
    });
  };
  fold(stage1Questions, pretest.stage1.answers);
  if (pretest.stage2) fold(stage2Questions, pretest.stage2.answers);
  return s;
}
