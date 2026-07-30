/**
 * Hydration cap on reader pages.
 *
 * Lesson pages are the ones with a real budget: they are the deep-read surface,
 * and every island there is JS the reader pays for before the text is usable.
 * Hub/nav pages (home, track overview, projects, glossary, roadmap) legitimately
 * render one island per listed item, so they are exempt.
 *
 * NOTE: this rule used to key off a 4-segment `dist/<lang>/<pillar>/<piece>/`
 * path from the retired pieces model. No emitted page has that shape any more,
 * so the check silently applied to nothing. It now matches the live lesson route,
 * `dist/<lang>/learn/<track>/<unit>/<lesson>/index.html`.
 */
const BUDGET = 8;

export function checkHydrationBudget(html: string, file: string): string[] {
  const afterDist = file.split(/[\\/]dist[\\/]/)[1] ?? "";
  const segments = afterDist.split(/[\\/]/).filter(Boolean);
  // ["en", "learn", "<track>", "<unit>", "<lesson>", "index.html"] = 6
  const isLesson =
    segments.length === 6 &&
    (segments[0] === "en" || segments[0] === "ru") &&
    segments[1] === "learn" &&
    segments[5].endsWith(".html");
  if (!isLesson) return [];

  const count = html.match(/<astro-island\b/g)?.length ?? 0;
  if (count > BUDGET) {
    return [`${file}: ${count} hydration islands (max ${BUDGET} on a lesson page)`];
  }
  return [];
}
