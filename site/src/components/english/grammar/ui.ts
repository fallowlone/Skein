// Pure presentation helpers shared by the grammar surfaces (Atlas, Topic,
// Practice, Coverage). No DOM, no signals — unit-testable in isolation.
import type { Bi } from "~/english/types";
import type { Cefr, GrammarFamily } from "~/english/grammar-types";
import type { CardState } from "~/english/scheduler/types";
import type { BandCoverage } from "~/english/grammar-coverage";

const DAY = 86_400_000;
/** A card whose next interval reaches this many days reads as "mature". */
const MATURE_DAYS = 21;

export type MasteryState = "new" | "learning" | "review" | "mature";
export type MasteryView = { state: MasteryState; strength: number; dueDays: number | null };

/**
 * Collapse an FSRS card into the calm 0–100 strength + 4-state model the design
 * shows. Strength is the next interval as a fraction of MATURE_DAYS, clamped.
 */
export function masteryView(card: CardState | undefined, now: number = Date.now()): MasteryView {
  if (!card || card.reps === 0) return { state: "new", strength: 0, dueDays: card ? dueDays(card, now) : null };
  const days = card.scheduled_days;
  const state: MasteryState =
    days >= MATURE_DAYS ? "mature" : card.reps >= 3 && days >= 7 ? "review" : "learning";
  const strength = clamp(Math.round((days / MATURE_DAYS) * 100), 0, 100);
  return { state, strength, dueDays: dueDays(card, now) };
}

function dueDays(card: CardState, now: number): number {
  return Math.round((card.due - now) / DAY);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** "B1" for a single level, "B1–C1" for a span. */
export function cefrRange(levels: Cefr[]): string {
  if (!levels.length) return "";
  if (levels.length === 1) return levels[0];
  return `${levels[0]}–${levels[levels.length - 1]}`;
}

// ── Family colour + editorial note ──────────────────────────────────────────
// 19 families share the system's 8 domain hues + accent, grouped by relatedness
// so the reuse reads as intentional map regions rather than an accident.
type FamMeta = { hue: string; note: Bi };

export const FAMILY_META: Record<GrammarFamily, FamMeta> = {
  // verb system — sky
  tenses: { hue: "var(--d-backend)", note: { en: "how time is carved up", ru: "как размечается время" } },
  aspect: { hue: "var(--d-backend)", note: { en: "ongoing vs complete", ru: "процесс или результат" } },
  passive: { hue: "var(--d-backend)", note: { en: "who acts, who receives", ru: "кто действует, кто получает" } },
  "verb-patterns": { hue: "var(--d-backend)", note: { en: "what follows a verb", ru: "что идёт после глагола" } },
  // modality — lilac
  modals: { hue: "var(--d-network)", note: { en: "possibility, obligation", ru: "возможность, долженствование" } },
  conditionals: { hue: "var(--d-network)", note: { en: "if / unless / wishes", ru: "if / unless / желания" } },
  // reference — mint
  nouns: { hue: "var(--d-data)", note: { en: "count, mass, plurals", ru: "счёт, масса, мн. число" } },
  pronouns: { hue: "var(--d-data)", note: { en: "reference & agreement", ru: "отсылка и согласование" } },
  articles: { hue: "var(--d-data)", note: { en: "a / an / the / zero", ru: "a / an / the / нулевой" } },
  // modifiers — peach
  adjectives: { hue: "var(--d-frontend)", note: { en: "describing & comparing", ru: "описание и сравнение" } },
  adverbs: { hue: "var(--d-frontend)", note: { en: "how, when, how much", ru: "как, когда, насколько" } },
  // relation — teal
  prepositions: { hue: "var(--d-systems)", note: { en: "space, time, relation", ru: "место, время, связь" } },
  conjunctions: { hue: "var(--d-systems)", note: { en: "joining ideas", ru: "соединение идей" } },
  "phrasal-verbs": { hue: "var(--d-systems)", note: { en: "verb + particle", ru: "глагол + частица" } },
  // clause structure — rose
  "relative-clauses": { hue: "var(--d-ai)", note: { en: "embedding & linking", ru: "вложение и связь" } },
  "reported-speech": { hue: "var(--d-ai)", note: { en: "saying what was said", ru: "передача чужих слов" } },
  // syntax — indigo
  "word-order": { hue: "var(--d-hardware)", note: { en: "syntax & inversion", ru: "синтаксис и инверсия" } },
  questions: { hue: "var(--d-hardware)", note: { en: "asking & negating", ru: "вопрос и отрицание" } },
  // discourse — amber
  discourse: { hue: "var(--d-crypto)", note: { en: "cohesion across sentences", ru: "связность речи" } },
  // sentinel
  unclassified: { hue: "var(--muted)", note: { en: "", ru: "" } },
};

export function familyHue(id: GrammarFamily): string {
  return FAMILY_META[id]?.hue ?? "var(--muted)";
}

export function familyNote(id: GrammarFamily, lang: "en" | "ru"): string {
  return FAMILY_META[id]?.note[lang] ?? "";
}

// ── Coverage bar segments (percent of the band's EGP inventory) ─────────────
export type CoverageSegments = { covered: number; notYet: number; waived: number };

export function coverageSegments(b: BandCoverage): CoverageSegments {
  if (b.total === 0) return { covered: 100, notYet: 0, waived: 0 };
  const covered = Math.round((100 * b.covered) / b.total);
  // Clamp waived so independent rounding can never push the three segments past
  // 100% (which would overflow the stacked bar by ~1%).
  const waived = Math.min(Math.round((100 * b.waived) / b.total), 100 - covered);
  const notYet = Math.max(0, 100 - covered - waived);
  return { covered, notYet, waived };
}

// ── Placement bands shown in the Atlas filter rail ──────────────────────────
export const BANDS: { id: Cefr; locked: boolean }[] = [
  { id: "A0", locked: false },
  { id: "A1", locked: false },
  { id: "A2", locked: false },
  { id: "B1", locked: false },
  { id: "B2", locked: false },
  { id: "C1", locked: true },
  { id: "C2", locked: true },
];

/** C1/C2 are gated until a B2 placement; A0–B2 always open. */
export function isLevelLocked(cefr: Cefr, placementBand: string | undefined): boolean {
  return (cefr === "C1" || cefr === "C2") && placementBand !== "B2";
}
