import { Button as ShadcnButton } from "~/components/ui/button";
import { Textarea as ShadcnTextarea } from "~/components/ui/textarea";
// site/src/components/pedagogy/ReviewSession.tsx
// The "due today" spaced-repetition island: snapshots the due queue at mount,
// walks one card at a time, reveals the answer, and grades again|hard|good|easy,
// writing the next interval back via the SM-2 store. Pure client state (no SSR).
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { dueBefore, recordReview, allCards, type Card, type ReviewEvidence } from "~/scripts/review-state";
import { recordActiveDay } from "~/scripts/user-state";
import type { Grade } from "~/scripts/progression/srs";
import { isCommitted, readResponses, writeResponse } from "~/scripts/practice-state";

const GRADES: Grade[] = ["again", "hard", "good", "easy"];
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
  const [draft, setDraft] = useState("");
  const [attemptedAt, setAttemptedAt] = useState<number | null>(null);
  const [reviewEvent, setReviewEvent] = useState<Omit<ReviewEvidence, "reviewedAt" | "delayMs"> | null>(null);
  const [reviewed, setReviewed] = useState(0);
  // Cards graded in THIS sitting. Excluded from later batches + the "remaining" count so a lapsed
  // ("again", interval 0 → due immediately) card can't re-enter the queue and make Continue loop
  // forever — it resurfaces in a future session like any other due card.
  const gradedThisSession = useRef<Set<string>>(new Set());

  // Snapshot the due list once at mount, capped. Also clear the SSR fallback the page renders while
  // this client:only island boots.
  useLayoutEffect(() => {
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

  useLayoutEffect(() => {
    if (!card) return;
    setDraft(readResponses(card.lessonKey)[`review::${card.cardKey}`] ?? "");
    setAttemptedAt(null);
    setReviewEvent(null);
    setRevealed(false);
  }, [card?.cardKey]);

  function makeReviewEvent(skipped: boolean): Omit<ReviewEvidence, "reviewedAt" | "delayMs"> | null {
    if (!card) return null;
    const now = Date.now();
    const delayMs = Math.max(0, now - (card.lastReviewedAt ?? card.addedAt));
    return {
      eventId: `${card.cardKey}:${now}`,
      basis: "self-report",
      attempt: skipped ? "skipped" : "answered",
      support: skipped ? "none" : "independent",
      timing: delayMs > 0 ? "delayed" : "immediate",
      attemptedAt: skipped ? null : (attemptedAt ?? now),
      revealedAt: now,
    };
  }

  function revealAnswer(skipped = false) {
    const event = makeReviewEvent(skipped);
    if (!event || (!skipped && !isCommitted(draft))) return;
    setReviewEvent(event);
    setRevealed(true);
    if (skipped) grade("again", event);
  }

  function grade(g: Grade, event = reviewEvent) {
    if (!card || !event) return;
    const now = Date.now();
    const delayMs = Math.max(0, now - (card.lastReviewedAt ?? card.addedAt));
    const evidence: ReviewEvidence = { ...event, reviewedAt: now, delayMs };
    if (!recordReview(card.cardKey, g, evidence)) return;
    if (reviewed === 0) recordActiveDay(); // review feeds the existing streak
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
        if ((e.key === " " || e.key === "Enter") && isCommitted(draft)) { e.preventDefault(); revealAnswer(false); }
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
  }, [revealed, idx, queue, draft, reviewEvent]);

  if (queue.length === 0) {
    const next = nextDueLabel(lang);
    return (
      <section class="ss-empty">
        <p>{t("review.empty", lang)}</p>
        {next && <span>{t("review.nextDue", lang)}: {next}</span>}
      </section>
    );
  }

  if (idx >= queue.length) {
    const remaining = freshDue().length; // untouched due cards beyond this batch (excludes this sitting's)
    const next = nextDueLabel(lang);
    return (
      <section class="ss-card">
        <p class="ss-sub">{t("review.done", lang)}</p>
        <p class="ss-big">{reviewed}</p>
        {remaining > 0 ? (
          <ShadcnButton type="button" class="oa-btn oa-btn-primary h-9 px-4 font-mono text-[12px]" onClick={loadBatch}>
            {t("review.continue", lang).replace("{n}", String(remaining))}
          </ShadcnButton>
        ) : (
          next && <p class="ss-cap">{t("review.nextDue", lang)}: {next}</p>
        )}
      </section>
    );
  }

  const progress = Math.round((idx / queue.length) * 100);
  const originalTask = card.answerMode === "original-task";

  return (
    <section class="ss-card">
      <header class="ss-head">
        <span class="ss-count">
          <em>{idx + 1}</em> {t("review.cardOf", lang)} {queue.length}
          {totalDue > queue.length && <span> · {totalDue} {t("review.dueCount", lang)}</span>}
        </span>
        <div class="ss-bar" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={idx}>
          <i style={`--p:${progress}%`} />
        </div>
      </header>

      <h2 class="ss-q">{card.front}</h2>

      {originalTask ? (
        <a class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]" href={`/${lang}/learn/${card.lessonKey}/`}>
          {lang === "ru" ? "Открыть исходное задание" : "Open original task"}
        </a>
      ) : !revealed ? (
        <>
          <ShadcnTextarea
            class="ss-answer-field"
            value={draft}
            placeholder={lang === "ru" ? "Ответь по памяти…" : "Answer from memory…"}
            onInput={(e) => {
              const value = (e.target as HTMLTextAreaElement).value;
              if (attemptedAt == null && value.trim()) setAttemptedAt(Date.now());
              setDraft(value);
              writeResponse(card.lessonKey, `review::${card.cardKey}`, value);
            }}
          />
          <div class="ss-actions">
            <ShadcnButton type="button" class="oa-btn oa-btn-primary h-9 px-4 text-[12px]" disabled={!isCommitted(draft)} onClick={() => revealAnswer(false)}>
              {t("review.showAnswer", lang)} <span class="opacity-60 font-mono">␣</span>
            </ShadcnButton>
            <button type="button" class="ss-link" onClick={() => revealAnswer(true)}>
              {lang === "ru" ? "Пропустить" : "Skip"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div class="ss-reveal animate-reveal-up">{card.back}</div>
          <div class="ss-grades" role="group">
            {GRADES.map((g, i) => (
              <button key={g} type="button" class={`ss-grade is-${g}`} data-key={i + 1} aria-keyshortcuts={String(i + 1)} onClick={() => grade(g)}>
                {t(`review.${g}`, lang)}
              </button>
            ))}
          </div>
        </>
      )}

      <footer class="ss-foot">{card.lessonKey}</footer>
    </section>
  );
}
