// src/components/progression/ProfilePanel.tsx
// The single Progression-screen island. Plain Preact composition — NO client:* here;
// profile.astro mounts this once. Sections (re-skin of docs/redesign/v2 Progression.html):
//   first run  → PlacementIntro + the existing Pretest
//   placed     → 01 rank-now + ladder · 02 domain radar (signature) · 03 XP & streak
//                · 04 missions (omitted when empty) · 05 titles + achievements
// All data is real (engine rating / path-engine knowledge / progression streak). No season,
// no rank-up banner, no fabricated rewards.
import { useEffect } from "preact/hooks";
import { userState } from "~/scripts/user-state";
import { loadStore } from "~/components/algo/drill-state";
import { getPlacement } from "~/english/state";
import { knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount } from "~/english/stats";
import { evaluateAchievements } from "~/scripts/progression/achievements";
import { titlesFromState, TITLES } from "~/scripts/progression/titles";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";
import { type Locale } from "~/i18n";
import Pretest from "~/components/pedagogy/Pretest";
import AchievementGrid from "./AchievementGrid";
import PlacementIntro from "./PlacementIntro";
import RankNow from "./RankNow";
import RankLadder from "./RankLadder";
import DomainRadar from "./DomainRadar";
import XpStreakInstruments from "./XpStreakInstruments";
import MissionsList, { computeMissions } from "./MissionsList";

function countSeniorAnswers(pretest: typeof userState.value.pretest): number {
  if (!pretest) return 0;
  const s1 = pretest.stage1.answers.filter((c, i) => pretestQuestions[i]?.choices[c]?.weight === 3).length;
  const s2 = (pretest.stage2?.answers ?? []).filter((c, i) => advancedQuestions[i]?.choices[c]?.weight === 3).length;
  return s1 + s2;
}

const L = {
  en: {
    plLead: "Take the placement to earn a rank and start the climb.",
    secRank: "01 · STANDING", rankHead: "Your rank now",
    rankNote: "The ladder runs foundations → senior",
    secRadar: "SIGNATURE · INSTRUMENT", radarHead: "Competence by domain",
    radarNote: "Where you're strong — and where you're not",
    secInst: "02 · INSTRUMENTS", instHead: "XP & streak",
    instNote: "Read like dials, not fireworks",
    secMiss: "03 · MISSIONS", missHead: "Missions in progress",
    missNote: "Honest goals, not a daily-login casino",
    secMarks: "04 · MARKS", marksHead: "Titles & achievements",
    marksNote: "Earned from real activity",
    foot: "A self-assessment placement, not a certificate. All content stays open.",
  },
  ru: {
    plLead: "Пройди placement, чтобы получить ранг и начать восхождение.",
    secRank: "01 · ПОЛОЖЕНИЕ", rankHead: "Твой ранг сейчас",
    rankNote: "Лестница идёт от основ к senior",
    secRadar: "ПОДПИСЬ · ИНСТРУМЕНТ", radarHead: "Компетентность по доменам",
    radarNote: "Где ты силён — и где нет",
    secInst: "02 · ИНСТРУМЕНТЫ", instHead: "XP и серия",
    instNote: "Читай как приборы, не как фейерверк",
    secMiss: "03 · МИССИИ", missHead: "Миссии в процессе",
    missNote: "Честные цели, не казино за ежедневный вход",
    secMarks: "04 · ЗНАКИ", marksHead: "Титулы и достижения",
    marksNote: "Заработаны реальной активностью",
    foot: "Самооценка-placement, не сертификат. Весь контент остаётся открытым.",
  },
} as const;

export default function ProfilePanel({ lang }: { lang: Locale }) {
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
  const unlocked = new Set(evaluateAchievements(s, ctx));
  const titles = titlesFromState(s);

  // Persist newly-unlocked achievements once on mount (real side-effect, unchanged from v1).
  // Also clear the SSR fallback the page renders while this client:only island boots.
  useEffect(() => {
    document.getElementById("profile-fallback")?.remove();
    if (!pretest) return;
    const now = Date.now();
    const have = s.progression.achievements;
    let changed = false;
    const next = { ...have };
    unlocked.forEach((id) => {
      if (!(id in next)) { next[id] = now; changed = true; }
    });
    if (changed) userState.value = { ...userState.value, progression: { ...s.progression, achievements: next } };
  }, []);

  if (!pretest) {
    return (
      <div>
        <section class="screen-section">
          <PlacementIntro lang={lang} />
          <p class="pl-after">{t.plLead}</p>
        </section>
        <Pretest lang={lang} />
      </div>
    );
  }

  const missions = computeMissions(); // computed once here; passed to the gate + the list

  return (
    <div>
      {/* 01 · STANDING — rank now + ladder */}
      <section class="screen-section" aria-labelledby="rank-h">
        <div class="sec-head">
          <span class="sec-index">{t.secRank}</span>
          <h2 id="rank-h">{t.rankHead}</h2>
          <span class="sec-note">{t.rankNote}</span>
        </div>
        <div class="rank-top">
          <RankNow lang={lang} rank={pretest.rank} rating={pretest.rating} confidence={pretest.confidence} />
          <RankLadder lang={lang} rating={pretest.rating} />
        </div>
      </section>

      {/* SIGNATURE — per-domain competence radar */}
      <section class="screen-section" aria-labelledby="radar-h">
        <div class="sec-head">
          <span class="sec-index">{t.secRadar}</span>
          <h2 id="radar-h">{t.radarHead}</h2>
          <span class="sec-note">{t.radarNote}</span>
        </div>
        <DomainRadar lang={lang} />
      </section>

      {/* 02 · INSTRUMENTS — XP & streak */}
      <section class="screen-section" aria-labelledby="inst-h">
        <div class="sec-head">
          <span class="sec-index">{t.secInst}</span>
          <h2 id="inst-h">{t.instHead}</h2>
          <span class="sec-note">{t.instNote}</span>
        </div>
        <XpStreakInstruments lang={lang} />
      </section>

      {/* 03 · MISSIONS — derived, omitted when empty */}
      {missions.length > 0 && (
        <section class="screen-section" aria-labelledby="miss-h">
          <div class="sec-head">
            <span class="sec-index">{t.secMiss}</span>
            <h2 id="miss-h">{t.missHead}</h2>
            <span class="sec-note">{t.missNote}</span>
          </div>
          <MissionsList lang={lang} missions={missions} />
        </section>
      )}

      {/* 04 · MARKS — titles + achievements */}
      <section class="screen-section" aria-labelledby="marks-h">
        <div class="sec-head">
          <span class="sec-index">{t.secMarks}</span>
          <h2 id="marks-h">{t.marksHead}</h2>
          <span class="sec-note">{t.marksNote}</span>
        </div>
        {titles.length > 0 && (
          <div class="titles-row">
            {TITLES.filter((tt) => titles.includes(tt.id)).map((tt) => (
              <span key={tt.id} class="title-chip">{tt.label[lang]}</span>
            ))}
          </div>
        )}
        <AchievementGrid unlocked={unlocked} lang={lang} />
        <p class="fig-caption" style="margin-top:var(--s-4)"><b>·</b> {t.foot}</p>
      </section>
    </div>
  );
}
