// src/components/english/SpeakExercise.tsx
import { useState } from "preact/hooks";
import { gradeSpeech } from "~/english/byok/speech";
import { hasKey } from "~/english/byok";
import { speak } from "~/english/speech/tts";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
import type { GradingResult, OutputTask } from "~/english/types";
import type { Locale } from "~/i18n";

// A small spoken-prompt set; reuse OutputTask shape so gradeSpeech accepts it.
const TASKS: OutputTask[] = [
  { id: "sp-standup", band: "B1", type: "standup", prompt: { en: "Give a 30-second spoken standup: what you did yesterday, today, and any blocker.", ru: "" }, rubric: ["clear sequence", "correct tense", "concise"] },
  { id: "sp-bug", band: "B1", type: "bug-report", prompt: { en: "Describe a recent bug out loud: symptom, cause, fix.", ru: "" }, rubric: ["cause/effect", "past tense", "specific"] },
  { id: "sp-design", band: "B2", type: "design-rationale", prompt: { en: "Explain out loud why you would pick a queue over direct calls between two services.", ru: "" }, rubric: ["tradeoffs", "linking words", "precise vocabulary"] },
];

const COPY = {
  en: { rec: "Record", stop: "Stop & transcribe", grade: "Get feedback", grading: "Grading…", next: "Next prompt", needKey: "Add an API key (Output tab) for AI feedback.", transcript: "Transcript (edit if needed)", band: "Level" },
  ru: { rec: "Запись", stop: "Стоп и расшифровать", grade: "Получить разбор", grading: "Оцениваю…", next: "Следующий", needKey: "Добавь API-ключ (вкладка Письмо) для разбора.", transcript: "Транскрипт (поправь при необходимости)", band: "Уровень" },
};

export default function SpeakExercise({ lang, recognizer }: { lang: Locale; recognizer: SpeechRecognizer }) {
  const L = COPY[lang];
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const task = TASKS[i];

  const start = async () => { setResult(null); setText(""); setBusy(true); try { await recognizer.start(); } catch { setBusy(false); } };
  const stop = async () => { const r = await recognizer.stop(); setText(r.transcript); setBusy(false); };
  const grade = async () => {
    setGrading(true);
    try { setResult(await gradeSpeech(task, text, "claude-haiku-4-5")); } finally { setGrading(false); }
  };

  return (
    <div data-speak class="quiz">
      <p class="q">{task.prompt.en}</p>
      <div class="flex gap-2 mb-3">
        {!busy
          ? <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={start}>{L.rec}</button>
          : <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={stop}>{L.stop}</button>}
        <button class="oa-btn oa-btn-ghost oa-btn-sm" onClick={() => { setI((n) => (n + 1) % TASKS.length); setText(""); setResult(null); }}>{L.next}</button>
      </div>
      {text && (
        <>
          <div class="meta mb-1">{L.transcript}</div>
          <textarea class="w-full border border-rule rounded p-2 text-[14px] mb-2" rows={3} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
          {hasKey()
            ? <button class="oa-btn oa-btn-primary oa-btn-sm" disabled={grading || !text.trim()} onClick={grade}>{grading ? L.grading : L.grade}</button>
            : <p class="ex-note">{L.needKey}</p>}
        </>
      )}
      {result && (
        <div class="mt-3">
          <div class="meta mb-1">{L.band}: {result.scoreBand}</div>
          {result.corrections.map((c) => (
            <p class="text-[13px] m-0"><s class="text-danger">{c.before}</s> → <b>{c.after}</b> <span class="text-muted">({c.why})</span></p>
          ))}
          {result.betterVersion && (
            <button class="oa-btn oa-btn-ghost oa-btn-sm mt-2" onClick={() => speak(result.betterVersion, { rate: 0.95 })}>▶ {result.betterVersion}</button>
          )}
        </div>
      )}
    </div>
  );
}
