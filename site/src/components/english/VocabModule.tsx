// site/src/components/english/VocabModule.tsx
import { useMemo, useState } from "preact/hooks";
import { vocabA2 } from "~/english/data/vocab-a2";
import { vocabB1 } from "~/english/data/vocab-b1";
import { vocabB2 } from "~/english/data/vocab-b2";
import type { VocabEntry, Band } from "~/english/types";
import { englishState, gradeWord, queueNewWords, recordNewIntro, getPlacement, getNewWordsPerDay, introducedToday } from "~/english/state";
import { type Locale } from "~/i18n";

type Props = { lang: Locale };

const now = () => Date.now();

const BANK: Record<Band, VocabEntry[]> = { A2: vocabA2, B1: vocabB1, B2: vocabB2 };

export default function VocabModule({ lang }: Props) {
  englishState.value; // subscribe
  const band = getPlacement()?.band ?? "A2";
  const bank = BANK[band];

  const queue = useMemo(() => {
    const ids = queueNewWords(bank.map((e) => e.id), now());
    const set = new Set(ids);
    return bank.filter((e) => set.has(e.id));
  }, [band, englishState.value]);

  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);

  const L = {
    none: lang === "en"
      ? "No new words queued right now — come back tomorrow."
      : "Новых слов сейчас нет — загляни завтра.",
    show: lang === "en" ? "Show meaning" : "Показать значение",
    know: lang === "en" ? "I knew it" : "Знал",
    learn: lang === "en" ? "Learning" : "Учу",
    left: lang === "en" ? "new today" : "новых сегодня",
  };

  if (queue.length === 0 || i >= queue.length) {
    return <p class="text-[14px] text-muted max-w-[600px] mx-auto">{L.none}</p>;
  }

  const e = queue[i];

  function grade(known: boolean) {
    gradeWord(e.id, known ? "good" : "again", now());
    recordNewIntro(now());
    setReveal(false);
    setI((n) => n + 1);
  }

  const used = introducedToday(now());
  return (
    <div class="max-w-[460px] mx-auto">
      <div class="text-[12px] font-mono text-muted text-right mb-3">{used}/{getNewWordsPerDay()} {L.left}</div>
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
            {e.examples[0] ? <div class="text-[13px] text-ink italic mt-1">“{e.examples[0]}”</div> : null}
            {e.collocations?.length ? <div class="text-[12px] text-muted mt-1">{e.collocations.join(" · ")}</div> : null}
          </>
        ) : (
          <button type="button" class="btn ghost self-start mt-2" onClick={() => setReveal(true)}>{L.show}</button>
        )}
      </div>
      {reveal ? (
        <div class="flex gap-2 mt-4 justify-center">
          <button type="button" class="btn" onClick={() => grade(true)}>{L.know}</button>
          <button type="button" class="btn ghost" onClick={() => grade(false)}>{L.learn}</button>
        </div>
      ) : null}
    </div>
  );
}
