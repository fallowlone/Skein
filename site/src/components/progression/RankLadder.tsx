// src/components/progression/RankLadder.tsx
// The 25-rank ladder (ranks.ts via ladderRows). Windowed around the current rank so
// neighbors are always visible, with an ellipsis row for the condensed span. Each row
// shows the rank ordinal, tier+division label, band, and rating floor; current is marked.
import type { Locale } from "~/i18n";
import { ladderRows } from "~/scripts/progression/ladder";

const WINDOW = 4; // rows kept on each side of current (plus head + apex anchors)

const L = {
  en: {
    head: "The ladder · 25 ranks", note: "foundations → senior",
    you: "you", floor: "from",
    band: { junior: "foundations", middle: "intermediate", senior: "senior" },
    more: (n: number) => `+${n} more`,
    whatSenior: "What does senior mean?",
  },
  ru: {
    head: "Лестница · 25 рангов", note: "основы → senior",
    you: "ты", floor: "от",
    band: { junior: "основы", middle: "средний", senior: "senior" },
    more: (n: number) => `ещё +${n}`,
    whatSenior: "Что значит senior?",
  },
} as const;

export default function RankLadder({ lang, rating }: { lang: Locale; rating: number }) {
  const t = L[lang];
  const rows = ladderRows(rating);
  const total = rows.length;
  const curIdx = Math.max(0, rows.findIndex((r) => r.current));

  // Indices to render: the apex + head anchors and a window around current.
  const keep = new Set<number>();
  keep.add(0);
  keep.add(total - 1);
  for (let i = curIdx - WINDOW; i <= curIdx + WINDOW; i++) {
    if (i >= 0 && i < total) keep.add(i);
  }
  const shown = [...keep].sort((a, b) => a - b);

  return (
    <div class="panel">
      <div class="panel-head">
        <span class="ph-label">{t.head}</span>
        <a class="ph-note lad-what" href={`/${lang}/about#what-senior-means`}>{t.whatSenior}</a>
      </div>
      <div class="ladder">
        {shown.flatMap((i, n) => {
          const row = rows[i];
          const gap = n > 0 && shown[n - 1] !== i - 1 ? i - shown[n - 1] - 1 : 0;
          const cls = ["lad-row"];
          if (row.current) cls.push("current");
          else if (!row.reached) cls.push("future");
          // flatMap + per-element keys: keys on a Fragment are dropped by Preact, so the
          // gap row and the rank row are returned as separate keyed siblings of .ladder.
          const els = [] as any[];
          if (gap > 0) {
            els.push(<div key={`gap-${i}`} class="lad-gap" aria-hidden="true"><span>{t.more(gap)}</span></div>);
          }
          els.push(
            <div key={`row-${i}`} class={cls.join(" ")} aria-current={row.current ? "true" : undefined}>
              <div class="lr-rank">{i + 1}</div>
              <div class="lr-tier">
                {row.rank.label[lang]}
                {row.rank.market && <span class="lr-market">{row.rank.market[lang]}</span>}
              </div>
              <div class="lr-band">{t.band[row.rank.contentTier]}</div>
              <div class="lr-rating">
                {row.current
                  ? <span class="here">{t.you} · {rating}</span>
                  : <>{t.floor} {row.rank.min}</>}
              </div>
            </div>,
          );
          return els;
        })}
      </div>
    </div>
  );
}
