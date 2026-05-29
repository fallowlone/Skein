import type { Locale } from "~/i18n";

export default function StreakChip({ count, best, lang }: { count: number; best: number; lang: Locale }) {
  return (
    <span class="inline-flex items-center gap-1.5 text-[12px] font-mono">
      <span aria-hidden="true">🔥</span> {count} {lang === "ru" ? "дн." : "d"} <span class="text-muted">· best {best}</span>
    </span>
  );
}
