import type { Locale } from "~/i18n";
import RankBadge from "./RankBadge";
import { nextRank, rankById } from "~/scripts/progression/ranks";
import { rankToTier } from "~/scripts/progression/rank-tier";

export default function RankUpReveal({ rating, rankId, confidence, lang }:
  { rating: number; rankId: string; confidence: "high" | "medium"; lang: Locale }) {
  const r = rankById(rankId);
  const nxt = nextRank(r);
  const toNext = nxt ? nxt.min - rating : 0;
  const tier = rankToTier(rankId);
  return (
    <div class="flex flex-col gap-3">
      <div class="text-[11px] font-mono uppercase tracking-wider text-muted">{lang === "ru" ? "твой ранг" : "your rank"}</div>
      <div class="text-[28px]"><RankBadge rankId={rankId} lang={lang} size="lg" /></div>
      <div class="font-mono text-[13px] text-ink-2">
        {lang === "ru" ? "рейтинг" : "rating"} <strong>{rating}</strong> / 1000 · {confidence === "high" ? (lang === "ru" ? "уверенно" : "high confidence") : (lang === "ru" ? "средняя уверенность" : "medium confidence")}
      </div>
      {nxt && (
        <div class="flex flex-col gap-1">
          <div class="h-[6px] bg-rule rounded-full overflow-hidden">
            <div class="h-full bg-ink" style={`width:${Math.round(((rating - r.min) / (r.max - r.min)) * 100)}%`} />
          </div>
          <div class="text-[11px] text-muted font-mono">+{toNext} {lang === "ru" ? "до" : "to"} {nxt.label[lang]}</div>
        </div>
      )}
      <p class="text-[12px] text-muted">{lang === "ru"
        ? `Контентный уровень: ${tier}. Это placement-сигнал и мотивация, не сертификат — контент открыт весь.`
        : `Content tier: ${tier}. A placement signal and a nudge, not a certificate — all content stays open.`}</p>
    </div>
  );
}
