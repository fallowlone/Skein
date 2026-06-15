import { doc, twoBoxScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildContrastPair(p: { labels: string[]; items?: string[] }): LottieDoc {
  const [a = "X", b = "Y"] = p.labels;
  return doc(twoBoxScene(a, b));
}
