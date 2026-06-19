import type { GrammarTopic } from "~/english/grammar-types";
import type { Lang } from "~/types/index";
import type { Scene } from "./editorial/scene-types";
import { toDiagramInput } from "./editorial/diagram-input";
import { buildTimelineScene, buildArcScene, buildContrastScene, buildTransformScene, buildMapScene, buildBranchScene, buildScaleScene, buildSwapScene, buildHighlightScene, buildSlotFillScene } from "./editorial/build-scene";

export type SceneBuilder = (d: import("./editorial/diagram-input").DiagramInput) => Scene;

/** The editorial scene builders. `arc` is the grammar-decoupled retrospective timeline for general lessons. */
export const ARCHETYPE_BUILDERS: Record<string, SceneBuilder> = {
  "timeline":       buildTimelineScene,
  "arc":            buildArcScene,
  "slot-fill":      buildSlotFillScene,
  "contrast-pair":  buildContrastScene,
  "transformation": buildTransformScene,
  "scale":          buildScaleScene,
  "branch":         buildBranchScene,
  "swap":           buildSwapScene,
  "map":            buildMapScene,
  "highlight":      buildHighlightScene,
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
