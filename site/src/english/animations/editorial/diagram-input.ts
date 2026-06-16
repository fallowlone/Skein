// site/src/english/animations/editorial/diagram-input.ts
import type { GrammarTopic, GrammarFamily } from "~/english/grammar-types";
import type { Lang } from "~/types/index";

export type DiagramInput = {
  archetype: string;
  family: GrammarFamily;
  genre: string;            // title — UPPERCASED by the renderer
  formula?: string;         // lessons[entry].structure
  hero?: string;            // first content token of examples[0]
  caption?: string;         // examples[0].note OR a short gloss
  labels: string[];         // archetypeParams.labels (fallback ["past","now","future"] for timeline)
  items: string[];          // archetypeParams.items
};

const STOP = new Set(["the","a","an","i","you","we","they","he","she","it","have","has","to","is"]);
function heroWord(sentence: string): string | undefined {
  const w = sentence.replace(/[^\p{L}\s'-]/gu, "").split(/\s+/).filter(Boolean);
  return w.find((t) => !STOP.has(t.toLowerCase())) ?? w[0];
}

export function toDiagramInput(topic: GrammarTopic, lang: Lang): DiagramInput {
  const entry = topic.levels?.[0] ?? topic.cefr;
  const lesson = entry ? topic.lessons?.[entry] : undefined;
  const ex0 = lesson?.examples?.[0];
  const params = topic.archetypeParams ?? {};
  const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : []);
  return {
    archetype: topic.archetype,
    family: topic.family,
    genre: topic.title?.[lang] ?? topic.title?.en ?? topic.id,
    formula: lesson?.structure?.[lang]?.trim() || undefined,
    hero: ex0 ? heroWord(ex0[lang] ?? ex0.en ?? "") : undefined,
    caption: ex0?.note?.[lang] ?? ex0?.note?.en ?? undefined,
    labels: asArr(params.labels),
    items: asArr(params.items),
  };
}
