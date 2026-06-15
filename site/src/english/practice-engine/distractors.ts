// Ported from steep/grammar/algorithm/distractors-v2.ts + mc-adapter.ts
// Adapted to signatures: makeDistractors(answer, {lemma, kind}, n) and toMultipleChoice(answer, distractors, rng)
import { verbForm, nounPlural, adjForm } from "./morphology";
import { shuffleInPlace } from "./rng";

export type DistractorKind = "verb" | "noun" | "adjective";

function normalizeForCompare(s: string): string {
  return s.trim().toLowerCase();
}

/** Generate morphological candidates for a given lemma+kind. */
function morphCandidates(lemma: string, kind: DistractorKind): string[] {
  const candidates: string[] = [];
  if (kind === "verb") {
    candidates.push(
      verbForm(lemma, "base"),
      verbForm(lemma, "s3"),
      verbForm(lemma, "past"),
      verbForm(lemma, "pastParticiple"),
      verbForm(lemma, "gerund"),
    );
  } else if (kind === "noun") {
    candidates.push(lemma, nounPlural(lemma));
  } else if (kind === "adjective") {
    candidates.push(
      adjForm(lemma, "base"),
      adjForm(lemma, "comparative"),
      adjForm(lemma, "superlative"),
    );
  }
  return candidates;
}

/** Near-miss fallback heuristics (ported from steep's genericFallback). */
function nearMissFallback(answer: string): string[] {
  const candidates = new Set<string>();
  const lower = answer.toLowerCase();

  if (lower !== answer) candidates.add(lower);
  else if (answer[0]) candidates.add(answer[0].toUpperCase() + answer.slice(1));

  if (answer.endsWith("s")) candidates.add(answer.slice(0, -1));
  else candidates.add(answer + "s");

  if (answer.endsWith("ing")) candidates.add(answer.slice(0, -3));
  else if (!answer.includes(" ")) candidates.add(answer + "ing");

  if (answer.endsWith("ed")) candidates.add(answer.slice(0, -2));
  else if (!answer.includes(" ")) candidates.add(answer + "ed");

  // multi-word: try swapping first word
  if (answer.includes(" ")) {
    const [first, ...rest] = answer.split(" ");
    candidates.add([first + "s", ...rest].join(" "));
    candidates.add([first.slice(0, -1) || first, ...rest].join(" "));
  }

  return Array.from(candidates).filter((c) => c && c !== answer);
}

/**
 * Generate `n` plausible wrong forms for `answer`.
 * - Uses morphological candidates for verb/noun/adjective
 * - Falls back to near-miss heuristics if not enough unique candidates
 * - Never includes `answer` itself
 * - Returns exactly `n` items (pads with placeholders if truly not enough candidates)
 */
export function makeDistractors(
  answer: string,
  hint: { lemma: string; kind: DistractorKind },
  n: number,
): string[] {
  const normAnswer = normalizeForCompare(answer);
  const seen = new Set<string>([normAnswer]);
  const out: string[] = [];

  // Phase 1: morphological candidates
  for (const c of morphCandidates(hint.lemma, hint.kind)) {
    if (out.length >= n) break;
    const norm = normalizeForCompare(c);
    if (!seen.has(norm)) {
      seen.add(norm);
      out.push(c);
    }
  }

  // Phase 2: near-miss fallback
  if (out.length < n) {
    for (const c of nearMissFallback(answer)) {
      if (out.length >= n) break;
      const norm = normalizeForCompare(c);
      if (!seen.has(norm)) {
        seen.add(norm);
        out.push(c);
      }
    }
  }

  // Phase 3: padding (shouldn't normally reach here)
  while (out.length < n) {
    out.push(`[variant ${out.length + 1}]`);
  }

  return out.slice(0, n);
}

/**
 * Shuffle answer + distractors into 4 options using the seeded rng.
 * Returns the options array and the index of the correct answer.
 */
export function toMultipleChoice(
  answer: string,
  distractors: string[],
  rng: () => number,
): { options: string[]; correctIndex: number } {
  const options: string[] = [answer, ...distractors.slice(0, 3)];
  // Pad if fewer than 4
  while (options.length < 4) options.push(`[option ${options.length}]`);

  let correctIndex = 0;
  // Fisher-Yates with seeded RNG, tracking where answer lands
  for (let j = options.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    [options[j], options[k]] = [options[k], options[j]];
    if (j === correctIndex) correctIndex = k;
    else if (k === correctIndex) correctIndex = j;
  }

  return { options, correctIndex };
}
