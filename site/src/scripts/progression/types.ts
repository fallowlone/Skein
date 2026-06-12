import type { Tier } from "~/types";

export type RankId = string;

export interface RankDef {
  id: RankId;
  tier: string;
  division: 1 | 2 | 3 | null;
  min: number;
  max: number;
  contentTier: Tier;
  icon: string;
  color: string;
  label: { en: string; ru: string };
  /** Short market-level note on a few anchor ranks (≈ junior baseline, ≈ senior bar…). */
  market?: { en: string; ru: string };
}

export interface StageResult { score: number; answers: number[]; }

export interface PretestResult {
  takenAt: number;
  stage1: StageResult;
  stage2?: StageResult;
  rating: number;
  rank: RankId;
  confidence: "high" | "medium";
}

export interface EnglishSummary {
  knownTotal: number;
  knownByBand: { A2: number; B1: number; B2: number };
  band: "none" | "A2" | "B1" | "B2";
  readUnits: number;
  grammarDone: number;
  collocationDone: number;
  graded: boolean;
  updatedAt: number;     // epoch ms; merge tiebreaker for `band`
}

export interface Progression {
  xp: number;
  level: number;
  achievements: Record<string, number>;
  streak: { lastActiveDay: string; count: number; best: number };
  titles: string[];
  englishSummary?: EnglishSummary;   // optional → old payloads stay valid
}

export interface AchievementCtx {
  drillsSolved: number;
  drillUnitsWithSolve: number;
  noHintSolve: boolean;
  hourOfDay: number;
  seniorAnswers: number;   // count of weight-3 (expert) answers across both test stages
  pillarsVisited: number;  // distinct pillars touched in lesson history
  englishKnown: number;            // total known English words (placement-seeded ∪ matured)
  englishBand: "none" | "A2" | "B1" | "B2";
  englishReadUnits: number;
  englishGraded: boolean;          // any AI-graded output attempt (scoreBand set)
  englishGrammarDone: number;
  englishCollocationDone: number;
}
