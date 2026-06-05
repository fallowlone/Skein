// site/src/components/progression/DueToday.tsx
// Tiny profile widget: how many review cards are due now, linking to /[lang]/review.
// Renders nothing when the queue is empty.
import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { dueCount } from "~/scripts/review-state";

export default function DueToday({ lang }: { lang: Locale }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(dueCount(Date.now()));
  }, []);

  if (count === null || count === 0) return null;

  return (
    <a
      href={`/${lang}/review`}
      class="inline-flex items-center gap-2 bg-card-2 border-l-2 border-accent px-4 py-2 text-sm text-ink no-underline hover:border-ink transition-colors"
    >
      <strong class="tabular-nums">{count}</strong>
      <span class="text-muted">{t("review.dueCount", lang)}</span>
      <span aria-hidden="true">→</span>
    </a>
  );
}
