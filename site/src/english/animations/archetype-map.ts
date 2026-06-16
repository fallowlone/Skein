import type { GrammarTopic } from "~/english/grammar-types";
import type { Lang } from "~/types/index";
import type { Scene } from "./editorial/scene-types";
import { toDiagramInput } from "./editorial/diagram-input";
import { buildTimelineScene } from "./editorial/build-scene";

export type SceneBuilder = (d: import("./editorial/diagram-input").DiagramInput) => Scene;

/** The 9 editorial scene builders. */
export const ARCHETYPE_BUILDERS: Record<string, SceneBuilder> = {
  "timeline":       buildTimelineScene,
  "slot-fill":      buildTimelineScene,   // TODO(task5-6)
  "contrast-pair":  buildTimelineScene,   // TODO(task5-6)
  "transformation": buildTimelineScene,   // TODO(task5-6)
  "scale":          buildTimelineScene,   // TODO(task5-6)
  "branch":         buildTimelineScene,   // TODO(task5-6)
  "swap":           buildTimelineScene,   // TODO(task5-6)
  "map":            buildTimelineScene,   // TODO(task5-6)
  "highlight":      buildTimelineScene,   // TODO(task5-6)
};

/** Rare singleton archetypes folded onto a canonical neighbor (no topic-data churn). */
export const ALIASES: Record<string, string> = {
  "comparison": "contrast-pair",
  "fill-gap":   "slot-fill",
  "cycle":      "transformation",
  "tree":       "scale",
};

export type ResolvedAnimation = { archetype: string; scene: () => Scene };

/** Resolve a topic + locale to its canonical archetype + a thunk that builds the Scene. null if unmapped. */
export function resolveAnimation(topic: GrammarTopic, lang: Lang): ResolvedAnimation | null {
  const canonical = ALIASES[topic.archetype] ?? topic.archetype;
  const builder = ARCHETYPE_BUILDERS[canonical];
  if (!builder) return null;
  return {
    archetype: canonical,
    scene: () => builder(toDiagramInput(topic, lang)),
  };
}
