// site/src/components/german/ReviewSession.tsx
//
// Standalone spaced-repetition review for the German layer. Today surfaces the due
// count; this turns it into a flashcard pass over the FSRS-due words — the review
// half of the loop VocabModule starts. The due ids are snapshotted by the caller,
// so the list does not shrink under us as each grade reschedules its card.
// Mirrors site/src/components/english/ReviewSession.tsx, repointed at ~/german/*.
import { useMemo, useState } from "preact/hooks";
import { germanDeck, gradeWord } from "~/german/state";
import type { VocabEntry, Grade } from "~/german/types";
import { type Locale } from "~/i18n";

type Props = { lang: Locale; ids: string[] };

const now = () => Date.now();

// One id→entry index across the whole German deck; due words can come from any band.
const INDEX: Map<string, VocabEntry> = new Map(germanDeck.map((e) => [e.id, e]));

export default function ReviewSession({ lang, ids }: Props) {
  // Freeze the queue on first render so grading (which reschedules cards out of
  // "due") cannot mutate the list we are iterating.
  const queue = useMemo(() => ids.map((id) => INDEX.get(id)).filter(Boolean) as VocabEntry[], []);
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);

  const L = {
    show: lang === "en" ? "Show meaning" : "Показать значение",
    again: lang === "en" ? "Again" : "Снова",
    good: lang === "en" ? "Good" : "Помню",
    easy: lang === "en" ? "Easy" : "Легко",
    progress: lang === "en" ? "to review" : "на повтор",
    done: lang === "en" ? "Reviews done for now. 🎉" : "Повторения сделаны. 🎉",
  };

  if (queue.length === 0 || i >= queue.length) {
    return <p class="text-[14px] text-ink max-w-[460px] mx-auto">{L.done}</p>;
  }

  const e = queue[i];

  function grade(g: Grade) {
    gradeWord(e.id, g, now());
    setReveal(false);
    setI((n) => n + 1);
  }

  return (
    <div class="max-w-[460px] mx-auto">
      <div class="text-[12px] font-mono text-muted text-right mb-3">{queue.length - i} {L.progress}</div>
      <div class="bg-card border border-rule-strong rounded-[2px] p-8 min-h-[200px] flex flex-col gap-3">
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="font-display text-[26px] font-bold text-ink">{e.lemma}</span>
          {e.ipa ? <span class="text-[12px] font-mono text-muted">/{e.ipa}/</span> : null}
          <span class="text-[11px] font-mono uppercase text-muted">{e.pos}</span>
        </div>
        {reveal ? (
          <>
            <div class="text-[16px] text-ink">{e.ru}</div>
            <div class="text-[13px] text-muted">{e.gloss}</div>
            {e.examples[0] ? (
              <div class="text-[13px] text-ink italic mt-1">“{e.examples[0]}”</div>
            ) : null}
          </>
        ) : (
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm self-start mt-2" onClick={() => setReveal(true)}>{L.show}</button>
        )}
      </div>
      {reveal ? (
        <div class="flex gap-2 mt-4 justify-center">
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade("again")}>{L.again}</button>
          <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => grade("good")}>{L.good}</button>
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade("easy")}>{L.easy}</button>
        </div>
      ) : null}
    </div>
  );
}
