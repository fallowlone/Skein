import type { RankDef, RankId } from "./types";

type Tri = [number, number, number, number];
function tier(name: string, ct: RankDef["contentTier"], icon: string, color: string, edges: Tri,
  labels: { en: string; ru: string }): RankDef[] {
  const [a, b, c, d] = edges;
  const mk = (div: 3 | 2 | 1, min: number, max: number): RankDef => ({
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-${div}`,
    tier: name, division: div, min, max, contentTier: ct, icon, color,
    label: { en: `${labels.en} ${roman(div)}`, ru: `${labels.ru} ${roman(div)}` },
  });
  return [mk(3, a, b), mk(2, b, c), mk(1, c, d)];
}
function roman(d: number): string { return d === 1 ? "I" : d === 2 ? "II" : "III"; }

export const RANKS: RankDef[] = [
  ...tier("Initiate", "junior", "🌱", "#8a8f9c", [0, 42, 84, 125], { en: "Initiate", ru: "Initiate" }),
  ...tier("Apprentice", "junior", "🔧", "#7c9aa6", [125, 177, 228, 280], { en: "Apprentice", ru: "Apprentice" }),
  ...tier("Practitioner", "junior", "⚙️", "#6fae8f", [280, 337, 394, 450], { en: "Practitioner", ru: "Practitioner" }),
  ...tier("Engineer", "middle", "🛠️", "#6aa3d6", [450, 500, 550, 600], { en: "Engineer", ru: "Engineer" }),
  ...tier("Senior Engineer", "middle", "📐", "#5c8ad6", [600, 650, 700, 750], { en: "Senior Engineer", ru: "Senior Engineer" }),
  ...tier("Staff", "senior", "🧭", "#9a7cd6", [750, 780, 810, 840], { en: "Staff", ru: "Staff" }),
  ...tier("Principal", "senior", "🔭", "#c07cd6", [840, 870, 900, 930], { en: "Principal", ru: "Principal" }),
  ...tier("Architect", "senior", "🏛️", "#d6a25c", [930, 950, 970, 990], { en: "Architect", ru: "Architect" }),
  { id: "distinguished", tier: "Distinguished", division: null, min: 990, max: 1000, contentTier: "senior", icon: "👑", color: "#d6c15c", label: { en: "Distinguished", ru: "Distinguished" } },
];

// Market-level annotations on a few anchor ranks — what each milestone means relative to
// real hiring bars. Kept as a small id→label map so the tier() generator stays untouched.
const MARKET: Record<string, { en: string; ru: string }> = {
  "apprentice-1": { en: "≈ junior baseline", ru: "≈ база джуна" },
  "engineer-2": { en: "≈ ready for middle interviews", ru: "≈ готов к собеседованиям на middle" },
  "senior-engineer-1": { en: "≈ the senior bar", ru: "≈ планка senior" },
  "principal-1": { en: "≈ staff / principal scope", ru: "≈ уровень staff / principal" },
};
for (const r of RANKS) {
  const m = MARKET[r.id];
  if (m) r.market = m;
}

export function ratingToRank(rating: number): RankDef {
  const r = Math.max(0, Math.min(1000, rating));
  for (const rank of RANKS) {
    if (r >= rank.min && (r < rank.max || (rank.division === null && r <= rank.max))) return rank;
  }
  return RANKS[RANKS.length - 1];
}
export function nextRank(rank: RankDef): RankDef | null {
  const i = RANKS.findIndex((r) => r.id === rank.id);
  return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null;
}
export function rankById(id: RankId): RankDef {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}
