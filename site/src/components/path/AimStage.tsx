// src/components/path/AimStage.tsx
// Stage 1 of probabilistic placement (Open Atlas design): pick a goal + a coarse per-family
// self-mark. The self-placement seeds Bayesian priors (seedPriors) and prunes "never" families
// from the deep run; the goal is written through setGoals so the resulting path targets it.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content, activeGoals, setGoals, families } from "~/scripts/path/path-io";
import type { SelfPlace } from "~/scripts/path/bayes";

const L = {
  en: {
    kick: "Calibration · step 1 of 2",
    title: "Where are you aiming?",
    note: "≈ 30 seconds",
    lead: "A rough self-mark is enough — the test corrects itself. It only needs a starting belief and permission to skip what you've never touched.",
    goal: "Goal",
    markTitle: "Mark each area",
    markNote: "unmarked → treated as never touched",
    levels: { never: "Never touched", basics: "Basics", prod: "Used in production" },
    start: "Start the test",
    of: (n: number) => `of ${n} marked · the rest start as “never”`,
  },
  ru: {
    kick: "Калибровка · шаг 1 из 2",
    title: "Куда ты метишь?",
    note: "≈ 30 секунд",
    lead: "Грубой самооценки достаточно — тест сам себя поправит. Ему нужна лишь стартовая уверенность и право пропустить то, чего ты не трогал.",
    goal: "Цель",
    markTitle: "Отметь каждую область",
    markNote: "без отметки → считаем «не трогал»",
    levels: { never: "Не трогал", basics: "Основы", prod: "Использовал в проде" },
    start: "Начать тест",
    of: (n: number) => `из ${n} отмечено · остальные стартуют как «не трогал»`,
  },
} as const;

const LEVELS: SelfPlace[] = ["never", "basics", "prod"];

type Props = { lang: Locale; onDone: (selfByFamily: Record<string, SelfPlace>) => void };

export default function AimStage({ lang, onDone }: Props) {
  const t = L[lang];
  const goals = content.goals;
  const fams = families();
  const [goalId, setGoalId] = useState(activeGoals()[0]?.id ?? goals[0]?.id ?? "");
  const [picked, setPicked] = useState<Record<string, SelfPlace>>({});

  const markedCount = fams.filter((f) => (picked[f.key] ?? "never") !== "never").length;

  const submit = () => {
    if (goalId) setGoals([{ id: goalId, priority: 1 }]);
    const full: Record<string, SelfPlace> = {};
    for (const f of fams) full[f.key] = picked[f.key] ?? "never";
    onDone(full);
  };

  return (
    <div class="cal-flow" data-pt>
      <div class="pt-panel pt-rise">
        <div class="pt-panel-head">
          <span class="pph-kick">{t.kick}</span>
          <h3>{t.title}</h3>
          <span class="pph-note">{t.note}</span>
        </div>

        <p class="aim-lead">{t.lead}</p>

        <div class="aim-field">
          <label for="aim-goal">{t.goal}</label>
          <div class="aim-select">
            <select id="aim-goal" value={goalId} onChange={(e) => setGoalId((e.target as HTMLSelectElement).value)}>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.label[lang]}</option>
              ))}
            </select>
            <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div class="aim-mark-head">
          <span class="amh-title">{t.markTitle}</span>
          <span class="amh-note">{t.markNote}</span>
        </div>

        <div class="aim-areas">
          {fams.map((f) => (
            <div key={f.key} class="aim-row" style={`--d:var(${f.hue})`}>
              <span class="aim-area-name"><span class="sq" /><span>{f.label[lang]}</span></span>
              <div class="aim-seg" role="group" aria-label={f.label[lang]}>
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    data-level={lv}
                    aria-pressed={(picked[f.key] ?? "never") === lv}
                    onClick={() => setPicked((p) => ({ ...p, [f.key]: lv }))}
                  >{t.levels[lv]}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div class="aim-foot">
          <button type="button" class="btn btn-primary" onClick={submit}>
            <span>{t.start}</span><span class="arrow">→</span>
          </button>
          <span class="af-meta"><b>{markedCount}</b> {t.of(fams.length)}</span>
        </div>
      </div>
    </div>
  );
}
