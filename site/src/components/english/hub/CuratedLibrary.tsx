// Curated, not built — the leveled external listening/immersion library (data from
// ~/english/data/listening). External links open in a new tab with rel="noopener". The intensive vs
// extensive how-to copy is from the v2 mockup (RU authored to match). Plain Preact inside HubLanding.
import { listening, type ListenItem } from "~/english/data/listening";
import { type Locale } from "~/i18n";

function KindIcon({ kind }: { kind: ListenItem["kind"] }) {
  if (kind === "audio") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3z" />
        <path d="M5 12a7 7 0 0014 0M12 19v2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3z" />
    </svg>
  );
}

export default function CuratedLibrary({ lang }: { lang: Locale }) {
  const L =
    lang === "en"
      ? {
          index: "06",
          h: "Curated, not built",
          tag: "Curate · leveled external library",
          kicker: "Listening & immersion · B1–B2 · the engine we deliberately don't build",
          kindVideo: "video",
          kindAudio: "audio",
          min: "min",
          htIntK: "Intensive — study it",
          htIntV: "Short clips at or just below your level. Rewatch with captions, mine 5–8 new words into your deck.",
          htExtK: "Extensive — bathe in it",
          htExtV: "Longer, easier audio for volume. Listen once, no pausing — fluency comes from quantity of input.",
        }
      : {
          index: "06",
          h: "Отобрано, а не построено",
          tag: "Отбор · внешняя библиотека по уровням",
          kicker: "Слушание и погружение · B1–B2 · движок, который мы намеренно не строим",
          kindVideo: "видео",
          kindAudio: "аудио",
          min: "мин",
          htIntK: "Интенсивно — изучай",
          htIntV: "Короткие клипы на твоём уровне или чуть ниже. Пересматривай с субтитрами, выписывай 5–8 новых слов в колоду.",
          htExtK: "Экстенсивно — погружайся",
          htExtV: "Более длинное и лёгкое аудио для объёма. Слушай раз, без пауз — беглость рождается из количества ввода.",
        };

  const kindLabel = (k: ListenItem["kind"]) => (k === "audio" ? L.kindAudio : L.kindVideo);

  return (
    <section class="hub-section" aria-labelledby="cur-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="cur-h">{L.h}</h2>
        <span class="mode-tag is-curate"><span class="glyph">↗</span> {L.tag}</span>
      </div>

      <div class="library">
        <div class="kicker" style="margin-bottom:2px">{L.kicker}</div>

        {listening.map((item) => (
          <div class="lib-item" key={item.url + item.title}>
            <span class="li-kind" aria-hidden="true"><KindIcon kind={item.kind} /></span>
            <div>
              <a class="li-title" href={item.url} target="_blank" rel="noopener">{item.title}</a>
              <div class="li-meta">
                <span>{kindLabel(item.kind)} · {item.minutes} {L.min}</span>
                <span>{item.band}</span>
                <span>{item.how[lang]}</span>
              </div>
            </div>
            <span class="li-ext" aria-hidden="true">↗</span>
          </div>
        ))}

        <div class="how-to">
          <div class="ht"><div class="ht-k">{L.htIntK}</div><div class="ht-v">{L.htIntV}</div></div>
          <div class="ht"><div class="ht-k">{L.htExtK}</div><div class="ht-v">{L.htExtV}</div></div>
        </div>
      </div>
    </section>
  );
}
