// site/src/scripts/progression/competency.ts
// Pure per-domain competency model + senior-gap ranking + in-track next-unit
// recommendation. No I/O, no Date.now() — all inputs (including `now`) are passed
// in by the impure adapter (competency-inputs.ts). v1 is a single linear blend
// with a handful of documented, tunable constants. See
// docs/superpowers/plans/2026-06-05-senior-roadmap-competency-map.md (DESIGN DECISIONS).
import type { Track } from "~/types";
import type { Band } from "~/components/atlas/track-band";

const DAY = 86_400_000;
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

// Additive blend weights — sum to 1.0. doing > reading > a coarse one-time prior.
export const WEIGHTS = { prior: 0.25, lessons: 0.35, practice: 0.4 } as const;

// Recency nudges, never erases: fresh ≤30d → 1.0, decaying linearly to a 0.85
// floor by 120d. A never-touched domain takes no penalty (you can't be stale on
// something you started today).
export const RECENCY = { FRESH_DAYS: 30, STALE_DAYS: 120, FLOOR: 0.85 } as const;

// Evidence-volume confidence (distinct from rating.ts's variance-based confidenceOf,
// which is deliberately NOT widened).
export const CONFIDENCE = { LOW: 4, MED: 12 } as const;

// Senior-importance per band: systems concerns are the senior core; foundations
// are prerequisite, not the frontier.
export const SENIOR_WEIGHT: Record<Band, number> = {
  middle: 1.0,
  surface: 0.9,
  advanced: 0.8,
  foundations: 0.4,
};

// Pretest questions are domain-flavored but not 1:1 to tracks. Map the ones that
// clearly belong to a track; unmapped tracks fall back to the global rating prior.
export const PRETEST_DOMAIN: Record<string, Track> = {
  tcp: "networking",
  http: "networking",
  "adv-tls-0rtt": "networking",
  "db-index": "databases",
  "adv-mvcc": "databases",
  react: "frontend",
  "adv-http-cache": "caching",
  "adv-consensus": "distributed",
  "adv-cap": "distributed",
  "adv-event-loop": "js-engine",
};

export type DomainConfidence = "none" | "low" | "medium" | "high";

export type DomainInputs = {
  track: Track;
  priorWeights: number[]; // mapped pretest answer weights 0..3 (may be empty)
  globalRating: number; // 0..1000, fallback prior source
  readyLessonsTotal: number;
  readyLessonsOpened: number;
  practice: { objDone: number; subjEngaged: number; totalTasks: number };
  lastTouchedMs: number | null; // most recent history.lastAt in this domain, or null
  nowMs: number;
};

export type DomainScore = {
  track: Track;
  score: number; // 0..1
  confidence: DomainConfidence;
  parts: { prior: number; lessons: number; practice: number; recencyMul: number };
};

export type RankedGap = {
  track: Track;
  score: number;
  gapScore: number;
  band: Band;
  confidence: DomainConfidence;
};

export type UnitLite = { id: string; slug: string; order: number; lessons: string[] };
export type UnitRec = { track: Track; unit: string; lessonSlug: string };

// prior: mean of mapped pretest weights (0..3 → 0..1); else the global rating as a
// non-zero cold-start anchor so a domain is never 0 for an already-rated learner.
function priorOf(i: DomainInputs): number {
  if (i.priorWeights.length > 0) {
    const mean = i.priorWeights.reduce((a, b) => a + b, 0) / i.priorWeights.length;
    return clamp01(mean / 3);
  }
  return clamp01(i.globalRating / 1000);
}

const lessonFracOf = (i: DomainInputs): number =>
  i.readyLessonsTotal > 0 ? clamp01(i.readyLessonsOpened / i.readyLessonsTotal) : 0;

// objective `done` counts full; subjective only counts as engagement at half, until
// P3's LLM grader provides real correctness. P3 SEAM: replace 0.5*subjEngaged with a
// graded-correctness fraction once available.
const practiceScoreOf = (i: DomainInputs): number =>
  clamp01((i.practice.objDone + 0.5 * i.practice.subjEngaged) / Math.max(1, i.practice.totalTasks));

function recencyMulOf(lastTouchedMs: number | null, nowMs: number): number {
  if (lastTouchedMs === null) return 1;
  const days = (nowMs - lastTouchedMs) / DAY;
  if (days <= RECENCY.FRESH_DAYS) return 1;
  if (days >= RECENCY.STALE_DAYS) return RECENCY.FLOOR;
  const t = (days - RECENCY.FRESH_DAYS) / (RECENCY.STALE_DAYS - RECENCY.FRESH_DAYS);
  return 1 - t * (1 - RECENCY.FLOOR);
}

export function domainConfidenceOf(evidence: number): DomainConfidence {
  if (evidence <= 0) return "none";
  if (evidence < CONFIDENCE.LOW) return "low";
  if (evidence < CONFIDENCE.MED) return "medium";
  return "high";
}

export function computeDomainScore(i: DomainInputs): DomainScore {
  const prior = priorOf(i);
  const lessons = lessonFracOf(i);
  const practice = practiceScoreOf(i);
  const recencyMul = recencyMulOf(i.lastTouchedMs, i.nowMs);
  const base = clamp01(WEIGHTS.prior * prior + WEIGHTS.lessons * lessons + WEIGHTS.practice * practice);
  const score = clamp01(base * recencyMul);
  const evidence = i.readyLessonsOpened + (i.practice.objDone + i.practice.subjEngaged) + i.priorWeights.length;
  return { track: i.track, score, confidence: domainConfidenceOf(evidence), parts: { prior, lessons, practice, recencyMul } };
}

// gapScore = how much senior-weighted ground is unclosed. Tie-break by slug for
// deterministic, stable output.
export function rankGaps(domains: DomainScore[], bandOf: (t: Track) => Band): RankedGap[] {
  return domains
    .map((d): RankedGap => {
      const band = bandOf(d.track);
      return { track: d.track, score: d.score, band, confidence: d.confidence, gapScore: (1 - d.score) * SENIOR_WEIGHT[band] };
    })
    .sort((a, b) => b.gapScore - a.gapScore || String(a.track).localeCompare(String(b.track)));
}

// Within one track: recommend the first not-fully-opened unit (by order) whose
// prereqs are satisfied; if a unit is blocked by an unmet prereq, recommend the
// prereq instead. Cross-track sequencing is rankGaps's job, not this function's.
export function recommendNextUnit(
  track: Track,
  opened: string[],
  units: UnitLite[],
  prereqsOf: (unitId: string) => string[],
): UnitRec | null {
  const openedSet = new Set(opened);
  const byId = new Map(units.map((u) => [u.id, u]));
  const fullyOpened = (u: UnitLite): boolean => u.lessons.every((l) => openedSet.has(l));
  const sorted = [...units].sort((a, b) => a.order - b.order);
  const target = sorted.find((u) => !fullyOpened(u));
  if (!target) return null;

  const resolve = (u: UnitLite, seen: Set<string>): UnitLite => {
    if (seen.has(u.id)) return u;
    seen.add(u.id);
    for (const id of prereqsOf(u.id)) {
      const pu = byId.get(id);
      if (pu && !fullyOpened(pu)) return resolve(pu, seen);
    }
    return u;
  };
  const chosen = resolve(target, new Set());
  const lessonSlug = chosen.lessons.find((l) => !openedSet.has(l)) ?? chosen.lessons[0];
  return { track, unit: chosen.slug, lessonSlug };
}
