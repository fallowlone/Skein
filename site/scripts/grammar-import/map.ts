import { CEFR_ORDER, cefrIndex, type Cefr, type GrammarLesson, type GrammarTopic } from "~/english/grammar-types";
import { parseExample } from "./parse-example";

export type SteepLevel = { content: string; examples?: string[]; tip?: string };
export type SteepTopic = { topicId: string; levels: Record<string, SteepLevel> };

export const kebab = (s: string): string => s.replace(/_/g, "-").toLowerCase();

const isCefr = (s: string): s is Cefr => (CEFR_ORDER as string[]).includes(s);

export function mapSteepTopic(raw: SteepTopic): GrammarTopic {
  const levels = (Object.keys(raw.levels).filter(isCefr) as Cefr[])
    .sort((a, b) => cefrIndex(a) - cefrIndex(b));

  const lessons: Partial<Record<Cefr, GrammarLesson>> = {};
  for (const lv of levels) {
    const src = raw.levels[lv];
    lessons[lv] = {
      cefr: lv,
      explain: { en: "", ru: src.content ?? "" },
      structure: { en: "", ru: "" },
      examples: (src.examples ?? []).map(parseExample),
      tip: { en: "", ru: src.tip ?? "" },
    };
  }

  return {
    id: kebab(raw.topicId),
    title: { en: "", ru: titleFromId(raw.topicId) },
    cefr: levels[0] ?? "A1",
    levels,
    family: "unclassified",
    egp: [],
    archetype: "",
    lessons,
    related: [],
    crossTopic: [],
  };
}

// Human-ish RU placeholder title from the id; authoring replaces title.en and may refine ru.
function titleFromId(topicId: string): string {
  return topicId
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
