// site/src/components/english/ReviewSession.tsx
//
// Standalone spaced-repetition review. Today surfaces the due count; this turns
// it into an actual flashcard pass over the FSRS-due words — the review half of
// the loop VocabModule starts. The due ids are snapshotted by the caller, so the
// list does not shrink under us as each grade reschedules its card.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { vocabA2 } from "~/english/data/vocab-a2";
import { vocabB1 } from "~/english/data/vocab-b1";
import { vocabB2 } from "~/english/data/vocab-b2";
import type { VocabEntry } from "~/english/types";
import type { Grade } from "~/english/scheduler/types";
import { gradeWord, logMinutes, dueChunks, gradeChunk, englishState } from "~/english/state";
import { speak, ttsAvailable } from "~/english/speech/tts";
import { type Locale } from "~/i18n";

type Props = { lang: Locale; ids: string[] };

const now = () => Date.now();

// One id→entry index across every band; due words can come from any of them.
const INDEX: Map<string, VocabEntry> = new Map(
  [...vocabA2, ...vocabB1, ...vocabB2].map((e) => [e.id, e]),
);

export default function ReviewSession({ lang, ids }: Props) {
  // Freeze the queue on first render so grading (which reschedules cards out of
  // "due") cannot mutate the list we are iterating.
  const queue = useMemo(() => ids.map((id) => INDEX.get(id)).filter(Boolean) as VocabEntry[], []);
  // Sentence/chunk cards due now, frozen on mount like the word queue — reviewed in the same
  // session after the words (one SRS surface, no second screen).
  const chunkDeck = useMemo(
    () => dueChunks(now()).map((id) => ({ id, c: englishState.value.chunks[id] })).filter((x) => x.c),
    [],
  );
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [ci, setCi] = useState(0);
  const [cReveal, setCReveal] = useState(false);
  const canSpeak = ttsAvailable();

  // Auto-log SRS minutes (the methodology's primary metric); time on this screen, logged on exit.
  const startedAt = useRef(now());
  const graded = useRef(false);
  useEffect(() => () => {
    if (graded.current) logMinutes("srs", Math.max(1, Math.round((now() - startedAt.current) / 60_000)), "review");
  }, []);

  const L = {
    show: lang === "en" ? "Show meaning" : "Показать значение",
    again: lang === "en" ? "Again" : "Снова",
    good: lang === "en" ? "Good" : "Помню",
    easy: lang === "en" ? "Easy" : "Легко",
    say: lang === "en" ? "Pronounce" : "Произнести",
    progress: lang === "en" ? "to review" : "на повтор",
    done: lang === "en" ? "Reviews done for now. 🎉" : "Повторения сделаны. 🎉",
    phrasesLeft: lang === "en" ? "phrases to review" : "фраз на повтор",
    phrasesHead: lang === "en" ? "Phrase" : "Фраза",
  };

  const wordsLeft = queue.length > 0 && i < queue.length;
  const phrasesLeft = ci < chunkDeck.length;

  if (!wordsLeft && !phrasesLeft) {
    return <p class="text-[14px] text-ink max-w-[460px] mx-auto">{L.done}</p>;
  }

  function grade(g: Grade) {
    gradeWord(queue[i].id, g, now());
    graded.current = true;
    setReveal(false);
    setI((n) => n + 1);
  }

  function gradeC(g: Grade) {
    gradeChunk(chunkDeck[ci].id, g, now());
    graded.current = true;
    setCReveal(false);
    setCi((n) => n + 1);
  }

  // Phrase deck runs once the word queue is exhausted — same screen, same grade buttons.
  if (!wordsLeft) {
    const ch = chunkDeck[ci];
    return (
      <div class="max-w-[460px] mx-auto">
        <div class="text-[12px] font-mono text-muted text-right mb-3">{chunkDeck.length - ci} {L.phrasesLeft}</div>
        <div class="bg-card border border-rule-strong rounded-[2px] p-8 min-h-[200px] flex flex-col gap-3">
          <span class="text-[11px] font-mono uppercase text-muted">{L.phrasesHead}</span>
          <div class="font-display text-[20px] font-semibold text-ink leading-snug">{ch.c.text}</div>
          {cReveal ? (
            <>
              <div class="text-[14px] text-muted">{ch.c.note ?? "—"}</div>
              {ch.c.src ? <div class="text-[11px] font-mono uppercase text-muted">{ch.c.src}</div> : null}
            </>
          ) : (
            <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm self-start mt-2" onClick={() => setCReveal(true)}>{L.show}</button>
          )}
        </div>
        {cReveal ? (
          <div class="flex gap-2 mt-4 justify-center">
            <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => gradeC("again")}>{L.again}</button>
            <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => gradeC("good")}>{L.good}</button>
            <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => gradeC("easy")}>{L.easy}</button>
          </div>
        ) : null}
      </div>
    );
  }

  const e = queue[i];

  return (
    <div class="max-w-[460px] mx-auto">
      <div class="text-[12px] font-mono text-muted text-right mb-3">
        {queue.length - i} {L.progress}{chunkDeck.length > 0 ? ` · ${chunkDeck.length} ${L.phrasesLeft}` : ""}
      </div>
      <div class="bg-card border border-rule-strong rounded-[2px] p-8 min-h-[200px] flex flex-col gap-3">
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="font-display text-[26px] font-bold text-ink">{e.lemma}</span>
          {canSpeak ? (
            <button type="button" class="icon-btn shrink-0 self-center" title={L.say}
              aria-label={`${L.say}: ${e.lemma}`} onClick={() => speak(e.lemma)}>
              <span aria-hidden="true">🔊</span>
            </button>
          ) : null}
          {e.ipa ? <span class="text-[12px] font-mono text-muted">/{e.ipa}/</span> : null}
          <span class="text-[11px] font-mono uppercase text-muted">{e.pos}</span>
        </div>
        {reveal ? (
          <>
            <div class="text-[16px] text-ink">{e.ru}</div>
            <div class="text-[13px] text-muted">{e.gloss}</div>
            {e.examples[0] ? (
              <div class="text-[13px] text-ink italic mt-1 flex items-start gap-2">
                <span>“{e.examples[0]}”</span>
                {canSpeak ? (
                  <button type="button" class="icon-btn shrink-0 not-italic" title={L.say}
                    aria-label={L.say} onClick={() => speak(e.examples[0])}>
                    <span aria-hidden="true">🔊</span>
                  </button>
                ) : null}
              </div>
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
