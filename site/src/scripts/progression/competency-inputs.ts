// site/src/scripts/progression/competency-inputs.ts
// Impure adapter: reads live UserState + practice-state + a build-time content
// bundle (assembled in the roadmap route) and produces DomainInputs[] for the
// pure competency core. ALL localStorage/history/content access lives here.
// See docs/superpowers/plans/2026-06-05-senior-roadmap-competency-map.md (Phase 4).
import type { Track } from "~/types";
import type { UserState } from "~/scripts/user-state";
import { readProgress } from "~/scripts/practice-state";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";
import { bandOf } from "~/components/atlas/track-band";
import {
  computeDomainScore,
  rankGaps,
  recommendNextUnit,
  PRETEST_DOMAIN,
  type DomainInputs,
  type DomainScore,
  type RankedGap,
  type UnitRec,
  type UnitLite,
} from "./competency";

// The serializable content bundle the route hands to the island (no content I/O
// inside the pure core or this adapter beyond what the route pre-collects).
export type LessonPractice = { lessonKey: string; tasks: { id: string; objective: boolean }[] };
export type TrackContent = { track: Track; readyUnits: UnitLite[]; practiceByLesson: LessonPractice[] };
export type RoadmapContent = { tracks: TrackContent[] };

export type CompetencyMap = {
  scores: DomainScore[];
  gaps: RankedGap[];
  topGap: RankedGap | null;
  nextUnit: UnitRec | null;
};

// Map every answered pretest question (both stages) to its track via PRETEST_DOMAIN,
// collecting the chosen answer's weight. Unmapped questions are ignored.
function priorWeightsByTrack(state: UserState): Map<Track, number[]> {
  const out = new Map<Track, number[]>();
  const collect = (questions: typeof pretestQuestions, answers: number[] | undefined) => {
    if (!answers) return;
    questions.forEach((q, i) => {
      const track = PRETEST_DOMAIN[q.id];
      const ans = answers[i];
      if (track === undefined || ans === undefined) return;
      const weight = q.choices[ans]?.weight;
      if (typeof weight !== "number") return;
      const arr = out.get(track) ?? [];
      arr.push(weight);
      out.set(track, arr);
    });
  };
  collect(pretestQuestions, state.pretest?.stage1.answers);
  collect(advancedQuestions, state.pretest?.stage2?.answers);
  return out;
}

export function buildDomainInputs(state: UserState, content: RoadmapContent, nowMs: number): DomainInputs[] {
  const priorMap = priorWeightsByTrack(state);
  const globalRating = state.pretest?.rating ?? 0;
  const historyKeys = Object.keys(state.history);

  return content.tracks.map((tc): DomainInputs => {
    const readyLessonsTotal = tc.readyUnits.reduce((n, u) => n + u.lessons.length, 0);

    // Coverage: history is keyed "<track>/…" (same split convention as ProfilePanel).
    // history is sparsely populated today (only faded-example reveals call recordVisit),
    // so this term is a floor, not full coverage — prior + practice carry early signal.
    const inTrack = historyKeys.filter((k) => k.split("/")[0] === tc.track);
    const readyLessonsOpened = Math.min(inTrack.length, readyLessonsTotal);
    const lastTouchedMs = inTrack.length
      ? Math.max(...inTrack.map((k) => state.history[k]?.lastAt ?? 0))
      : null;

    // Practice outcomes: objective tasks count `done`; subjective count engagement (half-weighted in the core).
    let objDone = 0;
    let subjEngaged = 0;
    let totalTasks = 0;
    for (const lp of tc.practiceByLesson) {
      const prog = readProgress(lp.lessonKey);
      for (const t of lp.tasks) {
        totalTasks += 1;
        const st = prog[t.id];
        if (t.objective) {
          if (st === "done") objDone += 1;
        } else if (st === "attempted" || st === "done") {
          subjEngaged += 1;
        }
      }
    }

    return {
      track: tc.track,
      priorWeights: priorMap.get(tc.track) ?? [],
      globalRating,
      readyLessonsTotal,
      readyLessonsOpened,
      practice: { objDone, subjEngaged, totalTasks },
      lastTouchedMs,
      nowMs,
    };
  });
}

export function computeCompetencyMap(state: UserState, content: RoadmapContent, nowMs: number): CompetencyMap {
  const scores = buildDomainInputs(state, content, nowMs).map(computeDomainScore);
  const gaps = rankGaps(scores, bandOf);
  const topGap = gaps[0] ?? null;

  let nextUnit: UnitRec | null = null;
  if (topGap) {
    const tc = content.tracks.find((t) => t.track === topGap.track);
    if (tc) {
      // recommendNextUnit compares against full lesson keys "<unit.id>/<lesson>".
      const units = tc.readyUnits.map((u) => ({ ...u, lessons: u.lessons.map((l) => `${u.id}/${l}`) }));
      nextUnit = recommendNextUnit(topGap.track, Object.keys(state.history), units, () => []);
    }
  }
  return { scores, gaps, topGap, nextUnit };
}
