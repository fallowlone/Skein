import { userState } from "~/scripts/user-state";
import { loadStore } from "~/components/algo/drill-state";
import { xpFromState } from "~/scripts/progression/xp";
import RankBadge from "./RankBadge";
import XpBar from "./XpBar";
import Pretest from "~/components/pedagogy/Pretest";
import { nextRank, rankById } from "~/scripts/progression/ranks";
import { type Locale } from "~/i18n";

export default function ProfilePanel({ lang }: { lang: Locale }) {
  const s = userState.value;
  const pretest = s.pretest;
  const drillsSolved = Object.values(loadStore()).filter((e: any) => e.status === "solved").length;
  const xp = xpFromState(s, drillsSolved);

  if (!pretest) {
    return (
      <div class="flex flex-col gap-4">
        <p class="text-[14px] text-ink-2">{lang === "ru"
          ? "Пройди placement-тест, чтобы получить ранг и начать прокачку." : "Take the placement test to earn a rank and start leveling up."}</p>
        <Pretest lang={lang} />
      </div>
    );
  }
  const r = rankById(pretest.rank);
  const nxt = nextRank(r);
  return (
    <div class="flex flex-col gap-6 max-w-[640px]">
      <div class="flex items-center justify-between">
        <div class="text-[30px]"><RankBadge rankId={pretest.rank} lang={lang} size="lg" /></div>
        <div class="text-right font-mono text-[13px]">
          <div>{lang === "ru" ? "рейтинг" : "rating"} <strong>{pretest.rating}</strong>/1000</div>
          <div class="text-muted text-[11px]">{pretest.confidence === "high" ? (lang === "ru" ? "уверенно" : "high conf.") : (lang === "ru" ? "средне" : "medium conf.")}</div>
        </div>
      </div>
      <XpBar xp={xp} lang={lang} />
      {nxt && <div class="text-[12px] text-muted font-mono">+{nxt.min - pretest.rating} {lang === "ru" ? "до" : "to"} {nxt.label[lang]}</div>}
      <p class="text-[12px] text-muted">{lang === "ru"
        ? "Самооценка-placement, не сертификат. Контент открыт весь."
        : "A self-assessment placement, not a certificate. All content stays open."}</p>
    </div>
  );
}
