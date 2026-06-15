import { doc, transformScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildTransformation(p: { labels: string[]; items?: string[] }): LottieDoc {
  const [from = "before", to = "after"] = p.labels;
  return doc(transformScene(from, to));
}
