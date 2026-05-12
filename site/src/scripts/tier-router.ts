import type { Tier } from "../types";
import { pretestQuestions } from "./pretest-questions";

export function scoreToTier(score: number): Tier {
  if (score <= 3) return "junior";
  if (score <= 6) return "middle";
  return "senior";
}

export function scorePretest(answers: number[]): number {
  return answers.reduce((sum, choiceIdx, qIdx) => {
    const q = pretestQuestions[qIdx];
    if (!q) return sum;
    return sum + (q.choices[choiceIdx]?.weight ?? 0);
  }, 0);
}

export { pretestQuestions } from "./pretest-questions";
