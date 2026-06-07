// /english/review island: the daily drill. Mirrors Today.tsx's due-id logic (snapshot started
// cards → FSRS-due, capped) so ReviewSession is reused unchanged, plus VocabModule for new words.
import { useMemo } from "preact/hooks";
import { englishState, dueWordIds } from "~/english/state";
import { type Locale } from "~/i18n";
import ReviewSession from "../ReviewSession";
import VocabModule from "../VocabModule";

const now = () => Date.now();
const REVIEW_CAP = 30;

export default function ReviewRoute({ lang }: { lang: Locale }) {
  englishState.value; // subscribe
  const startedIds = useMemo(() => Object.keys(englishState.value.words), [englishState.value]);
  const due = useMemo(() => dueWordIds(startedIds, now()).slice(0, REVIEW_CAP), [startedIds]);

  const L = lang === "en"
    ? { due: "Reviews due", neww: "New words", clear: "All clear for today." }
    : { due: "Повторений", neww: "Новые слова", clear: "На сегодня всё." };

  return (
    <div class="max-w-[620px] mx-auto flex flex-col gap-8">
      <div class="meta">{L.due}: <span class="text-ink font-semibold">{due.length}</span></div>
      {due.length ? (
        <ReviewSession lang={lang} ids={due} />
      ) : (
        <div class="text-[13px] text-ink">{L.clear}</div>
      )}
      <div>
        <div class="meta mb-3">{L.neww}</div>
        <VocabModule lang={lang} />
      </div>
    </div>
  );
}
