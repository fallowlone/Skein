// Barrel over per-topic modules. Vite's import.meta.glob (eager) loads them so
// new topic files are picked up without editing this file.
import type { GrammarTopic } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";

// Exclude *.test.ts at the glob level: an eager glob IMPORTS every match (the
// runtime filter below only drops them from the array), and importing a test
// file pulls in `vitest`, which crashes the Astro prerender build. The negative
// pattern keeps test modules out of the import graph entirely.
const mods = import.meta.glob<{ topic: GrammarTopic }>(["./*.ts", "!./*.test.ts"], { eager: true });

export const grammarTopics: GrammarTopic[] = Object.entries(mods)
  .filter(([p]) => !/\/(index|families)\.ts$/.test(p) && !p.includes(".test."))
  .map(([, m]) => m.topic)
  .filter(Boolean)
  .sort((a, b) => cefrIndex(a.cefr) - cefrIndex(b.cefr) || a.id.localeCompare(b.id));

export const grammarById: Map<string, GrammarTopic> = new Map(
  grammarTopics.map((t) => [t.id, t]),
);
