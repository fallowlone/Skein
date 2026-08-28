import type { Track } from "./types";
import type { MarketDemandScore, MarketDemandSnapshot } from "./market-demand";

export interface JobPosting {
  source: string;
  id: string;
  title: string;
  description: string;
  publishedAt?: string;
}

export interface SkillDefinition {
  id: string;
  aliases: string[];
  tracks: Track[];
  concepts: string[];
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function aliasPattern(alias: string): RegExp {
  const escaped = escapeRegExp(alias).replace(/\\ /g, "[\\s-]+");
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}(?=$|[^a-z0-9+#.])`, "i");
}

function confidence(mentions: number, sourceCount: number): number {
  return Math.round(Math.min(1, mentions / 20) * Math.min(1, sourceCount / 2) * 1000) / 1000;
}

export function buildMarketDemandSnapshot(
  jobs: JobPosting[],
  skills: SkillDefinition[],
  generatedAt: string,
  windowDays = 30,
): MarketDemandSnapshot {
  const now = Date.parse(generatedAt);
  if (!Number.isFinite(now)) throw new Error("market demand: generatedAt must be an ISO date");
  const cutoff = now - windowDays * 86_400_000;
  const seen = new Set<string>();
  const current = jobs.filter((job) => {
    const key = `${job.source}:${job.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (!job.publishedAt) return true;
    const timestamp = Date.parse(job.publishedAt);
    return Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= now + 86_400_000;
  });

  const skillStats = new Map<string, { mentions: number; sources: Set<string>; definition: SkillDefinition }>();
  const trackStats = new Map<Track, { mentions: number; sources: Set<string> }>();

  for (const skill of skills) {
    const patterns = skill.aliases.map(aliasPattern);
    const matches = current.filter((job) => {
      const text = `${job.title}\n${job.description}`;
      return patterns.some((pattern) => pattern.test(text));
    });
    if (!matches.length) continue;
    const sources = new Set(matches.map((job) => job.source));
    skillStats.set(skill.id, { mentions: matches.length, sources, definition: skill });
    for (const track of skill.tracks) {
      const stat = trackStats.get(track) ?? { mentions: 0, sources: new Set<string>() };
      stat.mentions += matches.length;
      for (const source of sources) stat.sources.add(source);
      trackStats.set(track, stat);
    }
  }

  const maxSkillMentions = Math.max(1, ...[...skillStats.values()].map((stat) => stat.mentions));
  const maxTrackMentions = Math.max(1, ...[...trackStats.values()].map((stat) => stat.mentions));
  const concepts: Record<string, MarketDemandScore> = {};
  for (const { mentions, sources, definition } of skillStats.values()) {
    const value = {
      score: Math.round((mentions / maxSkillMentions) * 1000) / 1000,
      mentions,
      confidence: confidence(mentions, sources.size),
    };
    for (const concept of definition.concepts) {
      const previous = concepts[concept];
      if (!previous || value.score * value.confidence > previous.score * previous.confidence) concepts[concept] = value;
    }
  }

  const tracks: MarketDemandSnapshot["tracks"] = {};
  for (const [track, stat] of trackStats) {
    tracks[track] = {
      score: Math.round((stat.mentions / maxTrackMentions) * 1000) / 1000,
      mentions: stat.mentions,
      confidence: confidence(stat.mentions, stat.sources.size),
    };
  }

  const sourceJobs = new Map<string, number>();
  for (const job of current) sourceJobs.set(job.source, (sourceJobs.get(job.source) ?? 0) + 1);
  return {
    schemaVersion: 1,
    generatedAt: new Date(now).toISOString(),
    windowDays,
    sampleSize: current.length,
    sources: [...sourceJobs].sort(([a], [b]) => a.localeCompare(b)).map(([id, count]) => ({ id, label: id, jobs: count })),
    tracks,
    concepts,
  };
}
