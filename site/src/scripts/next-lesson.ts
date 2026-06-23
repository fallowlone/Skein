export type UnitLite = {
  slug: string;
  order: number;
  lessons: readonly string[];
};

export type NextLesson = { unit: string; slug: string } | null;
export type PriorLesson = NextLesson;

export function resolveNextLesson(
  units: readonly UnitLite[],
  currentUnitSlug: string,
  currentLessonSlug: string,
): NextLesson {
  const unit = units.find((u) => u.slug === currentUnitSlug);
  if (!unit) return null;
  const idx = unit.lessons.indexOf(currentLessonSlug);
  if (idx === -1) return null;

  if (idx + 1 < unit.lessons.length) {
    return { unit: unit.slug, slug: unit.lessons[idx + 1] };
  }

  const nextUnit = units.find((u) => u.order === unit.order + 1);
  if (!nextUnit) return null;
  const firstSlug = nextUnit.lessons[0];
  if (!firstSlug) return null;
  return { unit: nextUnit.slug, slug: firstSlug };
}

/**
 * Mirror of {@link resolveNextLesson} in the other direction: the lesson
 * immediately before the current one. Steps back within the unit, then falls
 * back to the *last* lesson of the previous unit. Returns null at the very
 * start of the track (first lesson of the first unit) or on an unknown ref.
 */
export function resolvePriorLesson(
  units: readonly UnitLite[],
  currentUnitSlug: string,
  currentLessonSlug: string,
): PriorLesson {
  const unit = units.find((u) => u.slug === currentUnitSlug);
  if (!unit) return null;
  const idx = unit.lessons.indexOf(currentLessonSlug);
  if (idx === -1) return null;

  if (idx - 1 >= 0) {
    return { unit: unit.slug, slug: unit.lessons[idx - 1] };
  }

  const prevUnit = units.find((u) => u.order === unit.order - 1);
  if (!prevUnit) return null;
  const lastSlug = prevUnit.lessons[prevUnit.lessons.length - 1];
  if (!lastSlug) return null;
  return { unit: prevUnit.slug, slug: lastSlug };
}
