// site/src/scripts/assess/retest.ts
// Confirmed gaps and fragile concepts → spaced-repetition cards carrying the verbatim
// question, so the re-test is the same question, not a paraphrase (spec §9.3).
import type { CardSeed } from "~/scripts/review-state";
import { expectedLevel } from "./ordinal";
import { LEVELS, type Cell, type CellKey, type Level } from "./types";

/** Two to four weeks out, per the spec; the SRS scheduler takes over from there. */
export const RETEST_DELAY_MS = 21 * 24 * 60 * 60 * 1000;

/** Continuous expectedLevel cutoff (0..3, the mass-weighted mean), not a LEVELS.indexOf bucket. */
const RETEST_LEVEL = 1.2;

// Bilingual fallback for a card's `back` when no grader left a failureNote (e.g. the learner
// answered "dont_know", or the item kind doesn't produce one). Same pattern as
// PATTERN_LABELS in patterns.ts: a real EN/RU pair per Level, never the raw internal id —
// this branch's hard constraint is bilingual-or-it-does-not-ship (Ruling 3).
const LEVEL_FALLBACK: Record<Level, { en: string; ru: string }> = {
  gap: { en: "Not yet known — worth a fresh look.", ru: "Пока не освоено — стоит повторить с нуля." },
  junior: { en: "Recognized the term, but the mechanism wasn't clear.", ru: "Узнаёт термин, но механизм пока не понятен." },
  middle: { en: "Explains the mechanism, but it wasn't fluent yet.", ru: "Объясняет механизм, но пока не бегло." },
  senior: { en: "Answered correctly, but only with hints — worth confirming without them.", ru: "Ответил верно, но только с подсказками — стоит проверить без них." },
};

export function toRetestCards(
  cells: ReadonlyMap<CellKey, Cell>,
  lang: "en" | "ru",
  atMs: number,
  promptFor: (conceptId: string, cell: Cell) => string,
): CardSeed[] {
  const out: CardSeed[] = [];
  let index = 0;
  for (const cell of cells.values()) {
    if (cell.items === 0) continue;
    const level = expectedLevel(cell.posterior);
    const fragile = cell.evidence.some((e) => e.response.outcome === "correct" && e.response.hintsUsed === 2);
    if (level > RETEST_LEVEL && !fragile) continue;

    const note = cell.evidence.map((e) => e.failureNote).filter(Boolean).join("; ");
    const levelKey = LEVELS[Math.round(level)] ?? LEVELS[0];
    out.push({
      // Deliberately stable across re-assessment (Ruling 4) — no `atMs` in the key. A repeat
      // session for the same concept+facet must update the existing card through
      // review-state.ts's addCard(), which is idempotent on cardKey (keeps the SRS schedule,
      // refreshes only front/back/lessonKey). Keying on atMs would mint a brand-new "day
      // zero" card every time the learner re-assesses the same gap, silently discarding
      // whatever spacing progress that card had already earned.
      cardKey: `assess:${cell.conceptId}:${cell.facet}`,
      lessonKey: cell.evidence[0]?.lessonKey ?? cell.conceptId,
      source: "assess",
      index: index++,
      front: promptFor(cell.conceptId, cell),
      back: note || LEVEL_FALLBACK[levelKey][lang],
      lang,
    });
  }
  return out;
}
