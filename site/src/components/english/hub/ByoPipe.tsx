// BYO content pipe (Signature #2). Paste English text → Extract (tokenize + classify against the
// vocab bank and your known set) → Build (create real SRS cards for in-bank "new" words, and — only
// if a BYOK key is present — AI-write exercises) → Reuse (five modes routed to Own/Delegate). v1 is
// paste-only; the URL toggle shows a hint, no fetch. The key never leaves the audited withKey()
// path; with no key, cards are still created and an "add key" affordance links to /writing where
// KeyEntry (with the verbatim security disclosure) lives. Plain Preact inside HubLanding.
import { useEffect, useMemo, useState } from "preact/hooks";
import { tokenizeToLemmas } from "~/english/byo/tokenize";
import { classifyLemmas, bankIndex, type Classification, type BankIndexEntry } from "~/english/byo/classify";
import { commitByoCards } from "~/english/byo/cards";
import { generateExercises, type GenExercises } from "~/english/byo/exercises";
import { suggestChunkSentences } from "~/english/byo/sentences";
import { isKnown, addChunk } from "~/english/state";
import { hasKey } from "~/english/byok";
import { type Locale } from "~/i18n";

const now = () => Date.now();

// Build the live bank index lazily (the vocab arrays are large) and only once.
let _bank: BankIndexEntry[] | null = null;
async function getBank(): Promise<BankIndexEntry[]> {
  if (_bank) return _bank;
  const [{ vocabA2 }, { vocabB1 }, { vocabB2 }] = await Promise.all([
    import("~/english/data/vocab-a2"),
    import("~/english/data/vocab-b1"),
    import("~/english/data/vocab-b2"),
  ]);
  _bank = bankIndex([...vocabA2, ...vocabB1, ...vocabB2]);
  return _bank;
}

type SrcType = "text" | "url";

export default function ByoPipe({ lang }: { lang: Locale }) {
  const [text, setText] = useState("");
  const [srcType, setSrcType] = useState<SrcType>("text");
  const [result, setResult] = useState<Classification | null>(null);
  const [cardsMade, setCardsMade] = useState(0);
  const [building, setBuilding] = useState(false);
  const [exercises, setExercises] = useState<GenExercises | null>(null);
  const [keyOn, setKeyOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sentence/chunk mining: whole phrases from the source (new + out-of-bank), checked by default.
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set());
  const [chunksMade, setChunksMade] = useState(0);
  const [phrase, setPhrase] = useState("");
  const [phraseSaved, setPhraseSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    hasKey().then((v) => { if (alive) setKeyOn(v); });
    return () => { alive = false; };
  }, []);

  // First sentence per new/technical lemma (capped at the methodology's "mine 5–8" window).
  const sentences = useMemo(
    () => (result
      ? suggestChunkSentences(text, [...result.newWords, ...result.technical].map((w) => w.lemma)).slice(0, 8)
      : []),
    [result],
  );
  // Reset selection + saved counters whenever a fresh extract lands.
  useEffect(() => { setUnchecked(new Set()); setChunksMade(0); }, [result]);

  function saveSentenceCards() {
    let made = 0;
    sentences.forEach((s, i) => { if (!unchecked.has(i)) made += addChunk(s.sentence, undefined, now(), "byo") ? 1 : 0; });
    setChunksMade(made);
  }
  function savePhrase() {
    if (!phrase.trim()) return;
    addChunk(phrase, undefined, now(), "manual");
    setPhrase("");
    setPhraseSaved(true);
    setTimeout(() => setPhraseSaved(false), 1800);
  }

  const L =
    lang === "en"
      ? {
          index: "03 · PIPE",
          h: "Bring your own content",
          note: "Any text → a lesson, five ways",
          placeholder: "Paste any English text — an RFC, a postmortem, a New Yorker piece…",
          inputAria: "Paste text",
          text: "Text", url: "URL",
          make: "Make lesson",
          tryLabel: "Try:",
          urlNote: "URL fetch is coming — for now, paste the text itself.",
          s1no: "Stage 01 · Extract", s1title: "Sort every word against what you know",
          s1desc: (n: number) => `From a ${n}-word source, scored on your profile:`,
          s1descEmpty: "Paste a passage above, then “Make lesson”.",
          known: "known", neww: "new", tech: "technical",
          s2no: "Stage 02 · Build", s2title: "Spaced cards + AI-written exercises",
          s2desc: "Generated from the source, ready to drill:",
          buildDeck: "Build deck",
          cardsMade: (n: number) => `${n} SRS card${n === 1 ? "" : "s"} added`,
          generating: "Generating exercises…",
          addKey: "Add your AI key to generate exercises →",
          clozeN: (n: number) => `${n} cloze gap${n === 1 ? "" : "s"}`,
          compN: (n: number) => `${n} comprehension Q`,
          retellN: "1 retell task",
          s3no: "Stage 03 · Reuse", s3title: "One source, five ways",
          s3desc: "Each reuse routes to the mode that does it best:",
          rcComp: "Comprehension", rcVocab: "Vocab", rcDict: "Dictation", rcRetell: "Retell", rcImit: "Imitation",
          own: "Own", delegate: "Delegate",
          caption1: "Signature.",
          caption2: " One paste becomes a spaced-repetition deck, AI-written exercises, and five reuse modes — the same pipe for an RFC or a news article.",
          ex1: "RFC 9293 (TCP)", ex2: "martinfowler.com/microservices", ex3: "your last incident postmortem",
          sentH: "Mine sentences, not just words",
          sentNote: "The strongest cards are whole phrases from your own text — including out-of-bank ones a word deck can't hold. Pick the ones to keep:",
          sentSave: "Save sentence cards",
          sentMade: (n: number) => `${n} phrase card${n === 1 ? "" : "s"} added — they’ll appear in review`,
          phraseLabel: "Or save any phrase by hand:",
          phrasePlaceholder: "a phrase worth keeping…",
          phraseSave: "Save phrase",
          phraseSaved: "Saved ✓",
        }
      : {
          index: "03 · КОНВЕЙЕР",
          h: "Свой контент",
          note: "Любой текст → урок, пятью способами",
          placeholder: "Вставь любой английский текст — RFC, постмортем, статью…",
          inputAria: "Вставь текст",
          text: "Текст", url: "URL",
          make: "Собрать урок",
          tryLabel: "Примеры:",
          urlNote: "Загрузка по URL появится позже — пока вставь сам текст.",
          s1no: "Этап 01 · Извлечь", s1title: "Разложи каждое слово по тому, что знаешь",
          s1desc: (n: number) => `Из источника на ${n} слов, по твоему профилю:`,
          s1descEmpty: "Вставь текст выше и нажми «Собрать урок».",
          known: "знакомо", neww: "новые", tech: "технические",
          s2no: "Этап 02 · Собрать", s2title: "Интервальные карты + AI-упражнения",
          s2desc: "Сгенерировано из источника, готово к тренировке:",
          buildDeck: "Собрать колоду",
          cardsMade: (n: number) => `Добавлено карт: ${n}`,
          generating: "Генерирую упражнения…",
          addKey: "Добавь ключ ИИ, чтобы сгенерировать упражнения →",
          clozeN: (n: number) => `${n} пропуск${n === 1 ? "" : "ов"}`,
          compN: (n: number) => `${n} вопрос${n === 1 ? "" : "ов"} на понимание`,
          retellN: "1 пересказ",
          s3no: "Этап 03 · Переиспользовать", s3title: "Один источник, пять способов",
          s3desc: "Каждое переиспользование идёт в режим, где оно работает лучше всего:",
          rcComp: "Понимание", rcVocab: "Словарь", rcDict: "Диктант", rcRetell: "Пересказ", rcImit: "Имитация",
          own: "Сам", delegate: "Поручить",
          caption1: "Сигнатура.",
          caption2: " Одна вставка превращается в колоду интервального повторения, AI-упражнения и пять режимов переиспользования — один конвейер для RFC или новостной статьи.",
          ex1: "RFC 9293 (TCP)", ex2: "martinfowler.com/microservices", ex3: "постмортем твоего инцидента",
          sentH: "Выписывай предложения, а не только слова",
          sentNote: "Самые сильные карточки — целые фразы из твоего текста, включая вне-словарные, которые колода слов не удержит. Отметь, что сохранить:",
          sentSave: "Сохранить карты-предложения",
          sentMade: (n: number) => `Добавлено карт-фраз: ${n} — появятся в повторе`,
          phraseLabel: "Или сохрани любую фразу вручную:",
          phrasePlaceholder: "фраза, которую стоит запомнить…",
          phraseSave: "Сохранить фразу",
          phraseSaved: "Сохранено ✓",
        };

  const examples: { label: string; fill: string }[] = [
    { label: L.ex1, fill: "RFC 9293 — Transmission Control Protocol establishes a reliable byte stream between two endpoints. It manages flow control, congestion avoidance, retransmission of lost segments, and orderly connection teardown." },
    { label: L.ex2, fill: "Microservices structure an application as a suite of independently deployable services. Each service runs in its own process and communicates through lightweight mechanisms, often an HTTP resource API." },
    { label: L.ex3, fill: "A postmortem of the outage: a deployment introduced a regression in the caching layer, latency climbed, retries amplified load, and the database saturated. We added backpressure and a circuit breaker." },
  ];

  // total source word count (raw whitespace tokens) — honest figure for the extract caption.
  const sourceWords = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text],
  );

  async function makeLesson() {
    setError(null);
    setExercises(null);
    setCardsMade(0);
    const bank = await getBank();
    const lemmas = tokenizeToLemmas(text);
    setResult(classifyLemmas(lemmas, bank, isKnown));
  }

  async function buildDeck() {
    if (!result) return;
    const ids = result.newWords.map((w) => w.id!).filter(Boolean);
    const made = commitByoCards(ids, now());
    setCardsMade(made);
    if (keyOn && text.trim()) {
      setBuilding(true);
      setError(null);
      try {
        const ex = await generateExercises(text);
        setExercises(ex);
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setBuilding(false);
      }
    }
  }

  const counts = result?.counts ?? { known: 0, new: 0, technical: 0 };
  const totalClassified = counts.known + counts.new + counts.technical;
  const w = (n: number) => (totalClassified ? Math.round((n / totalClassified) * 100) : 0);

  return (
    <section class="hub-section" aria-labelledby="byo-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="byo-h">{L.h}</h2>
        <span class="sec-note">{L.note}</span>
      </div>

      <div class="byo card">
        <div class="byo-input">
          <div class="byo-field">
            <span class="pill-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 7H6a3 3 0 000 6h3M15 7h3a3 3 0 010 6h-3M8 10h8" />
              </svg>
            </span>
            <input
              type="text"
              placeholder={L.placeholder}
              aria-label={L.inputAria}
              value={text}
              onInput={(e) => setText((e.target as HTMLInputElement).value)}
            />
            <div class="seg src-seg" role="group" aria-label={lang === "en" ? "Source type" : "Тип источника"}>
              {(["text", "url"] as SrcType[]).map((s) => (
                <button key={s} type="button" aria-pressed={srcType === s} onClick={() => setSrcType(s)}>
                  {s === "text" ? L.text : L.url}
                </button>
              ))}
            </div>
            <button class="btn btn-primary" type="button" onClick={makeLesson} disabled={!text.trim()}>
              <span>{L.make}</span><span class="arrow">→</span>
            </button>
          </div>
          {srcType === "url" ? <div class="byo-hint" style="color:var(--warn)">{L.urlNote}</div> : null}
          <div class="byo-hint">
            <span>{L.tryLabel}</span>
            {examples.map((ex) => (
              <span class="ex" key={ex.label} role="button" tabIndex={0}
                onClick={() => { setSrcType("text"); setText(ex.fill); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setSrcType("text"); setText(ex.fill); } }}>
                {ex.label}
              </span>
            ))}
          </div>
        </div>

        {/* pipeline */}
        <div class="pipeline">
          {/* Stage 01 — Extract */}
          <div class="pipe-stage">
            <span class="ps-no">{L.s1no}</span>
            <span class="ps-title">{L.s1title}</span>
            <span class="ps-desc">{result ? L.s1desc(sourceWords) : L.s1descEmpty}</span>
            <div class="ps-fill">
              <div class="extract-bar" aria-hidden="true">
                <span class="eb known" style={`width:${w(counts.known)}%`}></span>
                <span class="eb new" style={`width:${w(counts.new)}%`}></span>
                <span class="eb tech" style={`width:${w(counts.technical)}%`}></span>
              </div>
              <div class="extract-key">
                <span><i class="k" style="background:color-mix(in srgb,var(--ink) 18%,transparent)"></i>{counts.known} {L.known}</span>
                <span><i class="k" style="background:var(--accent)"></i>{counts.new} {L.neww}</span>
                <span><i class="k" style="background:var(--d-ai)"></i>{counts.technical} {L.tech}</span>
              </div>
            </div>
          </div>

          <div class="pipe-link" aria-hidden="true"><span class="node"></span><span class="arrow">→</span></div>

          {/* Stage 02 — Build */}
          <div class="pipe-stage">
            <span class="ps-no">{L.s2no}</span>
            <span class="ps-title">{L.s2title}</span>
            <span class="ps-desc">{L.s2desc}</span>
            <div class="ps-fill">
              <div class="pipe-chips">
                <span class="pc">{result ? L.cardsMade(cardsMade) : `0 ${lang === "en" ? "SRS cards" : "карт"}`}</span>
                {exercises ? (
                  <>
                    <span class="pc">{L.clozeN(exercises.cloze.length)}</span>
                    <span class="pc">{L.compN(exercises.comprehension.length)}</span>
                    {exercises.retell ? <span class="pc">{L.retellN}</span> : null}
                  </>
                ) : null}
              </div>
              {result ? (
                <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  <button class="btn btn-primary btn-sm" type="button" onClick={buildDeck} disabled={building}>
                    <span>{building ? L.generating : L.buildDeck}</span>
                    {building ? null : <span class="arrow">→</span>}
                  </button>
                  {!keyOn && cardsMade > 0 ? (
                    <a class="btn btn-ext btn-sm" href={`/${lang}/english/writing`}>
                      <span>{L.addKey}</span>
                    </a>
                  ) : null}
                </div>
              ) : null}
              {error ? <div style="margin-top:6px;font-size:12px;color:var(--warn)">{error}</div> : null}
            </div>
          </div>

          <div class="pipe-link" aria-hidden="true"><span class="node"></span><span class="arrow">→</span></div>

          {/* Stage 03 — Reuse */}
          <div class="pipe-stage">
            <span class="ps-no">{L.s3no}</span>
            <span class="ps-title">{L.s3title}</span>
            <span class="ps-desc">{L.s3desc}</span>
            <div class="ps-fill reuse">
              <div class="reuse-grid">
                <div class="reuse-card is-own"><span class="rc-name">{L.rcComp}</span><span class="rc-mode">{L.own}</span></div>
                <div class="reuse-card is-own"><span class="rc-name">{L.rcVocab}</span><span class="rc-mode">{L.own}</span></div>
                <div class="reuse-card is-delegate"><span class="rc-name">{L.rcDict}</span><span class="rc-mode">{L.delegate}</span></div>
                <div class="reuse-card is-delegate"><span class="rc-name">{L.rcRetell}</span><span class="rc-mode">{L.delegate}</span></div>
                <div class="reuse-card is-delegate"><span class="rc-name">{L.rcImit}</span><span class="rc-mode">{L.delegate}</span></div>
              </div>
            </div>
          </div>
        </div>

        {sentences.length > 0 ? (
          <div class="byo-sentences" style="display:flex;flex-direction:column;gap:8px;border-top:0.5px solid var(--hairline);padding-top:var(--s-4)">
            <span class="ps-no">{L.sentH}</span>
            <p class="ps-desc" style="margin:0">{L.sentNote}</p>
            <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px">
              {sentences.map((s, i) => (
                <li key={s.sentence} style="display:flex;align-items:flex-start;gap:8px">
                  <input type="checkbox" checked={!unchecked.has(i)} style="margin-top:3px"
                    onChange={() => setUnchecked((u) => { const n = new Set(u); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
                  <label style="font-size:13px;line-height:1.4;color:var(--ink-2)">
                    <span class="pc" style="margin-right:6px">{s.lemma}</span>{s.sentence}
                  </label>
                </li>
              ))}
            </ul>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" type="button" onClick={saveSentenceCards}>
                <span>{L.sentSave}</span><span class="arrow">→</span>
              </button>
              {chunksMade > 0 ? <span class="pc">{L.sentMade(chunksMade)}</span> : null}
            </div>
          </div>
        ) : null}

        <div class="byo-phrase" style="display:flex;flex-direction:column;gap:6px;border-top:0.5px solid var(--hairline);padding-top:var(--s-4)">
          <span class="ps-no">{L.phraseLabel}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <input type="text" value={phrase} placeholder={L.phrasePlaceholder} aria-label={L.phraseLabel}
              onInput={(e) => setPhrase((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === "Enter") savePhrase(); }}
              style="flex:1;min-width:200px;border:0.5px solid var(--hairline-strong);border-radius:var(--r-sm);background:var(--paper);padding:8px 10px;font-size:14px;color:var(--ink)" />
            <button class="btn btn-ext btn-sm" type="button" onClick={savePhrase} disabled={!phrase.trim() && !phraseSaved}>
              <span>{phraseSaved ? L.phraseSaved : L.phraseSave}</span>
            </button>
          </div>
        </div>
      </div>
      <p class="fig-caption">
        <b>{L.caption1}</b>
        {L.caption2}
      </p>
    </section>
  );
}
