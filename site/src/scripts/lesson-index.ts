import lessonIndexJson from "~/content/path/lesson-index.json";
import type { Locale } from "~/i18n";

export type LessonIndexEntry = {
  lang: Locale;
  track: string;
  unit: string;
  slug: string;
  status: string;
  order: number;
  title: string;
  summary: string;
  estMin: number;
  prereqs: string[];
  terms: string[];
};

const lessonIndex = lessonIndexJson as Record<string, LessonIndexEntry>;

export function indexedLessons(lang: Locale, track?: string): LessonIndexEntry[] {
  return Object.values(lessonIndex).filter((lesson) =>
    lesson.lang === lang && (track === undefined || lesson.track === track));
}
