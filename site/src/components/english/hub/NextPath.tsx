// NEXT orchestrator — one path across three modes (Own / Delegate / Curate). Assembles an ordered
// action list from REAL signals (due cards, recommended reading unit, a speaking task, the top
// curated listen) and drops any whose signal is empty. Ordering is fixed: retrieval first (decay
// risk), then input (reading), then output (speaking), then immersion (curate). Plain Preact inside
// HubLanding; reads englishState/register in the body to subscribe. Capped at 5.
import { englishState, dueWordIds, getPlacement } from "~/english/state";
import { register } from "~/english/register";
import { listening } from "~/english/data/listening";
import { ALL_IDS, recommendedUnit } from "./selectors";
import type { Band } from "~/english/types";
import { type Locale } from "~/i18n";

type Mode = "own" | "delegate" | "curate";
type Action = {
  mode: Mode;
  title: string;
  reason: string;
  minutes: string;
  route: string; // route label shown in meta
  href: string;
  cite: string;
  cta: string;
  external?: boolean;
};

const now = () => Date.now();

export default function NextPath({ lang }: { lang: Locale }) {
  englishState.value; // subscribe
  const reg = register.value; // subscribe
  const band = (getPlacement()?.band ?? "A2") as Band;

  const due = dueWordIds(ALL_IDS, now());
  const unit = recommendedUnit();
  const listen = listening.find((l) => l.band === band) ?? listening[0];

  const L =
    lang === "en"
      ? {
          index: "02 · ORCHESTRATOR",
          h: "Next — one path, three modes",
          note: "Sequenced across tools, not within one",
          own: "Own",
          delegate: "Delegate",
          curate: "Curate",
          legOwn: "do it here, now",
          legDel: "launch with your AI coach →",
          legCur: "watch / read (external) ↗",
          dueTitle: (n: number) => `Clear today's ${n} due card${n === 1 ? "" : "s"}`,
          dueReason:
            "Retrieval is due — spacing it today keeps these words from slipping back toward forgetting.",
          dueRoute: "→ Vocabulary (here)",
          dueCite: "spaced retrieval · Roediger & Karpicke",
          start: "Start",
          readTitle: (t: string) => `Read “${t}”`,
          readReason:
            "Reading at your level locks new words in context — the comprehensible-input sweet spot (i+1).",
          readRoute: "→ Reading (here)",
          readCite: "comprehensible input · Krashen",
          openReader: "Open reader",
          speakTitle: "Explain a concept aloud — 90 seconds",
          speakReason:
            "You can read it; now produce it. Your AI coach plays a skeptical reviewer and probes follow-ups.",
          speakRoute: "→ Speaking · your AI (BYOK)",
          speakCite: "output + feedback · Swain",
          openCoach: "Open coach",
          watchTitle: (t: string) => `Watch: “${t}”`,
          watchReason:
            "Extensive listening at your level locks in this week's terms. Captions on, watch once for gist.",
          watchRoute: "↗ Listening library (external)",
          watchCite: "comprehensible input · Krashen",
          watch: "Watch",
          minutes: (n: number) => `~${n} min`,
        }
      : {
          index: "02 · ОРКЕСТРАТОР",
          h: "Дальше — один путь, три режима",
          note: "Последовательность между инструментами, а не внутри одного",
          own: "Сам",
          delegate: "Поручить",
          curate: "Отобрано",
          legOwn: "сделай здесь, сейчас",
          legDel: "запусти со своим ИИ-коучем →",
          legCur: "смотри / читай (внешнее) ↗",
          dueTitle: (n: number) => `Закрой ${n} повторени${n % 10 === 1 && n % 100 !== 11 ? "е" : "й"} на сегодня`,
          dueReason:
            "Пришло время вспомнить — повторение сегодня не даёт словам соскользнуть к забыванию.",
          dueRoute: "→ Словарь (здесь)",
          dueCite: "интервальное повторение · Roediger & Karpicke",
          start: "Начать",
          readTitle: (t: string) => `Прочитай «${t}»`,
          readReason:
            "Чтение по уровню закрепляет слова в контексте — зона понятного ввода (i+1).",
          readRoute: "→ Чтение (здесь)",
          readCite: "понятный ввод · Krashen",
          openReader: "Открыть ридер",
          speakTitle: "Объясни концепцию вслух — 90 секунд",
          speakReason:
            "Прочитать можешь; теперь произведи. ИИ-коуч играет придирчивого ревьюера и задаёт уточнения.",
          speakRoute: "→ Речь · твой ИИ (BYOK)",
          speakCite: "продукция + обратная связь · Swain",
          openCoach: "Открыть коуча",
          watchTitle: (t: string) => `Смотри: «${t}»`,
          watchReason:
            "Экстенсивное слушание по уровню закрепляет термины недели. Субтитры включи, смотри раз для смысла.",
          watchRoute: "↗ Библиотека слушания (внешнее)",
          watchCite: "понятный ввод · Krashen",
          watch: "Смотреть",
          minutes: (n: number) => `~${n} мин`,
        };

  const actions: Action[] = [];

  if (due.length > 0) {
    actions.push({
      mode: "own",
      title: L.dueTitle(due.length),
      reason: L.dueReason,
      minutes: L.minutes(Math.max(1, Math.round(due.length * 0.25))),
      route: L.dueRoute,
      href: `/${lang}/english/review`,
      cite: L.dueCite,
      cta: L.start,
    });
  }

  if (unit) {
    actions.push({
      mode: "own",
      title: L.readTitle(unit.title[lang]),
      reason: L.readReason,
      minutes: L.minutes(Math.max(5, (unit.passages?.length ?? 4) * 2)),
      route: L.readRoute,
      href: `/${lang}/english/reading`,
      cite: L.readCite,
      cta: L.openReader,
    });
  }

  actions.push({
    mode: "delegate",
    title: L.speakTitle,
    reason: L.speakReason,
    minutes: L.minutes(6),
    route: L.speakRoute,
    href: `/${lang}/english/speaking`,
    cite: L.speakCite,
    cta: L.openCoach,
  });

  if (listen) {
    actions.push({
      mode: "curate",
      title: L.watchTitle(listen.title),
      reason: L.watchReason,
      minutes: L.minutes(listen.minutes),
      route: L.watchRoute,
      href: listen.url,
      cite: L.watchCite,
      cta: L.watch,
      external: true,
    });
  }

  const shown = actions.slice(0, 5);

  return (
    <section class="hub-section" aria-labelledby="next-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="next-h">{L.h}</h2>
        <span class="sec-note">{L.note}</span>
      </div>

      <div class="mode-legend" aria-hidden="true">
        <span class="ml">
          <span class="chip-mode is-own"><span class="dot"></span>{L.own}</span> <b>{L.legOwn}</b>
        </span>
        <span class="ml">
          <span class="chip-mode is-delegate"><span class="dot"></span>{L.delegate}</span> <b>{L.legDel}</b>
        </span>
        <span class="ml">
          <span class="chip-mode is-curate"><span class="dot"></span>{L.curate}</span> <b>{L.legCur}</b>
        </span>
      </div>

      <ol class="path-list">
        {shown.map((a, i) => {
          const chipLabel = a.mode === "own" ? L.own : a.mode === "delegate" ? L.delegate : L.curate;
          const btnClass =
            a.mode === "own" ? "btn btn-primary btn-sm a-cta"
            : a.mode === "delegate" ? "btn btn-launch btn-sm a-cta"
            : "btn btn-ext btn-sm a-cta";
          return (
            <li class={`action is-${a.mode}`} key={i}>
              <span class="step-no"></span>
              <div class="a-body">
                <div class="a-head">
                  <span class={`chip-mode is-${a.mode}`}><span class="dot"></span>{chipLabel}</span>
                  <span class="a-title">{a.title}</span>
                </div>
                <p class="a-reason">{a.reason}</p>
                <div class="a-meta">
                  <span>{a.minutes}</span>
                  <span>·</span>
                  <span class="route">{a.route}</span>
                  <span>·</span>
                  <span>{a.cite}</span>
                </div>
              </div>
              {a.external ? (
                <a class={btnClass} href={a.href} target="_blank" rel="noopener">
                  <span>{a.cta}</span>
                  <span class="ext">↗</span>
                </a>
              ) : (
                <a class={btnClass} href={a.href}>
                  <span>{a.cta}</span>
                  <span class="arrow">→</span>
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
