// site/src/english/state.ts
//
// English-for-Engineers — per-user vocabulary state, scheduler-backed.
// Own localStorage key, separate from the synced user-state for now (P0).
// One CardState per word; status is derived from the card's maturity.

import { signal, effect } from "@preact/signals";
import { fsrsScheduler } from "./scheduler/fsrs";
import type { CardState, Grade } from "./scheduler/types";

const KEY = "awesome.english.v2"; // v2: scheduler-backed (v1 Leitner is discarded)
const scheduler = fsrsScheduler();

/** A card whose next interval is at least this many days counts as "known". */
const MATURE_DAYS = 21;
const DAY = 86_400_000;

export type WordStatus = "new" | "learning" | "known";

export type WordRecord = {
  card: CardState;
  seen: number;
};

export type EnglishState = {
  words: Record<string, WordRecord>;
  revealed: Record<string, number>;
};

const defaults: EnglishState = { words: {}, revealed: {} };

function load(): EnglishState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    // Only accept v2 records (must carry a `card`); anything else is dropped.
    const words: Record<string, WordRecord> = {};
    for (const [id, rec] of Object.entries(parsed.words ?? {})) {
      if (rec && typeof rec === "object" && "card" in (rec as object)) {
        words[id] = rec as WordRecord;
      }
    }
    return { words, revealed: parsed.revealed ?? {} };
  } catch {
    return defaults;
  }
}

function save(s: EnglishState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const englishState = signal<EnglishState>(load());

if (typeof window !== "undefined") {
  effect(() => save(englishState.value));
}

function statusFromCard(card: CardState): WordStatus {
  if (card.reps === 0) return "new";
  return card.scheduled_days >= MATURE_DAYS ? "known" : "learning";
}

/** Grade a word; creates the card on first grade. */
export function gradeWord(id: string, grade: Grade, now: number) {
  const prev = englishState.value.words[id];
  const base = prev?.card ?? scheduler.newCard(now);
  const card = scheduler.review(base, grade, now);
  englishState.value = {
    ...englishState.value,
    words: {
      ...englishState.value.words,
      [id]: { card, seen: (prev?.seen ?? 0) + 1 },
    },
  };
}

/** Count a first exposure without scheduling (word shown in reading). */
export function bumpSeen(id: string, now: number) {
  if (englishState.value.words[id]) return;
  englishState.value = {
    ...englishState.value,
    words: {
      ...englishState.value.words,
      [id]: { card: scheduler.newCard(now), seen: 1 },
    },
  };
}

export function statusOf(id: string): WordStatus {
  const rec = englishState.value.words[id];
  return rec ? statusFromCard(rec.card) : "new";
}

/** Of the given ids, those whose card is due at `now` (and already started). */
export function dueWordIds(ids: string[], now: number): string[] {
  return ids.filter((id) => {
    const rec = englishState.value.words[id];
    return rec && rec.card.reps > 0 && scheduler.isDue(rec.card, now);
  });
}

export function knownCount(ids: string[]): number {
  return ids.filter((id) => statusOf(id) === "known").length;
}

export function recordReveal(unitId: string, passageCount: number) {
  const cur = englishState.value.revealed[unitId] ?? 0;
  if (passageCount <= cur) return;
  englishState.value = {
    ...englishState.value,
    revealed: { ...englishState.value.revealed, [unitId]: passageCount },
  };
}

/** Test/Settings helper: wipe English progress. */
export function resetEnglish() {
  englishState.value = { words: {}, revealed: {} };
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
