import type { GrammarTopic } from "~/english/grammar-types";
import type { LottieDoc } from "./lottie-types";
import { buildTimeline } from "./archetypes/timeline";
import { buildSlotFill } from "./archetypes/slot-fill";
import { buildContrastPair } from "./archetypes/contrast-pair";
import { buildTransformation } from "./archetypes/transformation";
import { buildScale } from "./archetypes/scale";
import { buildBranch } from "./archetypes/branch";
import { buildSwap } from "./archetypes/swap";
import { buildMap } from "./archetypes/map";
import { buildHighlight } from "./archetypes/highlight";

export type AnimParams = { labels: string[]; items?: string[] };
export type AnimBuilder = (p: AnimParams) => LottieDoc;

/** The 9 generators we actually build. */
export const ARCHETYPE_BUILDERS: Record<string, AnimBuilder> = {
  "timeline": buildTimeline,
  "slot-fill": buildSlotFill,
  "contrast-pair": buildContrastPair,
  "transformation": buildTransformation,
  "scale": buildScale,
  "branch": buildBranch,
  "swap": buildSwap,
  "map": buildMap,
  "highlight": buildHighlight,
};

/** Rare singleton archetypes folded onto a canonical neighbor (no topic-data churn). */
export const ALIASES: Record<string, string> = {
  "comparison": "contrast-pair",
  "fill-gap": "slot-fill",
  "cycle": "transformation",
  "tree": "scale",
};

function paramsOf(topic: GrammarTopic): AnimParams {
  const raw = topic.archetypeParams ?? {};
  const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return { labels: asArray(raw.labels), items: asArray(raw.items) };
}

export type ResolvedAnimation = { archetype: string; doc: () => LottieDoc };

/** Resolve a topic to its canonical archetype + a thunk that builds the doc. null if unmapped. */
export function resolveAnimation(topic: GrammarTopic): ResolvedAnimation | null {
  const canonical = ALIASES[topic.archetype] ?? topic.archetype;
  const builder = ARCHETYPE_BUILDERS[canonical];
  if (!builder) return null;
  const params = paramsOf(topic);
  return { archetype: canonical, doc: () => builder(params) };
}
