// site/src/components/pedagogy/ReviewSession.tsx
// The "due today" spaced-repetition island: snapshots the due queue at mount,
// walks one card at a time, reveals the answer, and grades again|hard|good|easy,
// writing the next interval back via the SM-2 store. Pure client state (no SSR).
import { useEffect, useRef, useState } from "preact/hooks";
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

// Cap one sitting so a huge backlog doesn't become a fatigue marathon — retention degrades and
// cards get graded carelessly past ~40, corrupting the very ease/interval signal the engine needs.
// Capping only DEFERS the overflow (it stays due); a "continue" button loads the next batch on demand.
const SESSION_CAP = 40;

export default function ReviewSession({ lang }: { lang: Locale }) {
  const [queue, setQueue] = useState<Card[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  // Cards graded in THIS sitting. Excluded from later batches + the "remaining" count so a lapsed
  // ("again", interval 0 → due immediately) card can't re-enter the queue and make Continue loop
  // forever — it resurfaces in a future session like any other due card.
  const gradedThisSession = useRef<Set<string>>(new Set());

  // Snapshot the due list once at mount, capped. Also clear the SSR fallback the page renders while
  // this client:only island boots.
  useEffect(() => {
    document.getElementById("review-fallback")?.remove();
    loadBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadBatch is a hoisted declaration; intentional mount-only fire
  }, []);

  // Due cards not yet touched this sitting — the genuine remaining work, regardless of grade.
  function freshDue(): Card[] {
    return dueBefore(Date.now()).filter((c) => !gradedThisSession.current.has(c.cardKey));
  }

  // (Re)load the next capped batch of untouched due cards. On "continue" this is only the overflow
  // beyond what's already been reviewed this sitting.
  function loadBatch() {
    const due = freshDue();
    setTotalDue(due.length);
    setQueue(due.slice(0, SESSION_CAP));
    setIdx(0);
    setRevealed(false);
  }

  const card = queue[idx];

  function grade(g: Grade) {
    if (!card) return;
    if (reviewed === 0) recordActiveDay(); // review feeds the existing streak
    recordReview(card.cardKey, g);
    gradedThisSession.current.add(card.cardKey);
    setReviewed((n) => n + 1);
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  // Keyboard: Space/Enter reveals the answer; 1–4 grade once revealed. A fast grading loop lifts
  // cards-per-session, which is what spaced repetition actually depends on. Rebinds on state change.
  useEffect(() => {
    if (!card) return; // no listener on the empty / session-complete screens
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      // let a focused control handle its own keys (buttons activate on Space/Enter natively)
      if (tag && /^(input|textarea|select|button)$/i.test(tag)) return;
      if (!revealed) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); setRevealed(true); }
        return;
      }
      const i = ["1", "2", "3", "4"].indexOf(e.key);
      if (i >= 0) { e.preventDefault(); grade(GRADES[i]); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // grade is a hoisted function declaration; its closure over card/reviewed is recaptured on every
    // re-bind because idx+queue are deps, so no stale capture is possible — the disable is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, idx, queue]);

  if (queue.length === 0) {
    return (
      <section class="my-10">
        <div class="meta mb-2">{t("review.title", lang)}</div>
        <p class="text-muted text-sm">{t("review.empty", lang)}</p>
      </section>
    );
  }

  if (idx >= queue.length) {
    const remaining = freshDue().length; // untouched due cards beyond this batch (excludes this sitting's)
    const next = nextDueLabel(lang);
    return (
      <section class="my-10">
        <div class="meta mb-2">{t("review.title", lang)}</div>
        <p class="text-ink text-sm mb-1">
          {t("review.done", lang)} — {reviewed}
        </p>
        {remaining > 0 ? (
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm text-[12px] mt-1" onClick={loadBatch}>
            {t("review.continue", lang).replace("{n}", String(remaining))}
          </button>
        ) : (
          next && <p class="text-muted text-xs">{t("review.nextDue", lang)}: {next}</p>
        )}
      </section>
    );
  }

  const progress = Math.round((idx / queue.length) * 100);

  return (
    <section class="my-10">
      <div class="rounded-[var(--r-lg)] border-[0.5px] border-hairline-2 bg-card shadow-soft p-6 sm:p-7">
        <header class="flex items-center justify-between mb-4">
          <span class="meta">{t("review.title", lang)}</span>
          <span class="font-mono text-[11px] text-muted tabular-nums">
            {idx + 1} {t("review.cardOf", lang)} {queue.length}
            {totalDue > queue.length && <span class="opacity-70"> · {totalDue} {t("review.dueCount", lang)}</span>}
          </span>
        </header>

        <div class="h-[3px] w-full overflow-hidden rounded-full bg-hairline-2 mb-6">
          <div class="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={`width:${progress}%`} />
        </div>

        <div class="font-display text-[19px] sm:text-[21px] font-semibold leading-snug text-ink mb-6">{card.front}</div>

        {!revealed ? (
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]" onClick={() => setRevealed(true)}>
            {t("review.showAnswer", lang)} <span class="opacity-50 font-mono">␣</span>
          </button>
        ) : (
          <>
            <div class="rounded-[var(--r-md)] border-l-2 border-accent bg-paper-2 pl-4 pr-3 py-3 text-[14px] leading-relaxed text-ink-2 mb-6 animate-reveal-up">
              <div class="meta mb-1.5" style="color: var(--accent);">{t("review.title", lang)}</div>
              {card.back}
            </div>
            <div class="flex flex-wrap items-center gap-2">
              {GRADES.map((g, i) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => grade(g)}
                  class={`px-3 h-8 font-mono text-[11px] border rounded-[var(--r-sm)] bg-transparent transition-colors ${GRADE_CLS[g]}`}
                >
                  <span class="opacity-50 mr-1">{i + 1}</span>{t(`review.${g}`, lang)}
                </button>
              ))}
            </div>
          </>
        )}

        <footer class="mt-7 pt-4 border-t border-hairline">
          <span class="font-mono text-[10px] text-muted uppercase tracking-wide">{card.lessonKey}</span>
        </footer>
      </div>
    </section>
  );
}
