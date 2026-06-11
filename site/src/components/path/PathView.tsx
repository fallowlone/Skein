// src/components/path/PathView.tsx
// The single Planning-screen island. Plain Preact composition — NO client:* here;
// roadmap.astro mounts this once. Sections (re-skin of docs/redesign/v2 Planning.html):
//   XP/level strip · cold-start banner · droppedLocal warning
//   TodayFocus · 01 · GOAL · 02 · INSTRUMENT (deadline) · 03 · PATH (next units)
//   04 · INSTRUMENT (concept-mastery map) · Advanced knobs.
// Owns the two reused modals: PathConfigDrawer, DiagnosticRunner.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import {
  effectiveKnowledge, config, content, computePath,
  unitProbeConcepts, applyDiagnosticResult,
} from "~/scripts/path/path-io";
import { currentXp } from "~/scripts/progression/current";
import { levelFromXp } from "~/scripts/progression/xp";
import { completedStepCount, PATH_STEP_BONUS } from "~/scripts/progression/path-xp";
import GoalSection from "./planning/GoalSection";
import ConceptMasteryMap from "./planning/ConceptMasteryMap";
import NextPath from "./planning/NextPath";
import DeadlineSection from "./planning/DeadlineSection";
import AdvancedKnobs from "./planning/AdvancedKnobs";
import TodayFocus from "./planning/TodayFocus";
import PathConfigDrawer from "./PathConfigDrawer";
import DiagnosticRunner from "./DiagnosticRunner";

const L = {
  en: {
    level: "Level", xp: "XP", steps: "Steps completed",
    coldTitle: "Start here",
    coldBody: "We've planned a path toward becoming a senior fullstack engineer, beginning at the foundations. Mark what you already know, or set a goal to retarget.",
    coldCta: "Calibrate (5 min)",
    droppedNote: "Some local prerequisite edits created a cycle and were ignored.",
    goalHead: "What are you aiming at?", goalNote: "Active goals shape the plan below",
    mapHead: "Concept-mastery map", mapNote: "Everything you've surveyed — and the gaps",
    pathHead: "Next units — dependency-ordered", pathNote: "Prereqs first · concepts you know are skipped",
    dlHead: "Deadline & exam-prep mode", dlNote: "An honest, dated schedule from your real availability",
    secGoal: "01 · GOAL", secDl: "02 · INSTRUMENT", secPath: "03 · PATH", secMap: "04 · INSTRUMENT",
  },
  ru: {
    level: "Уровень", xp: "XP", steps: "Шагов пройдено",
    coldTitle: "Начни здесь",
    coldBody: "Мы построили путь к уровню senior fullstack, начиная с основ. Отметь, что уже знаешь, или задай цель, чтобы перенацелить.",
    coldCta: "Калибровка (5 мин)",
    droppedNote: "Некоторые локальные правки пререквизитов создали цикл и были проигнорированы.",
    goalHead: "К чему ты идёшь?", goalNote: "Активные цели формируют план ниже",
    mapHead: "Карта освоения концептов", mapNote: "Всё, что размечено — и пробелы",
    pathHead: "Следующие юниты — по зависимостям", pathNote: "Пререквизиты вперёд · известное пропускается",
    dlHead: "Дедлайн и подготовка к экзамену", dlNote: "Честный план по датам из твоей реальной загрузки",
    secGoal: "01 · ЦЕЛЬ", secDl: "02 · ИНСТРУМЕНТ", secPath: "03 · ПУТЬ", secMap: "04 · ИНСТРУМЕНТ",
  },
} as const;

export default function PathView({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [modal, setModal] = useState<null | "config">(null);
  const [quickUnit, setQuickUnit] = useState<string | null>(null);

  const k = effectiveKnowledge();        // subscribe
  const cfg = config.value;         // subscribe
  const { droppedLocal } = computePath();
  const isColdStart = k.size === 0;

  const xp = currentXp();
  const lvl = levelFromXp(xp);
  const doneSteps = completedStepCount(k, content.units, cfg.weights.masteryThreshold);
  const intoPct = lvl.intoLevel + lvl.toNext > 0
    ? Math.round((lvl.intoLevel / (lvl.intoLevel + lvl.toNext)) * 100)
    : 0;

  return (
    <div>
      {/* XP / level strip */}
      <div class="xp-strip">
        <span class="xs-level">{t.level} {lvl.level}</span>
        <span class="xs-xp">{xp} {t.xp}</span>
        <div class="xs-bar"><div style={`width:${intoPct}%`} /></div>
        <span class="xs-steps">{t.steps}: {doneSteps} <b>+{doneSteps * PATH_STEP_BONUS} {t.xp}</b></span>
      </div>

      {/* Cold-start banner */}
      {isColdStart && (
        <section class="banner cold">
          <h2>{t.coldTitle}</h2>
          <p>{t.coldBody}</p>
          <a class="btn btn-primary btn-sm" href={`/${lang}/calibrate`}><span>{t.coldCta}</span><span class="arrow">→</span></a>
        </section>
      )}

      {/* droppedLocal warning */}
      {droppedLocal && <p class="banner dropped">{t.droppedNote}</p>}

      {/* TODAY focus */}
      <TodayFocus lang={lang} />

      {/* 01 · GOAL */}
      <section class="screen-section" aria-labelledby="goal-h">
        <div class="sec-head">
          <span class="sec-index">{t.secGoal}</span>
          <h2 id="goal-h">{t.goalHead}</h2>
          <span class="sec-note">{t.goalNote}</span>
        </div>
        <GoalSection lang={lang} />
      </section>

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

      {/* modals (reused, mounted conditionally) */}
      {modal === "config" && <PathConfigDrawer lang={lang} onClose={() => setModal(null)} />}
      {quickUnit && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQuickUnit(null)}>
          <div class="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <DiagnosticRunner
              lang={lang}
              conceptIds={unitProbeConcepts(quickUnit)}
              onConcept={(c, f) => applyDiagnosticResult(c, f)}
              onDone={() => setQuickUnit(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
