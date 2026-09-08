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
//
// cardsFromRetrieval takes TWO ids: `cardSlug` builds the stable SM-2 cardKey (the
// bare author id, so existing schedules survive) while `lessonKey` is the canonical
// "<track>/<unit>/<slug>" join key (injected by the remark plugin) that unitReviewHealth
// buckets on. They differ on purpose — see path-io.ts unitReviewHealth.
export type RetrievalQ = { id?: string; q: unknown; a?: unknown; answer?: unknown; conceptIds?: string[] };
export type PracticeTaskLite = {
  id: string;
  type?: string;
  title: Bi;
  prompt: Bi;
  concepts?: string[];
  reveal?: Bi;
  model?: Bi;
  grading?: unknown;
};

function gradingModel(grading: unknown): Bi | undefined {
  if (!grading || typeof grading !== "object" || !("model" in grading)) return undefined;
  const model = (grading as { model?: unknown }).model;
  return model && typeof model === "object" && "en" in model && "ru" in model ? model as Bi : undefined;
}

export function cardsFromRetrieval(cardSlug: string, lessonKey: string, lang: Lang, questions: RetrievalQ[]): CardSeed[] {
  return questions
    .map((q, index): CardSeed | null => {
      const front = q.q;
      const back = q.a ?? q.answer;
      if (typeof front !== "string" || typeof back !== "string") return null;
      return {
        cardKey: `${lessonKey}::retrieval::${index}`,
        ...(cardSlug !== lessonKey ? { legacyCardKey: `${cardSlug}::retrieval::${index}` } : {}),
        lessonKey,
        source: "retrieval" as const,
        index,
        ...(q.conceptIds?.length ? { conceptIds: q.conceptIds } : {}),
        front: trunc(front),
        back: trunc(back),
        lang,
      };
    })
    .filter((c): c is CardSeed => c !== null);
}

export function cardsFromPractice(lessonKey: string, lang: Lang, tasks: PracticeTaskLite[]): CardSeed[] {
  return tasks.map((t, index) => {
    const answer = t.reveal?.[lang] ?? t.model?.[lang] ?? gradingModel(t.grading)?.[lang] ?? "";
    const inline = t.prompt[lang].length <= HARVEST_MAX && answer.length > 0 && answer.length <= HARVEST_MAX;
    return {
      cardKey: `${lessonKey}::practice::${t.id}`,
      lessonKey,
      source: "practice" as const,
      index,
      front: inline ? t.prompt[lang] : trunc(t.title[lang]),
      back: inline ? answer : "",
      lang,
      taskId: t.id,
      answerMode: inline ? "inline" as const : "original-task" as const,
      ...(t.concepts?.length ? { conceptIds: t.concepts } : {}),
    };
  });
}
