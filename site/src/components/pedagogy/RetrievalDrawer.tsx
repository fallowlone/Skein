import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { recordRetrieval, dismissRevisit } from "~/scripts/user-state";
import { cardsFromRetrieval } from "~/scripts/review-harvest";
import { addCard } from "~/scripts/review-state";
import { t, type Locale } from "~/i18n";

type Q = {
  id: string;
  q: ComponentChildren;
  answer: ComponentChildren;
  hint?: ComponentChildren;
};

type Props = {
  pieceSlug: string;
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

export default function RetrievalDrawer({ pieceSlug, lang, questions }: Props) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);
  const l = labels[lang];

  // Lazy-seed spaced-repetition cards on first visit (string-valued Q/A only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    cardsFromRetrieval(pieceSlug, lang, questions).forEach(addCard);
  }, []);

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
          const isOpen = revealed[q.id];
          const conf = confidence[q.id] ?? 0;
          return (
            <li key={q.id}>
              <div class="flex items-start gap-3">
                <span class="font-mono text-[11px] text-muted tabular-nums shrink-0 mt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div class="flex-1 min-w-0">
                  <div class="font-display text-[16px] font-semibold leading-snug text-ink">
                    {q.q}
                  </div>
                  <textarea
                    class="mt-3 w-full bg-card border border-rule-strong rounded-[1px] px-3 py-2 text-[13px] font-mono text-ink resize-y min-h-[60px] focus:outline-none focus:border-ink"
                    rows={2}
                    placeholder={l.write}
                  />
                  <div class="flex items-center gap-3 mt-2">
                    {!isOpen ? (
                      <button
                        type="button"
                        class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]"
                        onClick={() => {
                          setRevealed({ ...revealed, [q.id]: true });
                          recordRetrieval(pieceSlug);
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        {l.reveal}
                      </button>
                    ) : (
                      <>
                        <div class="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((v) => {
                            const active = conf === v;
                            return (
                              <button
                                key={v}
                                type="button"
                                onClick={() =>
                                  setConfidence({ ...confidence, [q.id]: v })
                                }
                                class={`w-6 h-6 font-mono text-[11px] border rounded-[1px] transition-colors ${active ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule-strong hover:border-ink"}`}
                                aria-label={`confidence ${v}`}
                                aria-pressed={active}
                              >
                                {v}
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
                      {q.answer}
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
          onClick={() => dismissRevisit(pieceSlug)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </footer>
    </section>
  );
}
