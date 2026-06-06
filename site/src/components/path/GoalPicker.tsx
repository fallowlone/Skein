// src/components/path/GoalPicker.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { config, content, setGoals, toggleExcludedTrack, setDeadline, toggleCustomTarget, searchConcepts } from "~/scripts/path/path-io";
import type { DeadlineConfig } from "~/scripts/path/types";

const L = {
  en: { title: "Goals & deadline", priority: "priority", targets: "Custom targets", search: "Search concepts to target…", remove: "remove", exclude: "Excluded tracks", deadline: "Deadline", date: "Target date", hours: "Hours per weekday (Mon–Sun)", clear: "Clear deadline", close: "Done", set: "Set deadline" },
  ru: { title: "Цели и дедлайн", priority: "приоритет", targets: "Свои цели", search: "Найти концепты для цели…", remove: "убрать", exclude: "Исключённые треки", deadline: "Дедлайн", date: "Целевая дата", hours: "Часов по дням (Пн–Вс)", clear: "Убрать дедлайн", close: "Готово", set: "Задать дедлайн" },
} as const;

export default function GoalPicker({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  const t = L[lang];
  const [q, setQ] = useState("");
  const cfg = config.value;
  const custom = cfg.customTargets ?? [];
  const results = searchConcepts(content.concepts, content.taughtConcepts, q, lang, 20)
    .filter((c) => !custom.includes(c.id));
  const tracks = [...new Set(content.concepts.map((c) => c.track))].sort();
  const goalPrio = (id: string) => cfg.goals.find((g) => g.id === id)?.priority ?? 0;

  const setGoalPriority = (id: string, priority: number) => {
    const rest = cfg.goals.filter((g) => g.id !== id);
    setGoals(priority <= 0 ? rest : [...rest, { id, priority }]);
  };

  const dl = cfg.deadline;
  const setDate = (iso: string) => {
    const targetDateMs = Date.parse(iso + "T00:00:00Z");
    if (Number.isNaN(targetDateMs)) return;
    const next: DeadlineConfig = dl
      ? { ...dl, targetDateMs }
      : { targetDateMs, perWeekdayHours: [1, 1, 1, 1, 1, 0, 0], tzOffsetMin: 0 };
    setDeadline(next);
  };
  const setHour = (i: number, v: number) => {
    if (!dl) return;
    const perWeekdayHours = dl.perWeekdayHours.map((h, j) => (j === i ? Math.max(0, v) : h));
    setDeadline({ ...dl, perWeekdayHours });
  };
  const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  return (
    <div class="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside class="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold">{t.title}</h2>
          <button class="rounded border border-stone-300 px-3 py-1 text-sm" onClick={onClose}>{t.close}</button>
        </div>

        <ul class="flex flex-col gap-2 mb-6">
          {content.goals.map((g) => (
            <li key={g.id} class="flex items-center justify-between gap-3">
              <span class="text-sm">{g.label[lang]}</span>
              <input type="number" min={0} max={5} value={goalPrio(g.id)} class="w-16 rounded border border-stone-300 px-2 py-1 text-sm"
                onInput={(e) => setGoalPriority(g.id, Number((e.target as HTMLInputElement).value))} aria-label={`${g.label[lang]} ${t.priority}`} />
            </li>
          ))}
        </ul>

        <h3 class="font-semibold mb-2">{t.targets}</h3>
        <div class="flex flex-wrap gap-1 mb-2">
          {custom.map((id) => (
            <button key={id} class="rounded border border-sky-400 bg-sky-50 px-2 py-1 text-xs text-sky-800"
              onClick={() => toggleCustomTarget(id)} title={t.remove}>
              {content.conceptById.get(id)?.label[lang] ?? id} ✕
            </button>
          ))}
        </div>
        <input value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder={t.search}
          class="mb-2 block w-full rounded border border-stone-300 px-2 py-1 text-sm" />
        {results.length > 0 && (
          <ul class="mb-6 max-h-48 overflow-y-auto rounded border border-stone-200">
            {results.map((c) => (
              <li key={c.id}>
                <button class="flex w-full items-center justify-between px-2 py-1 text-left text-sm hover:bg-stone-100"
                  onClick={() => { toggleCustomTarget(c.id); setQ(""); }}>
                  <span>{c.label[lang]}</span>
                  <span class="text-xs text-stone-400">{c.track}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <h3 class="font-semibold mb-2">{t.exclude}</h3>
        <div class="flex flex-wrap gap-1 mb-6">
          {tracks.map((tr) => {
            const off = cfg.excludedTracks.includes(tr);
            return <button key={tr} class={`rounded border px-2 py-1 text-xs ${off ? "border-rose-400 bg-rose-50 text-rose-700" : "border-stone-300"}`} onClick={() => toggleExcludedTrack(tr)}>{tr}</button>;
          })}
        </div>

        <h3 class="font-semibold mb-2">{t.deadline}</h3>
        <label class="block text-sm mb-2">{t.date}
          <input type="date" value={dl ? isoOf(dl.targetDateMs) : ""} class="mt-1 block rounded border border-stone-300 px-2 py-1" onInput={(e) => setDate((e.target as HTMLInputElement).value)} />
        </label>
        {dl && (
          <>
            <p class="text-sm mb-1">{t.hours}</p>
            <div class="flex gap-1 mb-3">
              {dl.perWeekdayHours.map((h, i) => (
                <input key={i} type="number" min={0} max={12} value={h} class="w-10 rounded border border-stone-300 px-1 py-1 text-center text-xs"
                  onInput={(e) => setHour(i, Number((e.target as HTMLInputElement).value))} aria-label={`weekday ${i}`} />
              ))}
            </div>
            <button class="rounded border border-stone-300 px-3 py-1 text-sm" onClick={() => setDeadline(undefined)}>{t.clear}</button>
          </>
        )}
      </aside>
    </div>
  );
}
