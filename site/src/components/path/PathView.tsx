// src/components/path/PathView.tsx
// The single Planning-screen island. Plain Preact composition — NO client:* here;
// roadmap.astro mounts this once. Sections (re-skin of docs/redesign/v2 Planning.html):
//   XP/level strip · cold-start banner · droppedLocal warning
//   TodayFocus · 01 · GOAL · 02 · INSTRUMENT (deadline) · 03 · PATH (next units)
//   04 · INSTRUMENT (concept-mastery map) · Advanced knobs.
// Owns the two reused modals: PathConfigDrawer, UnitProbe.
import { useState, useEffect } from "preact/hooks";
import type { Locale } from "~/i18n";
import {
  effectiveKnowledge, config, content, computePath,
  isColdStartView, resetPath,
} from "~/scripts/path/path-io";
import { resetAll } from "~/scripts/user-state";
import { currentXp } from "~/scripts/progression/current";
import { levelFromXp } from "~/scripts/progression/xp";
import { completedStepCount, PATH_STEP_BONUS } from "~/scripts/progression/path-xp";
import GoalSection from "./planning/GoalSection";
import ConceptMasteryMap from "./planning/ConceptMasteryMap";
import NextPath from "./planning/NextPath";
import DeadlineSection from "./planning/DeadlineSection";
import AdvancedKnobs from "./planning/AdvancedKnobs";
import TodayFocus from "./planning/TodayFocus";
import SeniorityReceipt from "./planning/SeniorityReceipt";
import PathConfigDrawer from "./PathConfigDrawer";
import UnitProbe from "./UnitProbe";
import PlacementMeter from "./planning/PlacementMeter";

const L = {
  en: {
    level: "Level", xp: "XP", steps: "Steps completed",
    coldTitle: "Start here",
    coldBody: "We've planned a path toward becoming a senior fullstack engineer, beginning at the foundations. One quick calibration tells us what you already know, so the plan skips it.",
    coldCta: "Calibrate (5 min)",
    coldSettings: "Set a goal, deadline, or fine-tune — optional",
    droppedNote: "Some local prerequisite edits created a cycle and were ignored.",
    goalHead: "What are you aiming at?", goalNote: "Active goals shape the plan below",
    mapHead: "Concept-mastery map", mapNote: "Everything you've surveyed — and the gaps",
    pathHead: "Next units — dependency-ordered", pathNote: "Prereqs first · concepts you know are skipped",
    dlHead: "Deadline & exam-prep mode", dlNote: "An honest, dated schedule from your real availability",
    secGoal: "01 · GOAL", secDl: "02 · INSTRUMENT", secPath: "03 · PATH", secMap: "04 · INSTRUMENT",
    placeHead: "How well-placed are you?", placeNote: "Measured vs guessed across your goal",
    resetHead: "Start over", resetNote: "Local data only",
    resetDesc: "Erase your path, calibration, progression, and settings on this device. This cannot be undone.",
    resetCta: "Reset all progress…",
    resetConfirm: "Reset all local progress? This cannot be undone.",
  },
  ru: {
    level: "Уровень", xp: "XP", steps: "Шагов пройдено",
    coldTitle: "Начни здесь",
    coldBody: "Мы построили путь к уровню senior fullstack, начиная с основ. Одна быстрая калибровка покажет, что ты уже знаешь, — и план это пропустит.",
    coldCta: "Калибровка (5 мин)",
    coldSettings: "Задать цель, дедлайн или донастроить — по желанию",
    droppedNote: "Некоторые локальные правки пререквизитов создали цикл и были проигнорированы.",
    goalHead: "К чему ты идёшь?", goalNote: "Активные цели формируют план ниже",
    mapHead: "Карта освоения концептов", mapNote: "Всё, что размечено — и пробелы",
    pathHead: "Следующие юниты — по зависимостям", pathNote: "Пререквизиты вперёд · известное пропускается",
    dlHead: "Дедлайн и подготовка к экзамену", dlNote: "Честный план по датам из твоей реальной загрузки",
    secGoal: "01 · ЦЕЛЬ", secDl: "02 · ИНСТРУМЕНТ", secPath: "03 · ПУТЬ", secMap: "04 · ИНСТРУМЕНТ",
    placeHead: "Насколько точно ты размещён?", placeNote: "Измерено и угадано по твоей цели",
    resetHead: "Начать заново", resetNote: "Только локальные данные",
    resetDesc: "Стереть путь, калибровку, прогрессию и настройки на этом устройстве. Отменить нельзя.",
    resetCta: "Сбросить весь прогресс…",
    resetConfirm: "Сбросить весь локальный прогресс? Отменить нельзя.",
  },
} as const;

export default function PathView({ lang }: { lang: Locale }) {
  const t = L[lang];
  // client:only island → the SSR page shows #plan-skeleton until this mounts.
  // Remove it once real content is in the DOM so there is no perceived "blank".
  useEffect(() => { document.getElementById("plan-skeleton")?.remove(); }, []);
  const [modal, setModal] = useState<null | "config">(null);
  const [quickUnit, setQuickUnit] = useState<string | null>(null);

  const k = effectiveKnowledge();        // subscribe
  const cfg = config.value;         // subscribe
  const { droppedLocal } = computePath();
  const isColdStart = isColdStartView(k.size);

  const xp = currentXp();
  const lvl = levelFromXp(xp);
  const doneSteps = completedStepCount(k, content.units, cfg.weights.masteryThreshold);
  // Receipt view: calibration ran (knowledge is non-empty) but no step is completed
  // yet — the just-calibrated moment. The Seniority Receipt replaces the cold-start
  // banner, and the config sections stay tucked in the collapsed inset (same
  // progressive disclosure as cold-start) until the learner starts working the plan.
  const showReceipt = !isColdStart && doneSteps === 0;
  const intoPct = lvl.intoLevel + lvl.toNext > 0
    ? Math.round((lvl.intoLevel / (lvl.intoLevel + lvl.toNext)) * 100)
    : 0;

  function onResetAll() {
    if (!confirm(t.resetConfirm)) return;
    resetAll();   // user-state: progression / pretest / tier / motion
    resetPath();  // path-io: knowledge / config / overrides
    location.reload(); // every section here reads a signal seeded at load — re-read from scratch
  }

  // The four numbered sections + advanced knobs. Rendered flat when the student has a
  // plan; tucked inside a collapsed inset at cold-start (see below).
  const sections = (
    <>
      {/* 01 · GOAL */}
      <section class="screen-section" aria-labelledby="goal-h">
        <div class="sec-head">
          <span class="sec-index">{t.secGoal}</span>
          <h2 id="goal-h">{t.goalHead}</h2>
          <span class="sec-note">{t.goalNote}</span>
        </div>
        <GoalSection lang={lang} />
      </section>

      {/* INSTRUMENT · placement completeness */}
      {!isColdStart && (
        <section class="screen-section" aria-labelledby="place-h">
          <div class="sec-head">
            <h2 id="place-h">{t.placeHead}</h2>
            <span class="sec-note">{t.placeNote}</span>
          </div>
          <PlacementMeter lang={lang} />
        </section>
      )}

      {/* 02 · INSTRUMENT — deadline */}
      <section class="screen-section" aria-labelledby="dl-h">
        <div class="sec-head">
          <span class="sec-index">{t.secDl}</span>
          <h2 id="dl-h">{t.dlHead}</h2>
          <span class="sec-note">{t.dlNote}</span>
        </div>
        <DeadlineSection lang={lang} />
      </section>

      {/* 03 · PATH — next units */}
      <section class="screen-section" aria-labelledby="next-h">
        <div class="sec-head">
          <span class="sec-index">{t.secPath}</span>
          <h2 id="next-h">{t.pathHead}</h2>
          <span class="sec-note">{t.pathNote}</span>
        </div>
        <NextPath lang={lang} onQuickCheck={(u) => setQuickUnit(u)} />
      </section>

      {/* 04 · INSTRUMENT — concept-mastery map */}
      <section class="screen-section" aria-labelledby="map-h">
        <div class="sec-head">
          <span class="sec-index">{t.secMap}</span>
          <h2 id="map-h">{t.mapHead}</h2>
          <span class="sec-note">{t.mapNote}</span>
        </div>
        <ConceptMasteryMap lang={lang} />
      </section>

      {/* Advanced knobs */}
      <section class="screen-section">
        <AdvancedKnobs lang={lang} onGraphEdits={() => setModal("config")} />
      </section>

      {/* Start over — same two-call reset the account screen performs; resetAll alone
          leaves the path graph behind, which reads as "the reset did nothing". */}
      <section class="screen-section" aria-labelledby="reset-h">
        <div class="sec-head">
          <h2 id="reset-h">{t.resetHead}</h2>
          <span class="sec-note">{t.resetNote}</span>
        </div>
        <div class="reset-block">
          <p class="rb-desc">{t.resetDesc}</p>
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm rb-btn" onClick={onResetAll}>
            {t.resetCta}
          </button>
        </div>
      </section>
    </>
  );

  return (
    <div>
      {/* XP / level strip */}
      <div class="xp-strip">
        <span class="xs-level">{t.level} {lvl.level}</span>
        <span class="xs-xp">{xp} {t.xp}</span>
        <div class="xs-bar"><div style={`width:${intoPct}%`} /></div>
        <span class="xs-steps">{t.steps}: {doneSteps} <b>+{doneSteps * PATH_STEP_BONUS} {t.xp}</b></span>
      </div>

      {/* Cold-start banner / Seniority Receipt (just-calibrated, nothing done yet) */}
      {isColdStart && (
        <section class="banner cold">
          <h2>{t.coldTitle}</h2>
          <p>{t.coldBody}</p>
          <a class="btn btn-primary btn-sm" href={`/${lang}/calibrate`}><span>{t.coldCta}</span><span class="arrow">→</span></a>
        </section>
      )}
      {showReceipt && <SeniorityReceipt lang={lang} />}

      {/* droppedLocal warning */}
      {droppedLocal && <p class="banner dropped">{t.droppedNote}</p>}

      {/* TODAY focus */}
      <TodayFocus lang={lang} />

      {/* Planning sections. At cold-start or in the receipt view the student sees
          only the banner/receipt above; everything else is progressive-disclosure
          inside a collapsed inset so the next move stays obvious. With a plan in
          progress, sections render flat as before. */}
      {isColdStart || showReceipt ? (
        <details class="screen-section inset cold-more">
          <summary>
            <svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" /></svg>
            {t.coldSettings}
          </summary>
          <div class="inset-body">{sections}</div>
        </details>
      ) : (
        sections
      )}

      {/* modals (reused, mounted conditionally) */}
      {modal === "config" && <PathConfigDrawer lang={lang} onClose={() => setModal(null)} />}
      {quickUnit && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQuickUnit(null)}>
          <div class="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <UnitProbe lang={lang} unit={quickUnit} onComplete={() => setQuickUnit(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
