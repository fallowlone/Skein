// site/src/scripts/path/types.ts
import type { Track, Tier } from "~/types";
import type { Band } from "~/components/atlas/track-band";

export type { Band, Track, Tier };

export interface Concept {
  id: string;
  label: { en: string; ru: string };
  track: Track;
  band: Band;
  requires: string[]; // concept-level prereq ids (DAG edges)
}

export interface UnitConcepts {
  unit: string; // "<track>/<unit-slug>"
  track: Track;
  teaches: string[];
  requires: string[];
  estMin: number;
}

export type Source = "pretest" | "diagnostic" | "activity" | "declared" | "review";
export interface ConceptMastery { confidence: number; source: Source; lastAt: number; }
export type KnowledgeState = Map<string, ConceptMastery>;

export interface Goal {
  id: string;
  label: { en: string; ru: string };
  target: { rule?: string; concepts?: string[] };
  trackWeights: Partial<Record<Track, number>>;
}

export interface DeadlineConfig {
  targetDateMs: number;
  perWeekdayHours: number[]; // length 7, Mon..Sun; 0 = day off
  blackoutDates?: string[];  // ISO "YYYY-MM-DD"
  tzOffsetMin: number;       // minutes; keeps the core clock-free
  startedAtMs?: number;          // when the deadline was first activated (pace baseline anchor)
  baselineRequiredMin?: number;  // scaled required minutes at activation; raised if scope grows
}

export interface PathWeights {
  lessons: number; practice: number;       // study-evidence blend (applyStudyEvidence)
  masteryThreshold: number; // concept "known" cutoff
  decayFloor: number;       // base confidence floor after decay
}

export interface PathConfig {
  version: number;
  goals: { id: string; priority: number }[];
  customTargets?: string[];
  excludedTracks: string[];
  breadthVsDepth: number; // 0 = depth-first … 1 = breadth-first
  depthTier: Tier | Partial<Record<Track, Tier>>;
  pace: { stepsAhead: number; srsAggressiveness: number };
  weights: PathWeights;
  deadline?: DeadlineConfig;
}

export type StepKind = "learn" | "review" | "check";
export interface PathStep {
  unit: string; track: Track; unlocks: string[]; reason: string; kind: StepKind; estMin: number;
  value?: number; // triage weight (goal × band × unlocking power); learn steps only
}
export interface Path { steps: PathStep[]; }

export interface Feasibility { verdict: "fits" | "over" | "under"; deltaMin: number; dropped: string[]; }
export interface DayPlan { date: string; minutes: number; steps: PathStep[]; }
export interface Schedule { days: DayPlan[]; feasibility: Feasibility; countdownDays: number; }
