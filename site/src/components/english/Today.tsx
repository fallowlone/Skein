// site/src/components/english/Today.tsx
import { useMemo, useState } from "preact/hooks";
import { englishState, dueWordIds, getPlacement } from "~/english/state";
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

  const L = {
    due: lang === "en" ? "Reviews due" : "Повторений",
    reviewHint: lang === "en" ? "Open the Reading tab's Review to clear them." : "Открой Review во вкладке Reading.",
    newWords: lang === "en" ? "New words" : "Новые слова",
    allClear: lang === "en" ? "All clear for today. 🎉" : "На сегодня всё. 🎉",
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
    </div>
  );
}
