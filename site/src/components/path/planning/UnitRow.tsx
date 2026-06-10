// src/components/path/planning/UnitRow.tsx
// One dependency-ordered unit in the Next-path list. Re-skin of PathCard — every
// affordance preserved: I-know-this / skip / pin / move up·down / loosen /
// quick-check (DiagnosticRunner) / HTML5 drag-drop reorder. Start CTA when a
// lesson route resolves; otherwise a disabled/queued style.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { PathStep } from "~/scripts/path/types";
import { content } from "~/scripts/path/path-io";
import { hueForTrack } from "./domain-hue";
import unitsJson from "~/content/units.json";

// Unit id → lesson count, so a step is legibly "a unit of N lessons", not "a lesson".
const LESSON_COUNT = new Map<string, number>(
  (unitsJson as Array<{ id: string; lessons: string[] }>).map((u) => [u.id, u.lessons?.length ?? 0]),
);

function ruLessons(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "урок";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "урока";
  return "уроков";
}

const L = {
  en: {
    unlocks: "Unlocks", iKnow: "I know this", skip: "Skip", pin: "Pin", pinned: "Pinned",
    up: "↑", down: "↓", loosen: "Loosen", quick: "quick check", min: "min",
    learn: "learn", review: "review", check: "check", start: "Start", queued: "Queued",
    prereqsMet: "prereqs met", needs: "needs",
    lessons: (n: number) => `${n} lesson${n === 1 ? "" : "s"} — complete all to finish this step`,
  },
  ru: {
    unlocks: "Открывает", iKnow: "Уже знаю", skip: "Пропустить", pin: "Закрепить", pinned: "Закреплено",
    up: "↑", down: "↓", loosen: "Ослабить", quick: "проверка", min: "мин",
    learn: "изучить", review: "повторить", check: "проверка", start: "Начать", queued: "В очереди",
    prereqsMet: "пререквизиты готовы", needs: "нужно",
    lessons: (n: number) => `${n} ${ruLessons(n)} — шаг засчитан, когда пройдены все`,
  },
} as const;

export type UnitRowProps = {
  lang: Locale;
  step: PathStep;
  ready: boolean;            // all unit-level prereq concepts known
  unmetLabel: string | null; // first unmet prereq concept label (when not ready)
  unmetCount: number;        // number of unmet prereq concepts
  pinned: boolean;
  hasQuickCheck: boolean;
  startHref: string | null; // resolved first-lesson route, or null when none resolves
  onKnow: () => void;
  onSkip: () => void;
  onPin: () => void;
  onMove: (d: "up" | "down") => void;
  onLoosen: () => void;
  onQuickCheck: () => void;
  onDragStart: () => void;
  onDrop: () => void;
};

export default function UnitRow(p: UnitRowProps) {
  const { lang, step, ready, unmetLabel, unmetCount, pinned, hasQuickCheck, startHref } = p;
  const t = L[lang];
  const [over, setOver] = useState(false);
  const hue = hueForTrack(step.track);
  const title = content.unitTitleById.get(step.unit)?.[lang] ?? step.unit;
  const concepts = step.unlocks.map((id) => content.conceptById.get(id)?.label[lang] ?? id);

  return (
    <li
      class={`unit${over ? " drag-over" : ""}`}
      style={`--d:var(${hue})`}
      draggable
      onDragStart={() => p.onDragStart()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); p.onDrop(); }}
    >
      <span class="u-no" aria-hidden="true" />
      <div class="u-body">
        <div class="u-head">
          <span class="domain-tag" style={`--d:var(${hue})`}><span class="sq" />{step.track}</span>
          <span class="u-title">{title}</span>
        </div>
        {concepts.length > 0 && (
          <p class="u-why">
            {t.unlocks}{" "}
            {concepts.slice(0, 6).map((c, i) => (
              <span key={c}>{i > 0 ? ", " : ""}<u>{c}</u></span>
            ))}
            {concepts.length > 6 ? "…" : ""}
          </p>
        )}
        <div class="u-meta">
          {ready
            ? <span class="prereq met">{t.prereqsMet}</span>
            : <span class="prereq pending">{t.needs}: {unmetLabel}{unmetCount > 1 ? ` +${unmetCount - 1}` : ""}</span>}
          <span>·</span>
          <span>~{step.estMin} {t.min} · {t[step.kind]}</span>
          {(LESSON_COUNT.get(step.unit) ?? 0) > 0 && (
            <>
              <span>·</span>
              <span>{t.lessons(LESSON_COUNT.get(step.unit)!)}</span>
            </>
          )}
        </div>
        <div class="u-actions">
          <button type="button" class="u-act" onClick={p.onKnow}>{t.iKnow}</button>
          <button type="button" class="u-act" onClick={p.onSkip}>{t.skip}</button>
          <button type="button" class={`u-act${pinned ? " is-on" : ""}`} aria-pressed={pinned} onClick={p.onPin}>{pinned ? t.pinned : t.pin}</button>
          <button type="button" class="u-act" aria-label={`${t.up}`} onClick={() => p.onMove("up")}>{t.up}</button>
          <button type="button" class="u-act" aria-label={`${t.down}`} onClick={() => p.onMove("down")}>{t.down}</button>
          <button type="button" class="u-act" onClick={p.onLoosen} title="not a prerequisite">{t.loosen}</button>
          {hasQuickCheck && <button type="button" class="u-act quick" onClick={p.onQuickCheck}>✓ {t.quick}</button>}
        </div>
      </div>
      {ready && startHref ? (
        <a class="btn btn-primary btn-sm u-cta" href={startHref}><span>{t.start}</span><span class="arrow">→</span></a>
      ) : (
        <span class="btn btn-secondary btn-sm u-cta" aria-disabled="true"><span>{t.queued}</span></span>
      )}
    </li>
  );
}
