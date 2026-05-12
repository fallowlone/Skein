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

export default function ChapterSidebarTOC({
  pieces,
  pillarSlug,
  lang,
  currentPiece,
}: Props) {
  const history = userState.value.history;

  return (
    <ol class="space-y-1.5 list-none">
      {pieces.map((p) => {
        const visited = !!history[p.slug];
        const current = p.slug === currentPiece;
        return (
          <li key={p.slug}>
            <a
              href={`/${lang}/${pillarSlug}/${p.slug}/`}
              class={`flex items-center gap-2 px-2 py-1 rounded ${
                current ? "bg-bbg-teal/15 font-semibold" : ""
              }`}
            >
              <span
                class={`inline-block w-3 ${visited ? "text-bbg-success" : "text-gray-300"}`}
              >
                {visited ? "✓" : "•"}
              </span>
              <span class="flex-1">{p.title}</span>
              <span class="text-[10px] text-bbg-muted">{p.readingMin}m</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
