// site/src/components/assess/labels.ts
// Small shared i18n helpers, deliberately dependency-free (only ~/i18n and pure
// assess/types) — importers that need just `tt`/`levelLabel` (AssessReport.tsx,
// BlockVerdict.tsx) should pull from here, not from item-bodies.tsx, which drags
// in graders/practice-state for what is otherwise a two-line helper.
import { t, type Locale } from "~/i18n";
import type { Level } from "~/scripts/assess/types";

/** Picks the field for the active locale out of a bilingual {en, ru} pair —
 *  content already sourced as BiText, not a ui.json chrome string. */
export const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

const LEVEL_KEY: Record<Level, string> = {
  gap: "assess.level.gap",
  junior: "assess.level.junior",
  middle: "assess.level.middle",
  senior: "assess.level.senior",
};

export function levelLabel(level: Level, lang: Locale): string {
  return t(LEVEL_KEY[level], lang);
}
