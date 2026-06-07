// src/components/path/planning/NextPath.tsx
// 03 · PATH — the dependency-ordered unit list. Real steps from computePath().
// Every PathCard affordance is preserved (skip/know/pin/move/loosen/quick-check/
// HTML5 reorder). The first row gets a working "Start" link to the unit's first
// lesson; rows whose lesson route can't be resolved render a disabled CTA.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import {
  knowledge, config, content, computePath,
  skipUnit, pinUnit, moveUnit, isPinned, loosenUnit, reorderPath,
} from "~/scripts/path/path-io";
import { masteryOf } from "~/scripts/path/knowledge";
import unitsJson from "~/content/units.json";
import UnitRow from "./UnitRow";

// Unit-level concept prerequisites, keyed by unit id — for the real "prereqs met / needs X" pill.
const REQ_BY_UNIT = new Map(content.units.map((u) => [u.unit, u.requires]));

const L = {
  en: { empty: "Nothing to study for the current goal — pick a broader goal or unskip a unit." },
  ru: { empty: "Для текущей цели учить нечего — выбери цель пошире или верни пропущенный юнит." },
} as const;

// First-lesson lookup keyed by unit id ("<track>/<slug>") → { track, slug, firstLesson }.
type UnitMeta = { track: string; slug: string; firstLesson: string | undefined };
const UNIT_META: Map<string, UnitMeta> = (() => {
  const m = new Map<string, UnitMeta>();
  for (const u of unitsJson as Array<{ id: string; slug: string; track: string; lessons: string[] }>) {
    m.set(u.id, { track: u.track, slug: u.slug, firstLesson: u.lessons?.[0] });
  }
  return m;
})();

// Build the unit's first-lesson route, or null when no lesson resolves.
function startHrefFor(lang: Locale, unitId: string): string | null {
  const meta = UNIT_META.get(unitId);
  if (!meta || !meta.firstLesson) return null;
  return `/${lang}/learn/${meta.track}/${meta.slug}/${meta.firstLesson}`;
}

export default function NextPath({ lang, onQuickCheck }: { lang: Locale; onQuickCheck: (unitId: string) => void }) {
  const t = L[lang];
  const state = knowledge.value; // subscribe to knowledge (drives prereq readiness)
  const threshold = config.value.weights.masteryThreshold; // subscribe to config (pins/reorder/goals/knobs)
  const { path } = computePath(); // subscribe
  const [dragUnit, setDragUnit] = useState<string | null>(null);

  if (path.steps.length === 0) {
    return <p class="cmap-empty">{t.empty}</p>;
  }

  return (
    <ol class="unit-list">
      {path.steps.map((s) => {
        // Real readiness: a unit's prereqs are met when every required concept is known.
        const unmet = (REQ_BY_UNIT.get(s.unit) ?? []).filter((c) => masteryOf(state, c) < threshold);
        const unmetLabel = unmet.length ? (content.conceptById.get(unmet[0])?.label[lang] ?? unmet[0]) : null;
        return (
        <UnitRow
          key={s.unit}
          lang={lang}
          step={s}
          ready={unmet.length === 0}
          unmetLabel={unmetLabel}
          unmetCount={unmet.length}
          pinned={isPinned(s.unit)}
          hasQuickCheck={content.quickCheckUnits.has(s.unit)}
          startHref={startHrefFor(lang, s.unit)}
          onKnow={() => skipUnit(s.unit)}
          onSkip={() => skipUnit(s.unit)}
          onPin={() => pinUnit(s.unit)}
          onMove={(d) => moveUnit(s.unit, d)}
          onLoosen={() => loosenUnit(s.unit)}
          onQuickCheck={() => onQuickCheck(s.unit)}
          onDragStart={() => setDragUnit(s.unit)}
          onDrop={() => {
            if (dragUnit && dragUnit !== s.unit) reorderPath(path.steps.map((x) => x.unit), dragUnit, s.unit);
            setDragUnit(null);
          }}
        />
        );
      })}
    </ol>
  );
}
