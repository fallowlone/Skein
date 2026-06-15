import { doc, nodeRowScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildSlotFill(p: { labels: string[]; items?: string[] }): LottieDoc {
  return doc(nodeRowScene(p.labels.length ? p.labels : ["—"], { mode: "row" }));
}
