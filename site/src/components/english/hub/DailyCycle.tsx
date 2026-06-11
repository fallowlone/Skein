// The methodology's daily cycle, driven by live state — what's actually left TODAY: SRS → input →
// output (writing/speaking alternating by day parity). Each row links to the route that does it.
// Plain Preact inside HubLanding; logging hours (HoursPanel) visibly shrinks the "left" figures.
import { englishState, dueWordIds, dueChunks } from "~/english/state";
import { summarize } from "~/english/hours";
import { dailyPlan } from "~/english/daily";
import { type Locale } from "~/i18n";

const now = () => Date.now();

export default function DailyCycle({ lang }: { lang: Locale }) {
  const st = englishState.value; // subscribe
  const d = new Date();
  const todayISO = d.toISOString().slice(0, 10);
  const s = summarize(st.hoursLog, todayISO, todayISO); // weekStart unused here → today is fine
  const dueCount = dueWordIds(Object.keys(st.words), now()).length + dueChunks(now()).length;

  const plan = dailyPlan({
    dueCount,
    todaySrsMin: s.todayByKind.srs,
    todayInputMin: s.todayByKind["input-active"] + s.todayByKind["input-passive"],
    todayOutputMin: s.todayByKind.output,
    dayOfMonth: d.getDate(),
  });

  const L = lang === "en"
    ? { index: "TODAY", h: "Today's cycle", note: "SRS → input → output",
        srsT: "Review", srsM: (n: number) => `${n} card${n === 1 ? "" : "s"} due`,
        inT: "Comprehensible input", inM: "read · watch · listen — and log your external hours",
        outT: "Output", writing: "writing", speaking: "speaking",
        left: (m: number) => `${m}′ left`, done: "done ✓" }
    : { index: "СЕГОДНЯ", h: "Цикл на сегодня", note: "повтор → ввод → вывод",
        srsT: "Повторение", srsM: (n: number) => `${n} карт к повтору`,
        inT: "Понятный ввод", inM: "читать · смотреть · слушать — и записывай внешние часы",
        outT: "Вывод", writing: "письмо", speaking: "речь",
        left: (m: number) => `${m}′ осталось`, done: "готово ✓" };

  const rows = plan.map((b) => {
    if (b.key === "srs") return { b, title: L.srsT, meta: L.srsM(b.dueCount ?? 0), href: `/${lang}/english/review` };
    if (b.key === "input") return { b, title: L.inT, meta: L.inM, href: `/${lang}/english/reading` };
    const speaking = b.mode === "speaking";
    return { b, title: `${L.outT} · ${speaking ? L.speaking : L.writing}`, meta: "", href: `/${lang}/english/${speaking ? "speaking" : "writing"}` };
  });

  return (
    <section class="hub-section" aria-labelledby="cycle-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="cycle-h">{L.h}</h2>
        <span class="sec-note">{L.note}</span>
      </div>
      <div class="cycle">
        {rows.map(({ b, title, meta, href }, idx) => {
          const done = b.remainingMin === 0;
          return (
            <a key={b.key} href={href} class={`cycle-row${done ? " is-done" : ""}`}>
              <span class="cy-no">{done ? "✓" : idx + 1}</span>
              <div class="cy-body">
                <span class="cy-title">{title}</span>
                {meta ? <span class="cy-meta">{meta}</span> : null}
              </div>
              <span class={`cy-rem${done ? " zero" : ""}`}>{done ? L.done : L.left(b.remainingMin)}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
