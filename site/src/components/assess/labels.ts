// site/src/components/assess/labels.ts
// Small shared i18n lookups for BlockVerdict.tsx and AssessReport.tsx — kept out
// of ui.json's flat key space being duplicated in two components.
import { t, type Locale } from "~/i18n";
import type { Level } from "~/scripts/assess/types";

const LEVEL_KEY: Record<Level, string> = {
  gap: "assess.level.gap",
  junior: "assess.level.junior",
  middle: "assess.level.middle",
  senior: "assess.level.senior",
};

export function levelLabel(level: Level, lang: Locale): string {
  return t(LEVEL_KEY[level], lang);
}
