// site/src/components/english/Today.tsx
import { useMemo, useState } from "preact/hooks";
import { englishState, dueWordIds, getPlacement, isUnitRead, outputAttemptOf, isGrammarDone } from "~/english/state";
import { readingUnits } from "~/english/data/reading";
import { grammarPoints } from "~/english/data/grammar";
import { outputTasks } from "~/english/data/output/tasks";
import { type Locale } from "~/i18n";
import PlacementTest from "./PlacementTest";
import VocabModule from "./VocabModule";

type Props = { lang: Locale };
const now = () => Date.now();
const REVIEW_CAP = 30;

export default function Today({ lang }: Props) {
  englishState.value; // subscribe
  const placement = getPlacement();
  const [placing, setPlacing] = useState(!placement);

  const startedIds = useMemo(() => Object.keys(englishState.value.words), [englishState.value]);
  const due = useMemo(() => dueWordIds(startedIds, now()).slice(0, REVIEW_CAP), [startedIds]);

  const nextText = useMemo(() => {
    const order = ["A2", "B1", "B2"];
    const maxIdx = order.indexOf(placement?.band ?? "A2");
    const eligible = readingUnits.filter((u) => order.indexOf(u.level) <= maxIdx && !isUnitRead(u.id));
    return eligible.find((u) => u.stream === "engineering") ?? eligible[0] ?? null;
  }, [englishState.value, placement]);

  const outputTask = useMemo(() => {
    const order = ["A2", "B1", "B2"];
    const maxIdx = order.indexOf(placement?.band ?? "A2");
    const showToday = Math.floor(now() / 86_400_000) % 3 === 0; // ~every 3rd day
    if (!showToday) return null;
    return outputTasks.find((t) => order.indexOf(t.band) <= maxIdx && !outputAttemptOf(t.id)) ?? null;
  }, [englishState.value, placement]);

  const grammarPoint = useMemo(() => {
    const order = ["A2", "B1", "B2"];
    const maxIdx = order.indexOf(placement?.band ?? "A2");
    return grammarPoints.find((p) => order.indexOf(p.band) <= maxIdx && !isGrammarDone(p.id)) ?? null;
  }, [englishState.value, placement]);

  const L = {
    due: lang === "en" ? "Reviews due" : "Повторений",
    reviewHint: lang === "en" ? "Open a text below and use its Review tab." : "Открой текст ниже и используй вкладку Review.",
    newWords: lang === "en" ? "New words" : "Новые слова",
    allClear: lang === "en" ? "All clear for today. 🎉" : "На сегодня всё. 🎉",
    reading: lang === "en" ? "Today's reading" : "Чтение на сегодня",
    readCta: lang === "en" ? "Open in Reading below ↓" : "Открой в разделе «Чтение» ниже ↓",
    readDone: lang === "en" ? "Reading done for today. ✅" : "Чтение на сегодня сделано. ✅",
    output: lang === "en" ? "Today's writing" : "Письмо на сегодня",
    outputCta: lang === "en" ? "Open in Output below ↓" : "Открой в разделе «Письмо» ниже ↓",
    grammar: lang === "en" ? "Today's grammar" : "Грамматика на сегодня",
    grammarCta: lang === "en" ? "Open in Grammar & Phrasing below ↓" : "Открой в разделе «Грамматика и фразы» ниже ↓",
    grammarDone: lang === "en" ? "Grammar done for now. ✅" : "Грамматика пока пройдена. ✅",
  };

  if (placing || !placement) {
    return <PlacementTest lang={lang} onDone={() => setPlacing(false)} />;
  }

  return (
    <div class="max-w-[620px] mx-auto flex flex-col gap-8">
      <div class="flex items-center gap-4">
        <div class="text-[13px] font-mono text-muted">{L.due}: <span class="text-ink font-semibold">{due.length}</span></div>
        {due.length ? <div class="text-[12px] text-muted">{L.reviewHint}</div> : <div class="text-[13px] text-ink">{L.allClear}</div>}
      </div>
      <div>
        <div class="meta mb-3">{L.newWords}</div>
        <VocabModule lang={lang} />
      </div>
      <div>
        <div class="meta mb-2">{L.reading}</div>
        {nextText ? (
          <div class="text-[14px] text-ink">
            <span class="font-semibold">{nextText.title[lang]}</span>
            <span class="text-muted"> — {L.readCta}</span>
          </div>
        ) : (
          <div class="text-[13px] text-ink">{L.readDone}</div>
        )}
      </div>
      <div>
        <div class="meta mb-2">{L.grammar}</div>
        {grammarPoint ? (
          <div class="text-[14px] text-ink">
            <span class="font-semibold">{grammarPoint.title[lang]}</span>
            <span class="text-muted"> — {L.grammarCta}</span>
          </div>
        ) : (
          <div class="text-[13px] text-ink">{L.grammarDone}</div>
        )}
      </div>
      {outputTask ? (
        <div>
          <div class="meta mb-2">{L.output}</div>
          <div class="text-[14px] text-ink"><span class="font-semibold">{outputTask.prompt[lang]}</span><span class="text-muted"> — {L.outputCta}</span></div>
        </div>
      ) : null}
    </div>
  );
}
