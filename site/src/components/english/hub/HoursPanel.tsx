// Input-hours panel — the methodology's primary metric, with one-tap quick-log for EXTERNAL
// input (YouTube/podcasts/reading outside the site). Plain Preact inside HubLanding; styled with
// the english-hub.css editorial vocabulary, not utility classes.
import { englishState, logMinutes } from "~/english/state";
import { summarize } from "~/english/hours";
import { type Locale } from "~/i18n";

function mondayOf(d: Date): string {
  const day = (d.getDay() + 6) % 7; // Mon=0
  const m = new Date(d);
  m.setDate(d.getDate() - day);
  return m.toISOString().slice(0, 10);
}

export default function HoursPanel({ lang }: { lang: Locale }) {
  const log = englishState.value.hoursLog; // subscribe
  const now = new Date();
  const s = summarize(log, now.toISOString().slice(0, 10), mondayOf(now));
  const L = lang === "en"
    ? {
        index: "METRIC · HOURS",
        h: "Input hours",
        note: "Hours of comprehensible input decide progress",
        sub: "Log what you watched, read or listened to OUTSIDE the site too — that volume is 80% of the gain.",
        today: "today", week: "this week", total: "total",
        add: "Log external input",
        active: "active", passive: "passive",
        kActive: "active input", kPassive: "passive", kSrs: "review", kOutput: "output",
      }
    : {
        index: "МЕТРИКА · ЧАСЫ",
        h: "Часы ввода",
        note: "Прогресс решают часы понятного ввода",
        sub: "Записывай и то, что смотрел, читал или слушал ВНЕ сайта — этот объём даёт 80% результата.",
        today: "сегодня", week: "за неделю", total: "всего",
        add: "Записать внешний ввод",
        active: "активный", passive: "пассивный",
        kActive: "активный ввод", kPassive: "пассивный", kSrs: "повторение", kOutput: "вывод",
      };
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
  const breakdown: [string, number][] = [
    [L.kActive, s.byKind["input-active"]],
    [L.kPassive, s.byKind["input-passive"]],
    [L.kSrs, s.byKind.srs],
    [L.kOutput, s.byKind.output],
  ];

  return (
    <section class="hub-section" aria-labelledby="hours-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="hours-h">{L.h}</h2>
        <span class="sec-note">{L.note}</span>
      </div>

      <div class="hours card">
        <p class="kicker" style="margin:0 0 2px">{L.sub}</p>
        <div class="hours-stats">
          <div class="hstat"><span class="hs-num">{fmt(s.todayMin)}</span><span class="hs-lbl">{L.today}</span></div>
          <div class="hstat"><span class="hs-num">{fmt(s.weekMin)}</span><span class="hs-lbl">{L.week}</span></div>
          <div class="hstat"><span class="hs-num">{fmt(s.totalMin)}</span><span class="hs-lbl">{L.total}</span></div>
        </div>
        <div class="hours-break">
          {breakdown.map(([label, min]) => (
            <span key={label}><b>{fmt(min)}</b> {label}</span>
          ))}
        </div>
        <div class="hours-log">
          <span class="hl-label">{L.add}</span>
          {[15, 30, 60].map((m) => (
            <button key={m} type="button" class="btn btn-ext btn-sm"
              onClick={() => logMinutes("input-active", m, "external")}>
              +{m}′ {L.active}
            </button>
          ))}
          <button type="button" class="btn btn-ext btn-sm"
            onClick={() => logMinutes("input-passive", 30, "external")}>
            +30′ {L.passive}
          </button>
        </div>
      </div>
    </section>
  );
}
