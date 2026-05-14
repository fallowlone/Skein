import { userState } from "~/scripts/user-state";
import { type Locale } from "~/i18n";

type PieceMeta = {
  pillar: string;
  pillarColor: "lilac" | "mint" | "peach" | "sky" | "rose";
  chapter: string;
  chapterTitle: string;
  title: string;
};

type Props = {
  lang: Locale;
  pieceMap: Record<string, PieceMeta>;
};

const pillarColor: Record<string, string> = {
  lilac: "var(--p-lilac)",
  mint:  "var(--p-mint)",
  peach: "var(--p-peach)",
  sky:   "var(--p-sky)",
  rose:  "var(--p-rose)",
};

export default function ContinueLearning({ lang, pieceMap }: Props) {
  const history = userState.value.history;
  const entries = Object.entries(history)
    .filter(([slug]) => pieceMap[slug])
    .sort(([, a], [, b]) => b.lastAt - a.lastAt)
    .slice(0, 3);

  const heading = lang === "en" ? "Where you are" : "Где ты сейчас";
  const empty = entries.length === 0;

  return (
    <section class="my-8">
      <div class="flex items-baseline justify-between mb-4">
        <h3 class="font-display text-[18px] font-bold m-0 text-ink">{heading}</h3>
        <span class="meta">
          {empty
            ? lang === "en" ? "nothing yet" : "пока пусто"
            : `${entries.length} active`}
        </span>
      </div>

      {empty ? (
        <div class="px-5 py-7 border border-dashed border-rule-strong bg-card rounded-[2px] flex flex-col gap-2.5 items-start">
          <div class="font-mono text-[11px] text-muted">// empty state</div>
          <div class="text-[14px] text-ink-2 leading-relaxed">
            {lang === "en"
              ? "You haven't opened a piece yet. Start anywhere — we'll remember the spot."
              : "Ты ещё ничего не открывал. Начни с любой пьесы — мы запомним место."}
          </div>
          <a class="btn ghost text-[12px]" href="#pillar-map">
            {lang === "en" ? "See the pillar map" : "Посмотреть карту столпов"}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      ) : (
        <ul class="flex flex-col">
          {entries.map(([slug, h], i) => {
            const meta = pieceMap[slug];
            const daysAgo = Math.max(
              0,
              Math.floor((Date.now() - h.lastAt) / (1000 * 60 * 60 * 24)),
            );
            const tier = h.tiersOpened[h.tiersOpened.length - 1] ?? "middle";
            const context =
              daysAgo === 0
                ? lang === "en"
                  ? "today"
                  : "сегодня"
                : daysAgo === 1
                  ? lang === "en" ? "yesterday" : "вчера"
                  : `${daysAgo}${lang === "en" ? "d ago" : " дн назад"}`;
            return (
              <li>
                <a
                  href={`/${lang}/${meta.pillar}/${slug}/`}
                  class={`flex items-stretch bg-card border border-rule-strong hover:bg-card-2 transition-colors ${i > 0 ? "border-t-0" : ""}`}
                >
                  <span
                    class="w-[3px] shrink-0"
                    style={`background:${pillarColor[meta.pillarColor]};`}
                  />
                  <div class="flex-1 px-4 py-3 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <span class="meta" style="color: var(--ink-2);">
                        {lang === "en" ? "continue" : "продолжить"}
                      </span>
                      <span class="meta-lc">·</span>
                      <span class="font-mono text-[10.5px] text-muted truncate">
                        {meta.pillar} · {meta.chapterTitle}
                      </span>
                    </div>
                    <div class="font-display text-[16px] font-semibold leading-snug text-ink truncate">
                      {meta.title}
                    </div>
                    <div class="font-mono text-[10.5px] text-muted mt-1">
                      {context} · tier <span class="text-ink-2">{tier}</span>
                    </div>
                  </div>
                  <div class="flex items-center px-4 border-l border-rule text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
