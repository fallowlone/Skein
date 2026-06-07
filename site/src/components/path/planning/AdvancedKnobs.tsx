// src/components/path/planning/AdvancedKnobs.tsx
// Collapsed <details> with the three coarse knobs that re-weight the plan:
// breadth⇄depth (config.breadthVsDepth), pace (config.pace), depth-tier (config.depthTier).
// A quiet link asks the parent to open the full PathConfigDrawer (graph edits / weights).
import type { Locale } from "~/i18n";
import type { Tier } from "~/scripts/path/types";
import { config, setKnob } from "~/scripts/path/path-io";

const TIERS: Tier[] = ["junior", "middle", "senior"];

const L = {
  en: {
    summary: "Advanced — tune how the plan is built",
    bd: "Breadth ⇄ Depth", depthLean: "Depth-leaning", balanced: "Balanced", breadthLean: "Breadth-leaning",
    bdAria: "Breadth to depth",
    pace: "Pace", relaxed: "Relaxed", steady: "Steady", intense: "Intense", paceAria: "Pace",
    depth: "Depth tier", junior: "junior", middle: "middle", senior: "senior",
    graph: "advanced graph edits →",
  },
  ru: {
    summary: "Продвинутое — как строится план",
    bd: "Вширь ⇄ Вглубь", depthLean: "В глубину", balanced: "Сбалансировано", breadthLean: "В ширину",
    bdAria: "Вширь или вглубь",
    pace: "Темп", relaxed: "Спокойный", steady: "Ровный", intense: "Интенсивный", paceAria: "Темп",
    depth: "Уровень глубины", junior: "junior", middle: "middle", senior: "senior",
    graph: "правки графа →",
  },
} as const;

// Engine: breadthVsDepth 0 = depth-first … 1 = breadth-first.
function bdLabel(lang: Locale, v: number): string {
  const t = L[lang];
  return v < 0.35 ? t.depthLean : v > 0.65 ? t.breadthLean : t.balanced;
}
// Single pace slider 0..1 → stepsAhead (3..8) + srsAggressiveness (0..1).
function paceLabel(lang: Locale, v: number): string {
  const t = L[lang];
  return v < 0.35 ? t.relaxed : v > 0.65 ? t.intense : t.steady;
}
function paceToConfig(v: number): { stepsAhead: number; srsAggressiveness: number } {
  return { stepsAhead: Math.round(3 + v * 5), srsAggressiveness: Math.max(0, Math.min(1, v)) };
}
// Recover the slider position from the stored config (inverse of paceToConfig's stepsAhead leg).
function paceValue(stepsAhead: number): number {
  return Math.max(0, Math.min(1, (stepsAhead - 3) / 5));
}

export default function AdvancedKnobs({ lang, onGraphEdits }: { lang: Locale; onGraphEdits: () => void }) {
  const t = L[lang];
  const cfg = config.value; // subscribe
  const bd = cfg.breadthVsDepth;
  const pace = paceValue(cfg.pace.stepsAhead);
  const tier: Tier = typeof cfg.depthTier === "string" ? cfg.depthTier : "middle";

  return (
    <details class="inset">
      <summary>
        <svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" /></svg>
        {t.summary}
      </summary>
      <div class="inset-body">
        <div class="knobs">
          <div class="knob">
            <span class="k-label"><span>{t.bd}</span><b>{bdLabel(lang, bd)}</b></span>
            <input
              type="range" min={0} max={100} value={Math.round(bd * 100)} aria-label={t.bdAria}
              onInput={(e) => setKnob({ breadthVsDepth: Number((e.target as HTMLInputElement).value) / 100 })}
            />
          </div>
          <div class="knob">
            <span class="k-label"><span>{t.pace}</span><b>{paceLabel(lang, pace)}</b></span>
            <input
              type="range" min={0} max={100} value={Math.round(pace * 100)} aria-label={t.paceAria}
              onInput={(e) => setKnob({ pace: paceToConfig(Number((e.target as HTMLInputElement).value) / 100) })}
            />
          </div>
          <div class="knob">
            <span class="k-label">{t.depth}</span>
            <div class="seg depth" role="group" aria-label={t.depth}>
              {TIERS.map((tr) => (
                <button key={tr} type="button" aria-pressed={tier === tr} onClick={() => setKnob({ depthTier: tr })}>{t[tr]}</button>
              ))}
            </div>
          </div>
        </div>
        <button type="button" class="adv-link" onClick={onGraphEdits}>{t.graph}</button>
      </div>
    </details>
  );
}
