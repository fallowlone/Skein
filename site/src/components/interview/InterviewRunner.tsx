import { useState, useEffect } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import GradeWithAi from "~/components/pedagogy/GradeWithAi";
import { recordPracticeOutcome } from "~/scripts/path/path-io";
import { recordActiveDay, userState } from "~/scripts/user-state";
import { cardsFromPractice } from "~/scripts/review-harvest";
import { addCard } from "~/scripts/review-state";
import { readinessScore, type SessionItem, type Outcome } from "~/scripts/interview/interview-session";

const PICKS: Outcome[] = ["pass", "partial", "fail"];

export default function InterviewRunner({ lang, items }: { lang: Locale; items: SessionItem[] }) {
  const [idx, setIdx] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [pick, setPick] = useState<Outcome | null>(null);

  // Remove the SSR fallback once the island mounts.
  useEffect(() => { document.getElementById("interview-fallback")?.remove(); }, []);

  // Seed the interview tasks as SRS cards once, so they re-surface in /review.
  useEffect(() => {
    const byLesson = new Map<string, SessionItem["task"][]>();
    for (const it of items) {
      const arr = byLesson.get(it.lessonKey) ?? [];
      arr.push(it.task);
      byLesson.set(it.lessonKey, arr);
    }
    for (const [lessonKey, tasks] of byLesson) {
      cardsFromPractice(lessonKey, lang, tasks.map((tk) => ({ id: tk.id, title: tk.title, prompt: tk.prompt }))).forEach(addCard);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items.length) {
    return <p class="re-lead">{t("interview.empty", lang)}</p>;
  }

  if (idx >= items.length) {
    const score = Math.round(readinessScore(outcomes));
    const prog = userState.value.progression;
    if (score > (prog.interviewReadiness ?? 0)) {
      userState.value = {
        ...userState.value,
        progression: { ...prog, interviewReadiness: score, interviewCompletedAt: Date.now() },
      };
    }
    return (
      <section class="iv-done">
        <div class="meta mb-2">{t("interview.title", lang)}</div>
        <p class="iv-score">{t("interview.readiness", lang)}: {score}%</p>
        <p class="text-muted text-xs">{t("interview.doneHint", lang)}</p>
        <a class="re-cta" href={`/${lang}/roadmap/`}>{t("interview.reviewCta", lang)}</a>
      </section>
    );
  }

  const item = items[idx];
  const task = item.task;

  function next() {
    if (!pick) return;
    if (idx === 0) recordActiveDay();
    recordPracticeOutcome(item.lessonKey, task.id, pick === "pass");
    setOutcomes((o) => [...o, pick]);
    setPick(null);
    setIdx((i) => i + 1);
  }

  const counter = t("interview.task", lang).replace("{n}", String(idx + 1)).replace("{total}", String(items.length));

  return (
    <section class="iv-task">
      <div class="meta mb-1">{counter}</div>
      <h2 class="iv-prompt">{task.title[lang]}</h2>
      <p class="iv-body">{task.prompt[lang]}</p>
      {task.type === "design" && <p class="iv-constraints">{task.constraints[lang]}</p>}
      <GradeWithAi lang={lang} task={task} />
      <fieldset class="iv-assess">
        <legend>{t("interview.selfAssess", lang)}</legend>
        {PICKS.map((o) => (
          <button
            type="button"
            key={o}
            class={`iv-pick ${pick === o ? "on" : ""}`}
            aria-pressed={pick === o}
            onClick={() => setPick(o)}
          >
            {t(`interview.${o}`, lang)}
          </button>
        ))}
      </fieldset>
      <button type="button" class="iv-next" disabled={!pick} onClick={next}>{t("interview.next", lang)}</button>
    </section>
  );
}
