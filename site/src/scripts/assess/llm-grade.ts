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
import { LEVELS, type AssessItem, type Level } from "./types";

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
