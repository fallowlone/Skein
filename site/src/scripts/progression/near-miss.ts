// site/src/scripts/progression/near-miss.ts
//
// Pure "within reach" read-model: for the numeric-threshold achievements (the only ones
// with an honest N/M progress), compute current/target from the real AchievementCtx/state
// and return the locked ones closest to completion. No I/O.
import type { AchievementCtx } from "./types";
import { ACHIEVEMENTS } from "./achievements";

type St = { history?: Record<string, unknown>; retrieval?: Record<string, unknown>; progression?: { streak?: { best?: number } } };

const PROGRESS: Record<string, { target: number; current: (s: St, c: AchievementCtx) => number }> = {
  "streak-7": { target: 7, current: (s) => s.progression?.streak?.best ?? 0 },
  "streak-30": { target: 30, current: (s) => s.progression?.streak?.best ?? 0 },
  "drill-rookie": { target: 5, current: (_s, c) => c.drillsSolved },
  "drill-sergeant": { target: 25, current: (_s, c) => c.drillsSolved },
  "completionist-algo": { target: 11, current: (_s, c) => c.drillUnitsWithSolve },
  "scholar": { target: 10, current: (s) => Object.keys(s.history ?? {}).length },
  "well-read": { target: 40, current: (s) => Object.keys(s.history ?? {}).length },
  "retriever": { target: 15, current: (s) => Object.keys(s.retrieval ?? {}).length },
  "polyglot": { target: 5, current: (_s, c) => c.pillarsVisited },
  "renaissance": { target: 10, current: (_s, c) => c.pillarsVisited },
  "sharp-shooter": { target: 5, current: (_s, c) => c.seniorAnswers },
  "en-words-500": { target: 500, current: (_s, c) => c.englishKnown },
  "en-words-2000": { target: 2000, current: (_s, c) => c.englishKnown },
  "en-words-5000": { target: 5000, current: (_s, c) => c.englishKnown },
  "en-reader-10": { target: 10, current: (_s, c) => c.englishReadUnits },
  "en-reader-40": { target: 40, current: (_s, c) => c.englishReadUnits },
  "en-grammar-5": { target: 5, current: (_s, c) => c.englishGrammarDone },
};

const META = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export interface NearMissMark { id: string; name: string; cond: string; current: number; target: number; pct: number; }

export function nearMiss(state: St, ctx: AchievementCtx, earnedSet: Set<string>, lang: "en" | "ru" = "en"): NearMissMark[] {
  const out: NearMissMark[] = [];
  for (const [id, p] of Object.entries(PROGRESS)) {
    if (earnedSet.has(id) || p.target <= 0) continue;
    const a = META.get(id);
    if (!a) continue;
    const current = Math.min(p.target, Math.max(0, p.current(state, ctx)));
    const pct = Math.round((current / p.target) * 100);
    if (pct >= 100 || pct <= 0) continue;
    out.push({ id, name: a.label[lang], cond: a.desc[lang], current, target: p.target, pct });
  }
  return out.sort((x, y) => y.pct - x.pct).slice(0, 3);
}
