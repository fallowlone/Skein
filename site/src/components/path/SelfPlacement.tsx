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
    <section class="self-place">
      <h2 class="sp-title">{t.title}</h2>
      <p class="sp-hint">{t.hint}</p>
      <div class="sp-grid">
        {DOMAIN_FAMILIES.map((f) => (
          <div key={f.key} class="sp-family">
            <div class="sp-fam-label">{f.label[lang]}</div>
            {f.tracks.map((track) => (
              <div key={track} class="sp-row">
                <span class="sp-track">{track}</span>
                <div class="seg sp-levels" role="group" aria-label={track}>
                  {LEVELS.map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      aria-pressed={(picked[track] ?? "none") === lv}
                      onClick={() => pick(track, lv)}
                    >
                      {t.levels[lv]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
