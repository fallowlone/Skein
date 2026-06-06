// src/components/path/PathView.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import {
  knowledge, config, content, computePath, masteryByTrack,
  skipUnit, pinUnit, moveUnit, isPinned, resetPath,
} from "~/scripts/path/path-io";
import PathCard from "./PathCard";
import GoalPicker from "./GoalPicker";
import PathConfigDrawer from "./PathConfigDrawer";
import DeadlinePanel from "./DeadlinePanel";

const L = {
  en: { title: "Your path", recompute: "Recompute", goals: "Goals & deadline", settings: "Tune", reset: "Reset",
        coldTitle: "Start here", coldBody: "We've planned a path toward becoming a senior fullstack engineer, beginning at the foundations. Mark what you already know, or set a goal to retarget.",
        coldCta: "Calibrate (5 min)",
        masteryTitle: "Mastery by track", known: "known", empty: "Nothing to study for the current goal — try a broader goal or unskip units." },
  ru: { title: "Твой путь", recompute: "Пересчитать", goals: "Цели и дедлайн", settings: "Настроить", reset: "Сбросить",
        coldTitle: "Начни здесь", coldBody: "Мы построили путь к уровню senior fullstack, начиная с основ. Отметь, что уже знаешь, или задай цель, чтобы перенацелить.",
        coldCta: "Калибровка (5 мин)",
        masteryTitle: "Освоение по трекам", known: "освоено", empty: "Для текущей цели учить нечего — выбери более широкую цель или верни пропущенные юниты." },
} as const;

export default function PathView({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [drawer, setDrawer] = useState<null | "goals" | "config">(null);
  const k = knowledge.value; const cfg = config.value;
  const { path, schedule } = computePath();
  const mastery = masteryByTrack(k, content.concepts, cfg.weights.masteryThreshold);
  const isColdStart = k.size === 0;

  return (
    <div class="flex flex-col gap-6">
      <header class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-extrabold mr-auto">{t.title}</h1>
        <button class="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100" onClick={() => setDrawer("goals")}>{t.goals}</button>
        <button class="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100" onClick={() => setDrawer("config")}>{t.settings}</button>
        <button class="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100" onClick={() => resetPath()}>{t.reset}</button>
      </header>

      {isColdStart && (
        <section class="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 class="font-semibold text-amber-900">{t.coldTitle}</h2>
          <p class="text-sm text-amber-800 mt-1">{t.coldBody}</p>
          <a class="mt-3 inline-block rounded bg-sky-600 px-4 py-2 text-sm text-white" href={`/${lang}/calibrate`}>{t.coldCta}</a>
        </section>
      )}

      {schedule && <DeadlinePanel lang={lang} schedule={schedule} />}

      <ol class="flex flex-col gap-3">
        {path.steps.length === 0 && <li class="text-sm text-stone-500">{t.empty}</li>}
        {path.steps.map((s) => (
          <PathCard
            key={s.unit} lang={lang} step={s} pinned={isPinned(s.unit)}
            hasQuickCheck={content.quickCheckUnits.has(s.unit)}
            onKnow={() => skipUnit(s.unit)} onSkip={() => skipUnit(s.unit)}
            onPin={() => pinUnit(s.unit)} onMove={(d) => moveUnit(s.unit, d)}
          />
        ))}
      </ol>

      <section>
        <h2 class="text-lg font-bold mb-2">{t.masteryTitle}</h2>
        <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {mastery.filter((m) => m.known > 0).length === 0 && <li class="text-sm text-stone-400 col-span-full">—</li>}
          {mastery.map((m) => (
            <li key={m.track} class="rounded border border-stone-200 p-2 text-sm">
              <div class="flex justify-between"><span class="font-medium">{m.track}</span><span class="text-stone-500">{m.known}/{m.total}</span></div>
              <div class="mt-1 h-1.5 rounded bg-stone-200"><div class="h-full rounded bg-emerald-500" style={`width:${Math.round(m.avg * 100)}%`} /></div>
            </li>
          ))}
        </ul>
      </section>

      {drawer === "goals" && <GoalPicker lang={lang} onClose={() => setDrawer(null)} />}
      {drawer === "config" && <PathConfigDrawer lang={lang} onClose={() => setDrawer(null)} />}
    </div>
  );
}
