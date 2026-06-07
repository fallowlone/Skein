// src/components/account/OverviewGrid.tsx
// 02 · OVERVIEW — six "where you stand" cards, every value from real engine reads.
// rank ← pretest.rank/.rating (0..1000, NOT a fabricated comma number); CEFR ← english
// placement band; goal ← active path goal label; streak/due/marks ← progression + SRS +
// achievements. A missing value (fresh account) becomes null → the card shows a neutral "—".
import { userState } from "~/scripts/user-state";
import { rankById } from "~/scripts/progression/ranks";
import { getPlacement } from "~/english/state";
import { config, content } from "~/scripts/path/path-io";
import { dueCount } from "~/scripts/review-state";
import { knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount } from "~/english/stats";
import { evaluateAchievements, ACHIEVEMENTS } from "~/scripts/progression/achievements";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";
import { overviewCards } from "~/scripts/account/overview";
import { type Locale } from "~/i18n";

function seniorAnswersOf(pretest: typeof userState.value.pretest): number {
  if (!pretest) return 0;
  const s1 = pretest.stage1.answers.filter((c, i) => pretestQuestions[i]?.choices[c]?.weight === 3).length;
  const s2 = (pretest.stage2?.answers ?? []).filter((c, i) => advancedQuestions[i]?.choices[c]?.weight === 3).length;
  return s1 + s2;
}

export default function OverviewGrid({ lang }: { lang: Locale }) {
  const s = userState.value; // subscribe in render
  const pretest = s.pretest;

  // Rank — real 0..1000 rating, label from the rank definition. Absent until placed.
  const rank = pretest
    ? { label: rankById(pretest.rank).label[lang], rating: pretest.rating }
    : undefined;

  // English CEFR band — undefined until placement is taken, so the card shows "—".
  const cefr = getPlacement()?.band ?? undefined;

  // Active path goal label (first goal; absent until one is set).
  const goalId = config.value.goals[0]?.id;
  const goal = (goalId && content.goalById.get(goalId)?.label[lang]) || undefined;

  const streak = s.progression.streak;

  // Achievement marks: how many predicates currently fire / the total catalogue size.
  const placementBand = getPlacement()?.band ?? "none";
  const pillarsVisited = new Set(Object.keys(s.history ?? {}).map((k) => k.split("/")[0])).size;
  const ctx = {
    drillsSolved: 0, drillUnitsWithSolve: 0, noHintSolve: false,
    hourOfDay: new Date().getHours(),
    seniorAnswers: seniorAnswersOf(pretest), pillarsVisited,
    englishKnown: knownTotal(),
    englishBand: placementBand,
    englishReadUnits: readUnitsCount(),
    englishGraded: gradedOutputCount() > 0,
    englishGrammarDone: grammarDoneCount(),
    englishCollocationDone: collocationDoneCount(),
  } as const;
  const earned = evaluateAchievements(s, ctx).length;

  const cards = overviewCards({
    rank, cefr, goal,
    streak: { count: streak.count, best: streak.best },
    due: dueCount(Date.now()),
    marks: { earned, total: ACHIEVEMENTS.length },
  });

  const dash = "—";
  return (
    <div class="overview">
      {cards.map((c) => (
        <a key={c.key} class="ov-card" href={c.href(lang)}>
          <span class="ov-label">{c.label[lang]}</span>
          <span class={`ov-val${c.value === null ? " is-empty" : ""}`}>{c.value ?? dash}</span>
          <span class="ov-sub">{c.sub[lang]}</span>
        </a>
      ))}
    </div>
  );
}
