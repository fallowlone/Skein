// site/src/components/assess/item-bodies.tsx
// Per-kind item bodies for the text/self-grade family: recall (fill-the-blanks),
// predict, explain, review. Code-execution kinds (debug, exec) live in
// item-bodies-code.tsx — split so neither file drifts far past ~200 lines.
//
// A note on "recall": the harvester's `kindOf()` names a diagnose task with
// `grading.mode === "blanks"` as kind "recall" — free-recall short answer
// (`Blank[]` with an `accept` list per blank), graded against text the learner
// types, not chosen from options. Nothing in the practice content schema has
// real multiple-choice `choices[].correct` data (see content.config.ts's
// DiagnoseTask) — this kind was originally mislabelled "mcq" (Task 12b fixed
// the mislabel, the guess-floor cost it carried, and deleted the unreachable
// `gradeMcq`). This file grades every "recall" item with `gradeBlanks`, which
// matches what the content actually contains.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { t } from "~/i18n";
import type { PracticeTaskData } from "~/content.config";
import type { Outcome } from "~/scripts/assess/types";
import type { ResponseMeta } from "~/scripts/assess/update";
import { gradeBlanks, gradeReview } from "~/scripts/assess/graders";
import { isCommitted } from "~/scripts/practice-state";
import { tt } from "./labels";

export type Submit = (outcome: Outcome, meta?: ResponseMeta) => void;
type BodyProps = { lang: Locale; task: PracticeTaskData; onSubmit: Submit };

const DIGEST_MAX = 240;

/** Defensive fallback: the fetched task's shape didn't match what this item's
 *  `kind` implies (a corrupt/stale item, or a future authoring shape this file
 *  doesn't know about yet). Never silently mis-grade — surface it and let the
 *  learner fall through to the shared "I don't know" / "Finish" controls. */
export function KindMismatch({ lang }: { lang: Locale }) {
  return <p class="assess-mismatch">{t("assess.item.mismatch", lang)}</p>;
}

export function RecallBody({ lang, task, onSubmit }: BodyProps) {
  if (task.type !== "diagnose" || task.grading.mode !== "blanks") return <KindMismatch lang={lang} />;
  const blanks = task.grading.blanks;
  const [answers, setAnswers] = useState<string[]>(() => blanks.map(() => ""));

  const submit = () => {
    const r = gradeBlanks(blanks, answers);
    onSubmit(r.outcome, { failureNote: r.failureNote, answerDigest: answers.join(" | ").slice(0, DIGEST_MAX) });
  };

  return (
    <div class="assess-body">
      {task.evidence && <pre class="assess-evidence">{tt(lang, task.evidence.en, task.evidence.ru)}</pre>}
      {blanks.map((b: { id: string; accept: string[]; hint?: { en: string; ru: string } }, i: number) => {
        // Every blank gets a real, unique label — a hint when the content has
        // one, else a numbered fallback ("Blank 2") — so a multi-blank item
        // does not leave every input sharing the same accessible name (they
        // previously fell back to the shared placeholder text with no label
        // at all when a blank had no authored hint).
        const inputId = `assess-blank-${b.id}`;
        const labelText = b.hint ? tt(lang, b.hint.en, b.hint.ru) : t("assess.item.blankN", lang).replace("{n}", String(i + 1));
        return (
          <div key={b.id} class="assess-blank">
            <label class="assess-blank-hint" for={inputId}>{labelText}</label>
            <input
              id={inputId}
              class="assess-input"
              value={answers[i]}
              placeholder={t("assess.item.blankPlaceholder", lang)}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setAnswers((prev) => prev.map((cur, j) => (j === i ? v : cur)));
              }}
            />
          </div>
        );
      })}
      <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={submit}>
        {t("assess.item.submit", lang)}
      </button>
    </div>
  );
}

/** Shared write → reveal → self-grade shell for predict / explain. The learner's
 *  own self-grade (hit/partial/miss) IS the outcome for these kinds — there is no
 *  deterministic grader for free-form recall, matching graders/index.ts, which
 *  only covers blanks/review/exec. */
function CommitRevealBody({
  lang, label, prefix, revealHtml, onSubmit,
}: {
  lang: Locale; label: string; prefix?: string; revealHtml: string; onSubmit: Submit;
}) {
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState(false);
  const committed = isCommitted(draft);

  const grade = (g: "hit" | "partial" | "miss") => {
    const outcome: Outcome = g === "hit" ? "correct" : g === "partial" ? "partial" : "wrong";
    // `rawAnswer` carries the FULL, untruncated draft — read only by
    // ItemView.tsx's explain-item LLM check (its own MAX_INPUT_CHARS bound
    // applies there), and stripped by ItemView.tsx before the response ever
    // reaches onAnswer/applyResponse/Evidence. `answerDigest` (240 chars,
    // DIGEST_MAX) stays the one that gets stored, exactly as before — this
    // adds a second, transient field, it does not change what gets persisted.
    onSubmit(outcome, { answerDigest: draft.slice(0, DIGEST_MAX), rawAnswer: draft });
  };

  return (
    <div class="assess-body">
      {prefix && <pre class="assess-evidence">{prefix}</pre>}
      <label class="assess-label" for="assess-draft">{label}</label>
      <textarea
        id="assess-draft"
        class="assess-textarea"
        value={draft}
        readOnly={shown}
        onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
      />
      {!shown && (
        <button
          type="button"
          class="oa-btn oa-btn-primary oa-btn-sm"
          disabled={!committed}
          aria-disabled={!committed}
          onClick={() => setShown(true)}
        >
          {t("assess.reveal.cta", lang)}
        </button>
      )}
      {shown && (
        <div class="assess-reveal">
          <div class="assess-label">{t("assess.reveal.model", lang)}</div>
          {/* eslint-disable-next-line react/no-danger -- authored lesson content, not user input */}
          <div class="prose assess-prose" dangerouslySetInnerHTML={{ __html: revealHtml }} />
          <p class="assess-selfgrade-prompt">{t("assess.selfgrade.prompt", lang)}</p>
          <div class="assess-selfgrade">
            <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade("hit")}>{t("assess.selfgrade.hit", lang)}</button>
            <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade("partial")}>{t("assess.selfgrade.partial", lang)}</button>
            <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade("miss")}>{t("assess.selfgrade.miss", lang)}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PredictBody({ lang, task, onSubmit }: BodyProps) {
  if (task.type !== "predict") return <KindMismatch lang={lang} />;
  return (
    <CommitRevealBody
      lang={lang}
      label={t("assess.item.yourPrediction", lang)}
      prefix={tt(lang, task.scenario.en, task.scenario.ru)}
      revealHtml={tt(lang, task.reveal.en, task.reveal.ru)}
      onSubmit={onSubmit}
    />
  );
}

/** "explain" covers 4 different underlying shapes (Task 6's kindOf): a self-graded
 *  diagnose, a self-graded fix, a design task, or an incident walkthrough. Each is
 *  normalised down to {prefix?, revealHtml} for the shared commit/reveal shell —
 *  a deliberate simplification versus practice's fuller per-type UI (step-by-step
 *  incident reveal, a live rubric checklist): /assess measures, it doesn't teach,
 *  so the model answer in full is enough context to self-grade honestly. */
export function ExplainBody({ lang, task, onSubmit }: BodyProps) {
  const label = t("assess.item.yourAnswer", lang);
  if (task.type === "diagnose" && task.grading.mode === "self") {
    return (
      <CommitRevealBody
        lang={lang}
        label={label}
        prefix={task.evidence ? tt(lang, task.evidence.en, task.evidence.ru) : undefined}
        revealHtml={tt(lang, task.grading.model.en, task.grading.model.ru)}
        onSubmit={onSubmit}
      />
    );
  }
  if (task.type === "fix" && task.grading.mode === "self") {
    return (
      <CommitRevealBody
        lang={lang}
        label={label}
        prefix={task.starter}
        revealHtml={tt(lang, task.grading.model.en, task.grading.model.ru)}
        onSubmit={onSubmit}
      />
    );
  }
  if (task.type === "design") {
    return (
      <CommitRevealBody
        lang={lang}
        label={label}
        prefix={tt(lang, task.constraints.en, task.constraints.ru)}
        revealHtml={tt(lang, task.model.en, task.model.ru)}
        onSubmit={onSubmit}
      />
    );
  }
  if (task.type === "incident") {
    type Step = { label: { en: string; ru: string }; prompt: { en: string; ru: string }; reveal: { en: string; ru: string } };
    const prefix = task.steps.map((s: Step) => `${tt(lang, s.label.en, s.label.ru)}: ${tt(lang, s.prompt.en, s.prompt.ru)}`).join("\n\n");
    const revealHtml = task.steps.map((s: Step) => `<p><b>${tt(lang, s.label.en, s.label.ru)}</b> — ${tt(lang, s.reveal.en, s.reveal.ru)}</p>`).join("");
    return <CommitRevealBody lang={lang} label={label} prefix={prefix} revealHtml={revealHtml} onSubmit={onSubmit} />;
  }
  return <KindMismatch lang={lang} />;
}

export function ReviewBody({ lang, task, onSubmit }: BodyProps) {
  if (task.type !== "review") return <KindMismatch lang={lang} />;
  type Labelled = { id: string; label: { en: string; ru: string }; explanation: { en: string; ru: string } };
  const candidates: Labelled[] = [
    ...task.findings.map((f: Labelled) => ({ id: f.id, label: f.label, explanation: f.explanation })),
    ...(task.decoys ?? []).map((d: Labelled) => ({ id: d.id, label: d.label, explanation: d.explanation })),
  ];
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(false);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    const picks = [...picked];
    const r = gradeReview(task.findings, picks);
    setShown(true);
    onSubmit(r.outcome, { failureNote: r.failureNote, answerDigest: picks.join(",").slice(0, DIGEST_MAX) });
  };

  return (
    <div class="assess-body">
      <div class="assess-diff-lang">{task.diff.lang}</div>
      <pre class="assess-evidence assess-diff">{task.diff.code}</pre>
      <p class="assess-label">{t("assess.review.whatFound", lang)}</p>
      <ul class="assess-review-list">
        {candidates.map((c) => (
          <li key={c.id}>
            <label class="assess-review-item">
              <input type="checkbox" checked={picked.has(c.id)} disabled={shown} onChange={() => toggle(c.id)} />
              <span>{tt(lang, c.label.en, c.label.ru)}</span>
            </label>
            {shown && (
              <div class="prose assess-prose assess-finding-explain" dangerouslySetInnerHTML={{ __html: tt(lang, c.explanation.en, c.explanation.ru) }} />
            )}
          </li>
        ))}
      </ul>
      {!shown && (
        <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={submit}>
          {t("assess.review.reveal", lang)}
        </button>
      )}
    </div>
  );
}
