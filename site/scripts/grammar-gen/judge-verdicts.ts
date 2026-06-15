// Read + shape the committed offline LLM-judge verdict file. Pure + testable.
// The build gate reads ONLY this committed file — it never calls a live LLM.
import { readFileSync, existsSync } from "node:fs";

export type TopicVerdict = { topicId: string; sampled: number; passed: number; failures: string[] };
export type VerdictFile = Record<string, TopicVerdict>;

export function loadVerdicts(path: string): VerdictFile {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as VerdictFile;
}

export function verdictPassRate(v: TopicVerdict): number {
  return v.sampled === 0 ? 0 : v.passed / v.sampled;
}
