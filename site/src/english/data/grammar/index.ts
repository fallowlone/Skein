// Barrel over per-topic modules. Vite's import.meta.glob (eager) loads them so
// new topic files are picked up without editing this file.
import type { GrammarTopic } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";

const mods = import.meta.glob<{ topic: GrammarTopic }>("./*.ts", { eager: true });

export const grammarTopics: GrammarTopic[] = Object.entries(mods)
  .filter(([p]) => !/\/(index|families)\.ts$/.test(p) && !p.includes(".test."))
  .map(([, m]) => m.topic)
  .filter(Boolean)
  .sort((a, b) => cefrIndex(a.cefr) - cefrIndex(b.cefr) || a.id.localeCompare(b.id));

export const grammarById: Map<string, GrammarTopic> = new Map(
  grammarTopics.map((t) => [t.id, t]),
);
