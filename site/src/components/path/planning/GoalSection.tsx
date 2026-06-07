// src/components/path/planning/GoalSection.tsx
// 01 · GOAL — preset goals from content.goals as toggle cards with live P1/P2/P3
// priority chips driven by config.goals. Toggling reflows priorities via setGoals.
// A dashed "Custom goal" card asks the parent to open the GoalPicker modal.
import type { Locale } from "~/i18n";
import type { Goal } from "~/scripts/path/types";
import { config, content, setGoals } from "~/scripts/path/path-io";

const L = {
  en: {
    tracks: (n: number) => `${n} track${n === 1 ? "" : "s"}`,
    concepts: (n: number) => `${n} concept${n === 1 ? "" : "s"}`,
    custom: "+ Custom goal", customMeta: "pick tracks / concepts",
  },
  ru: {
    tracks: (n: number) => `${n} трек${n === 1 ? "" : n < 5 ? "а" : "ов"}`,
    concepts: (n: number) => `${n} концепт${n === 1 ? "" : n < 5 ? "а" : "ов"}`,
    custom: "+ Своя цель", customMeta: "выбрать треки / концепты",
  },
} as const;

function goalMeta(lang: Locale, g: Goal): string {
  const t = L[lang];
  const trackN = Object.keys(g.trackWeights ?? {}).length;
  const conceptN = g.target?.concepts?.length ?? 0;
  const parts: string[] = [];
  if (trackN > 0) parts.push(t.tracks(trackN));
  if (conceptN > 0) parts.push(t.concepts(conceptN));
  return parts.join(" · ");
}

export default function GoalSection({ lang, onCustom }: { lang: Locale; onCustom: () => void }) {
  const t = L[lang];
  const cfg = config.value; // subscribe
  const active = cfg.goals; // {id, priority}[]

  // Active goals in ascending priority → P1, P2, P3 … so the chip reflows on toggle.
  const ranked = [...active].sort((a, b) => a.priority - b.priority);
  const prioOf = (id: string): number | null => {
    const i = ranked.findIndex((g) => g.id === id);
    return i === -1 ? null : i + 1;
  };

  // Toggle a goal: remove if active, else append at the next priority slot.
  const toggle = (id: string) => {
    if (active.some((g) => g.id === id)) {
      setGoals(active.filter((g) => g.id !== id));
    } else {
      const nextPrio = active.length ? Math.max(...active.map((g) => g.priority)) + 1 : 1;
      setGoals([...active, { id, priority: nextPrio }]);
    }
  };

  return (
    <div class="goals">
      {content.goals.map((g) => {
        const prio = prioOf(g.id);
        const on = prio !== null;
        return (
          <button key={g.id} type="button" class="goal" aria-pressed={on} onClick={() => toggle(g.id)}>
            {on && <span class="g-prio">P{prio}</span>}
            <span class="g-name">{g.label[lang]}</span>
            <span class="g-meta">{goalMeta(lang, g)}</span>
          </button>
        );
      })}
      <button type="button" class="goal is-custom" aria-pressed={false} onClick={onCustom}>
        <span class="g-name">{t.custom}</span>
        <span class="g-meta">{t.customMeta}</span>
      </button>
    </div>
  );
}
