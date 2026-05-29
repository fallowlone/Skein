import type { UserState } from "../user-state";

export interface TitleDef { id: string; pillar: string; label: { en: string; ru: string }; }

export const TITLES: TitleDef[] = [
  { id: "index-surgeon", pillar: "databases", label: { en: "Index Surgeon", ru: "Хирург индексов" } },
  { id: "packet-whisperer", pillar: "networking", label: { en: "Packet Whisperer", ru: "Заклинатель пакетов" } },
  { id: "concurrency-wrangler", pillar: "distributed", label: { en: "Concurrency Wrangler", ru: "Укротитель конкурентности" } },
  { id: "cache-alchemist", pillar: "caching", label: { en: "Cache Alchemist", ru: "Алхимик кэша" } },
  { id: "latency-hunter", pillar: "performance", label: { en: "Latency Hunter", ru: "Охотник за латентностью" } },
  { id: "shield-bearer", pillar: "security", label: { en: "Shield Bearer", ru: "Щитоносец" } },
];

export function titlesFromState(s: Pick<UserState, "history">): string[] {
  const counts: Record<string, number> = {};
  for (const key of Object.keys(s.history ?? {})) {
    const pillar = key.split("/")[0];
    counts[pillar] = (counts[pillar] ?? 0) + 1;
  }
  return TITLES.filter((tt) => (counts[tt.pillar] ?? 0) >= 3).map((tt) => tt.id);
}
