import { userState } from "~/scripts/user-state";
import type { Locale } from "~/i18n";

type Piece = {
  slug: string;
  title: string;
  readingMin: number;
  spiral: string[];
  status: string;
};

type Props = {
  pieces: Piece[];
  pillarSlug: string;
  lang: Locale;
  currentPiece?: string;
};

const statusBadgeClass: Record<string, string> = {
  ready: "ok",
  draft: "warn",
  stub:  "muted",
};

export default function ChapterSidebarTOC({
  pieces,
  pillarSlug,
  lang,
  currentPiece,
}: Props) {
  const history = userState.value.history;

  return (
    <ol class="list-none m-0 p-0 border-t border-rule">
      {pieces.map((p, idx) => {
        const h = history[p.slug];
        const tiersOpened = new Set(h?.tiersOpened ?? []);
        const current = p.slug === currentPiece;
        return (
          <li
            key={p.slug}
            class={`border-b border-rule ${current ? "bg-card-2" : ""}`}
          >
            <a
              href={`/${lang}/${pillarSlug}/${p.slug}/`}
              class="flex items-start gap-2.5 px-2 py-2.5 hover:bg-card-2 transition-colors"
            >
              <span class="font-mono text-[10.5px] text-muted tabular-nums shrink-0 mt-[2px]">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div class="flex-1 min-w-0">
                <div
                  class={`text-[13px] leading-snug truncate ${current ? "font-semibold text-ink" : "text-ink-2"}`}
                >
                  {p.title}
                </div>
                <div class="flex items-center gap-2 mt-1.5">
                  <div class="flex items-center gap-[3px]" aria-label="tier progress">
                    {(["junior", "middle", "senior"] as const).map((t) => (
                      <span
                        key={t}
                        class="w-1.5 h-1.5 rounded-[1px]"
                        style={{
                          background: tiersOpened.has(t) ? "var(--ok)" : "var(--rule)",
                        }}
                        title={t}
                      />
                    ))}
                  </div>
                  <span class={`badge ${statusBadgeClass[p.status] ?? "muted"}`}>
                    {p.status}
                  </span>
                  <span class="font-mono text-[10px] text-muted-2 ml-auto">
                    {p.readingMin}m
                  </span>
                </div>
              </div>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
