// src/components/english/grammar/GrammarPlanner.tsx
import { useMemo, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { type Cefr, CEFR_ORDER, cefrIndex } from "~/english/grammar-types";
import type { GrammarCoverage } from "~/english/grammar-coverage";
import { buildGrammarPlan, type PlanTopic, type GrammarStep } from "~/english/grammar-plan";
import { forecastGrammarPlan, dailyBudgetMinutes } from "~/english/grammar-schedule";
import {
  englishState, getPlacement, getGrammarGoal, setGrammarGoal, clearGrammarGoal, grammarCardOf, type GrammarGoal,
} from "~/english/state";
import { gt } from "./strings";

const DAY = 86_400_000;
const TARGETS: Cefr[] = ["A2", "B1", "B2", "C1", "C2"];

export type GrammarPlannerProps = { lang: Locale; topics: PlanTopic[]; coverage: GrammarCoverage };

export default function GrammarPlanner({ lang, topics, coverage }: GrammarPlannerProps) {
  englishState.value; // subscribe to mastery/goal changes
  const goal = getGrammarGoal();
  if (!goal) return <GoalSetter lang={lang} />;

  const now = Date.now();
  const placementBand = (getPlacement()?.band ?? "A2") as Cefr;
  const dailyBudgetMin = dailyBudgetMinutes(goal, now);
  const plan = useMemo(
    () => buildGrammarPlan({ topics, cardOf: grammarCardOf, coverage, placementBand, goal, dailyBudgetMin, now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topics, coverage, englishState.value, goal.targetCefr, goal.deadlineMs, dailyBudgetMin],
  );
  const forecast = useMemo(() => forecastGrammarPlan(plan, goal, now), [plan, goal]);

  const verdictKey = forecast.verdict === "fits" ? "fc_fits" : forecast.verdict === "under" ? "fc_under" : "fc_over";
  const titleById = new Map(topics.map((t) => [t.id, t.title]));
  const bandIdx = cefrIndex(plan.currentBand);

  const learns = plan.steps.filter((s) => s.kind === "learn");
  const byBand = CEFR_ORDER
    .map((c) => ({ cefr: c, steps: learns.filter((s) => s.cefr === c) }))
    .filter((g) => g.steps.length > 0);

  const Row = ({ s }: { s: GrammarStep }) => {
    const locked = s.kind === "learn" && cefrIndex(s.cefr) > bandIdx;
    const inner = (
      <>
        <span class="gplan-row-title">{titleById.get(s.topicId)?.[lang] ?? s.topicId}</span>
        <span class="gplan-row-meta">{s.cefr}{s.kind === "review" ? " · ↻" : ""}</span>
      </>
    );
    return locked
      ? <div class="gplan-row locked" aria-disabled="true" title={gt("locked_band", lang)}>{inner}</div>
      : <a class="gplan-row" href={`/${lang}/english/grammar/${s.topicId}`}>{inner}</a>;
  };

  return (
    <div class="gplan">
      <div class={"gplan-fc " + forecast.verdict}>
        <span class="gplan-fc-verdict">{gt(verdictKey, lang)}</span>
        <span class="gplan-fc-count">{forecast.countdownDays} {gt("fc_countdown", lang)}</span>
        <button type="button" class="btn ghost btn-sm" onClick={() => clearGrammarGoal()}>{gt("goal_change", lang)}</button>
      </div>

      <section class="gplan-today">
        <h2>{gt("today_title", lang)}</h2>
        {plan.today.length === 0
          ? <p class="meta">{gt("plan_empty", lang)}</p>
          : plan.today.map((s) => <Row key={s.topicId} s={s} />)}
      </section>

      <section class="gplan-full">
        <h2>{gt("plan_full_title", lang)}</h2>
        {byBand.map((g) => (
          <div class="gplan-band" key={g.cefr}>
            <div class="gplan-band-head">{g.cefr}</div>
            {g.steps.map((s) => <Row key={s.topicId} s={s} />)}
          </div>
        ))}
      </section>
    </div>
  );
}

function GoalSetter({ lang }: { lang: Locale }) {
  const [target, setTarget] = useState<Cefr>("B2");
  const [weeks, setWeeks] = useState(12);
  const [hours, setHours] = useState(1);
  const save = () => {
    const goal: GrammarGoal = {
      targetCefr: target,
      deadlineMs: Date.now() + weeks * 7 * DAY,
      perWeekdayHours: [hours, hours, hours, hours, hours, 0, 0].map((h) => Math.max(0, h)),
      tzOffsetMin: -new Date().getTimezoneOffset(),
    };
    setGrammarGoal(goal);
  };
  return (
    <div class="gplan-goalset">
      <h2>{gt("goal_title", lang)}</h2>
      <label>{gt("goal_target", lang)}
        <select value={target} onChange={(e) => setTarget((e.target as HTMLSelectElement).value as Cefr)}>
          {TARGETS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label>{gt("goal_deadline", lang)}
        <input type="number" min={1} max={104} value={weeks}
          onInput={(e) => setWeeks(Math.max(1, Number((e.target as HTMLInputElement).value) || 1))} />
      </label>
      <label>{gt("goal_hours", lang)}
        <input type="number" min={0} max={12} step={0.5} value={hours}
          onInput={(e) => setHours(Math.max(0, Number((e.target as HTMLInputElement).value) || 0))} />
      </label>
      <button type="button" class="btn" onClick={save}>{gt("goal_save", lang)}</button>
    </div>
  );
}
