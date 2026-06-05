// site/src/components/pedagogy/ReviewSession.tsx
// The "due today" spaced-repetition island: snapshots the due queue at mount,
// walks one card at a time, reveals the answer, and grades again|hard|good|easy,
// writing the next interval back via the SM-2 store. Pure client state (no SSR).
import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { dueBefore, recordReview, allCards, type Card } from "~/scripts/review-state";
import { recordActiveDay } from "~/scripts/user-state";
import type { Grade } from "~/scripts/progression/srs";

const GRADES: Grade[] = ["again", "hard", "good", "easy"];
const GRADE_CLS: Record<Grade, string> = {
  again: "border-rule-strong text-danger hover:border-danger",
  hard: "border-rule-strong text-muted hover:border-ink",
  good: "border-rule-strong text-ink hover:border-ink",
  easy: "border-rule-strong text-ok hover:border-ok",
};

function nextDueLabel(lang: Locale): string {
  const now = Date.now();
  const future = allCards()
    .map((c) => c.dueAt)
    .filter((d) => d > now)
    .sort((a, b) => a - b);
  if (future.length === 0) return "";
  const days = Math.max(1, Math.round((future[0] - now) / 86_400_000));
  return lang === "ru" ? `через ~${days} дн.` : `in ~${days}d`;
}

export default function ReviewSession({ lang }: { lang: Locale }) {
  const [queue, setQueue] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  // Snapshot the due list once at mount — cards graded this session must not
  // pop back in immediately.
  useEffect(() => {
    setQueue(dueBefore(Date.now()));
  }, []);

  const card = queue[idx];

  function grade(g: Grade) {
    if (!card) return;
    if (reviewed === 0) recordActiveDay(); // review feeds the existing streak
    recordReview(card.cardKey, g);
    setReviewed((n) => n + 1);
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  if (queue.length === 0) {
    return (
      <section class="my-10">
        <div class="meta mb-2">{t("review.title", lang)}</div>
        <p class="text-muted text-sm">{t("review.empty", lang)}</p>
      </section>
    );
  }

  if (idx >= queue.length) {
    const next = nextDueLabel(lang);
    return (
      <section class="my-10">
        <div class="meta mb-2">{t("review.title", lang)}</div>
        <p class="text-ink text-sm mb-1">
          {t("review.done", lang)} — {reviewed}
        </p>
        {next && <p class="text-muted text-xs">{t("review.nextDue", lang)}: {next}</p>}
      </section>
    );
  }

  return (
    <section class="my-10 hr-top hr-bot py-6">
      <header class="flex items-center justify-between mb-5">
        <span class="meta">{t("review.title", lang)}</span>
        <span class="font-mono text-[11px] text-muted tabular-nums">
          {idx + 1} {t("review.cardOf", lang)} {queue.length}
        </span>
      </header>

      <div class="font-display text-[17px] font-semibold leading-snug text-ink mb-4">{card.front}</div>

      {!revealed ? (
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]" onClick={() => setRevealed(true)}>
          {t("review.showAnswer", lang)}
        </button>
      ) : (
        <>
          <div class="pl-3 border-l-2 border-accent text-[13.5px] leading-relaxed text-ink-2 mb-5">
            <div class="meta mb-1.5" style="color: var(--accent);">answer</div>
            {card.back}
          </div>
          <div class="flex items-center gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => grade(g)}
                class={`px-3 h-8 font-mono text-[11px] border rounded-[1px] bg-transparent transition-colors ${GRADE_CLS[g]}`}
              >
                {t(`review.${g}`, lang)}
              </button>
            ))}
          </div>
        </>
      )}

      <footer class="mt-6 pt-4 hr-top">
        <span class="font-mono text-[10px] text-muted uppercase tracking-wide">{card.lessonKey}</span>
      </footer>
    </section>
  );
}
