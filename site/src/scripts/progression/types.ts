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

export interface Progression {
  xp: number;
  level: number;
  achievements: Record<string, number>;
  streak: { lastActiveDay: string; count: number; best: number };
  titles: string[];
}

export interface AchievementCtx {
  drillsSolved: number;
  drillUnitsWithSolve: number;
  noHintSolve: boolean;
  hourOfDay: number;
  seniorAnswers: number;   // count of weight-3 (expert) answers across both test stages
  pillarsVisited: number;  // distinct pillars touched in lesson history
}
