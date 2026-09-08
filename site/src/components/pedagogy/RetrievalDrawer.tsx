import { useLayoutEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { recordRetrieval, recordRetrievalRating, dismissRevisit } from "~/scripts/user-state";
import { cardsFromRetrieval } from "~/scripts/review-harvest";
import { addCard, recordReview, type ReviewEvidence } from "~/scripts/review-state";
import type { Grade } from "~/scripts/progression/srs";
import { isCommitted, readResponses, writeResponse } from "~/scripts/practice-state";
import { t, type Locale } from "~/i18n";

// Tolerant reader: lesson MDX passes `{ q, a }` (no per-question `id`), while the
// SRS refactor renamed the contract to `{ id, q, answer }`. Accept both keys so
// every call site renders, regardless of which shape it was authored in.
type Q = {
  id?: string;
  q: ComponentChildren;
  answer?: ComponentChildren;
  a?: ComponentChildren;
  hint?: ComponentChildren;
};

// Likewise the slug arrives as `id` from MDX but `pieceSlug` from the renamed
// contract; either identifies the lesson for retrieval/SRS bookkeeping.
// `lessonKey` is the canonical join key injected by the remark plugin at build
// time (e.g. "databases/03-execution-plans/07-plan-stability"); when absent the
// bare slug is used as a fallback so existing MDX call sites regress-free.
type Props = {
  pieceSlug?: string;
  id?: string;
  lessonKey?: string;
  lang: Locale;
  questions: Q[];
};

const labels = {
  en: {
    write: "Write from memory…",
    reveal: "Reveal",
    confidence: "rate",
    markDone: "✓ done",
    snooze: "+3d",
    skip: "skip",
    completed: "✓",
  },
  ru: {
    write: "По памяти…",
    reveal: "Ответ",
    confidence: "оценка",
    markDone: "✓ done",
    snooze: "+3д",
    skip: "skip",
    completed: "✓",
  },
};

export default function RetrievalDrawer({ pieceSlug, id, lessonKey, lang, questions }: Props) {
  const slug = pieceSlug ?? id ?? "";
  const storageLessonKey = lessonKey ?? slug;
  const storedResponses = readResponses(storageLessonKey);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [graded, setGraded] = useState<Record<string, Grade>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>(() => Object.fromEntries(
    questions.map((_, i) => [i, storedResponses[`retrieval::${i}`] ?? ""]),
  ));
  const [attemptedAt, setAttemptedAt] = useState<Record<number, number>>({});
  const [reviewEvents, setReviewEvents] = useState<Record<string, Omit<ReviewEvidence, "reviewedAt" | "delayMs">>>({});
  const [completed, setCompleted] = useState(false);
  const l = labels[lang];

  // Lazy-seed spaced-repetition cards on first visit (string-valued Q/A only).
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    cardsFromRetrieval(slug, storageLessonKey, lang, questions).forEach((card) => addCard(card));
  }, []);

  const persistDraft = (index: number, text: string) => {
    if (!attemptedAt[index] && text.trim()) setAttemptedAt((current) => ({ ...current, [index]: Date.now() }));
    setDrafts((current) => ({ ...current, [index]: text }));
    writeResponse(storageLessonKey, `retrieval::${index}`, text);
  };

  const revealQuestion = (key: string, index: number, skipped: boolean) => {
    const now = Date.now();
    const evidence: Omit<ReviewEvidence, "reviewedAt" | "delayMs"> = {
      eventId: `${storageLessonKey}::retrieval::${index}:${now}`,
      basis: "self-report",
      attempt: skipped ? "skipped" : "answered",
      support: skipped ? "none" : "independent",
      timing: "same-pass",
      attemptedAt: skipped ? null : (attemptedAt[index] ?? now),
      revealedAt: now,
    };
    setReviewEvents((current) => ({ ...current, [key]: evidence }));
    setRevealed((current) => ({ ...current, [key]: true }));
    recordRetrieval(slug);
    if (skipped) {
      const accepted = recordReview(`${storageLessonKey}::retrieval::${index}`, "again", { ...evidence, reviewedAt: now, delayMs: 0 });
      if (accepted) setGraded((current) => ({ ...current, [key]: "again" }));
    }
  };

  return (
    <section class="my-10 hr-top hr-bot py-6">
      <header class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2.5">
          <span class="pill-dot" style="background: var(--accent);"></span>
          <span class="meta">{t("retrieval.title", lang)}</span>
        </div>
        {completed && (
          <span class="badge ok">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
            {l.completed}
          </span>
        )}
      </header>

      <ol class="list-none m-0 p-0 flex flex-col gap-7">
        {questions.map((q, i) => {
          const key = q.id ?? `${slug}-${i}`;
          const answer = q.answer ?? q.a;
          const isOpen = revealed[key];
          return (
            <li key={key}>
              <div class="flex items-start gap-3">
                <span class="font-mono text-[11px] text-muted tabular-nums shrink-0 mt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div class="flex-1 min-w-0">
                  {/* The question labels its own answer box — a placeholder is
                      not a label (it disappears on input and is not reliably
                      announced), so the box points at the prompt by id. */}
                  <div id={`${key}-prompt`} class="font-display text-[16px] font-semibold leading-snug text-ink">
                    {q.q}
                  </div>
                  <textarea
                    class="mt-3 w-full bg-card border border-rule-strong rounded-[1px] px-3 py-2 text-[13px] font-mono text-ink resize-y min-h-[60px] focus:outline-none focus:border-ink"
                    rows={2}
                    placeholder={l.write}
                    aria-labelledby={`${key}-prompt`}
                    value={drafts[i] ?? ""}
                    readOnly={isOpen}
                    onInput={(e) => persistDraft(i, (e.target as HTMLTextAreaElement).value)}
                  />
                  <div class="flex items-center gap-3 mt-2">
                    {!isOpen ? (
                      <>
                        <button
                          type="button"
                          class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]"
                          disabled={!isCommitted(drafts[i] ?? "")}
                          onClick={() => revealQuestion(key, i, false)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          {l.reveal}
                        </button>
                        <button type="button" class="text-xs text-muted underline" onClick={() => revealQuestion(key, i, true)}>
                          {lang === "ru" ? "Пропустить" : "Skip"}
                        </button>
                      </>
                    ) : (
                      <>
                        <div class="flex items-center gap-1">
                          {(["again", "hard", "good", "easy"] as const).map((grade) => {
                            const active = graded[key] === grade;
                            return (
                              <button
                                key={grade}
                                type="button"
                                disabled={graded[key] !== undefined}
                                onClick={() => {
                                  const event = reviewEvents[key];
                                  if (!event || graded[key] !== undefined) return;
                                  const now = Date.now();
                                  if (recordReview(`${storageLessonKey}::retrieval::${i}`, grade, { ...event, reviewedAt: now, delayMs: 0 })) {
                                    setGraded((current) => ({ ...current, [key]: grade }));
                                    recordRetrievalRating(slug, grade);
                                  }
                                }}
                                class={`px-2 h-6 font-mono text-[11px] border rounded-[1px] transition-colors ${active ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule-strong hover:border-ink"}`}
                                aria-label={`grade ${grade}`}
                                aria-pressed={active}
                              >
                                {grade}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {isOpen && (
                    <div class="mt-4 pl-3 border-l-2 border-accent text-[13.5px] leading-relaxed text-ink-2">
                      <div class="meta mb-1.5" style="color: var(--accent);">answer</div>
                      {answer}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <footer class="mt-6 flex flex-wrap items-center gap-2 pt-4 hr-top">
        <button
          type="button"
          class="oa-btn oa-btn-primary oa-btn-sm text-[12px]"
          onClick={() => setCompleted(true)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
          done
        </button>
        <button
          type="button"
          class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]"
          aria-label={l.snooze}
          title={l.snooze}
          onClick={() => dismissRevisit(slug)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </footer>
    </section>
  );
}
