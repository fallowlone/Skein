// site/src/components/english/PlacementTest.tsx
import { useMemo, useState } from "preact/hooks";
import { buildPlacement, scorePlacement } from "~/english/placement/placement";
import { setPlacement, getPlacement, englishState } from "~/english/state";
import { type Locale } from "~/i18n";

type Props = { lang: Locale; onDone?: () => void };

const wrap = "my-6 max-w-[620px] mx-auto bg-card border border-rule-strong rounded-[2px] overflow-hidden";
const header = "flex items-center justify-between px-4 py-2.5 bg-card-2 border-b border-rule";

/** Simple seeded RNG; a fresh seed per attempt reshuffles the deck. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
}

export default function PlacementTest({ lang, onDone }: Props) {
  englishState.value; // subscribe
  const existing = getPlacement();
  const [seed, setSeed] = useState(1);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [yes, setYes] = useState<Set<number>>(new Set());
  const [done, setDone] = useState<null | ReturnType<typeof scorePlacement>>(null);

  const items = useMemo(() => buildPlacement(seeded(seed)), [seed]);

  function answer(known: boolean) {
    const nextYes = new Set(yes);
    if (known) nextYes.add(i);
    setYes(nextYes);
    if (i + 1 >= items.length) {
      const score = scorePlacement(items, nextYes);
      setPlacement(
        { estimatedKnown: score.estimatedKnown, band: score.band, takenAt: Date.now() },
        score.knownLemmas,
      );
      setDone(score);
    } else setI(i + 1);
  }

  function restart() {
    setSeed((s) => s + 1); setStarted(false); setI(0); setYes(new Set()); setDone(null);
  }

  const L = {
    title: lang === "en" ? "vocabulary check" : "проверка словаря",
    intro: lang === "en"
      ? "Mark each word you know the meaning of. Some are made-up — be honest, it keeps the estimate accurate."
      : "Отметь слова, значение которых знаешь. Часть — выдуманные; будь честен, это уточняет оценку.",
    begin: lang === "en" ? "Begin" : "Начать",
    know: lang === "en" ? "I know it" : "Знаю",
    dont: lang === "en" ? "I don't" : "Не знаю",
    again: lang === "en" ? "Retake" : "Заново",
    resultLead: lang === "en" ? "Estimated vocabulary" : "Оценка словаря",
    words: lang === "en" ? "word families" : "семей слов",
    start: lang === "en" ? "Starting band" : "Стартовый уровень",
  };

  if (done || (existing && !started)) {
    const est = done?.estimatedKnown ?? existing!.estimatedKnown;
    const band = done?.band ?? existing!.band;
    return (
      <aside class={wrap}>
        <div class={header}><span class="meta">{L.title} · {lang === "en" ? "done" : "готово"}</span></div>
        <div class="px-6 pt-5 pb-6">
          <div class="text-[13px] text-muted">{L.resultLead}</div>
          <div class="font-display text-[34px] font-bold text-ink leading-none my-1">~{est}</div>
          <div class="text-[13px] text-muted">{L.words} · {L.start}: <span class="text-ink font-semibold">{band}</span></div>
          <div class="flex gap-2.5 mt-4">
            <button type="button" class="btn ghost text-[12px]" onClick={restart}>{L.again}</button>
            {onDone ? <button type="button" class="btn link text-[12px]" onClick={onDone}>{lang === "en" ? "Continue" : "Дальше"}</button> : null}
          </div>
        </div>
      </aside>
    );
  }

  if (!started) {
    return (
      <aside class={wrap}>
        <div class={header}><span class="meta">{L.title}</span>
          <span class="badge muted">{lang === "en" ? "~4 min" : "~4 мин"}</span></div>
        <div class="px-6 pt-5 pb-6">
          <p class="text-[14px] text-ink-2 leading-relaxed mt-0 mb-4">{L.intro}</p>
          <button type="button" class="btn" onClick={() => setStarted(true)}>{L.begin}</button>
        </div>
      </aside>
    );
  }

  const item = items[i];
  return (
    <aside class={wrap}>
      <div class={header}>
        <span class="meta">{L.title} · {i + 1}/{items.length}</span>
        <button type="button" class="btn link text-muted text-[11px]" onClick={restart}>{L.again}</button>
      </div>
      <div class="h-[2px] bg-rule relative"><div class="absolute inset-0 bg-ink" style={`width:${((i + 1) / items.length) * 100}%`} /></div>
      <div class="px-6 pt-8 pb-8 flex flex-col items-center gap-6">
        <div class="font-display text-[30px] font-bold text-ink">{item.lemma}</div>
        <div class="flex gap-3">
          <button type="button" class="btn" onClick={() => answer(true)}>{L.know}</button>
          <button type="button" class="btn ghost" onClick={() => answer(false)}>{L.dont}</button>
        </div>
      </div>
    </aside>
  );
}
