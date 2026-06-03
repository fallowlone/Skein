// site/src/components/german/ReadingFeed.tsx
// German reading feed. Adapted from components/english/ReadingFeed.tsx, repointed to
// ~/german/*. Lists reading units filtered by the learner's placement band (and all
// easier bands) and the chosen stream; opening one renders DeReader. Completing a
// unit's comprehension check seeds its targetWords into the SRS deck via markUnitRead.
import { useMemo, useState } from "preact/hooks";
import { readingUnits } from "~/german/data/reading";
import type { ReadingUnit, GerBand } from "~/german/types";
import { germanState, getPlacement, isUnitRead, markUnitRead } from "~/german/state";
import { type Locale } from "~/i18n";
import DeReader from "./DeReader";

type Props = { lang: Locale };
type Stream = "general" | "engineering";
const now = () => Date.now();

/** Bands at or below the learner's placement band (so easier texts stay available). */
function bandsUpTo(band: GerBand): GerBand[] {
  const order: GerBand[] = ["A1", "A2", "B1"];
  return order.slice(0, order.indexOf(band) + 1);
}

export default function ReadingFeed({ lang }: Props) {
  germanState.value; // subscribe
  const band = getPlacement()?.band ?? "A1";
  const [stream, setStream] = useState<Stream>("engineering");
  const [openId, setOpenId] = useState<string | null>(null);

  const allowed = bandsUpTo(band);
  const list = useMemo<ReadingUnit[]>(
    () => readingUnits.filter((u) => allowed.includes(u.level) && u.stream === stream),
    [stream, band],
  );

  const L = {
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
        <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm text-[12px] text-muted mb-4" onClick={() => setOpenId(null)}>{L.back}</button>
        <h2 class="font-display text-[24px] font-bold text-ink m-0 mb-1">{open.title[lang]}</h2>
        <p class="text-[14px] text-muted m-0 mb-5">{open.blurb[lang]}</p>
        <DeReader unit={open} lang={lang} onComplete={() => markUnitRead(open.id, open.targetWords ?? [], now())} />
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
