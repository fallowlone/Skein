// site/src/components/german/Today.tsx
// Orchestrator for the German daily loop: placement gate → due reviews → new words.
// Mirrors site/src/components/english/Today.tsx, repointed at ~/german/*, but limited
// to the modules that exist in the German layer today (vocab + placement). Reading,
// grammar and output pointers are intentionally omitted until those German modules land.
import { useMemo, useState } from "preact/hooks";
import { germanState, dueWordIds, getPlacement } from "~/german/state";
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
  germanState.value; // subscribe
  const placement = getPlacement();
  const [placing, setPlacing] = useState(!placement);

  const startedIds = useMemo(() => Object.keys(germanState.value.words), [germanState.value]);
  const due = useMemo(() => dueWordIds(startedIds, now()).slice(0, REVIEW_CAP), [startedIds]);
  const dueTotal = useMemo(() => dueWordIds(startedIds, now()).length, [startedIds]);
  const welcomeBack = useMemo(() => {
    const last = userState.value.progression.streak.lastActiveDay;
    if (!last) return false;
    // Match the streak module's UTC convention (daysBetween appends T00:00:00Z).
    const days = Math.round((Date.parse(todayISO() + "T00:00:00Z") - Date.parse(last + "T00:00:00Z")) / 86_400_000);
    return days >= 2;
  }, [userState.value]);

  const L = {
    due: lang === "en" ? "Reviews due" : "Повторений",
    reviews: lang === "en" ? "Reviews" : "Повторение",
    newWords: lang === "en" ? "New words" : "Новые слова",
    allClear: lang === "en" ? "All clear for today. 🎉" : "На сегодня всё. 🎉",
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
    </div>
  );
}
