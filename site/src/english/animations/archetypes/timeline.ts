import { doc, axisScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildTimeline(p: { labels: string[]; items?: string[] }): LottieDoc {
  return doc(axisScene(p.labels.length ? p.labels : ["—"]));
}
