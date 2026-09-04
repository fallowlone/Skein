import { useState, useEffect } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import GradeWithAi from "~/components/pedagogy/GradeWithAi";
import { recordPracticeOutcome } from "~/scripts/path/path-io";
import { recordActiveDay, userState } from "~/scripts/user-state";
import { cardsFromPractice } from "~/scripts/review-harvest";
import { addCard } from "~/scripts/review-state";
import { readinessScore, selectRound, type SessionItem, type Outcome } from "~/scripts/interview/interview-session";

const PICKS: Outcome[] = ["pass", "partial", "fail"];
const SESSION_SIZE = 8;

export default function InterviewRunner({ lang, items }: { lang: Locale; items: SessionItem[] }) {
  const [idx, setIdx] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [pick, setPick] = useState<Outcome | null>(null);
  // Captured once at mount: which rotation window to show. Each completed session advances it, so
  // repeat practice surfaces a different slice of the question pool (selectRound wraps).
  const [round] = useState(() => userState.value.progression.interviewRounds ?? 0);
  const view = selectRound(items, SESSION_SIZE, round);

  // Remove the SSR fallback once the island mounts.
  useEffect(() => { document.getElementById("interview-fallback")?.remove(); }, []);

  // Seed this round's interview tasks as SRS cards once, so they re-surface in /review.
  useEffect(() => {
    const byLesson = new Map<string, SessionItem["task"][]>();
    for (const it of view) {
      const arr = byLesson.get(it.lessonKey) ?? [];
      arr.push(it.task);
      byLesson.set(it.lessonKey, arr);
    }
    for (const [lessonKey, tasks] of byLesson) {
      cardsFromPractice(lessonKey, lang, tasks.map((tk) => ({ id: tk.id, title: tk.title, prompt: tk.prompt }))).forEach(addCard);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On completion: advance the rotation counter (so next session differs) and persist interview
  // readiness as a high-water mark. Runs in an effect (not render) so we never write a signal
  // during Preact's render pass; deps [idx] fire it once when the session finishes.
  useEffect(() => {
    if (!view.length || idx < view.length) return; // never advance the round on an empty pool
    const score = Math.round(readinessScore(outcomes));
    const prog = userState.value.progression;
    const readinessPatch =
      score > (prog.interviewReadiness ?? 0)
        ? { interviewReadiness: score, interviewCompletedAt: Date.now() }
        : {};
    userState.value = {
      ...userState.value,
      progression: { ...prog, interviewRounds: (prog.interviewRounds ?? 0) + 1, ...readinessPatch },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!view.length) {
    return <p class="my-10 text-muted text-sm">{t("interview.empty", lang)}</p>;
  }

  if (idx >= view.length) {
    const score = Math.round(readinessScore(outcomes));
    return (
      <section class="my-10">
        <div class="rounded-[var(--r-lg)] border-[0.5px] border-hairline-2 bg-card shadow-soft p-6 sm:p-7">
          <div class="meta mb-2">{t("interview.title", lang)}</div>
          <p class="font-mono text-[28px] font-bold text-ink mb-1">{t("interview.readiness", lang)}: {score}%</p>
          <p class="text-muted text-xs mb-4">{t("interview.doneHint", lang)}</p>
          <a
            class="inline-block font-mono text-[12px] tracking-[0.03em] text-accent no-underline border-b-[0.5px] border-accent hover:opacity-80"
            href={`/${lang}/roadmap/`}
          >
            {t("interview.reviewCta", lang)}
          </a>
        </div>
      </section>
    );
  }

  const item = view[idx];
  const task = item.task;

  function next() {
    if (!pick) return;
    if (idx === 0) recordActiveDay();
    recordPracticeOutcome(item.lessonKey, task.id, pick === "pass");
    setOutcomes((o) => [...o, pick]);
    setPick(null);
    setIdx((i) => i + 1);
  }

  const counter = t("interview.task", lang).replace("{n}", String(idx + 1)).replace("{total}", String(view.length));

  return (
    <section class="my-10">
      <div class="rounded-[var(--r-lg)] border-[0.5px] border-hairline-2 bg-card shadow-soft p-6 sm:p-7">
        <header class="flex items-center justify-between mb-4">
          <span class="meta">{counter}</span>
        </header>
        <h2 class="font-display text-[19px] sm:text-[21px] font-semibold leading-snug text-ink mb-2">{task.title[lang]}</h2>
        <p class="text-[15px] leading-relaxed text-ink-2 mb-3">{task.prompt[lang]}</p>
        {task.type === "design" && (
          <p class="rounded-[var(--r-md)] border-l-2 border-accent bg-paper-2 pl-4 pr-3 py-3 text-[14px] leading-relaxed text-ink-2 mb-4">
            {task.constraints[lang]}
          </p>
        )}
        <div class="mb-5">
          <GradeWithAi lang={lang} task={task} />
        </div>
        <div class="mb-6">
          <div class="meta mb-2">{t("interview.selfAssess", lang)}</div>
          <div class="flex flex-wrap gap-2" role="group" aria-label={t("interview.selfAssess", lang)}>
            {PICKS.map((o) => (
              <button
                type="button"
                key={o}
                class={`oa-btn oa-btn-secondary h-9 px-3 font-mono text-[12px] ${pick === o ? "!border-accent !text-accent" : ""}`}
                aria-pressed={pick === o}
                onClick={() => setPick(o)}
              >
                {t(`interview.${o}`, lang)}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          class="oa-btn oa-btn-primary h-9 px-4 font-mono text-[12px] disabled:opacity-40 disabled:pointer-events-none"
          disabled={!pick}
          onClick={next}
        >
          {t("interview.next", lang)}
        </button>
      </div>
    </section>
  );
}
