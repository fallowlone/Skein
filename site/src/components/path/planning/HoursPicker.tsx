// src/components/path/planning/HoursPicker.tsx
// Reusable weekday-hours grid. Explicit −/+ buttons per day (the old grid was click-to-increase
// only); also supports wheel + arrow keys. Used by DeadlineSection and (formerly) GoalPicker.
import type { Locale } from "~/i18n";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAYS: Record<Locale, string[]> = {
  en: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  ru: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"],
};
const UNIT: Record<Locale, string> = { en: "h", ru: "ч" };
const WEEK_NOTE: Record<Locale, (h: number, off: number) => string> = {
  en: (h, off) => `${fmtH(h)} h/week · ${off} day(s) off`,
  ru: (h, off) => `${fmtH(h)} ч в неделю · выходных: ${off}`,
};

export function fmtH(h: number): string { return Number.isInteger(h) ? String(h) : h.toFixed(1); }
export function clampHour(v: number, max = 12): number { return Math.max(0, Math.min(max, Math.round(v * 2) / 2)); }

export default function HoursPicker(
  { lang, hours, onSet, max = 12 }: { lang: Locale; hours: number[]; onSet: (i: number, v: number) => void; max?: number },
) {
  const bump = (i: number, delta: number) => onSet(i, clampHour((hours[i] ?? 0) + delta, max));
  const total = hours.reduce((a, b) => a + b, 0);
  const off = hours.filter((h) => h === 0).length;

  return (
    <div>
      <div class="hp-grid">
        {DAY_KEYS.map((_, i) => {
          const h = hours[i] ?? 0;
          return (
            <div key={i} class="hp-day">
              <div class="hp-name">{DAYS[lang][i]}</div>
              <button type="button" class="hp-btn dec" aria-label={`${DAYS[lang][i]} −`}
                onClick={() => bump(i, -0.5)} disabled={h <= 0}>−</button>
              <div
                class={`hp-val${h === 0 ? " off" : ""}`}
                role="spinbutton"
                tabIndex={0}
                aria-label={lang === "ru" ? `${DAYS[lang][i]}, часов` : `${DAYS[lang][i]} hours`}
                aria-valuenow={h} aria-valuemin={0} aria-valuemax={max} aria-valuetext={`${fmtH(h)} ${UNIT[lang]}`}
                onWheel={(e) => { e.preventDefault(); bump(i, e.deltaY < 0 ? 0.5 : -0.5); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") { e.preventDefault(); bump(i, 0.5); }
                  if (e.key === "ArrowDown") { e.preventDefault(); bump(i, -0.5); }
                }}
              >
                <span class="hv">{h === 0 ? "·" : fmtH(h)}</span>
                <span class="hu">{UNIT[lang]}</span>
              </div>
              <button type="button" class="hp-btn inc" aria-label={`${DAYS[lang][i]} +`}
                onClick={() => bump(i, 0.5)} disabled={h >= max}>+</button>
            </div>
          );
        })}
      </div>
      <div class="hp-note">{WEEK_NOTE[lang](total, off)}</div>
    </div>
  );
}
