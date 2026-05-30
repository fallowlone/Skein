// site/src/components/english/ReadingFeed.tsx
import { useMemo, useState } from "preact/hooks";
import { readingUnits } from "~/english/data/reading";
import type { ReadingUnit, Band } from "~/english/types";
import { englishState, getPlacement, isUnitRead, markUnitRead } from "~/english/state";
import { type Locale } from "~/i18n";
import EnReader from "./EnReader";

type Props = { lang: Locale };
type Stream = "general" | "engineering";
const now = () => Date.now();

/** Bands at or below the learner's placement band (so easier texts stay available). */
function bandsUpTo(band: Band): Band[] {
  const order: Band[] = ["A2", "B1", "B2"];
  return order.slice(0, order.indexOf(band) + 1);
}

export default function ReadingFeed({ lang }: Props) {
  englishState.value; // subscribe
  const band = getPlacement()?.band ?? "A2";
  const [stream, setStream] = useState<Stream>("engineering");
  const [openId, setOpenId] = useState<string | null>(null);

  const allowed = bandsUpTo(band);
  const list = useMemo<ReadingUnit[]>(
    () => readingUnits.filter((u) => allowed.includes(u.level) && u.stream === stream),
    [stream, band],
  );

  const L = {
    title: lang === "en" ? "Reading" : "Чтение",
    general: lang === "en" ? "General" : "Общий",
    engineering: lang === "en" ? "Engineering" : "Инженерный",
    back: lang === "en" ? "← All texts" : "← Все тексты",
    read: lang === "en" ? "read" : "прочитано",
    empty: lang === "en" ? "No texts at your level yet." : "Пока нет текстов твоего уровня.",
  };

  const open = openId ? readingUnits.find((u) => u.id === openId) : null;
  if (open) {
    return (
      <div class="max-w-[760px] mx-auto">
        <button type="button" class="btn link text-[12px] text-muted mb-4" onClick={() => setOpenId(null)}>{L.back}</button>
        <h2 class="font-display text-[24px] font-bold text-ink m-0 mb-1">{open.title[lang]}</h2>
        <p class="text-[14px] text-muted m-0 mb-5">{open.blurb[lang]}</p>
        <EnReader unit={open} lang={lang} onComplete={() => markUnitRead(open.id, open.targetWords ?? [], now())} />
      </div>
    );
  }

  return (
    <div class="max-w-[620px] mx-auto">
      <div class="flex gap-1 mb-6">
        {(["engineering", "general"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStream(s)}
            class={`font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border rounded-[2px] cursor-pointer transition-colors ${
              stream === s ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule hover:text-ink"
            }`}
          >
            {s === "general" ? L.general : L.engineering}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p class="text-[14px] text-muted">{L.empty}</p>
      ) : (
        <ul class="flex flex-col gap-2 m-0 p-0 list-none">
          {list.map((u) => {
            const done = isUnitRead(u.id);
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(u.id)}
                  class="w-full text-left bg-card border border-rule rounded-[2px] px-4 py-3 cursor-pointer hover:border-rule-strong transition-colors flex items-center gap-3"
                >
                  <span class="flex-1">
                    <span class="block text-[14px] text-ink font-semibold">{u.title[lang]}</span>
                    <span class="block text-[12px] text-muted">{u.source[lang]} · {u.level}</span>
                  </span>
                  {done ? <span class="text-[11px] font-mono uppercase text-muted border border-rule rounded-[2px] px-2 py-0.5">{L.read}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
