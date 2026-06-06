import { useEffect } from "preact/hooks";
import { userState } from "~/scripts/user-state";
import { loadStore } from "~/components/algo/drill-state";
import { currentXp } from "~/scripts/progression/current";
import { getPlacement } from "~/english/state";
import { knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount } from "~/english/stats";
import RankBadge from "./RankBadge";
import XpBar from "./XpBar";
import AchievementGrid from "./AchievementGrid";
import StreakChip from "./StreakChip";
import Pretest from "~/components/pedagogy/Pretest";
import { nextRank, rankById } from "~/scripts/progression/ranks";
import { evaluateAchievements } from "~/scripts/progression/achievements";
import { titlesFromState, TITLES } from "~/scripts/progression/titles";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";

function countSeniorAnswers(pretest: typeof userState.value.pretest): number {
  if (!pretest) return 0;
  const s1 = pretest.stage1.answers.filter((c, i) => pretestQuestions[i]?.choices[c]?.weight === 3).length;
  const s2 = (pretest.stage2?.answers ?? []).filter((c, i) => advancedQuestions[i]?.choices[c]?.weight === 3).length;
  return s1 + s2;
}
import { type Locale } from "~/i18n";

export default function ProfilePanel({ lang }: { lang: Locale }) {
  const s = userState.value;
  const pretest = s.pretest;
  const store = loadStore();
  const solvedEntries = Object.entries(store).filter(([, e]: any) => e.status === "solved");
  const drillsSolved = solvedEntries.length;
  const xp = currentXp();

  // Each solved entry records its drill unit (DrillBoard passes it through), so
  // distinct solved units are exact — drives the completionist achievement.
  const drillUnitsWithSolve = new Set(solvedEntries.map(([, e]: any) => e.unit).filter(Boolean)).size;
  const noHintSolve = solvedEntries.some(([, e]: any) => e.noHint);
  const pillarsVisited = new Set(Object.keys(s.history ?? {}).map((k) => k.split("/")[0])).size;
  const seniorAnswers = countSeniorAnswers(pretest);
  const ctx = {
    drillsSolved, drillUnitsWithSolve, noHintSolve, hourOfDay: new Date().getHours(),
    seniorAnswers, pillarsVisited,
    englishKnown: knownTotal(),
    englishBand: getPlacement()?.band ?? "none",
    englishReadUnits: readUnitsCount(),
    englishGraded: gradedOutputCount() > 0,
    englishGrammarDone: grammarDoneCount(),
    englishCollocationDone: collocationDoneCount(),
  } as const;
  const unlocked = new Set(evaluateAchievements(s, ctx));
  const titles = titlesFromState(s);

  useEffect(() => {
    if (!pretest) return;
    const now = Date.now();
    const have = s.progression.achievements;
    let changed = false;
    const next = { ...have };
    unlocked.forEach((id) => {
      if (!(id in next)) {
        next[id] = now;
        changed = true;
      }
    });
    if (changed) userState.value = { ...userState.value, progression: { ...s.progression, achievements: next } };
  }, []);

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
      <StreakChip count={s.progression.streak.count} best={s.progression.streak.best} lang={lang} />
      {titles.length > 0 && <div class="flex flex-wrap gap-1.5">{TITLES.filter((tt) => titles.includes(tt.id)).map((tt) => <span key={tt.id} class="text-[11px] font-mono border border-rule rounded px-1.5 py-0.5">{tt.label[lang]}</span>)}</div>}
      <AchievementGrid unlocked={unlocked} lang={lang} />
      <p class="text-[12px] text-muted">{lang === "ru"
        ? "Самооценка-placement, не сертификат. Контент открыт весь."
        : "A self-assessment placement, not a certificate. All content stays open."}</p>
    </div>
  );
}
