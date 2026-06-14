// site/src/scripts/path/mastery-field.ts
//
// Pure read-model for the Planning screen's concept-mastery map (signature instrument).
// Groups every concept into 8 deterministic domain families, each concept tagged
// known / shaky / unknown against the config mastery threshold. No I/O, no Date.now().
import type { Concept, KnowledgeState, Track } from "./types";
import { masteryOf } from "./knowledge";

export type CState = "known" | "shaky" | "unknown";

export interface DomainFamily {
  key: string;
  label: { en: string; ru: string };
  hue: string; // a live --d-* domain token
  tracks: Track[];
}

// Deterministic 8-family grouping of every track in TRACKS. Hues reuse the live
// --d-* domain tokens (global.css). The exhaustiveness test asserts every track
// is mapped exactly once — adding a track without updating this map fails CI.
export const DOMAIN_FAMILIES: DomainFamily[] = [
  { key: "foundations", label: { en: "Foundations", ru: "Основы" }, hue: "--d-hardware",
    tracks: ["math", "base-cs", "algorithms", "logic"] as Track[] },
  { key: "frontend", label: { en: "Frontend · runtime", ru: "Фронтенд · рантайм" }, hue: "--d-frontend",
    tracks: ["browser", "frontend", "typescript", "js-engine", "react", "nextjs"] as Track[] },
  { key: "backend", label: { en: "Backend · APIs", ru: "Бэкенд · API" }, hue: "--d-backend",
    tracks: ["backend", "apis", "node", "nest", "python", "go"] as Track[] },
  { key: "data", label: { en: "Databases · data", ru: "Базы · данные" }, hue: "--d-data",
    tracks: ["databases", "sql-postgres", "caching", "data-engineering"] as Track[] },
  { key: "distributed", label: { en: "Distributed · design", ru: "Распределённые · дизайн" }, hue: "--d-systems",
    tracks: ["distributed", "queues", "system-design", "system-design-cases"] as Track[] },
  { key: "network-sec", label: { en: "Networking · security", ru: "Сети · безопасность" }, hue: "--d-network",
    tracks: ["networking", "security", "security-foundations", "security-offensive", "security-defensive", "security-cloud"] as Track[] },
  { key: "infra", label: { en: "Infra · operations", ru: "Инфра · эксплуатация" }, hue: "--d-crypto",
    tracks: ["deployment", "aws", "ci-cd", "docker", "observability", "performance", "engineering-practice"] as Track[] },
  { key: "ai", label: { en: "AI · LLMs", ru: "AI · LLM" }, hue: "--d-ai",
    tracks: ["ai-llm"] as Track[] },
];

export const FAMILY_OF: Map<string, DomainFamily> = (() => {
  const m = new Map<string, DomainFamily>();
  for (const f of DOMAIN_FAMILIES) for (const t of f.tracks) m.set(t, f);
  return m;
})();

export function conceptState(confidence: number, threshold: number): CState {
  if (confidence >= threshold) return "known";
  if (confidence > 0) return "shaky";
  return "unknown";
}

export interface FieldNode { id: string; label: string; state: CState; }
export interface FamilyField {
  key: string; label: { en: string; ru: string }; hue: string; tracks: Track[];
  known: number; shaky: number; unknown: number; total: number; nodes: FieldNode[];
}

const RANK: Record<CState, number> = { known: 0, shaky: 1, unknown: 2 };

// Survey of every concept grouped by domain family, each tagged known/shaky/unknown.
// `lang` controls node label locale; nodes ordered known→shaky→unknown (stable within state).
// Families with zero concepts are omitted; family order follows DOMAIN_FAMILIES.
export function masteryField(
  state: KnowledgeState, concepts: Concept[], threshold: number, lang: "en" | "ru" = "en",
): FamilyField[] {
  const acc = new Map<string, FamilyField>();
  for (const c of concepts) {
    const fam = FAMILY_OF.get(c.track);
    if (!fam) continue; // unmapped track (guarded by the exhaustiveness test)
    let ff = acc.get(fam.key);
    if (!ff) {
      ff = { key: fam.key, label: fam.label, hue: fam.hue, tracks: fam.tracks, known: 0, shaky: 0, unknown: 0, total: 0, nodes: [] };
      acc.set(fam.key, ff);
    }
    const s = conceptState(masteryOf(state, c.id), threshold);
    ff[s]++; ff.total++;
    ff.nodes.push({ id: c.id, label: c.label[lang], state: s });
  }
  const out = DOMAIN_FAMILIES.map((f) => acc.get(f.key)).filter((x): x is FamilyField => !!x && x.total > 0);
  for (const ff of out) ff.nodes.sort((a, b) => RANK[a.state] - RANK[b.state]);
  return out;
}

function pickByState(field: FamilyField[], st: CState, n: number): string[] {
  const out: string[] = [];
  for (const f of field) for (const node of f.nodes) {
    if (node.state === st) out.push(node.label);
    if (out.length >= n) return out;
  }
  return out;
}
export function topGaps(field: FamilyField[], _lang: "en" | "ru", n = 6): string[] { return pickByState(field, "unknown", n); }
export function topShaky(field: FamilyField[], _lang: "en" | "ru", n = 6): string[] { return pickByState(field, "shaky", n); }
