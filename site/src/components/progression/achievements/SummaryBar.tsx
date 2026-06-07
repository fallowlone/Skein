// SummaryBar — the case-of-marks summary strip: a big tally ("N / total marks earned")
// + a per-category rail (real category counts from groupAchievements). All data real.
import { type Locale } from "~/i18n";
import { tally, groupAchievements } from "~/scripts/progression/achievement-view";

const L = {
  en: { of1: "marks", of2: "earned" },
  ru: { of1: "знаков", of2: "получено" },
} as const;

export default function SummaryBar({
  earned, dates, lang,
}: { earned: Set<string>; dates: Record<string, number>; lang: Locale }) {
  const t = L[lang];
  const { earned: got, total } = tally(earned);
  const groups = groupAchievements(earned, dates, lang);
  return (
    <div class="ach-summary">
      <div class="ach-tally">
        <span class="at-num">{got}</span>
        <span class="at-of">/ {total} {t.of1}<br />{t.of2}</span>
      </div>
      <div class="cat-rail">
        {groups.map((g) => (
          <div key={g.category} class="cat-pill">
            <span class="cp-name">{g.label[lang]}</span>
            <span class="cp-count">{g.earned}<em>/{g.total}</em></span>
          </div>
        ))}
      </div>
    </div>
  );
}
