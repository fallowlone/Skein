// site/src/scripts/progression/domain-ratings.ts
//
// Per-domain competence (0..100), aggregated from the path-engine knowledge over the
// 8 DOMAIN_FAMILIES. An honest substitute for a per-domain Elo: the progression engine
// has a single global rating, so the radar plots mastery-derived competence by domain.
// Pure — no I/O, no Date.now().
import type { Concept, KnowledgeState } from "~/scripts/path/types";
import { masteryOf } from "~/scripts/path/knowledge";
import { DOMAIN_FAMILIES } from "~/scripts/path/mastery-field";

const FAMILY_OF: Map<string, (typeof DOMAIN_FAMILIES)[number]> = (() => {
  const m = new Map<string, (typeof DOMAIN_FAMILIES)[number]>();
  for (const f of DOMAIN_FAMILIES) for (const t of f.tracks) m.set(t, f);
  return m;
})();

export interface DomainRating {
  key: string;
  label: { en: string; ru: string };
  hue: string;
  score: number; // 0..100, average concept confidence in the family
  known: number;
  total: number;
}

export function domainRatings(state: KnowledgeState, concepts: Concept[], threshold: number): DomainRating[] {
  const acc = new Map<string, { fam: (typeof DOMAIN_FAMILIES)[number]; known: number; total: number; sum: number }>();
  for (const c of concepts) {
    const fam = FAMILY_OF.get(c.track);
    if (!fam) continue;
    let a = acc.get(fam.key);
    if (!a) { a = { fam, known: 0, total: 0, sum: 0 }; acc.set(fam.key, a); }
    const conf = masteryOf(state, c.id);
    a.total++; a.sum += conf;
    if (conf >= threshold) a.known++;
  }
  return DOMAIN_FAMILIES
    .map((f) => acc.get(f.key))
    .filter((a): a is NonNullable<typeof a> => !!a && a.total > 0)
    .map((a) => ({ key: a.fam.key, label: a.fam.label, hue: a.fam.hue, score: Math.round((a.sum / a.total) * 100), known: a.known, total: a.total }));
}

export function weakestDomain(rs: DomainRating[]): DomainRating | null {
  const gaps = rs.filter((r) => r.known < r.total);
  if (!gaps.length) return null;
  return gaps.reduce((lo, r) => (r.score < lo.score ? r : lo));
}
export function strongestDomain(rs: DomainRating[]): DomainRating | null {
  return rs.length ? rs.reduce((hi, r) => (r.score > hi.score ? r : hi)) : null;
}
