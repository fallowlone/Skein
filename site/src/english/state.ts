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
import type { Cefr } from "./grammar-types";
import { appendHours, type HourEntry, type HourKind } from "./hours";
import { migrateGrammarMastery, gradeGrammar, type GrammarMastery } from "./grammar-mastery";

export type GrammarGoal = { targetCefr: Cefr; deadlineMs: number; perWeekdayHours: number[]; tzOffsetMin: number };

const KEY = "awesome.english.v2"; // v2: scheduler-backed (v1 Leitner is discarded)
const scheduler = fsrsScheduler();

/** A card whose next interval is at least this many days counts as "known". */
const MATURE_DAYS = 21;
const DAY = 86_400_000;

export type WordStatus = "new" | "learning" | "known";

export type GradingModel = "claude-haiku-4-5" | "claude-sonnet-4-6";

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
  settings: { newWordsPerDay: number; gradingModel: GradingModel };
  daily?: { date: string; newIntroduced: number };
  readUnits: Record<string, true>;
  outputAttempts: Record<string, { at: number; scoreBand?: string }>;
  grammarDone: Record<string, true>;
  collocationDone: Record<string, true>;
  hoursLog: HourEntry[];
  chunks: Record<string, { text: string; note?: string; src?: string; addedAt: number; card: CardState }>;
  /** FSRS grammar mastery cards, keyed by topicId. Migrated from grammarDone on load. */
  grammar: GrammarMastery;
  grammarGoal?: GrammarGoal;
};

const DEFAULT_NEW_PER_DAY = 20;
const defaults: EnglishState = {
  words: {}, revealed: {}, known: {},
  settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY, gradingModel: "claude-haiku-4-5" },
  readUnits: {}, outputAttempts: {},
  grammarDone: {}, collocationDone: {},
  hoursLog: [],
  chunks: {},
  grammar: {},
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
      settings: {
        newWordsPerDay: parsed.settings?.newWordsPerDay ?? DEFAULT_NEW_PER_DAY,
        gradingModel: parsed.settings?.gradingModel ?? "claude-haiku-4-5",
      },
      daily: parsed.daily,
      readUnits: parsed.readUnits ?? {},
      outputAttempts: parsed.outputAttempts ?? {},
      grammarDone: parsed.grammarDone ?? {},
      collocationDone: parsed.collocationDone ?? {},
      hoursLog: Array.isArray(parsed.hoursLog) ? parsed.hoursLog : [],
      chunks: parsed.chunks && typeof parsed.chunks === "object" ? parsed.chunks : {},
      grammar: migrateGrammarMastery(
        parsed.grammarDone && typeof parsed.grammarDone === "object" ? parsed.grammarDone : undefined,
        parsed.grammar && typeof parsed.grammar === "object" ? parsed.grammar : {},
      ),
      grammarGoal: parsed.grammarGoal && typeof parsed.grammarGoal === "object" ? parsed.grammarGoal : undefined,
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
    settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY, gradingModel: "claude-haiku-4-5" },
    readUnits: {}, outputAttempts: {},
    grammarDone: {}, collocationDone: {},
    hoursLog: [],
    chunks: {},
    grammar: {},
    // grammarGoal omitted, stays undefined
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

export function isUnitRead(id: string): boolean {
  return englishState.value.readUnits[id] === true;
}

/** Mark a reading unit complete; seed its target words into the SRS deck. */
export function markUnitRead(id: string, targetWords: string[], now: number) {
  for (const w of targetWords) bumpSeen(w, now); // no-ops if already seen
  englishState.value = {
    ...englishState.value,
    readUnits: { ...englishState.value.readUnits, [id]: true },
  };
}

export function getGradingModel(): GradingModel {
  return englishState.value.settings.gradingModel;
}

export function setGradingModel(model: GradingModel) {
  englishState.value = {
    ...englishState.value,
    settings: { ...englishState.value.settings, gradingModel: model },
  };
}

export function recordOutputAttempt(id: string, scoreBand: string | undefined, now: number) {
  englishState.value = {
    ...englishState.value,
    outputAttempts: { ...englishState.value.outputAttempts, [id]: { at: now, scoreBand } },
  };
}

export function outputAttemptOf(id: string): { at: number; scoreBand?: string } | undefined {
  return englishState.value.outputAttempts[id];
}

export function isGrammarDone(id: string): boolean {
  return englishState.value.grammarDone[id] === true;
}

export function markGrammarDone(id: string) {
  if (englishState.value.grammarDone[id]) return;
  englishState.value = {
    ...englishState.value,
    grammarDone: { ...englishState.value.grammarDone, [id]: true },
  };
  if (typeof window !== "undefined") recordActiveDay();
}

/** The FSRS mastery card for a grammar topic, or undefined if never graded. */
export function grammarCardOf(topicId: string): CardState | undefined {
  return englishState.value.grammar[topicId];
}

/** Grade a grammar topic's mastery card (create-if-absent); used by the practice runner. */
export function gradeGrammarTopic(topicId: string, grade: Grade, now: number) {
  englishState.value = {
    ...englishState.value,
    grammar: gradeGrammar(englishState.value.grammar, topicId, grade, new Date(now)),
  };
  if (typeof window !== "undefined") recordActiveDay();
}

export function isCollocationDone(id: string): boolean {
  return englishState.value.collocationDone[id] === true;
}

export function markCollocationDone(id: string) {
  if (englishState.value.collocationDone[id]) return;
  englishState.value = {
    ...englishState.value,
    collocationDone: { ...englishState.value.collocationDone, [id]: true },
  };
  if (typeof window !== "undefined") recordActiveDay();
}

/** Log minutes of input/srs/output against today (the methodology's primary metric). */
export function logMinutes(kind: HourKind, min: number, src?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  englishState.value = {
    ...englishState.value,
    hoursLog: appendHours(englishState.value.hoursLog, { date, min, kind, src }),
  };
}

// Chunk cards — sentence-grain mining (the methodology's SRS feed after the frequency core):
// whole phrases from the learner's own content, including out-of-bank ones word-cards can't hold.
// Reuses the FSRS `scheduler` instance above; `card.due` is epoch ms.
const normChunk = (t: string) => t.toLowerCase().replace(/[…]/g, "...").replace(/\s+/g, " ").trim();

export function addChunk(text: string, note: string | undefined, now: number, src?: string): string {
  const norm = normChunk(text);
  if (norm.length < 3) return "";
  const existing = Object.entries(englishState.value.chunks).find(([, c]) => normChunk(c.text) === norm);
  if (existing) return existing[0];
  const id = `chunk:${now.toString(36)}:${norm.slice(0, 24).replace(/\W+/g, "-")}`;
  englishState.value = {
    ...englishState.value,
    chunks: { ...englishState.value.chunks, [id]: { text: text.trim(), note, src, addedAt: now, card: scheduler.newCard(now) } },
  };
  return id;
}

export function gradeChunk(id: string, grade: Grade, now: number): void {
  const c = englishState.value.chunks[id];
  if (!c) return;
  englishState.value = {
    ...englishState.value,
    chunks: { ...englishState.value.chunks, [id]: { ...c, card: scheduler.review(c.card, grade, now) } },
  };
  if (typeof window !== "undefined") recordActiveDay();
}

export function dueChunks(now: number): string[] {
  return Object.entries(englishState.value.chunks)
    .filter(([, c]) => c.card.due <= now)
    .sort((a, b) => a[1].card.due - b[1].card.due)
    .map(([id]) => id);
}

export function getGrammarGoal(): GrammarGoal | undefined {
  return englishState.value.grammarGoal;
}

export function setGrammarGoal(goal: GrammarGoal): void {
  englishState.value = { ...englishState.value, grammarGoal: goal };
}

export function clearGrammarGoal(): void {
  const { grammarGoal: _drop, ...rest } = englishState.value;
  englishState.value = { ...rest };
}
