import { Button as ShadcnButton } from "~/components/ui/button";
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
    return <div class="ss-empty"><p>{t("interview.empty", lang)}</p></div>;
  }

  if (idx >= view.length) {
    const score = Math.round(readinessScore(outcomes));
    const count = (o: Outcome) => outcomes.filter((x) => x === o).length;
    return (
      <section class="ss-card">
        <p class="ss-sub">{t("interview.readiness", lang)}</p>
        <p class="ss-big">{score}<small>%</small></p>
        <div class="ss-result-ticks" aria-hidden="true">
          {outcomes.map((o, i) => <span key={i} class={`ss-tick is-${o}`} />)}
        </div>
        <ul class="ss-legend">
          {PICKS.map((o) => (
            <li key={o}>
              <span class={`ss-dot is-${o}`} aria-hidden="true" />
              <b>{count(o)}</b> {t(`interview.${o === "pass" ? "solid" : o}Count`, lang)}
            </li>
          ))}
        </ul>
        <p class="ss-hint">{t("interview.doneHint", lang)}</p>
        <a class="oa-btn oa-btn-primary h-9 px-4 inline-flex items-center font-mono text-[12px] no-underline" href={`/${lang}/roadmap/`}>
          {t("interview.reviewCta", lang)}
        </a>
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
    <section class="ss-card">
      <header class="ss-head">
        <span class="ss-count">{counter}</span>
        <div class="ss-ticks" aria-hidden="true">
          {view.map((_, i) => (
            <span key={i} class={`ss-tick${i < outcomes.length ? ` is-${outcomes[i]}` : i === idx ? " is-now" : ""}`} />
          ))}
        </div>
      </header>
      <h2 class="ss-q">{task.title[lang]}</h2>
      <p class="ss-prompt">{task.prompt[lang]}</p>
      {task.type === "design" && <p class="ss-constraints">{task.constraints[lang]}</p>}
      <div class="ss-block">
        <GradeWithAi lang={lang} task={task} />
      </div>
      <div class="ss-block">
        <p class="ss-sub">{t("interview.selfAssess", lang)}</p>
        <div class="ss-opts" role="group" aria-label={t("interview.selfAssess", lang)}>
          {PICKS.map((o) => (
            <button type="button" key={o} class={`ss-opt is-${o}`} aria-pressed={pick === o} onClick={() => setPick(o)}>
              <span class="ss-dot" aria-hidden="true" />
              <span class="ss-opt-label">{t(`interview.${o}`, lang)}</span>
              <span class="ss-opt-hint">{t(`interview.${o}Hint`, lang)}</span>
            </button>
          ))}
        </div>
      </div>
      <div class="ss-actions">
        <ShadcnButton
          type="button"
          class="oa-btn oa-btn-primary h-9 px-4 font-mono text-[12px] disabled:opacity-40 disabled:pointer-events-none"
          disabled={!pick}
          onClick={next}
        >
          {t("interview.next", lang)}
        </ShadcnButton>
      </div>
    </section>
  );
}
