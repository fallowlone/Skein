// site/src/german/state.ts
//
// German-for-Engineers — per-user vocabulary state, scheduler-backed.
// Own localStorage key (awesome.german.v1), fully isolated from the English layer.
// One CardState per word; status is derived from the card's maturity.
//
// Mirrors site/src/english/state.ts exactly. The FSRS scheduler and the shared
// active-day streak are IMPORTED from the English/shared modules, never copied —
// German and English progress on the same daily streak but separate decks.

import { signal, effect } from "@preact/signals";
import { fsrsScheduler } from "~/english/scheduler/fsrs";
import type { CardState, Grade } from "~/english/scheduler/types";
import { recordActiveDay } from "~/scripts/user-state";
import type { GerBand } from "./types";
import { vocabA1 } from "./data/vocab-a1";
import { vocabA2 } from "./data/vocab-a2";
import { vocabB1 } from "./data/vocab-b1";

const KEY = "awesome.german.v1";
const scheduler = fsrsScheduler();

/** A card whose next interval is at least this many days counts as "known". */
const MATURE_DAYS = 21;

/**
 * The aggregated German vocabulary deck — A1 + A2 + B1. Every consumer
 * (stats band bars, queueing, VocabModule) reads from this single source.
 */
export const germanDeck = [...vocabA1, ...vocabA2, ...vocabB1];

export type WordStatus = "new" | "learning" | "known";

export type GradingModel = "claude-haiku-4-5" | "claude-sonnet-4-6";

export type WordRecord = {
  card: CardState;
  seen: number;
};

export type PlacementResult = { estimatedKnown: number; band: GerBand; takenAt: number };

export type GermanState = {
  words: Record<string, WordRecord>;
  revealed: Record<string, number>;
  placement?: PlacementResult;
  known: Record<string, true>;
  settings: { newWordsPerDay: number; gradingModel: GradingModel };
  daily?: { date: string; newIntroduced: number };
  readUnits: Record<string, true>;
  outputAttempts: Record<string, { at: number; scoreBand?: string }>;
  grammarDone: Record<string, true>;
  collocationDone: Record<string, true>;
};

const DEFAULT_NEW_PER_DAY = 20;
const defaults: GermanState = {
  words: {}, revealed: {}, known: {},
  settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY, gradingModel: "claude-haiku-4-5" },
  readUnits: {}, outputAttempts: {},
  grammarDone: {}, collocationDone: {},
};

function load(): GermanState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    // Only accept v1 records (must carry a `card`); anything else is dropped.
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
      settings: {
        newWordsPerDay: parsed.settings?.newWordsPerDay ?? DEFAULT_NEW_PER_DAY,
        gradingModel: parsed.settings?.gradingModel ?? "claude-haiku-4-5",
      },
      daily: parsed.daily,
      readUnits: parsed.readUnits ?? {},
      outputAttempts: parsed.outputAttempts ?? {},
      grammarDone: parsed.grammarDone ?? {},
      collocationDone: parsed.collocationDone ?? {},
    };
  } catch {
    return defaults;
  }
}

function save(s: GermanState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const germanState = signal<GermanState>(load());

if (typeof window !== "undefined") {
  effect(() => save(germanState.value));
}

function statusFromCard(card: CardState): WordStatus {
  if (card.reps === 0) return "new";
  return card.scheduled_days >= MATURE_DAYS ? "known" : "learning";
}

/** Grade a word; creates the card on first grade. */
export function gradeWord(id: string, grade: Grade, now: number) {
  const prev = germanState.value.words[id];
  const base = prev?.card ?? scheduler.newCard(now);
  const card = scheduler.review(base, grade, now);
  germanState.value = {
    ...germanState.value,
    words: {
      ...germanState.value.words,
      [id]: { card, seen: (prev?.seen ?? 0) + 1 },
    },
  };
  if (typeof window !== "undefined") recordActiveDay();
}

/** Count a first exposure without scheduling (word shown in reading). */
export function bumpSeen(id: string, now: number) {
  if (germanState.value.words[id]) return;
  germanState.value = {
    ...germanState.value,
    words: {
      ...germanState.value.words,
      [id]: { card: scheduler.newCard(now), seen: 1 },
    },
  };
}

export function statusOf(id: string): WordStatus {
  const rec = germanState.value.words[id];
  return rec ? statusFromCard(rec.card) : "new";
}

/** Of the given ids, those whose card is due at `now` (and already started). */
export function dueWordIds(ids: string[], now: number): string[] {
  return ids.filter((id) => {
    const rec = germanState.value.words[id];
    return rec && rec.card.reps > 0 && scheduler.isDue(rec.card, now);
  });
}

export function knownCount(ids: string[]): number {
  return ids.filter((id) => statusOf(id) === "known").length;
}

export function recordReveal(unitId: string, passageCount: number) {
  const cur = germanState.value.revealed[unitId] ?? 0;
  if (passageCount <= cur) return;
  germanState.value = {
    ...germanState.value,
    revealed: { ...germanState.value.revealed, [unitId]: passageCount },
  };
}

/** Test/Settings helper: wipe German progress. */
export function resetGerman() {
  germanState.value = {
    words: {}, revealed: {}, known: {},
    settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY, gradingModel: "claude-haiku-4-5" },
    readUnits: {}, outputAttempts: {},
    grammarDone: {}, collocationDone: {},
  };
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

/** Total words currently at "known" maturity — feeds derived XP. */
export function germanKnownTotal(): number {
  return Object.values(germanState.value.words).filter(
    (r) => r.card.reps > 0 && r.card.scheduled_days >= MATURE_DAYS,
  ).length;
}

function dayStr(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Save a placement result and seed its known lemmas/ids. */
export function setPlacement(result: PlacementResult, knownIds: string[]) {
  const known = { ...germanState.value.known };
  for (const id of knownIds) known[id] = true;
  germanState.value = { ...germanState.value, placement: result, known };
}

export function getPlacement(): PlacementResult | undefined {
  return germanState.value.placement;
}

/** A word counts as known if placement seeded it or its card matured. */
export function isKnown(id: string): boolean {
  return germanState.value.known[id] === true || statusOf(id) === "known";
}

export function getNewWordsPerDay(): number {
  return germanState.value.settings.newWordsPerDay;
}

export function setNewWordsPerDay(n: number) {
  germanState.value = {
    ...germanState.value,
    settings: { ...germanState.value.settings, newWordsPerDay: Math.max(1, Math.floor(n)) },
  };
}

/** New words already introduced today (0 if the stored day is not today). */
export function introducedToday(now: number): number {
  const d = germanState.value.daily;
  return d && d.date === dayStr(now) ? d.newIntroduced : 0;
}

/** Mark that one new word was introduced now (rolls the per-day counter). */
export function recordNewIntro(now: number) {
  const today = dayStr(now);
  const d = germanState.value.daily;
  const newIntroduced = d && d.date === today ? d.newIntroduced + 1 : 1;
  germanState.value = { ...germanState.value, daily: { date: today, newIntroduced } };
}

/**
 * From candidate band ids, those that are not known and never seen, capped by the
 * remaining daily new-word budget.
 */
export function queueNewWords(candidateIds: string[], now: number): string[] {
  const budget = Math.max(0, getNewWordsPerDay() - introducedToday(now));
  if (budget === 0) return [];
  const fresh = candidateIds.filter(
    (id) => !isKnown(id) && !germanState.value.words[id],
  );
  return fresh.slice(0, budget);
}

export function isUnitRead(id: string): boolean {
  return germanState.value.readUnits[id] === true;
}

/** Mark a reading unit complete; seed its target words into the SRS deck. */
export function markUnitRead(id: string, targetWords: string[], now: number) {
  for (const w of targetWords) bumpSeen(w, now); // no-ops if already seen
  germanState.value = {
    ...germanState.value,
    readUnits: { ...germanState.value.readUnits, [id]: true },
  };
}

export function getGradingModel(): GradingModel {
  return germanState.value.settings.gradingModel;
}

export function setGradingModel(model: GradingModel) {
  germanState.value = {
    ...germanState.value,
    settings: { ...germanState.value.settings, gradingModel: model },
  };
}

export function recordOutputAttempt(id: string, scoreBand: string | undefined, now: number) {
  germanState.value = {
    ...germanState.value,
    outputAttempts: { ...germanState.value.outputAttempts, [id]: { at: now, scoreBand } },
  };
}

export function outputAttemptOf(id: string): { at: number; scoreBand?: string } | undefined {
  return germanState.value.outputAttempts[id];
}

export function isGrammarDone(id: string): boolean {
  return germanState.value.grammarDone[id] === true;
}

export function markGrammarDone(id: string) {
  if (germanState.value.grammarDone[id]) return;
  germanState.value = {
    ...germanState.value,
    grammarDone: { ...germanState.value.grammarDone, [id]: true },
  };
  if (typeof window !== "undefined") recordActiveDay();
}

export function isCollocationDone(id: string): boolean {
  return germanState.value.collocationDone[id] === true;
}

export function markCollocationDone(id: string) {
  if (germanState.value.collocationDone[id]) return;
  germanState.value = {
    ...germanState.value,
    collocationDone: { ...germanState.value.collocationDone, [id]: true },
  };
  if (typeof window !== "undefined") recordActiveDay();
}
