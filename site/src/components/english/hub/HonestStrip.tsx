// "What we don't build" — the honest strip. Static three-item grid stating the three things we
// deliberately don't own and where we route instead. Copy from the v2 mockup (RU authored to match).
// Plain Preact inside HubLanding; no data.
import { type Locale } from "~/i18n";

export default function HonestStrip({ lang }: { lang: Locale }) {
  const L =
    lang === "en"
      ? {
          head: "What we don't build — and where we route you",
          note: "A thin orchestrator beats a bloated app. We own three honest things and point well for the rest.",
          d1a: "We don't run a ", d1s: "speech-recognition engine", d1b: ".",
          r1: "your AI coach runs speaking practice (BYOK)",
          d2a: "We don't ", d2s: "grade your writing", d2b: " ourselves.",
          r2: "your AI marks it up against our rubric",
          d3a: "We don't ", d3s: "host a video library", d3b: ".",
          r3: "we curate & annotate external sources",
        }
      : {
          head: "Что мы не строим — и куда направляем",
          note: "Тонкий оркестратор лучше раздутого приложения. Мы честно владеем тремя вещами и хорошо указываем на остальное.",
          d1a: "Мы не держим ", d1s: "движок распознавания речи", d1b: ".",
          r1: "речевую практику ведёт твой ИИ-коуч (BYOK)",
          d2a: "Мы не ", d2s: "оцениваем твоё письмо", d2b: " сами.",
          r2: "твой ИИ размечает его по нашей рубрике",
          d3a: "Мы не ", d3s: "держим видеотеку", d3b: ".",
          r3: "мы отбираем и аннотируем внешние источники",
        };

  return (
    <section class="honest" aria-labelledby="honest-h">
      <div class="honest-head">
        <span class="hk" id="honest-h">{L.head}</span>
        <span class="hn">{L.note}</span>
      </div>
      <div class="honest-grid">
        <div class="hi">
          <span class="dont">{L.d1a}<s>{L.d1s}</s>{L.d1b}</span>
          <span class="route"><span class="arr">→</span> {L.r1}</span>
        </div>
        <div class="hi">
          <span class="dont">{L.d2a}<s>{L.d2s}</s>{L.d2b}</span>
          <span class="route"><span class="arr">→</span> {L.r2}</span>
        </div>
        <div class="hi">
          <span class="dont">{L.d3a}<s>{L.d3s}</s>{L.d3b}</span>
          <span class="route"><span class="arr">→</span> {L.r3}</span>
        </div>
      </div>
    </section>
  );
}
