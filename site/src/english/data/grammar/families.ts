import type { Bi } from "~/english/types";
import type { GrammarFamily } from "~/english/grammar-types";

export type FamilyMeta = { id: Exclude<GrammarFamily, "unclassified">; title: Bi };

// Display order for the Atlas (Phase 5). "unclassified" is intentionally excluded —
// it is an import sentinel that must be gone after the authoring pass (Task 8).
export const FAMILIES: FamilyMeta[] = [
  { id: "tenses", title: { en: "Tenses", ru: "Времена" } },
  { id: "aspect", title: { en: "Aspect", ru: "Вид" } },
  { id: "modals", title: { en: "Modals", ru: "Модальные глаголы" } },
  { id: "conditionals", title: { en: "Conditionals", ru: "Условные" } },
  { id: "passive", title: { en: "Passive", ru: "Пассив" } },
  { id: "articles", title: { en: "Articles", ru: "Артикли" } },
  { id: "nouns", title: { en: "Nouns", ru: "Существительные" } },
  { id: "pronouns", title: { en: "Pronouns", ru: "Местоимения" } },
  { id: "adjectives", title: { en: "Adjectives", ru: "Прилагательные" } },
  { id: "adverbs", title: { en: "Adverbs", ru: "Наречия" } },
  { id: "prepositions", title: { en: "Prepositions", ru: "Предлоги" } },
  { id: "relative-clauses", title: { en: "Relative clauses", ru: "Относительные придаточные" } },
  { id: "reported-speech", title: { en: "Reported speech", ru: "Косвенная речь" } },
  { id: "questions", title: { en: "Questions", ru: "Вопросы" } },
  { id: "verb-patterns", title: { en: "Verb patterns", ru: "Глагольные модели" } },
  { id: "phrasal-verbs", title: { en: "Phrasal verbs", ru: "Фразовые глаголы" } },
  { id: "conjunctions", title: { en: "Conjunctions", ru: "Союзы" } },
  { id: "word-order", title: { en: "Word order", ru: "Порядок слов" } },
  { id: "discourse", title: { en: "Discourse", ru: "Дискурс" } },
];
