import type { TopicGenSpec, GrammarTopic } from "~/english/grammar-types";
import { grammarById } from "~/english/data/grammar/index";
import type { GeneratedExercise } from "./types";
import { generateFromSpec, type GenerateOpts } from "./generate";

// Map a slot morphology feature to the coarse grammatical tag a topic lists in `features`.
function featureToTag(feature: string): string {
  if (feature === "passive" || feature === "pastParticiple") return "passive";
  if (feature === "comparative" || feature === "superlative") return "comparison";
  if (feature === "plural") return "number";
  return feature;
}

// Compose two topics: keep the primary's templates, but only those that exercise a slot
// whose `feature` the secondary topic also lists in its `features` (pedagogically sane).
export function compositeFromSpecs(
  primaryId: string, primary: TopicGenSpec,
  secondaryId: string, secondary: TopicGenSpec,
  opts: Omit<GenerateOpts, "types">,
): GeneratedExercise[] {
  const secFeatures = new Set(secondary.features);
  const featureBearing = primary.templates.filter((t) =>
    Object.values(t.slots).some((s) => s.feature && secFeatures.has(featureToTag(s.feature))),
  );
  if (featureBearing.length === 0) return [];
  const sub: TopicGenSpec = { ...primary, templates: featureBearing };
  return generateFromSpec(`${primaryId}+${secondaryId}`, sub, opts);
}

export function composite(primaryId: string, secondaryId: string, opts: Omit<GenerateOpts, "types">): GeneratedExercise[] {
  const p: GrammarTopic | undefined = grammarById.get(primaryId);
  const s: GrammarTopic | undefined = grammarById.get(secondaryId);
  if (!p?.gen || !s?.gen) return [];
  if (!p.crossTopic.includes(secondaryId) && !s.crossTopic.includes(primaryId)) return [];
  return compositeFromSpecs(primaryId, p.gen, secondaryId, s.gen, opts);
}
