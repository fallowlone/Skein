// src/components/path/SelfPlacement.tsx
// Per-track self-placement grid: pick "how far you already are" per track; each pick batch-
// declares the track's concepts up to that band (declared source — diagnostics still override).
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { DOMAIN_FAMILIES } from "~/scripts/path/mastery-field";
import { declareTrackUpTo } from "~/scripts/path/path-io";

const L = {
  en: {
    title: "Self-placement",
    hint: "Mark what you already know per track — the path skips it. Honest beats optimistic: quick checks will verify the important parts anyway.",
    levels: { none: "Never touched", foundations: "Basics", surface: "Worked with it", middle: "Used in production" },
    done: "marked",
  },
  ru: {
    title: "Самооценка по трекам",
    hint: "Отметь, что уже знаешь, — путь это пропустит. Честно лучше, чем оптимистично: важное всё равно проверят quick-checks.",
    levels: { none: "Не трогал", foundations: "Основы", surface: "Работал с этим", middle: "Использовал в проде" },
    done: "отмечено",
  },
} as const;

const LEVELS = ["none", "foundations", "surface", "middle"] as const;
type Level = (typeof LEVELS)[number];

export default function SelfPlacement({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [picked, setPicked] = useState<Record<string, Level>>({});

  const pick = (track: string, level: Level) => {
    const prev = picked[track] ?? "none";
    if (prev !== "none") declareTrackUpTo(track, prev, false); // undo the previous declare set
    if (level !== "none") declareTrackUpTo(track, level, true);
    setPicked((p) => ({ ...p, [track]: level }));
  };

  return (
    <details class="rounded border border-stone-200 p-4">
      <summary class="cursor-pointer font-bold">{t.title}</summary>
      <p class="mt-2 text-sm text-stone-600">{t.hint}</p>
      <div class="mt-3 flex flex-col gap-3">
        {DOMAIN_FAMILIES.map((f) => (
          <div key={f.key}>
            <div class="text-xs font-semibold uppercase tracking-wide text-stone-500">{f.label[lang]}</div>
            {f.tracks.map((track) => (
              <div key={track} class="mt-1 flex flex-wrap items-center gap-1 text-sm">
                <span class="w-40 shrink-0 font-mono">{track}</span>
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    class={`rounded border px-2 py-0.5 text-xs ${(picked[track] ?? "none") === lv ? "border-sky-600 bg-sky-50 font-semibold" : "border-stone-300"}`}
                    onClick={() => pick(track, lv)}
                  >
                    {t.levels[lv]}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
