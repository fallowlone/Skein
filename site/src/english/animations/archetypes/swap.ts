import { doc, swapScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildSwap(p: { labels: string[]; items?: string[] }): LottieDoc {
  const [a = "A", b = "B"] = p.labels;
  return doc(swapScene(a, b));
}
