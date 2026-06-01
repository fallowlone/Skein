// site/src/components/english/Today.tsx
import { useMemo, useState } from "preact/hooks";
import { englishState, dueWordIds, getPlacement, isUnitRead, outputAttemptOf, isGrammarDone } from "~/english/state";
import { readingUnits } from "~/english/data/reading";
import { grammarPoints } from "~/english/data/grammar";
import { outputTasks } from "~/english/data/output/tasks";
import { userState } from "~/scripts/user-state";
import { todayISO } from "~/scripts/progression/streak";
import { type Locale } from "~/i18n";
import PlacementTest from "./PlacementTest";
import VocabModule from "./VocabModule";
import ReviewSession from "./ReviewSession";

type Props = { lang: Locale };
const now = () => Date.now();
const REVIEW_CAP = 30;

export default function Today({ lang }: Props) {
  englishState.value; // subscribe
  const placement = getPlacement();
  const [placing, setPlacing] = useState(!placement);

  const startedIds = useMemo(() => Object.keys(englishState.value.words), [englishState.value]);
  const due = useMemo(() => dueWordIds(startedIds, now()).slice(0, REVIEW_CAP), [startedIds]);
  const dueTotal = useMemo(() => dueWordIds(startedIds, now()).length, [startedIds]);
  const welcomeBack = useMemo(() => {
    const last = userState.value.progression.streak.lastActiveDay;
    if (!last) return false;
    // Match the streak module's UTC convention (daysBetween appends T00:00:00Z).
    const days = Math.round((Date.parse(todayISO() + "T00:00:00Z") - Date.parse(last + "T00:00:00Z")) / 86_400_000);
    return days >= 2;
  }, [userState.value]);

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
    reviews: lang === "en" ? "Reviews" : "Повторение",
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
    waiting: lang === "en" ? `reviews waiting — capped at ${REVIEW_CAP} today` : `повторений ждёт — сегодня лимит ${REVIEW_CAP}`,
    welcome: lang === "en" ? "Welcome back — your streak is safe. Pick up where you left off." : "С возвращением — серия сохранена. Продолжай с того места, где остановился.",
  };

  if (placing || !placement) {
    return <PlacementTest lang={lang} onDone={() => setPlacing(false)} />;
  }

  return (
    <div class="max-w-[620px] mx-auto flex flex-col gap-8">
      {welcomeBack ? (
        <div class="text-[13px] text-ink bg-card border border-rule rounded-[2px] px-4 py-3">{L.welcome}</div>
      ) : null}
      <div class="flex items-center gap-4 flex-wrap">
        <div class="text-[13px] font-mono text-muted">{L.due}: <span class="text-ink font-semibold">{due.length}</span></div>
        {due.length ? null : <div class="text-[13px] text-ink">{L.allClear}</div>}
        {dueTotal > REVIEW_CAP ? <div class="text-[12px] text-muted">· {dueTotal} {L.waiting}</div> : null}
      </div>
      {due.length ? (
        <div>
          <div class="meta mb-3">{L.reviews}</div>
          <ReviewSession lang={lang} ids={due} />
        </div>
      ) : null}
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
