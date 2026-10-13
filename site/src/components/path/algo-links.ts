import type { Locale } from "../../i18n";
import {
  ALGO_TRACK,
  CAP_PER_ALGO,
  CAP_PER_LESSON,
} from "../../../scripts/path/algo-links-core.mjs";
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

export type RowKind = "lesson" | "algoUnit";

/** Mono meta cell for a row: shared count, or the domain track label off-track. */
export function rowMeta(
  row: { track?: string; trackLabel?: string; shared: number; canonical: boolean },
  kind: RowKind,
  canonicalLabel: string,
): string {
  const canon = row.canonical ? `◆ ${canonicalLabel}` : "";
  if (kind === "algoUnit") {
    // Same-track rows would repeat the page title — show the shared count instead.
    const tag = row.track === ALGO_TRACK ? `${row.shared}∩` : (row.trackLabel ?? row.track ?? "");
    return [tag, canon].filter(Boolean).join(" · ");
  }
  return [`${row.shared}∩`, canon].filter(Boolean).join(" · ");
}

/** Algo units linked to a lesson (lesson-side block rows). */
export function linksForLesson(index: LinkIndex, lessonKey: string, lang: Locale): UnitLink[] {
  // A lesson's "topic algorithms" block must point outward: drop the unit the
  // lesson itself belongs to. An algo lesson listing its own unit just re-points
  // at the page it already lives on. Mirrors linksForUnit's self-filter (the
  // builder no longer emits self-rows, this is defence-in-depth for any index).
  const ownUnit = lessonKey.split("/").slice(0, 2).join("/");
  const hits = [...(index.lessons[lessonKey] ?? [])]
    .filter((h) => h.unit !== ownUnit)
    .sort(byRank);
  return hits.slice(0, CAP_PER_LESSON).map((h) => {
    const slug = unitSlug(h.unit);
    return {
      unit: h.unit,
      title: pickTitle(titles.units[h.unit], lang, slug),
      // Units have no route of their own — land on the unit's anchor on the track page.
      href: `/${lang}/learn/${ALGO_TRACK}/#unit-${slug}`,
      canonical: h.canonical,
      shared: h.shared,
    };
  });
}

/** Lessons where an algo unit gets used (algo-side block rows). */
export function linksForUnit(index: LinkIndex, unitId: string, lang: Locale): LessonLink[] {
  const hits = [...(index.units[unitId] ?? [])].sort(byRank);
  // "Where this unit gets used" must point OUTWARD. Without this filter the
  // unit's own lessons dominate the hits (they share the most concepts with
  // their own unit), so the block just re-lists what's rendered below it and
  // hides the genuine cross-unit/cross-track signal. Drop same-unit lessons.
  const outward = hits.filter((h) => !h.lesson.startsWith(`${unitId}/`));
  return outward.slice(0, CAP_PER_ALGO).map((h) => {
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
