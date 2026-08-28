import type { Track, UnitConcepts } from "./types";

export const MARKET_SIGNAL_MAX_AGE_DAYS = 45;
export const MARKET_SIGNAL_MAX_BOOST = 0.25;

export interface MarketDemandSource {
  id: string;
  label: string;
  jobs: number;
}

export interface MarketDemandScore {
  score: number;
  mentions: number;
  confidence: number;
}

export interface MarketDemandSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  windowDays: number;
  sampleSize: number;
  sources: MarketDemandSource[];
  tracks: Partial<Record<Track, MarketDemandScore>>;
  concepts: Record<string, MarketDemandScore>;
}

function finite01(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0;
}

export function isMarketSnapshotFresh(
  snapshot: MarketDemandSnapshot | undefined,
  now: number,
  maxAgeDays = MARKET_SIGNAL_MAX_AGE_DAYS,
): boolean {
  if (!snapshot || snapshot.schemaVersion !== 1 || snapshot.sampleSize < 1) return false;
  const generatedAt = Date.parse(snapshot.generatedAt);
  if (!Number.isFinite(generatedAt)) return false;
  const ageMs = now - generatedAt;
  return ageMs >= -86_400_000 && ageMs <= maxAgeDays * 86_400_000;
}

/**
 * Market demand is deliberately a weak ranking signal: it may reorder only units whose
 * prerequisites are already satisfied. Goals, mastery, and the concept DAG remain authoritative.
 */
export function marketFactorForUnit(
  unit: UnitConcepts,
  snapshot: MarketDemandSnapshot | undefined,
  now: number,
): number {
  if (!isMarketSnapshotFresh(snapshot, now)) return 1;

  const track = snapshot!.tracks[unit.track];
  const trackSignal = finite01(track?.score) * finite01(track?.confidence);
  let conceptSignal = 0;
  for (const concept of unit.teaches) {
    const signal = snapshot!.concepts[concept];
    conceptSignal = Math.max(conceptSignal, finite01(signal?.score) * finite01(signal?.confidence));
  }

  // Concept evidence is more precise than track-level evidence. The cap prevents a noisy job
  // board sample from overwhelming the learner's declared goal or prerequisite ordering.
  const relevance = Math.max(trackSignal * 0.6, conceptSignal);
  return 1 + MARKET_SIGNAL_MAX_BOOST * relevance;
}
