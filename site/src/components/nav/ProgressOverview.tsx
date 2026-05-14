import { userState } from "~/scripts/user-state";
import { type Locale } from "~/i18n";

type Props = {
  lang: Locale;
  totalPieces: number;       // 256 = 16 chapters × 8 pieces × 2 langs
  readyPieces: number;       // counted at build time across both langs
  totalPillars: number;      // 16
  readyPillars: number;      // pillars where every piece is "ready" in both langs
};

export default function ProgressOverview({
  lang,
  totalPieces,
  readyPieces,
  totalPillars,
  readyPillars,
}: Props) {
  const tier = userState.value.tier;
  const visited = Object.keys(userState.value.history).length;

  const heading = lang === "en" ? "Progress" : "Прогресс";
  const piecesLabel = lang === "en" ? "pieces shipped" : "пьес готово";
  const pillarsLabel = lang === "en" ? "pillars finished" : "столпов закрыто";
  const tierLabel = lang === "en" ? "default tier" : "тир по умолчанию";
  const visitedLabel = lang === "en" ? "pieces you've opened" : "пьес ты открыл";

  return (
    <section class="my-8">
      <div class="flex items-baseline justify-between mb-4">
        <h3 class="font-display text-[18px] font-bold m-0 text-ink">{heading}</h3>
        <span class="meta">overall</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 border border-rule-strong bg-card">
        {[
          { big: `${readyPieces} / ${totalPieces}`, sub: piecesLabel },
          { big: `${readyPillars} / ${totalPillars}`, sub: pillarsLabel },
          { big: tier, sub: tierLabel },
          { big: String(visited), sub: visitedLabel },
        ].map((cell, i) => (
          <div
            key={i}
            class={`px-4 py-3.5 ${i < 3 ? "sm:border-r border-rule" : ""} ${i < 2 ? "border-b border-rule sm:border-b-0" : ""}`}
          >
            <div class="font-display text-[22px] font-bold tracking-[-0.02em] leading-none text-ink">
              {cell.big}
            </div>
            <div class="font-mono text-[10.5px] text-muted mt-1.5">{cell.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
