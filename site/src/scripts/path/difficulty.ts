// site/src/scripts/path/difficulty.ts
// Pure adaptive-difficulty selection for practice. Centralises the recall→apply→stretch tier
// vocabulary (PracticeSection re-uses the same order) and maps a concept's mastery to the tier
// the learner should attempt next: weak → recall the fact, mid → apply it, strong → senior stretch.
// See docs/superpowers/plans/2026-06-14-adaptive-path-engine.md §B.

export const DIFFICULTY_TIERS = ["recall", "apply", "stretch"] as const;
export type Difficulty = (typeof DIFFICULTY_TIERS)[number];

// Below half the threshold the concept is barely seen → recall; up to the threshold → apply;
// at/above the "known" cutoff → stretch (a senior-level extension of an already-solid concept).
export function pickDifficulty(mastery: number, threshold: number): Difficulty {
  if (mastery < threshold * 0.5) return "recall";
  if (mastery < threshold) return "apply";
  return "stretch";
}

const tierRank = (d: string): number => {
  const i = (DIFFICULTY_TIERS as readonly string[]).indexOf(d);
  return i === -1 ? DIFFICULTY_TIERS.length : i;
};

// Among not-yet-"done" tasks, prefer one matching the mastery-derived tier; otherwise the easiest
// remaining task (lowest tier rank). Returns null when nothing is left to do.
export function recommendTask<T extends { id: string; difficulty: string }>(
  tasks: T[], mastery: number, threshold: number, status: Record<string, string>,
): T | null {
  const open = tasks.filter((t) => status[t.id] !== "done");
  if (!open.length) return null;
  const want = pickDifficulty(mastery, threshold);
  const match = open.find((t) => t.difficulty === want);
  if (match) return match;
  return [...open].sort((a, b) => tierRank(a.difficulty) - tierRank(b.difficulty))[0];
}
