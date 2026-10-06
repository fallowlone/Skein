import type { Locale } from "../../i18n";
import { CAP_PER_ALGO, CAP_PER_LESSON } from "../../../scripts/path/algo-links-core.mjs";
import indexJson from "../../content/path/algo-links.json";
import titlesJson from "../../content/path/algo-link-titles.json";

export type AlgoLinkHit = { lesson?: string; unit?: string; shared: number; canonical: boolean };

export type LinkIndex = {
  units: Record<string, Array<{ lesson: string; shared: number; canonical: boolean }>>;
  lessons: Record<string, Array<{ unit: string; shared: number; canonical: boolean }>>;
};

type Titles = {
  lessons: Record<string, { en?: string; ru?: string }>;
  units: Record<string, { slug?: string; en?: string; ru?: string }>;
  tracks: Record<string, { en?: string; ru?: string }>;
};

export const algoLinksIndex = indexJson as LinkIndex;
const titles = titlesJson as Titles;

export type UnitLink = {
  unit: string;
  title: string;
  href: string;
  canonical: boolean;
  shared: number;
};

export type LessonLink = UnitLink & { lesson: string; track: string; trackLabel: string };

/** Locale title with EN fallback, then the raw id/slug — never blank. */
export function pickTitle(
  entry: { en?: string; ru?: string } | undefined,
  lang: Locale,
  fallback: string,
): string {
  return entry?.[lang] || entry?.en || fallback;
}

function unitSlug(unit: string): string {
  return titles.units[unit]?.slug || unit.split("/")[1] || unit;
}

const byRank = <T extends { canonical: boolean; shared: number }>(a: T, b: T) =>
  Number(b.canonical) - Number(a.canonical) || b.shared - a.shared;

/** Algo units linked to a lesson (lesson-side block rows). */
export function linksForLesson(index: LinkIndex, lessonKey: string, lang: Locale): UnitLink[] {
  const hits = [...(index.lessons[lessonKey] ?? [])].sort(byRank);
  return hits.slice(0, CAP_PER_LESSON).map((h) => {
    const slug = unitSlug(h.unit);
    return {
      unit: h.unit,
      title: pickTitle(titles.units[h.unit], lang, slug),
      // Units have no route of their own — land on the unit's anchor on the track page.
      href: `/${lang}/learn/algorithms/#unit-${slug}`,
      canonical: h.canonical,
      shared: h.shared,
    };
  });
}

/** Lessons where an algo unit gets used (algo-side block rows). */
export function linksForUnit(index: LinkIndex, unitId: string, lang: Locale): LessonLink[] {
  const hits = [...(index.units[unitId] ?? [])].sort(byRank);
  return hits.slice(0, CAP_PER_ALGO).map((h) => {
    const track = h.lesson.split("/")[0] || "";
    const slug = h.lesson.split("/")[2] || h.lesson;
    return {
      unit: unitId,
      lesson: h.lesson,
      track,
      title: pickTitle(titles.lessons[h.lesson], lang, slug),
      href: `/${lang}/learn/${h.lesson}/`,
      trackLabel: pickTitle(titles.tracks[track], lang, track),
      canonical: h.canonical,
      shared: h.shared,
    };
  });
}
