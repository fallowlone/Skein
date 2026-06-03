// site/src/components/german/VocabModule.tsx
// New-word SRS card for the German layer. Mirrors site/src/components/english/
// VocabModule.tsx, repointed at ~/german/*. German nouns carry their article in
// the lemma ("die Datei"), so the lemma is shown as-is. No TTS in the German layer.
import { useMemo, useState } from "preact/hooks";
import { germanDeck } from "~/german/state";
import type { VocabEntry, GerBand } from "~/german/types";
import { germanState, gradeWord, queueNewWords, recordNewIntro, getPlacement, getNewWordsPerDay, introducedToday } from "~/german/state";
import { type Locale } from "~/i18n";

type Props = { lang: Locale };

const now = () => Date.now();

// Band order, lowest first; a learner at a higher band still draws from the
// bands below it (just like English). Source from the aggregated germanDeck so
// new bands are picked up automatically as their decks land.
const ORDER: GerBand[] = ["A1", "A2", "B1"];

export default function VocabModule({ lang }: Props) {
  germanState.value; // subscribe
  const band = getPlacement()?.band ?? "A1";

  const bank = useMemo(() => {
    const maxIdx = ORDER.indexOf(band);
    return germanDeck.filter((e) => ORDER.indexOf(e.band) <= maxIdx);
  }, [band]);

  const queue = useMemo(() => {
    const ids = queueNewWords(bank.map((e) => e.id), now());
    const set = new Set(ids);
    return bank.filter((e) => set.has(e.id));
  }, [band, germanState.value]);

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

  const e = queue[i] as VocabEntry;

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
            {e.examples[0] ? (
              <div class="text-[13px] text-ink italic mt-1">“{e.examples[0]}”</div>
            ) : null}
            {e.collocations?.length ? <div class="text-[12px] text-muted mt-1">{e.collocations.join(" · ")}</div> : null}
          </>
        ) : (
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm self-start mt-2" onClick={() => setReveal(true)}>{L.show}</button>
        )}
      </div>
      {reveal ? (
        <div class="flex gap-2 mt-4 justify-center">
          <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => grade(true)}>{L.know}</button>
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade(false)}>{L.learn}</button>
        </div>
      ) : null}
    </div>
  );
}
