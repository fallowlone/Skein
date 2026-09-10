import { Button as ShadcnButton } from "~/components/ui/button";
// site/src/components/english/ReadingFeed.tsx
import { useEffect, useMemo, useState } from "preact/hooks";
import { readingUnits } from "~/english/data/reading";
import type { ReadingUnit, Band } from "~/english/types";
import { englishState, getPlacement, isUnitRead, markUnitRead } from "~/english/state";
import { type Locale } from "~/i18n";
import { fetchCoachStatus } from "~/lib/coach";
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
  const [planStartId, setPlanStartId] = useState<string | null>(null);
  const [pro, setPro] = useState(false);

  useEffect(() => {
    let live = true;
    fetchCoachStatus()
      .then((status) => { if (live) setPro(status.entitlements.coach); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

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
    b2Banner: lang === "en"
      ? "You're at B2 — your input should now be native. These texts are the on-ramp; from here the real curriculum is authentic sources."
      : "Ты на B2 — ввод теперь должен быть нативным. Эти тексты — разгонная полоса; дальше программа — это настоящие источники.",
    b2Link: lang === "en" ? "Open the curated library →" : "Открыть отобранную библиотеку →",
    mapTitle: lang === "en" ? "Your Senior Map" : "Твоя Senior-карта",
    mapSubtitle: lang === "en"
      ? "Pick any exercise. We’ll build a 7-day reading + practice plan."
      : "Выбери любое упражнение. Мы составим 7-дневный план чтения и практики.",
    unlockLine: lang === "en"
      ? "Pro unlocks the full plan + progress tracking"
      : "Pro открывает полный план + отслеживание прогресса",
    unlockPro: lang === "en" ? "Unlock Pro" : "Открыть Pro",
    freePlan: lang === "en" ? "Generate free 3-day plan" : "Создать бесплатный план на 3 дня",
    bilingual: lang === "en" ? "Bilingual mode:" : "Двуязычный режим:",
    sideBySide: lang === "en" ? "side-by-side" : "рядом",
  };

  const open = openId ? readingUnits.find((u) => u.id === openId) : null;
  if (open) {
    return (
      <div class="max-w-[760px] mx-auto">
        <ShadcnButton type="button" class="oa-btn oa-btn-ghost oa-btn-sm text-[12px] text-muted mb-4" onClick={() => setOpenId(null)}>{L.back}</ShadcnButton>
        <h2 class="font-display text-[24px] font-bold text-ink m-0 mb-1">{open.title[lang]}</h2>
        <p class="text-[14px] text-muted m-0 mb-5">{open.blurb[lang]}</p>
        <EnReader unit={open} lang={lang} onComplete={() => markUnitRead(open.id, open.targetWords ?? [], now())} />
      </div>
    );
  }

  const planStart = planStartId ? list.findIndex((u) => u.id === planStartId) : 0;
  const start = planStart >= 0 ? planStart : 0;
  const plan = [...list.slice(start), ...list.slice(0, start)].slice(0, 7);
  const preview = plan.slice(0, 3);

  return (
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_366px] gap-10 lg:gap-[83px] items-start lg:translate-x-3">
      <div>
        {band === "B2" ? (
          <div class="mb-6 border-l-2 border-accent bg-card rounded-[2px] px-4 py-3">
            <p class="text-[13px] text-ink m-0">{L.b2Banner}</p>
            <a href={`/${lang}/english#curated`} class="inline-block mt-2 text-[12px] font-mono text-accent underline underline-offset-2">{L.b2Link}</a>
          </div>
        ) : null}
        <div class="flex gap-1 mb-5 lg:ml-[208px]">
          {(["engineering", "general"] as const).map((s) => (
            <ShadcnButton
              key={s}
              type="button"
              onClick={() => setStream(s)}
              class={`font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border rounded-[2px] cursor-pointer transition-colors ${
                stream === s ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule hover:text-ink"
              }`}
            >
              {s === "general" ? L.general : L.engineering}
            </ShadcnButton>
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
                  <ShadcnButton
                    type="button"
                    onClick={() => {
                      setPlanStartId(u.id);
                      setOpenId(u.id);
                    }}
                    class="w-full min-h-[62px] text-left bg-card border border-rule rounded-[2px] px-4 py-3 cursor-pointer hover:border-rule-strong transition-colors flex items-center gap-3"
                  >
                    <span class="flex-1">
                      <span class="block text-[14px] leading-[1.3] text-ink font-semibold">{u.title[lang]}</span>
                      <span class="block mt-0.5 text-[12px] leading-[1.3] text-muted">{u.source[lang]} · {u.level}</span>
                    </span>
                    {done ? <span class="text-[11px] font-mono uppercase text-muted border border-rule rounded-[2px] px-2 py-0.5">{L.read}</span> : null}
                  </ShadcnButton>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside class="bg-card border border-rule rounded-[12px] px-[26px] py-[24px] shadow-soft lg:mt-[47px]">
        <div class="flex items-center gap-3 mb-3">
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 30 30" fill="none" class="shrink-0 text-ink">
            <path d="M3.5 6.5 10.5 3l9 3.5 7-3.5v20l-7 3.5-9-3.5-7 3.5v-20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            <path d="M10.5 3v20m9-16.5v20" stroke="currentColor" stroke-width="1.8" />
          </svg>
          <h2 class="font-body text-[25px] leading-none font-bold text-ink m-0">{L.mapTitle}</h2>
        </div>
        <p class="text-[15px] leading-[1.45] text-ink m-0 mb-4">{L.mapSubtitle}</p>

        <div class="border border-rule mb-4">
          {preview.map((u, i) => (
            <ShadcnButton
              key={u.id}
              type="button"
              onClick={() => {
                setPlanStartId(u.id);
                setOpenId(u.id);
              }}
              class="w-full min-h-[55px] grid grid-cols-[68px_1fr] items-center text-left border-0 border-b border-rule last:border-b-0 bg-transparent px-3 cursor-pointer hover:bg-paper/40 transition-colors"
            >
              <span class="font-mono text-[10px] font-bold tracking-[0.08em] text-ink">DAY {i + 1}</span>
              <span class="text-[13px] text-ink">{u.title[lang]}</span>
            </ShadcnButton>
          ))}
          {[4, 5, 6, 7].map((day) => {
            const unit = plan[day - 1];
            return pro && unit ? (
              <ShadcnButton
                key={day}
                type="button"
                onClick={() => {
                  setPlanStartId(unit.id);
                  setOpenId(unit.id);
                }}
                class="w-full min-h-[55px] grid grid-cols-[68px_1fr] items-center text-left border-0 border-b border-rule last:border-b-0 bg-transparent px-3 cursor-pointer hover:bg-paper/40 transition-colors"
              >
                <span class="font-mono text-[10px] font-bold tracking-[0.08em] text-ink">DAY {day}</span>
                <span class="text-[13px] text-ink">{unit.title[lang]}</span>
              </ShadcnButton>
            ) : (
              <div key={day} class="min-h-[55px] grid grid-cols-[68px_1fr] items-center border-b border-rule last:border-b-0 px-3 text-muted">
                <span class="font-mono text-[10px] font-bold tracking-[0.08em] opacity-60">DAY {day}</span>
                <span class="flex items-center gap-3 min-w-0">
                  <svg aria-hidden="true" width="14" height="16" viewBox="0 0 14 16" fill="none" class="shrink-0 opacity-70">
                    <rect x="2" y="7" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.4" />
                    <path d="M4.5 7V4.5a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" stroke-width="1.4" />
                  </svg>
                  <span class="block text-[12px] whitespace-nowrap overflow-hidden blur-[2.5px] opacity-60 select-none">
                    {unit?.title[lang] ?? (lang === "en" ? "Building a senior reading habit" : "Развитие навыка чтения senior")}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {!pro ? (
          <>
            <div class="flex items-center gap-3 text-[13px] text-ink mb-4">
              <svg aria-hidden="true" width="16" height="18" viewBox="0 0 16 18" fill="none" class="shrink-0">
                <rect x="2" y="8" width="12" height="9" rx="1" stroke="currentColor" stroke-width="1.5" />
                <path d="M5 8V5a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <span>{L.unlockLine}</span>
            </div>

            <a href={`/${lang}/settings#coach-plan`} class="flex min-h-[46px] items-center justify-center bg-ink text-paper border border-ink rounded-[2px] font-mono text-[13px] no-underline hover:opacity-90 transition-opacity">
              {L.unlockPro}
            </a>
          </>
        ) : null}
        <ShadcnButton
          type="button"
          onClick={() => {
            if (!preview[0]) return;
            setPlanStartId(preview[0].id);
            setOpenId(preview[0].id);
          }}
          class={`w-full min-h-[46px] ${pro ? "" : "mt-2.5"} bg-transparent text-ink border border-rule-strong rounded-[2px] font-mono text-[13px] cursor-pointer hover:bg-paper/40 transition-colors`}
        >
          {L.freePlan}
        </ShadcnButton>

        <div class="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-ink">
          <span>{L.bilingual}</span>
          <span class="font-mono border border-rule rounded-[2px] px-2 py-0.5">EN</span>
          <span aria-hidden="true">⇄</span>
          <span class="font-mono border border-rule rounded-[2px] px-2 py-0.5">RU</span>
          <span>{L.sideBySide}</span>
        </div>
      </aside>
    </div>
  );
}
