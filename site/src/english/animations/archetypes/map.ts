import { doc, mapScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildMap(p: { labels: string[]; items?: string[] }): LottieDoc {
  const left = p.labels;
  const right = p.items && p.items.length === left.length ? p.items : left.map((_, i) => left[(i + 1) % left.length]);
  const pairs = left.map((l, i): [string, string] => [l, right[i] ?? l]);
  return doc(mapScene(pairs.length ? pairs : [["—", "—"]]));
}
