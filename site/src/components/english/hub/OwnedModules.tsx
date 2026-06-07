// Owned modules row — the two things we build here: Vocabulary (SRS) and Reading. Every figure is
// derived from englishState: due count, a real 7-day due projection (started cards bucketed by their
// card.due day), tracked/known totals, and a per-unit reading-coverage ring over the recommended
// unit's target words. Where the mockup showed a number we can't derive ("89% retained"), we omit
// it. Plain Preact inside HubLanding.
import { englishState, dueWordIds, knownCount, isKnown } from "~/english/state";
import { register } from "~/english/register";
import { ALL_IDS, recommendedUnit } from "./selectors";
import { type Locale } from "~/i18n";

const now = () => Date.now();
const DAY = 86_400_000;

/** Bucket started cards into the next 7 days by their due time; bucket 0 = due now/overdue. */
function dueProjection(): number[] {
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  const t0 = now();
  for (const rec of Object.values(englishState.value.words)) {
    if (rec.card.reps <= 0) continue;
    const offset = Math.floor((rec.card.due - t0) / DAY);
    if (offset <= 0) buckets[0]++;
    else if (offset < 7) buckets[offset]++;
  }
  return buckets;
}

export default function OwnedModules({ lang }: { lang: Locale }) {
  englishState.value; // subscribe
  register.value; // subscribe (corpus framing, ring recompute)

  const due = dueWordIds(ALL_IDS, now()).length;
  const tracked = Object.keys(englishState.value.words).length;
  const known = knownCount(ALL_IDS);
  const proj = dueProjection();
  const projMax = Math.max(1, ...proj);

  const unit = recommendedUnit();
  const targets = unit?.targetWords ?? [];
  const unitKnown = targets.filter((id) => isKnown(id)).length;
  const unitPct = targets.length ? Math.round((unitKnown / targets.length) * 100) : null;
  const newTerms = targets.length ? targets.length - unitKnown : null;

  // ring geometry: circumference for r=15 ≈ 94.2; offset hides the unknown remainder.
  const RING = 2 * Math.PI * 15;
  const ringOffset = unitPct === null ? RING : RING * (1 - unitPct / 100);

  const L =
    lang === "en"
      ? {
          index: "04",
          h: "Built here",
          tag: "Own · live in the product",
          vKicker: "Vocabulary · spaced repetition",
          vTitle: "Due today",
          backend: "backend",
          cards: "cards",
          schedTitle: "Reviews scheduled across the next 7 days",
          tracked: (t: number, k: number) =>
            `${t.toLocaleString("en-US")} words tracked · ${k.toLocaleString("en-US")} at "known" maturity.`,
          noneTracked: "No cards yet — start a review or paste content below to build your deck.",
          vCite: "spaced retrieval, after Roediger & Karpicke",
          reviewNow: "Review now",
          rKicker: "Reading · on our own lessons",
          rTitleUnit: (t: string) => `Continue — ${t}`,
          rTitleNone: "Reading",
          iplus: "comprehensible · i+1",
          rLine:
            "An annotated reader over the site's engineering lessons. Unknown words are tappable and feed straight into your deck.",
          ringTxt: (n: number) =>
            ` of this lesson's words known — ${n} new term${n === 1 ? "" : "s"} ahead.`,
          ringNone: "Open the reader to start a lesson — coverage builds as you read.",
          rCite: "comprehensible input, after Krashen",
          openReader: "Open reader",
        }
      : {
          index: "04",
          h: "Создано здесь",
          tag: "Сам · работает в продукте",
          vKicker: "Словарь · интервальное повторение",
          vTitle: "Сегодня к повторению",
          backend: "backend",
          cards: "карт",
          schedTitle: "Повторения на ближайшие 7 дней",
          tracked: (t: number, k: number) =>
            `${t.toLocaleString("ru-RU")} слов отслеживается · ${k.toLocaleString("ru-RU")} на уровне «знаю».`,
          noneTracked: "Карт пока нет — начни повторение или вставь текст ниже, чтобы собрать колоду.",
          vCite: "интервальное повторение, по Roediger & Karpicke",
          reviewNow: "Повторить",
          rKicker: "Чтение · по нашим урокам",
          rTitleUnit: (t: string) => `Продолжить — ${t}`,
          rTitleNone: "Чтение",
          iplus: "понятно · i+1",
          rLine:
            "Аннотированный ридер по инженерным урокам сайта. Незнакомые слова кликабельны и сразу идут в колоду.",
          ringTxt: (n: number) =>
            ` слов этого урока знакомо — впереди ${n} новых терм${n === 1 ? "ин" : "ина/ов"}.`,
          ringNone: "Открой ридер, чтобы начать урок — охват растёт по мере чтения.",
          rCite: "понятный ввод, по Krashen",
          openReader: "Открыть ридер",
        };

  return (
    <section class="hub-section" aria-labelledby="own-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="own-h">{L.h}</h2>
        <span class="mode-tag is-own"><span class="glyph">●</span> {L.tag}</span>
      </div>

      <div class="row-2">
        {/* Vocabulary */}
        <div class="module">
          <div class="mod-head">
            <div>
              <div class="kicker" style="margin-bottom:6px">{L.vKicker}</div>
              <div class="mod-title">{L.vTitle}</div>
            </div>
            <span class="domain-tag" style="--d:var(--d-backend)"><span class="sq"></span>{L.backend}</span>
          </div>
          <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:var(--s-4)">
            <div class="due">
              <span class="due-num">{due}</span>
              <span class="due-lbl">{L.cards}</span>
            </div>
            <div class="sched" title={L.schedTitle} aria-hidden="true">
              {proj.map((v, i) => (
                <i
                  key={i}
                  class={i === 0 ? "now" : undefined}
                  style={`height:${Math.max(8, Math.round((v / projMax) * 100))}%`}
                ></i>
              ))}
            </div>
          </div>
          <p class="mod-line">{tracked > 0 ? L.tracked(tracked, known) : L.noneTracked}</p>
          <div class="mod-foot">
            <span class="cite">{L.vCite}</span>
            <a class="btn btn-primary btn-sm" href={`/${lang}/english/review`}>
              <span>{L.reviewNow}</span><span class="arrow">→</span>
            </a>
          </div>
        </div>

        {/* Reading */}
        <div class="module">
          <div class="mod-head">
            <div>
              <div class="kicker" style="margin-bottom:6px">{L.rKicker}</div>
              <div class="mod-title">{unit ? L.rTitleUnit(unit.title[lang]) : L.rTitleNone}</div>
            </div>
            <span class="iplus">{L.iplus}</span>
          </div>
          <p class="mod-line">{L.rLine}</p>
          <div class="read-cov">
            <svg class="rc-ring" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15" stroke="color-mix(in srgb,var(--ink) 12%,transparent)" stroke-width="3" />
              <circle
                cx="18" cy="18" r="15" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"
                stroke-dasharray={RING} stroke-dashoffset={ringOffset} transform="rotate(-90 18 18)"
              />
            </svg>
            <span class="rc-txt">
              {unitPct !== null && newTerms !== null ? (
                <>
                  <b>{unitPct}%</b>{L.ringTxt(newTerms)}
                </>
              ) : (
                L.ringNone
              )}
            </span>
          </div>
          <div class="mod-foot">
            <span class="cite">{L.rCite}</span>
            <a class="btn btn-primary btn-sm" href={`/${lang}/english/reading`}>
              <span>{L.openReader}</span><span class="arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
