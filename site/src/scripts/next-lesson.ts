export type UnitLite = {
  slug: string;
  order: number;
  lessons: readonly string[];
};

export type NextLesson = { unit: string; slug: string } | null;

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
