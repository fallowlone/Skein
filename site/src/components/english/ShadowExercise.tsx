// src/components/english/ShadowExercise.tsx
import { useMemo, useState } from "preact/hooks";
import { speak } from "~/english/speech/tts";
import { scoreShadow, type ShadowResult } from "~/english/speech/diff";
import { pickShadowSentences } from "~/english/speech/shadow-source";
import { vocabA2 } from "~/english/data/vocab-a2";
import { vocabB1 } from "~/english/data/vocab-b1";
import { vocabB2 } from "~/english/data/vocab-b2";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
import type { Locale } from "~/i18n";

const COPY = {
  en: { play: "Hear it", rec: "Record", stop: "Stop", next: "Next", score: "Intelligibility" },
  ru: { play: "Послушать", rec: "Запись", stop: "Стоп", next: "Дальше", score: "Понятность" },
};

export default function ShadowExercise({ lang, recognizer }: { lang: Locale; recognizer: SpeechRecognizer }) {
  const L = COPY[lang];
  const sentences = useMemo(
    () => pickShadowSentences([...vocabA2, ...vocabB1, ...vocabB2], "B2", 40),
    [],
  );
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShadowResult | null>(null);
  const target = sentences[i] ?? "";

  const record = async () => {
    setResult(null); setBusy(true);
    try {
      await recognizer.start();
    } catch { setBusy(false); }
  };
  const finish = async () => {
    const r = await recognizer.stop();
    // scoreShadow(reference, heard): first arg is the target sentence (reference),
    // second is the transcript (heard).
    setResult(scoreShadow(target, r.transcript));
    setBusy(false);
  };

  return (
    <div data-shadow class="quiz">
      <p class="q">{target}</p>
      <div class="flex gap-2 mb-3">
        <button class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => speak(target, { rate: 0.9 })}>{L.play}</button>
        {!busy
          ? <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={record}>{L.rec}</button>
          : <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={finish}>{L.stop}</button>}
        <button class="oa-btn oa-btn-ghost oa-btn-sm" onClick={() => { setResult(null); setI((n) => (n + 1) % sentences.length); }}>{L.next}</button>
      </div>
      {result && (
        <div>
          <div class="meta mb-1">{L.score}: {Math.round(result.score * 100)}%</div>
          <p class="leading-relaxed">
            {result.tokens.map((t) => (
              <span style={`color: var(${t.status === "ok" ? "--ok" : t.status === "sub" ? "--warn" : "--danger"}); margin-right:4px;`}>{t.target}</span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
