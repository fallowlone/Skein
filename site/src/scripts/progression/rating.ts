import type { PretestQuestion } from "../pretest-questions";

export function maxScore(bank: PretestQuestion[]): number {
  return bank.reduce((sum, q) => sum + Math.max(0, ...q.choices.map((c) => c.weight)), 0);
}
export function scoreStage(answers: number[], bank: PretestQuestion[]): number {
  return answers.reduce((sum, choiceIdx, qIdx) => sum + (bank[qIdx]?.choices[choiceIdx]?.weight ?? 0), 0);
}
export function qualifiesForStage2(s1: number): boolean { return s1 >= 0.75; }
export function computeRating(s1: number, s2?: number): number {
  if (s2 === undefined) return Math.round(750 * clamp01(s1));
  return 750 + Math.round(250 * clamp01(s2));
}
export function confidenceOf(weightLists: number[][]): "high" | "medium" {
  const all = weightLists.flat();
  if (all.length === 0) return "medium";
  const norm = all.map((w) => w / 3);
  const mean = norm.reduce((a, b) => a + b, 0) / norm.length;
  const variance = norm.reduce((a, b) => a + (b - mean) ** 2, 0) / norm.length;
  return Math.sqrt(variance) <= 0.25 ? "high" : "medium";
}
function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
