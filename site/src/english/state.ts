// site/src/english/state.ts
//
// English-for-Engineers — per-user vocabulary state, scheduler-backed.
// Own localStorage key, separate from the synced user-state for now (P0).
// One CardState per word; status is derived from the card's maturity.

import { signal, effect } from "@preact/signals";
import { fsrsScheduler } from "./scheduler/fsrs";
import type { CardState, Grade } from "./scheduler/types";
import { recordActiveDay } from "~/scripts/user-state";
import type { Band } from "~/english/types";

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

export type PlacementResult = { estimatedKnown: number; band: Band; takenAt: number };

export type EnglishState = {
  words: Record<string, WordRecord>;
  revealed: Record<string, number>;
  placement?: PlacementResult;
  known: Record<string, true>;
  settings: { newWordsPerDay: number };
  daily?: { date: string; newIntroduced: number };
};

const DEFAULT_NEW_PER_DAY = 20;
const defaults: EnglishState = {
  words: {}, revealed: {}, known: {}, settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY },
};

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
    return {
      words,
      revealed: parsed.revealed ?? {},
      placement: parsed.placement,
      known: parsed.known ?? {},
      settings: { newWordsPerDay: parsed.settings?.newWordsPerDay ?? DEFAULT_NEW_PER_DAY },
      daily: parsed.daily,
    };
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
  if (typeof window !== "undefined") recordActiveDay();
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
  englishState.value = {
    words: {}, revealed: {}, known: {},
    settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY },
  };
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

/** Total words currently at "known" maturity — feeds derived XP. */
export function englishKnownTotal(): number {
  return Object.values(englishState.value.words).filter(
    (r) => r.card.reps > 0 && r.card.scheduled_days >= MATURE_DAYS,
  ).length;
}

function dayStr(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Save a placement result and seed its known lemmas/ids. */
export function setPlacement(result: PlacementResult, knownIds: string[]) {
  const known = { ...englishState.value.known };
  for (const id of knownIds) known[id] = true;
  englishState.value = { ...englishState.value, placement: result, known };
}

export function getPlacement(): PlacementResult | undefined {
  return englishState.value.placement;
}

/** A word counts as known if placement seeded it or its card matured. */
export function isKnown(id: string): boolean {
  return englishState.value.known[id] === true || statusOf(id) === "known";
}

export function getNewWordsPerDay(): number {
  return englishState.value.settings.newWordsPerDay;
}

export function setNewWordsPerDay(n: number) {
  englishState.value = {
    ...englishState.value,
    settings: { ...englishState.value.settings, newWordsPerDay: Math.max(1, Math.floor(n)) },
  };
}

/** New words already introduced today (0 if the stored day is not today). */
export function introducedToday(now: number): number {
  const d = englishState.value.daily;
  return d && d.date === dayStr(now) ? d.newIntroduced : 0;
}

/** Mark that one new word was introduced now (rolls the per-day counter). */
export function recordNewIntro(now: number) {
  const today = dayStr(now);
  const d = englishState.value.daily;
  const newIntroduced = d && d.date === today ? d.newIntroduced + 1 : 1;
  englishState.value = { ...englishState.value, daily: { date: today, newIntroduced } };
}

/**
 * From candidate band ids, those that are not known and never seen, capped by the
 * remaining daily new-word budget.
 */
export function queueNewWords(candidateIds: string[], now: number): string[] {
  const budget = Math.max(0, getNewWordsPerDay() - introducedToday(now));
  if (budget === 0) return [];
  const fresh = candidateIds.filter(
    (id) => !isKnown(id) && !englishState.value.words[id],
  );
  return fresh.slice(0, budget);
}
