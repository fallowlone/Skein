// src/components/english/SpeakingModule.tsx
import { useState, useRef, useEffect } from "preact/hooks";
import { WebSpeechRecognizer, webSpeechAvailable, type SpeechRecognizer } from "~/english/speech/recognizer";
import { WhisperRecognizer, whisperReady, type DownloadState } from "~/english/speech/whisper";
import { logMinutes } from "~/english/state";
import ShadowExercise from "./ShadowExercise";
import SpeakExercise from "./SpeakExercise";
import TalkSession from "./TalkSession";
import type { Locale } from "~/i18n";

type Mode = "shadow" | "speak" | "talk";
type Prefer = "auto" | "webspeech" | "whisper";

const COPY = {
  en: { shadow: "Shadow", speak: "Speak", talk: "Talk", engine: "Voice engine",
    auto: "Auto", web: "Browser (cloud)", whisper: "On-device (Whisper)",
    download: "Download offline voice engine (~40 MB)", downloading: "Downloading…", ready: "On-device ready",
    cloudNote: "Browser STT sends audio to your browser's cloud service.",
    deviceNote: "On-device: audio never leaves this device.",
    noEngine: "Speaking needs speech recognition. Open in Chrome/Safari, or download the on-device engine." },
  ru: { shadow: "Произношение", speak: "Монолог", talk: "Диалог", engine: "Движок речи",
    auto: "Авто", web: "Браузер (облако)", whisper: "На устройстве (Whisper)",
    download: "Скачать офлайн-движок (~40 МБ)", downloading: "Загрузка…", ready: "На устройстве готов",
    cloudNote: "Браузерный STT отправляет аудио в облако браузера.",
    deviceNote: "На устройстве: аудио не покидает устройство.",
    noEngine: "Нужно распознавание речи. Открой в Chrome/Safari или скачай офлайн-движок." },
};

export default function SpeakingModule({ lang }: { lang: Locale }) {
  const L = COPY[lang];

  // Auto-log speaking output (the methodology's output block) — one log on exit for time spent in
  // any speaking mode (shadow/speak/talk), only if at least a full minute was spent here.
  const startedAt = useRef(Date.now());
  useEffect(() => () => {
    const min = Math.round((Date.now() - startedAt.current) / 60_000);
    if (min >= 1) logMinutes("output", min, "speaking");
  }, []);

  const [mode, setMode] = useState<Mode>("shadow");
  const [prefer, setPrefer] = useState<Prefer>("auto");
  const [dl, setDl] = useState<DownloadState>({ status: whisperReady() ? "ready" : "idle", pct: whisperReady() ? 100 : 0 });

  // Persist engine instances across renders — they hold live MediaRecorder /
  // stream / download state, so re-creating them per render would orphan an
  // in-flight recording or download. setDl identity is stable across renders.
  const webRef = useRef<WebSpeechRecognizer>();
  if (!webRef.current) webRef.current = new WebSpeechRecognizer();
  const whisperRef = useRef<WhisperRecognizer>();
  if (!whisperRef.current) whisperRef.current = new WhisperRecognizer(setDl);
  const web = webRef.current;
  const whisper = whisperRef.current;
  const resolved: SpeechRecognizer | null =
    prefer === "whisper" ? (whisper.available() ? whisper : null)
    : prefer === "webspeech" ? (web.available() ? web : null)
    : whisper.available() ? whisper : web.available() ? web : null;

  const onDownload = async () => { setDl({ status: "downloading", pct: 0 }); try { await whisper.download(); } catch { setDl({ status: "error", pct: 0 }); } };

  const privacyNote = resolved?.id === "whisper" ? L.deviceNote : resolved?.id === "webspeech" ? L.cloudNote : "";

  return (
    <div data-speaking class="max-w-[680px] mx-auto">
      <div class="seg mb-4" role="tablist">
        {(["shadow", "speak", "talk"] as Mode[]).map((m) => (
          <button role="tab" aria-pressed={mode === m} onClick={() => setMode(m)}>{L[m]}</button>
        ))}
      </div>

      <div class="flex items-center gap-3 mb-2 text-[12px]">
        <span class="meta">{L.engine}</span>
        <select class="oa-btn oa-btn-secondary oa-btn-sm" value={prefer} onChange={(e) => setPrefer((e.target as HTMLSelectElement).value as Prefer)}>
          <option value="auto">{L.auto}</option>
          <option value="webspeech" disabled={!webSpeechAvailable()}>{L.web}</option>
          <option value="whisper" disabled={dl.status !== "ready"}>{L.whisper}</option>
        </select>
        {dl.status === "ready"
          ? <span class="badge ok">{L.ready}</span>
          : <button class="oa-btn oa-btn-ghost oa-btn-sm" onClick={onDownload} disabled={dl.status === "downloading"}>
              {dl.status === "downloading" ? `${L.downloading} ${dl.pct}%` : L.download}
            </button>}
      </div>
      {privacyNote ? <p class="meta-lc mb-4">{privacyNote}</p> : null}

      {!resolved ? <p class="ex-note">{L.noEngine}</p> : (
        <>
          {mode === "shadow" && <ShadowExercise lang={lang} recognizer={resolved} />}
          {mode === "speak" && <SpeakExercise lang={lang} recognizer={resolved} />}
          {mode === "talk" && <TalkSession lang={lang} recognizer={resolved} />}
        </>
      )}
    </div>
  );
}
