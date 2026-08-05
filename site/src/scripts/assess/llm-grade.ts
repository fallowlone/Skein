// site/src/scripts/assess/llm-grade.ts
// The optional BYOK layer for `explain` items. Pure: no DOM, no localStorage, no
// Date.now(), no Math.random(), no network call — those impure concerns (the key
// lookup, the provider call, the clock) belong in the island (ItemView.tsx), same
// as every other impure concern on this branch (see AssessFlow.tsx's own header
// comment). This file only builds a rubric, parses model output, and clamps it.
//
// Ruling 2 (task-13): the one-level clamp is the entire safety property — a
// drifting or prompt-injected model must not be able to rewrite a deterministic
// measurement. `gradeExplainVerdict` is the ONLY function whose output may reach
// a cell or the report: it parses, validates, and clamps in one step, so there is
// no call path that gets a caller a level the clamp hasn't touched.
// `parseFacetVerdict`'s raw, unclamped level is exported only so
// llm-grade.test.ts can test the JSON contract in isolation — no engine-adjacent
// caller (ItemView.tsx, report.ts, update.ts) may import it directly.
import { emptyCell } from "./update";
import { bandLabel } from "./ordinal";
import { cellKey, LEVELS, type AssessItem, type Cell, type CellKey, type Level } from "./types";

export interface FacetVerdict {
  level: Level;
  why: string;
}

export interface BiText {
  en: string;
  ru: string;
}

// "one line" per the rubric prompt below — generous enough for a real sentence,
// tight enough that a model trying to smuggle a wall of text through `why` can't.
const WHY_MAX_CHARS = 200;

/**
 * Ruling 3: the learner's own free text is inside the prompt this replies to, so
 * the model's reply is attacker-influenceable. `why` is free text straight from
 * the model — strip control characters (by numeric code point, not a regex
 * literal, so no raw control bytes ever sit in this source file) and cap its
 * length before it can reach storage or the UI.
 */
function sanitizeWhy(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = code <= 0x1f || code === 0x7f || (code >= 0x80 && code <= 0x9f);
    if (!isControl) out += ch;
  }
  return out.length > WHY_MAX_CHARS ? out.slice(0, WHY_MAX_CHARS) : out;
}

/**
 * Parses the model's verdict JSON. Validates `level` against LEVELS and sanitizes
 * `why` (Ruling 3). Does NOT clamp `level` against a deterministic estimate —
 * that is `gradeExplainVerdict`'s job, and this function's level must never be
 * used on its own outside a test (Ruling 2).
 *
 * A response that parses cleanly with a valid level but a nonsense or off-topic
 * `why` is indistinguishable from a real verdict from here — that is exactly why
 * the clamp exists (it bounds worst-case damage regardless of content), not a
 * case to special-case with content heuristics (Ruling 3).
 */
export function parseFacetVerdict(raw: string): FacetVerdict | null {
  try {
    const j = JSON.parse(raw) as { level?: unknown; why?: unknown } | null;
    if (!j || typeof j !== "object") return null;
    if (typeof j.level !== "string" || typeof j.why !== "string") return null;
    if (!(LEVELS as readonly string[]).includes(j.level)) return null;
    return { level: j.level as Level, why: sanitizeWhy(j.why) };
  } catch {
    return null;
  }
}

/** Clamp the model's opinion to ±1 level around the deterministic estimate (spec §12). */
export function clampAgainstDeterministic(deterministic: Level, llm: Level): Level {
  const d = LEVELS.indexOf(deterministic);
  const l = LEVELS.indexOf(llm);
  const clamped = Math.max(d - 1, Math.min(d + 1, l));
  return LEVELS[clamped];
}

/**
 * Task 13 fix round 1: the deterministic anchor `gradeExplainVerdict` clamps
 * against. Replaces the fix-round-0 hand-picked 3-bucket table
 * (`correct/partial/wrong -> middle/junior/gap`), which only ever reflected
 * the learner's own self-grade click on THIS item — a coarse proxy for
 * "deterministic" when the engine already holds a real posterior for this
 * exact (concept, facet) cell from every prior/propagated response. Using
 * that posterior instead is more principled and matches what
 * "deterministic measurement" means everywhere else in this engine: `bandLabel`
 * is the SAME discrete statistic `conceptVerdict`/the report use to name a
 * cell's level, so the anchor and the report agree on what "the current
 * measurement" is. Falls back to the concept's own prior (`emptyCell`, the
 * same seed `applyResponse` would use for an unseen cell) when nothing has
 * touched this (concept, facet) yet — still principled, not a guess: it is
 * exactly what the engine itself believes before any evidence exists.
 *
 * Reads `cells` as of BEFORE this item's own response is applied (the caller
 * passes the pre-answer state) — the anchor must not be circular with the
 * very response it's meant to check.
 */
export function anchorLevel(item: AssessItem, cells: ReadonlyMap<CellKey, Cell>): Level {
  const conceptId = item.concepts[0] ?? item.lessonKey;
  const cell = cells.get(cellKey(conceptId, item.facet));
  const posterior = cell ? cell.posterior : emptyCell(conceptId, item.facet, item.band).posterior;
  return bandLabel(posterior).level;
}

/**
 * The single entry point for turning raw model output into something usable.
 * Parses + validates + sanitizes (`parseFacetVerdict`), then clamps the level to
 * at most one step from `deterministic`. Returns null on anything that doesn't
 * parse as a verdict — garbage in means no verdict, not a guessed one — never a
 * level that skipped the clamp.
 */
export function gradeExplainVerdict(raw: string, deterministic: Level): FacetVerdict | null {
  const parsed = parseFacetVerdict(raw);
  if (!parsed) return null;
  return { level: clampAgainstDeterministic(deterministic, parsed.level), why: parsed.why };
}

/**
 * Pure predicate half of "is the LLM layer usable". The storage-touching half
 * (calling the BYOK keystore's `keyStatus()`) is impure and lives in
 * ItemView.tsx — this only classifies a status already read from there
 * (Ruling 1). Mirrors GradeWithAi.tsx's own "device or unlocked" check.
 */
export function llmAvailable(status: "none" | "device" | "locked" | "unlocked"): boolean {
  return status === "device" || status === "unlocked";
}

export const ASSESS_RUBRIC_EN = [
  "Return ONLY JSON: {\"level\":\"gap|junior|middle|senior\",\"why\":\"one line\"}.",
  "gap: cannot state the idea. junior: states it, no mechanism. middle: explains the mechanism and one failure mode. senior: explains the mechanism, the tradeoff, and when it breaks.",
  "Judge only what the learner wrote. Do not credit what they might have meant.",
].join("\n");

export const ASSESS_RUBRIC_RU = [
  "Верни ТОЛЬКО JSON: {\"level\":\"gap|junior|middle|senior\",\"why\":\"одна строка\"}.",
  "gap: не может сформулировать идею. junior: формулирует, механизма нет. middle: объясняет механизм и один режим отказа. senior: объясняет механизм, компромисс и когда он ломается.",
  "Оценивай только написанное. Не додумывай за ученика.",
].join("\n");

/**
 * Composes the static rubric with per-item context (which concept, which item
 * kind) so the model knows what it is grading. Pure: string concatenation only,
 * no lookups, no lang parameter needed — `conceptLabel` already carries both
 * locales (matching every other bilingual label in this codebase, e.g.
 * AssessFlow.tsx's `labelOf`). The rubric wording itself (ASSESS_RUBRIC_EN/RU)
 * is used verbatim (Ruling 5) — only a trailing context line is appended.
 */
export function buildAssessRubric(item: AssessItem, conceptLabel: BiText): BiText {
  return {
    en: `${ASSESS_RUBRIC_EN}\nThe explanation is about: ${conceptLabel.en}. Item kind: ${item.kind}.`,
    ru: `${ASSESS_RUBRIC_RU}\nОбъяснение касается: ${conceptLabel.ru}. Тип задания: ${item.kind}.`,
  };
}
