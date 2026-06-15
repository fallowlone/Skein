import { doc, branchScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildBranch(p: { labels: string[]; items?: string[] }): LottieDoc {
  const [root = "if", ...rest] = p.labels;
  return doc(branchScene(root, rest.length ? rest : ["then"]));
}
