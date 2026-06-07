// src/components/progression/achievements/AchievementsPanel.tsx
// The single Achievements-screen island — plain Preact composition, NO client:* here;
// achievements.astro mounts this once (client:only). Re-skin of docs/redesign/v2
// "Achievements" — a museum case of engraved marks over the REAL achievements/titles engine:
//   01 · MARKS     → SummaryBar   (tally + per-category rail, real counts)
//   CLOSE          → NearMiss     (top-3 locked numeric marks within reach; omitted when empty)
//   TITLES         → TitlesEquip  (equip one earned pillar title; locked shown non-interactive)
//   THE CASE       → SealGroups   (every category as earned/locked seals with real dates)
// ctx is built EXACTLY as ProfilePanel builds it (loadStore drills, pillarsVisited,
// seniorAnswers, english stats, hourOfDay). All data is real — no fabricated counts/seals.
import { useEffect } from "preact/hooks";
import { userState } from "~/scripts/user-state";
import { loadStore } from "~/components/algo/drill-state";
import { getPlacement } from "~/english/state";
import { knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount } from "~/english/stats";
import { evaluateAchievements } from "~/scripts/progression/achievements";
import { groupAchievements } from "~/scripts/progression/achievement-view";
import { nearMiss } from "~/scripts/progression/near-miss";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";
import { type Locale } from "~/i18n";
import SummaryBar from "./SummaryBar";
import NearMiss from "./NearMiss";
import TitlesEquip from "./TitlesEquip";
import SealGroups from "./SealGroups";

function countSeniorAnswers(pretest: typeof userState.value.pretest): number {
  if (!pretest) return 0;
  const s1 = pretest.stage1.answers.filter((c, i) => pretestQuestions[i]?.choices[c]?.weight === 3).length;
  const s2 = (pretest.stage2?.answers ?? []).filter((c, i) => advancedQuestions[i]?.choices[c]?.weight === 3).length;
  return s1 + s2;
}

const L = {
  en: {
    secMarks: "01 · MARKS", marksHead: "The case of marks", marksNote: "Earned from real activity",
    secNear: "CLOSE", nearHead: "Within reach", nearNote: "A nudge, not a notification",
    secTitles: "TITLES", titlesHead: "Equip a title", titlesNote: "Shown beside your name",
    secCase: "THE CASE", caseHead: "Every mark", caseNote: "Earned vs locked, by category",
  },
  ru: {
    secMarks: "01 · ЗНАКИ", marksHead: "Собрание знаков", marksNote: "Заработаны реальной активностью",
    secNear: "БЛИЗКО", nearHead: "В пределах досягаемости", nearNote: "Подсказка, не уведомление",
    secTitles: "ТИТУЛЫ", titlesHead: "Надеть титул", titlesNote: "Показан рядом с именем",
    secCase: "ВИТРИНА", caseHead: "Каждый знак", caseNote: "Полученные и закрытые, по категориям",
  },
} as const;

export default function AchievementsPanel({ lang }: { lang: Locale }) {
  const t = L[lang];
  const s = userState.value;
  const pretest = s.pretest;

  const store = loadStore();
  const solvedEntries = Object.entries(store).filter(([, e]: any) => e.status === "solved");
  const drillsSolved = solvedEntries.length;
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

  const earned = new Set(evaluateAchievements(s, ctx));
  const dates = s.progression.achievements;
  const groups = groupAchievements(earned, dates, lang);
  const near = nearMiss(s, ctx, earned, lang);

  // Persist newly-unlocked achievements once on mount so earned dates populate even when the
  // reader lands directly on /achievements (same real side-effect as ProfilePanel).
  useEffect(() => {
    if (!pretest) return;
    const now = Date.now();
    const have = s.progression.achievements;
    let changed = false;
    const next = { ...have };
    earned.forEach((id) => {
      if (!(id in next)) { next[id] = now; changed = true; }
    });
    if (changed) userState.value = { ...userState.value, progression: { ...s.progression, achievements: next } };
  }, []);

  return (
    <div>
      {/* 01 · MARKS — summary tally + category rail */}
      <section class="screen-section" aria-labelledby="ach-marks-h">
        <div class="sec-head">
          <span class="sec-index">{t.secMarks}</span>
          <h2 id="ach-marks-h">{t.marksHead}</h2>
          <span class="sec-note">{t.marksNote}</span>
        </div>
        <SummaryBar earned={earned} dates={dates} lang={lang} />
      </section>

      {/* CLOSE — within reach (omitted when nothing is in progress) */}
      {near.length > 0 && (
        <section class="screen-section" aria-labelledby="ach-near-h">
          <div class="sec-head">
            <span class="sec-index">{t.secNear}</span>
            <h2 id="ach-near-h">{t.nearHead}</h2>
            <span class="sec-note">{t.nearNote}</span>
          </div>
          <NearMiss marks={near} lang={lang} />
        </section>
      )}

      {/* TITLES — equip one earned pillar title */}
      <section class="screen-section" aria-labelledby="ach-titles-h">
        <div class="sec-head">
          <span class="sec-index">{t.secTitles}</span>
          <h2 id="ach-titles-h">{t.titlesHead}</h2>
          <span class="sec-note">{t.titlesNote}</span>
        </div>
        <TitlesEquip lang={lang} />
      </section>

      {/* THE CASE — every mark, by category */}
      <section class="screen-section" aria-labelledby="ach-case-h">
        <div class="sec-head">
          <span class="sec-index">{t.secCase}</span>
          <h2 id="ach-case-h">{t.caseHead}</h2>
          <span class="sec-note">{t.caseNote}</span>
        </div>
        <SealGroups groups={groups} lang={lang} />
      </section>
    </div>
  );
}
