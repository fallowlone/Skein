// src/components/progression/ProfilePanel.tsx
// The single Progression-screen island. Plain Preact composition — NO client:* here;
// profile.astro mounts this once. Sections (re-skin of docs/redesign/v2 Progression.html):
//   first run  → PlacementIntro + the existing Pretest
//   placed     → 01 rank-now + ladder · 02 domain radar (signature) · 03 XP & streak
//                · 04 missions (omitted when empty) · 05 titles + achievements
// All data is real (engine rating / path-engine knowledge / progression streak). No season,
// no rank-up banner, no fabricated rewards.
import { Button as ShadcnButton } from "~/components/ui/button";
import { NativeSelect as ShadcnNativeSelect } from "~/components/ui/native-select";
import { useEffect, useState } from "preact/hooks";
import { setPretestResult, userState } from "~/scripts/user-state";
import { loadStore } from "~/components/algo/drill-state";
import { getPlacement } from "~/english/state";
import { knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount } from "~/english/stats";
import { evaluateAchievements } from "~/scripts/progression/achievements";
import { titlesFromState, TITLES } from "~/scripts/progression/titles";
import { RANKS, ratingToRank } from "~/scripts/progression/ranks";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";
import { type Locale } from "~/i18n";
import Pretest from "~/components/pedagogy/Pretest";
import AchievementGrid from "./AchievementGrid";
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
  const peakRating = s.progression.peakRating ?? 0;
  const displayRating = Math.max(pretest?.rating ?? 0, peakRating);
  const displayRank = ratingToRank(displayRating).id;
  const movedUp = !!pretest && displayRating > pretest.rating;

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
    return <FirstRunEntry lang={lang} />;
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
          <RankNow lang={lang} rank={displayRank} rating={displayRating} confidence={pretest.confidence} />
          {movedUp && (
            <p class="rank-progress-note" style="margin:0.25rem 0 0;font-size:0.85rem;opacity:0.75;">
              {lang === "ru"
                ? `Размещён на ${pretest.rating} → сейчас ${displayRating}`
                : `Placed at ${pretest.rating} → now ${displayRating}`}
            </p>
          )}
          <RankLadder lang={lang} rating={displayRating} />
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

function FirstRunEntry({ lang }: { lang: Locale }) {
  const [entry, setEntry] = useState<"adaptive" | "self" | null>(null);
  const [rankId, setRankId] = useState("");

  if (entry === "adaptive") return <Pretest lang={lang} startImmediately />;

  if (entry === "self") {
    const rank = RANKS.find((item) => item.id === rankId);
    return (
      <section class="self-rank panel" aria-labelledby="self-rank-heading">
        <div class="panel-head">
          <span class="meta">{lang === "ru" ? "самостоятельный ранг" : "self-set rank"}</span>
        </div>
        <div class="self-rank-body">
          <h2 id="self-rank-heading">{lang === "ru" ? "Выберите стартовый ранг" : "Choose your starting rank"}</h2>
          <p>{lang === "ru" ? "Его можно проверить placement-тестом в любой момент." : "You can validate it with placement anytime."}</p>
          <label for="self-rank-select">{lang === "ru" ? "Стартовый ранг" : "Starting rank"}</label>
          <ShadcnNativeSelect id="self-rank-select" value={rankId} onChange={(event) => setRankId(event.currentTarget.value)}>
            <option value="">{lang === "ru" ? "Выберите ранг…" : "Choose a rank…"}</option>
            {RANKS.map((item) => <option value={item.id}>{item.label[lang]}</option>)}
          </ShadcnNativeSelect>
          <div class="self-rank-actions">
            <ShadcnButton type="button" class="oa-btn oa-btn-primary oa-btn-sm" disabled={!rank} onClick={() => {
              if (!rank) return;
              const rating = Math.round((rank.min + rank.max) / 2);
              setPretestResult({
                takenAt: Date.now(),
                stage1: { score: 0, answers: [] },
                rating,
                rank: rank.id,
                confidence: "medium",
              });
            }}>
              {lang === "ru" ? "Установить ранг" : "Set rank"}
            </ShadcnButton>
            <ShadcnButton type="button" class="oa-btn oa-btn-ghost oa-btn-sm" onClick={() => setEntry(null)}>
              {lang === "ru" ? "Назад" : "Back"}
            </ShadcnButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section class="entry-first-run" aria-label="Placement options">
      <div class="entry-modes">
        <article class="entry-card">
          <EntryIcon kind="target" />
          <div class="entry-copy">
            <h2>Adaptive placement</h2>
            <p>3 questions · ~5 min · sets per-domain rank.</p>
            <ShadcnButton type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => setEntry("adaptive")}>Start placement</ShadcnButton>
          </div>
          <div class="entry-copy entry-copy-ru" lang="ru">
            <h2>Адаптивное размещение</h2>
            <p>3 вопроса · ~5 мин · устанавливает ранг по доменам.</p>
            <ShadcnButton type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => setEntry("adaptive")}>Начать размещение</ShadcnButton>
          </div>
        </article>

        <article class="entry-card">
          <EntryIcon kind="user" />
          <div class="entry-copy">
            <h2>Self-set rank</h2>
            <p>Pick a starting rank now; validate anytime.</p>
            <ShadcnButton type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => setEntry("self")}>Choose rank</ShadcnButton>
          </div>
          <div class="entry-copy entry-copy-ru" lang="ru">
            <h2>Самостоятельный ранг</h2>
            <p>Выберите стартовый ранг сейчас; проверка возможна в любой момент.</p>
            <ShadcnButton type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => setEntry("self")}>Выбрать ранг</ShadcnButton>
          </div>
        </article>
      </div>
      <div class="entry-footnote">
        <p>You can re-take and adjust later.</p>
        <p lang="ru">Вы можете пересдать и скорректировать позже.</p>
      </div>
    </section>
  );
}

function EntryIcon({ kind }: { kind: "target" | "user" }) {
  return (
    <span class="entry-icon" aria-hidden="true">
      {kind === "target" ? (
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>
      ) : (
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6"/></svg>
      )}
    </span>
  );
}
