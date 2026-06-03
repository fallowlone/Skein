// site/src/components/german/DeReader.tsx
// German reading-unit reader. Adapted from components/english/EnReader.tsx, but the
// German Passage carries no per-passage word list ({ de, ru } only), so the
// type-the-word review tab is dropped. Read tab renders German prose via passage.de
// with a .ru toggle and a phrase list (German text lives in phrase.en per the
// reading author's data shape); Check tab is the comprehension MCQ (q.en is German,
// q.ru Russian). Completing the check seeds targetWords via the parent's onComplete.
import { useState, useEffect } from "preact/hooks";
import type { ReadingUnit, Phrase } from "~/german/types";
import { germanState, recordReveal } from "~/german/state";
import type { Locale } from "~/i18n";

type Props = { unit: ReadingUnit; lang: Locale; onComplete?: () => void };

const L = {
  en: {
    read: "Read", check: "Check",
    showRu: "Show Russian", hideRu: "Hide Russian",
    phrases: "Phrases to know",
    checkTitle: "Did you get it?", checkScore: "correct", checkRetry: "Try again",
    tagLevel: "level",
  },
  ru: {
    read: "Чтение", check: "Проверка",
    showRu: "Показать перевод", hideRu: "Скрыть перевод",
    phrases: "Фразы, которые надо знать",
    checkTitle: "Понял?", checkScore: "верно", checkRetry: "Ещё раз",
    tagLevel: "уровень",
  },
};

export default function DeReader({ unit, lang, onComplete }: Props) {
  const l = L[lang];
  const [tab, setTab] = useState<"read" | "check">("read");
  germanState.value; // subscribe to re-render on change

  return (
    <section class="max-w-[760px] mx-auto">
      <div class="flex items-center gap-3 mb-4">
        <div class="text-[11px] font-mono uppercase tracking-[0.06em] text-muted border border-rule rounded-[2px] px-2 py-0.5">
          {l.tagLevel}: {unit.level}
        </div>
        <div class="text-[11px] font-mono uppercase tracking-[0.06em] text-muted border border-rule rounded-[2px] px-2 py-0.5">
          {unit.source[lang]}
        </div>
      </div>

      <div class="flex gap-1 mb-6">
        {(["read", "check"] as const).map((tt) => (
          <button
            key={tt}
            type="button"
            onClick={() => setTab(tt)}
            class={`font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border rounded-[2px] cursor-pointer transition-colors ${
              tab === tt ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule hover:text-ink"
            }`}
          >
            {tt === "read" ? l.read : l.check}
          </button>
        ))}
      </div>

      {tab === "read" ? (
        <ReadTab unit={unit} lang={lang} l={l} />
      ) : (
        <CheckTab unit={unit} lang={lang} l={l} onComplete={onComplete} />
      )}
    </section>
  );
}

function ReadTab({ unit, lang, l }: { unit: ReadingUnit; lang: Locale; l: (typeof L)["en"] }) {
  return (
    <div class="flex flex-col gap-8">
      {unit.passages.map((p, i) => (
        <PassageBlock key={i} idx={i} unitId={unit.id} de={p.de} ru={p.ru} lang={lang} l={l} />
      ))}

      {unit.phrases.length ? (
        <div class="mt-2 border-t border-rule pt-6">
          <div class="meta mb-3">{l.phrases}</div>
          <ul class="flex flex-col gap-2 m-0 p-0 list-none">
            {unit.phrases.map((ph: Phrase) => (
              <li key={ph.id} class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {/* German phrase text lives in ph.en per the reading data shape */}
                <code class="text-[13px] font-mono text-ink bg-card border border-rule rounded-[2px] px-1.5 py-0.5">{ph.en}</code>
                <span class="text-[13px] text-ink">{ph.ru}</span>
                {ph.note ? <span class="text-[12px] text-muted">— {ph.note[lang]}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PassageBlock({ idx, unitId, de, ru, lang, l }: {
  idx: number; unitId: string; de: string; ru: string; lang: Locale; l: (typeof L)["en"];
}) {
  const [showRu, setShowRu] = useState(false);

  function toggleRu() {
    const next = !showRu;
    setShowRu(next);
    if (next) recordReveal(unitId, idx + 1);
  }

  return (
    <div>
      <p class="text-[16px] leading-relaxed text-ink m-0">{de}</p>
      <button
        type="button"
        onClick={toggleRu}
        class="mt-2 text-[12px] font-mono text-muted hover:text-ink underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
      >
        {showRu ? l.hideRu : l.showRu}
      </button>
      {showRu ? <p class="mt-2 text-[14px] leading-relaxed text-muted m-0">{ru}</p> : null}
    </div>
  );
}

/** Comprehension check — pairs reading with retrieval. q.en holds the German question. */
function CheckTab({ unit, lang, l, onComplete }: {
  unit: ReadingUnit; lang: Locale; l: (typeof L)["en"]; onComplete?: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [nonce, setNonce] = useState(0);

  const answered = unit.questions.filter((q) => picked[q.id] !== undefined);
  const score = unit.questions.filter((q) => picked[q.id] === q.answer).length;
  const allDone = unit.questions.length > 0 && answered.length === unit.questions.length;

  useEffect(() => {
    if (allDone) onComplete?.();
  }, [allDone]);

  function reset() {
    setPicked({});
    setNonce((n) => n + 1);
  }

  return (
    <div class="max-w-[600px] mx-auto" key={nonce}>
      <div class="flex items-baseline justify-between mb-5">
        <div class="meta">{l.checkTitle}</div>
        {allDone ? (
          <div class="text-[12px] font-mono text-muted">{score} / {unit.questions.length} {l.checkScore}</div>
        ) : null}
      </div>

      <div class="flex flex-col gap-7">
        {unit.questions.map((q) => {
          const sel = picked[q.id];
          const locked = sel !== undefined;
          return (
            <div key={q.id}>
              {/* q.en holds the German question; q.ru the Russian */}
              <p class="text-[15px] text-ink m-0 mb-3">{lang === "ru" ? q.q.ru : q.q.en}</p>
              <div class="flex flex-col gap-2">
                {q.options.map((opt, oi) => {
                  const isAnswer = oi === q.answer;
                  const isPicked = sel === oi;
                  let cls = "border-rule text-ink hover:border-rule-strong";
                  if (locked && isAnswer) cls = "border-ink bg-card text-ink";
                  else if (locked && isPicked && !isAnswer) cls = "border-rule-strong text-muted line-through";
                  else if (locked) cls = "border-rule text-muted";
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={locked}
                      onClick={() => setPicked((p) => ({ ...p, [q.id]: oi }))}
                      class={`text-left text-[14px] px-3 py-2 border rounded-[2px] transition-colors ${locked ? "" : "cursor-pointer"} ${cls}`}
                    >
                      {lang === "ru" ? opt.ru : opt.en}
                    </button>
                  );
                })}
              </div>
              {locked && q.explain ? (
                <p class="text-[13px] text-muted mt-2 m-0">{q.explain[lang]}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {allDone ? (
        <div class="flex justify-center mt-7">
          <button
            type="button"
            onClick={reset}
            class="font-mono text-[11px] uppercase tracking-[0.04em] px-4 py-2 border border-rule-strong text-ink rounded-[2px] cursor-pointer hover:bg-card"
          >
            {l.checkRetry}
          </button>
        </div>
      ) : null}
    </div>
  );
}
