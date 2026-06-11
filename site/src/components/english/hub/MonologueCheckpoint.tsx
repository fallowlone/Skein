// Monthly monologue checkpoint: record ~3 minutes ("what I did this month"), store locally in
// IndexedDB, and replay the recording from ~3 months back next to it — the contrast is the metric.
// Plain Preact inside HubLanding; styled with the english-hub.css editorial vocabulary.
import { useEffect, useRef, useState } from "preact/hooks";
import { isDue, comparisonTarget, saveRecording, listRecordings, getRecordingBlob, type MonologueMeta } from "~/english/monologue";
import { type Locale } from "~/i18n";

export default function MonologueCheckpoint({ lang }: { lang: Locale }) {
  const [list, setList] = useState<MonologueMeta[]>([]);
  const [recording, setRecording] = useState(false);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);

  useEffect(() => { listRecordings().then(setList).catch(() => {}); }, []);
  useEffect(() => () => { if (playUrl) URL.revokeObjectURL(playUrl); }, [playUrl]);

  const L = lang === "en"
    ? { index: "METRIC · MONOLOGUE", h: "Monthly monologue", note: "Progress you can hear",
        due: "Due: record ~3 minutes — what you did this month, in English.",
        notDue: "Next checkpoint in a few weeks — recordings below.",
        start: "● Record", stop: "■ Stop & save", compare: "Play the one from ~3 months ago", play: "Play", min: "min",
        none: "No recordings yet — record your point A today." }
    : { index: "МЕТРИКА · МОНОЛОГ", h: "Ежемесячный монолог", note: "Прогресс, который слышно",
        due: "Пора: запиши ~3 минуты — что делал в этом месяце, по-английски.",
        notDue: "Следующий замер через несколько недель — записи ниже.",
        start: "● Записать", stop: "■ Стоп и сохранить", compare: "Включить запись ~3-месячной давности", play: "Слушать", min: "мин",
        none: "Записей пока нет — запиши точку А сегодня." };

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream);
    chunks.current = [];
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
      const at = Date.now();
      await saveRecording({ id: String(at), at, durationSec: Math.round((at - startedAt.current) / 1000) }, blob);
      setList(await listRecordings());
    };
    startedAt.current = Date.now();
    r.start();
    rec.current = r;
    setRecording(true);
  };
  const stop = () => { rec.current?.stop(); setRecording(false); };
  const play = async (id: string) => {
    const blob = await getRecordingBlob(id);
    if (blob) setPlayUrl(URL.createObjectURL(blob));
  };

  const due = isDue(list, Date.now());
  const cmp = comparisonTarget(list);
  return (
    <section class="hub-section" aria-labelledby="mono-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="mono-h">{L.h}</h2>
        <span class="sec-note">{L.note}</span>
      </div>

      <div class="mono card">
        <p class={`mono-sub${due ? " due" : ""}`}>{due ? L.due : L.notDue}</p>
        <div class="mono-actions">
          {!recording
            ? <button type="button" class="btn btn-rec" onClick={start}>{L.start}</button>
            : <button type="button" class="btn btn-primary" onClick={stop}>{L.stop}</button>}
          {cmp ? <button type="button" class="btn btn-ext" onClick={() => play(cmp.id)}>{L.compare}</button> : null}
        </div>
        {playUrl ? <audio controls src={playUrl} /> : null}
        <ul class="mono-list">
          {list.length === 0 ? <li class="ml-empty">{L.none}</li> : null}
          {list.map((m) => (
            <li key={m.id}>
              <span class="ml-date">{new Date(m.at).toISOString().slice(0, 10)}</span>
              <span class="ml-dur">{Math.round(m.durationSec / 60)} {L.min}</span>
              <button type="button" onClick={() => play(m.id)}>{L.play}</button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
