// src/components/path/DeadlinePanel.tsx
import type { Locale } from "~/i18n";
import type { Schedule } from "~/scripts/path/types";
import { content } from "~/scripts/path/path-io";

const L = {
  en: { countdown: "days left", fits: "On track", over: "Behind — not everything fits", under: "Ahead — room for more", dropped: "Won't fit by the date", perDay: "Per-day plan" },
  ru: { countdown: "дней осталось", fits: "В графике", over: "Отстаём — влезает не всё", under: "С запасом — можно добавить", dropped: "Не успеть к дате", perDay: "План по дням" },
} as const;

export default function DeadlinePanel({ lang, schedule }: { lang: Locale; schedule: Schedule }) {
  const t = L[lang];
  const f = schedule.feasibility;
  const verdict = f.verdict === "fits" ? t.fits : f.verdict === "over" ? t.over : t.under;
  return (
    <section class="rounded-lg border border-stone-300 bg-stone-50 p-4">
      <div class="flex items-center justify-between">
        <span class="text-2xl font-bold">{schedule.countdownDays} <span class="text-sm font-normal text-stone-500">{t.countdown}</span></span>
        <span class={`text-sm font-medium ${f.verdict === "over" ? "text-rose-600" : f.verdict === "under" ? "text-amber-600" : "text-emerald-600"}`}>{verdict}</span>
      </div>
      {f.dropped.length > 0 && (
        <p class="mt-2 text-sm text-rose-700">{t.dropped}: {f.dropped.map((u) => content.unitTitleById.get(u)?.[lang] ?? u).slice(0, 8).join(", ")}{f.dropped.length > 8 ? "…" : ""}</p>
      )}
      <details class="mt-2 text-sm">
        <summary class="cursor-pointer text-stone-600">{t.perDay}</summary>
        <ul class="mt-1 flex flex-col gap-0.5">
          {schedule.days.filter((d) => d.steps.length > 0).slice(0, 14).map((d) => (
            <li key={d.date} class="flex justify-between"><span class="text-stone-500">{d.date}</span><span>{d.steps.map((s) => content.unitTitleById.get(s.unit)?.[lang] ?? s.unit).join(", ")}</span></li>
          ))}
        </ul>
      </details>
    </section>
  );
}
