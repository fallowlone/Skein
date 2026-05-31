// src/components/english/TalkSession.tsx
import { useState } from "preact/hooks";
import { converse, endReview, MAX_TURNS } from "~/english/byok/converse";
import { hasKey } from "~/english/byok";
import { speak } from "~/english/speech/tts";
import { scenarios } from "~/english/data/scenarios";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
import type { ConversationTurn, Scenario, SpeechReview } from "~/english/types";
import type { Locale } from "~/i18n";

const COPY = {
  en: { pick: "Pick a scenario", start: "Start", rec: "Speak", stop: "Stop", end: "End & review", thinking: "…", needKey: "Add an API key (Output tab) to use Talk.", you: "You", partner: "Partner", review: "Review", well: "Went well", errs: "Fix these", nextp: "Practice next" },
  ru: { pick: "Выбери сценарий", start: "Начать", rec: "Говорить", stop: "Стоп", end: "Завершить и разбор", thinking: "…", needKey: "Добавь API-ключ (вкладка Письмо) для диалога.", you: "Ты", partner: "Собеседник", review: "Разбор", well: "Хорошо", errs: "Исправить", nextp: "Потренируй" },
};

export default function TalkSession({ lang, recognizer }: { lang: Locale; recognizer: SpeechRecognizer }) {
  const L = COPY[lang];
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [review, setReview] = useState<SpeechReview | null>(null);

  if (!hasKey()) return <p class="ex-note">{L.needKey}</p>;

  const begin = (s: Scenario) => { setScenario(s); setReview(null); setTurns([{ role: "assistant", text: s.opening }]); speak(s.opening, { rate: 0.95 }); };
  const record = async () => { setBusy(true); try { await recognizer.start(); } catch { setBusy(false); } };
  const stop = async () => {
    const r = await recognizer.stop(); setBusy(false);
    if (!r.transcript || !scenario) return;
    const next = [...turns, { role: "user" as const, text: r.transcript }];
    setTurns(next); setThinking(true);
    try {
      const reply = await converse(next, scenario, "claude-haiku-4-5");
      setTurns([...next, { role: "assistant", text: reply }]); speak(reply, { rate: 0.95 });
    } finally { setThinking(false); }
  };
  const finish = async () => { setThinking(true); try { setReview(await endReview(turns, "claude-sonnet-4-6")); } finally { setThinking(false); } };

  const userTurns = turns.filter((t) => t.role === "user").length;

  if (!scenario) {
    return (
      <div data-talk>
        <div class="meta mb-3">{L.pick}</div>
        <div class="flex flex-col gap-2">
          {scenarios.map((s) => (
            <button class="track-card text-left" style="--d: var(--accent);" onClick={() => begin(s)}>
              <div class="tc-meta"><span class="domain-tag"><span class="sq"></span>{s.level}</span></div>
              <h4>{lang === "ru" ? s.titleRu : s.role}</h4>
              <p class="tc-blurb">{s.goal}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-talk class="quiz">
      <div class="flex flex-col gap-2 mb-3">
        {turns.map((t) => (
          <div class={t.role === "user" ? "self-end text-right" : "self-start"}>
            <span class="meta">{t.role === "user" ? L.you : L.partner}</span>
            <p class="m-0 text-[14px]">{t.text}</p>
          </div>
        ))}
        {thinking && <p class="meta self-start">{L.thinking}</p>}
      </div>
      {!review && (
        <div class="flex gap-2">
          {!busy
            ? <button class="oa-btn oa-btn-primary oa-btn-sm" disabled={thinking || userTurns >= MAX_TURNS} onClick={record}>{L.rec}</button>
            : <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={stop}>{L.stop}</button>}
          <button class="oa-btn oa-btn-secondary oa-btn-sm" disabled={thinking || userTurns === 0} onClick={finish}>{L.end}</button>
        </div>
      )}
      {review && (
        <div class="mt-2">
          <div class="meta mb-1">{L.review}: {review.scoreBand}</div>
          {review.errors.map((e) => (
            <p class="text-[13px] m-0"><s class="text-danger">{e.said}</s> → <b>{e.better}</b> <span class="text-muted">({e.why})</span></p>
          ))}
        </div>
      )}
    </div>
  );
}
