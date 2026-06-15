import { doc, highlightScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildHighlight(p: { labels: string[]; items?: string[] }): LottieDoc {
  const tokens = p.labels.length ? p.labels : ["—"];
  return doc(highlightScene(tokens, tokens.length - 1));
}
