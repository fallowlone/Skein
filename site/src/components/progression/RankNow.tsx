// src/components/progression/RankNow.tsx
// Current-rank seal for the Progression screen. Pure presentational over real engine data:
// the placed pretest's rank/rating, the 25-rank ladder position, and the next rank's floor.
// The seal arc is an SVG stroke (no inline-span width); rating shown as-is (0..1000).
import type { Locale } from "~/i18n";
import { rankById, nextRank } from "~/scripts/progression/ranks";
import { rankPosition } from "~/scripts/progression/ladder";

const L = {
  en: {
    rating: "rating",
    pos: (i: number, total: number, top: number) => `rank ${i} of ${total} · top ${top}%`,
    to: (gap: number, label: string) => `+${gap} to ${label}`,
    apex: "Apex rank reached",
    band: { junior: "foundations", middle: "intermediate", senior: "senior" },
    conf: { high: "high confidence", medium: "medium confidence" },
  },
  ru: {
    rating: "рейтинг",
    pos: (i: number, total: number, top: number) => `ранг ${i} из ${total} · топ ${top}%`,
    to: (gap: number, label: string) => `+${gap} до ${label}`,
    apex: "Апекс-ранг достигнут",
    band: { junior: "основы", middle: "средний", senior: "senior" },
    conf: { high: "высокая уверенность", medium: "средняя уверенность" },
  },
} as const;

export default function RankNow({
  lang, rank: rankId, rating, confidence,
}: { lang: Locale; rank: string; rating: number; confidence: "high" | "medium" }) {
  const t = L[lang];
  const rank = rankById(rankId);
  const nxt = nextRank(rank);
  const { index, total, topPct } = rankPosition(rank);

  // Seal arc: fraction of the 25-rank ladder climbed, drawn as a stroked SVG circle.
  const R = 40;
  const C = 2 * Math.PI * R;
  const climbed = index / total;
  const dashOffset = C * (1 - climbed);

  return (
    <div class="rank-now panel">
      <div class="rank-hero">
        <div class="rank-seal">
          <svg viewBox="0 0 88 88" fill="none" aria-hidden="true">
            <circle cx="44" cy="44" r={R} stroke="color-mix(in srgb,var(--ink) 12%,transparent)" stroke-width="2" />
            <circle
              cx="44" cy="44" r={R} stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"
              transform="rotate(-90 44 44)"
              style={`stroke-dasharray:${C.toFixed(2)};stroke-dashoffset:${dashOffset.toFixed(2)}`}
            />
          </svg>
          <span class="rs-icon" aria-hidden="true">{rank.icon}</span>
        </div>
        <div class="rank-meta">
          <div class="rm-tier" style={`color:${rank.color}`}>{rank.label[lang]}</div>
          <div class="rm-pos">{t.pos(index, total, topPct)}</div>
          <div class="rm-band">{t.band[rank.contentTier]} · {t.conf[confidence]}</div>
        </div>
      </div>
      <div class="rank-rating">
        <span class="rr-num">{rating}</span>
        <span class="rr-lbl">{t.rating} / 1000</span>
      </div>
      <div class="rank-next">
        {nxt ? <>{t.to(Math.max(0, nxt.min - rating), nxt.label[lang])}</> : t.apex}
      </div>
    </div>
  );
}
