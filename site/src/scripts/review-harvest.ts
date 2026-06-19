// site/src/scripts/review-harvest.ts
// Pure extraction of review CardSeeds from lesson content: RetrievalDrawer Q/A
// and practice tasks. Keeps cards content-light and bounds their size so the
// localStorage store stays small. Lazy-seeded at island mount (see Phase 4 of
// docs/superpowers/plans/2026-06-05-spaced-repetition-engine.md).
import type { CardSeed } from "./review-state";

export const HARVEST_MAX = 600;

const trunc = (s: string): string => (s ?? "").slice(0, HARVEST_MAX);

type Lang = "en" | "ru";
type Bi = { en: string; ru: string };

// RetrievalDrawer prop drift: the component type says { id, q, answer } but lesson
// MDX passes { q, a }. Worse, q/answer are ComponentChildren — sometimes JSX, not
// strings. Accept both keys (`a ?? answer`) and harvest ONLY string-valued cards;
// JSX-bodied questions are skipped (a card needs plain text to review against).
export type RetrievalQ = { id?: string; q: unknown; a?: unknown; answer?: unknown };
export type PracticeTaskLite = { id: string; title: Bi; prompt: Bi };

export function cardsFromRetrieval(cardSlug: string, lessonKey: string, lang: Lang, questions: RetrievalQ[]): CardSeed[] {
  return questions
    .map((q, index): CardSeed | null => {
      const front = q.q;
      const back = q.a ?? q.answer;
      if (typeof front !== "string" || typeof back !== "string") return null;
      return {
        cardKey: `${cardSlug}::retrieval::${index}`,
        lessonKey,
        source: "retrieval" as const,
        index,
        front: trunc(front),
        back: trunc(back),
        lang,
      };
    })
    .filter((c): c is CardSeed => c !== null);
}

export function cardsFromPractice(lessonKey: string, lang: Lang, tasks: PracticeTaskLite[]): CardSeed[] {
  return tasks.map((t, index) => ({
    cardKey: `${lessonKey}::practice::${t.id}`,
    lessonKey,
    source: "practice" as const,
    index,
    front: trunc(t.prompt[lang]),
    back: trunc(t.title[lang]),
    lang,
  }));
}
