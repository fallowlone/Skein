// Coverage meter (Signature #1). A semicircular gauge of overall known-word coverage over the
// active register's vocab bank, plus per-CEFR-band frequency rows. All numbers derive from
// liveCoverage(register) — never hardcoded. Plain Preact inside HubLanding; reads register.value +
// englishState.value in the body to re-render on change. prefers-reduced-motion is handled in CSS
// (we set stroke-dashoffset directly, no JS animation).
import { register } from "~/english/register";
import { liveCoverage } from "~/english/coverage";
import { englishState } from "~/english/state";
import type { Band } from "~/english/types";
import { type Locale } from "~/i18n";

// gauge geometry — matches the arc d="M30 160 A130 130 0 0 1 290 160" (center 160,160 · r 130).
const R = 130;
const CX = 160;
const CY = 160;
const LEN = Math.PI * R; // semicircle arc length ≈ 408.4

// tier color for a band fill, per the legend (≥90 ok · ≥75 accent · else warn).
function tierColor(pct: number): string {
  if (pct >= 90) return "color-mix(in srgb, var(--ok) 80%, var(--ink))";
  if (pct >= 75) return "var(--accent)";
  return "color-mix(in srgb, var(--warn) 80%, var(--ink))";
}

export default function CoverageMeter({ lang }: { lang: Locale }) {
  const reg = register.value; // subscribe to register
  englishState.value; // subscribe to known-set changes
  const cov = liveCoverage(reg);
  const pct = cov.overallPct;

  const dashoffset = LEN * (1 - pct / 100);
  const angle = Math.PI * (1 - pct / 100);
  const ptx = CX + R * Math.cos(angle);
  const pty = CY - R * Math.sin(angle);

  const bandLabel = (b: Band) =>
    b === "A2" ? (lang === "en" ? "A2 · core" : "A2 · база")
    : b === "B1" ? (lang === "en" ? "B1 · working" : "B1 · рабочий")
    : (lang === "en" ? "B2 · advanced" : "B2 · продвинутый");

  const corpusName =
    reg === "engineering"
      ? lang === "en" ? "Backend Engineering" : "Backend-инженерия"
      : lang === "en" ? "General English" : "Общий английский";

  const L =
    lang === "en"
      ? {
          index: "01 · INSTRUMENT",
          h: "Coverage",
          note: "How much of this corpus you can already read",
          known: "words known",
          functional: "functional",
          fluent: "fluent reading",
          corpus: "Corpus",
          families: (n: number) => `${n.toLocaleString("en-US")} word families`,
          ge90: "≥ 90%",
          mid: "75–90%",
          lt75: "< 75%",
          cite: "frequency coverage, after Nation — 98% needed for unaided reading",
          caption1: "Signature.",
          caption2:
            " Your known-word profile measured against a frequency corpus — dashed lines mark the 75% and 90% thresholds. An instrument, not a score.",
          gaugeAria: `Coverage gauge: ${pct} percent`,
        }
      : {
          index: "01 · ИНСТРУМЕНТ",
          h: "Охват",
          note: "Сколько из этого корпуса ты уже можешь читать",
          known: "слов знакомо",
          functional: "функционально",
          fluent: "беглое чтение",
          corpus: "Корпус",
          families: (n: number) => `${n.toLocaleString("ru-RU")} семейств слов`,
          ge90: "≥ 90%",
          mid: "75–90%",
          lt75: "< 75%",
          cite: "частотный охват, по Нейшну — для чтения без словаря нужно 98%",
          caption1: "Сигнатура.",
          caption2:
            " Твой профиль знакомых слов на фоне частотного корпуса — пунктир отмечает пороги 75% и 90%. Это инструмент, а не оценка.",
          gaugeAria: `Шкала охвата: ${pct} процентов`,
        };

  return (
    <section class="hub-section" aria-labelledby="cov-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="cov-h">{L.h}</h2>
        <span class="sec-note">{L.note}</span>
      </div>

      <div class="coverage card">
        <div class="contour-field" aria-hidden="true"></div>

        {/* gauge */}
        <div class="gauge-col">
          <div class="gauge-wrap">
            <svg viewBox="0 0 320 188" role="img" aria-label={L.gaugeAria}>
              <path
                class="gauge-track"
                fill="none"
                stroke-width="14"
                stroke-linecap="round"
                d="M30 160 A130 130 0 0 1 290 160"
              />
              <path
                class="gauge-value"
                fill="none"
                stroke-width="14"
                stroke-linecap="round"
                d="M30 160 A130 130 0 0 1 290 160"
                stroke-dasharray={LEN}
                stroke-dashoffset={dashoffset}
              />
              {/* threshold ticks at 75% & 90% (static, copied from the mockup geometry) */}
              <g class="gauge-tick" stroke-width="2">
                <line x1="243.4" y1="66.6" x2="254.8" y2="55.2" />
                <line x1="272.2" y1="113.5" x2="287.4" y2="108.6" />
              </g>
              <text class="gauge-tlabel" x="250" y="44" text-anchor="middle">75</text>
              <text class="gauge-tlabel" x="300" y="104" text-anchor="start">90</text>
              <circle class="gauge-pointer" cx={ptx} cy={pty} r="5.5" />
            </svg>
            <div class="gauge-readout">
              <span class="gr-num">
                {pct}
                <sup>%</sup>
              </span>
              <span class="gr-lbl">{L.known}</span>
            </div>
          </div>
          <div class="gauge-thresholds">
            <span>
              <b>75%</b> {L.functional}
            </span>
            <span>
              <b>90%</b> {L.fluent}
            </span>
          </div>
        </div>

        {/* frequency bands */}
        <div class="bands">
          <div class="bands-head">
            <span class="corpus">
              <span class="sq" aria-hidden="true"></span>
              {L.corpus} · <b>{corpusName}</b>
            </span>
            <span class="fam">{L.families(cov.corpusTotal)}</span>
          </div>

          <div>
            {cov.bands.map((b) => (
              <div class="band-row" key={b.band}>
                <span class="bl">{bandLabel(b.band)}</span>
                <span class="band-track">
                  {/* in-flow BLOCK div with inline width — never a span-in-inline (parser bug) */}
                  <div
                    style={`width:${b.pct}%;height:100%;background:${tierColor(b.pct)};border-radius:inherit`}
                  ></div>
                  <span class="band-grid" aria-hidden="true">
                    <i style="left:75%"></i>
                    <i style="left:90%"></i>
                  </span>
                </span>
                <span class="band-pct">{b.pct}%</span>
              </div>
            ))}
          </div>

          <div class="bands-foot">
            <div class="bands-legend">
              <span>
                <i class="k" style="background:color-mix(in srgb,var(--ok) 80%,var(--ink))"></i> {L.ge90}
              </span>
              <span>
                <i class="k" style="background:var(--accent)"></i> {L.mid}
              </span>
              <span>
                <i class="k" style="background:color-mix(in srgb,var(--warn) 80%,var(--ink))"></i> {L.lt75}
              </span>
            </div>
            <span class="cite">{L.cite}</span>
          </div>
        </div>
      </div>
      <p class="fig-caption">
        <b>{L.caption1}</b>
        {L.caption2}
      </p>
    </section>
  );
}
