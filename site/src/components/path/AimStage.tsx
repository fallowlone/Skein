// src/components/path/AimStage.tsx
// Stage 1 of probabilistic placement: pick a goal + coarse per-family self-placement.
// The self-placement seeds Bayesian priors (seedPriors) and prunes "never" families from
// the deep run; the goal is written through setGoals so the resulting path targets it.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content, activeGoals, setGoals, families } from "~/scripts/path/path-io";
import type { SelfPlace } from "~/scripts/path/bayes";

const L = {
  en: {
    title: "Where are you aiming?",
    goal: "Goal",
    place: "Mark each area",
    levels: { never: "Never touched", basics: "Basics", prod: "Used in production" },
    start: "Start the test",
  },
  ru: {
    title: "Куда ты метишь?",
    goal: "Цель",
    place: "Отметь каждую область",
    levels: { never: "Не трогал", basics: "Основы", prod: "Использовал в проде" },
    start: "Начать тест",
  },
} as const;

const LEVELS: SelfPlace[] = ["never", "basics", "prod"];

type Props = { lang: Locale; onDone: (selfByFamily: Record<string, SelfPlace>) => void };

export default function AimStage({ lang, onDone }: Props) {
  const t = L[lang];
  const goals = content.goals;
  const [goalId, setGoalId] = useState(activeGoals()[0]?.id ?? goals[0]?.id ?? "");
  const [picked, setPicked] = useState<Record<string, SelfPlace>>({});
  const fams = families();

  const submit = () => {
    if (goalId) setGoals([{ id: goalId, priority: 1 }]);
    const full: Record<string, SelfPlace> = {};
    for (const f of fams) full[f.key] = picked[f.key] ?? "never";
    onDone(full);
  };

  return (
    <div class="cal-flow">
      <h1 class="cf-title">{t.title}</h1>
      <label class="cf-lead">
        {t.goal}{" "}
        <select
          class="aim-goal"
          value={goalId}
          onChange={(e) => setGoalId((e.target as HTMLSelectElement).value)}
        >
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.label[lang]}</option>
          ))}
        </select>
      </label>
      <p class="cf-lead">{t.place}</p>
      <div class="aim-grid">
        {fams.map((f) => (
          <div key={f.key} class="aim-row">
            <span class="aim-fam">{f.label[lang]}</span>
            <div class="seg" role="group" aria-label={f.label[lang]}>
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  aria-pressed={(picked[f.key] ?? "never") === lv}
                  onClick={() => setPicked((p) => ({ ...p, [f.key]: lv }))}
                >
                  {t.levels[lv]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="button" class="btn btn-primary" onClick={submit}>{t.start}</button>
    </div>
  );
}
