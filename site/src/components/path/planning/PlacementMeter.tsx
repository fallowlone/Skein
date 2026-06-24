// src/components/path/planning/PlacementMeter.tsx
// Visualises how much of the active goal frontier is measured / declared /
// propagated / guessed. Surfaces SelfPlacement so the learner can declare the
// isolated-leaf concepts that diagnostics can never reach.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { currentCompleteness } from "~/scripts/path/path-io";
import SelfPlacement from "../SelfPlacement";

const L = {
  en: {
    measuredOf: (pct: number) => `${pct}% of your goal is measured or declared`,
    legMeasured: "Measured",
    legDeclared: "Declared",
    legPropagated: "Inferred",
    legGuessed: "Unknown",
    declareCta: "Declare what you already know",
    declareHint: "Some concepts can only be placed by you — diagnostics can't reach them.",
    barAria: (c: { measured: number; declared: number; propagated: number; guessed: number; total: number }) =>
      `Goal placement: ${c.measured} measured, ${c.declared} declared, ${c.propagated} inferred, ${c.guessed} unknown of ${c.total}`,
  },
  ru: {
    measuredOf: (pct: number) => `${pct}% твоей цели измерено или отмечено`,
    legMeasured: "Измерено",
    legDeclared: "Отмечено",
    legPropagated: "Выведено",
    legGuessed: "Неизвестно",
    declareCta: "Отметить, что уже знаешь",
    declareHint: "Некоторые концепты можешь разместить только ты — диагностика до них не доходит.",
    barAria: (c: { measured: number; declared: number; propagated: number; guessed: number; total: number }) =>
      `Размещение по цели: ${c.measured} измерено, ${c.declared} отмечено, ${c.propagated} выведено, ${c.guessed} неизвестно из ${c.total}`,
  },
} as const;

// Segment colour palette — distinct hues, reusing CSS token conventions.
// measured = positive/green, declared = blue, propagated = amber, guessed = muted gray.
const SEG_COLORS = {
  measured: "var(--color-success, #22c55e)",
  declared: "var(--color-info, #3b82f6)",
  propagated: "var(--color-warn, #f59e0b)",
  guessed: "var(--color-muted, #94a3b8)",
} as const;

export default function PlacementMeter({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [declareOpen, setDeclareOpen] = useState(false);

  // Completeness over the EFFECTIVE goal frontier + graph (the structure the planner traverses),
  // resolved once in the adapter so the meter matches computePath. Reading it in render subscribes
  // this island to the config, knowledge, AND overrides signals (currentCompleteness reads all three).
  // Null = no goal yet (cold-start) → render nothing.
  const c = currentCompleteness();
  if (!c) return null;

  const measuredPct = Math.round(100 * (c.measured + c.declared) / c.total);
  const showDeclare = c.guessed > 0.2 * c.total;

  // Each segment width as a percentage of total (guard against division by zero
  // handled above via frontier.size === 0 early return; c.total >= frontier.size > 0).
  const widths = {
    measured: (100 * c.measured) / c.total,
    declared: (100 * c.declared) / c.total,
    propagated: (100 * c.propagated) / c.total,
    guessed: (100 * c.guessed) / c.total,
  };

  return (
    <div class="placement-meter">
      {/* 4-segment bar */}
      <div
        class="pm-bar"
        role="img"
        aria-label={t.barAria(c)}
        style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--color-muted,#94a3b8)"
      >
        <div style={`width:${widths.measured}%;background:${SEG_COLORS.measured}`} />
        <div style={`width:${widths.declared}%;background:${SEG_COLORS.declared}`} />
        <div style={`width:${widths.propagated}%;background:${SEG_COLORS.propagated}`} />
        <div style={`width:${widths.guessed}%;background:${SEG_COLORS.guessed}`} />
      </div>

      {/* Label line */}
      <p class="pm-label">{t.measuredOf(measuredPct)}</p>

      {/* Legend */}
      <div class="pm-legend">
        {(
          [
            ["measured", t.legMeasured, c.measured],
            ["declared", t.legDeclared, c.declared],
            ["propagated", t.legPropagated, c.propagated],
            ["guessed", t.legGuessed, c.guessed],
          ] as const
        ).map(([key, label, count]) => (
          <span key={key} class="pm-leg-item">
            <span
              class="pm-swatch"
              style={`background:${SEG_COLORS[key]};display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle`}
              aria-hidden="true"
            />
            <span class="pm-leg-label">{label}</span>
            <span class="pm-leg-count"> {count}</span>
          </span>
        ))}
      </div>

      {/* Declare CTA — shown only when guessed fraction is significant */}
      {showDeclare && (
        <div class="pm-declare">
          <p class="pm-declare-hint">{t.declareHint}</p>
          <button
            type="button"
            class="btn btn-sm"
            onClick={() => setDeclareOpen((o) => !o)}
            aria-expanded={declareOpen}
          >
            {t.declareCta}
          </button>
          {declareOpen && (
            <div class="pm-declare-panel">
              <SelfPlacement lang={lang} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
