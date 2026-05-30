import { useMemo, useState } from "preact/hooks";
import type { ReadingUnit, VocabWord } from "~/english/types";
import {
  englishState,
  statusOf,
  dueWordIds,
  knownCount,
  gradeWord,
  bumpSeen,
  recordReveal,
} from "~/english/state";
import type { Grade } from "~/english/scheduler/types";

/** Monotonic clock for scheduling; injected so logic stays testable elsewhere. */
const now = () => Date.now();
import type { Locale } from "~/i18n";

type Props = { unit: ReadingUnit; lang: Locale };

const L = {
  en: {
    read: "Read",
    review: "Review",
    check: "Check",
    showRu: "Show Russian",
    hideRu: "Hide Russian",
    words: "Words in this passage",
    known: "known",
    of: "of",
    gotIt: "Got it",
    learning: "Still learning",
    again: "Again",
    phrases: "Phrases to know",
    reviewEmpty: "Nothing to review yet. Tap words while reading and mark the hard ones “Still learning”.",
    reviewDone: "Done for now — come back later for the next round.",
    cardsLeft: "cards left",
    tagLevel: "level",
    typePrompt: "Type the English word:",
    typePlaceholder: "your answer…",
    submit: "Check",
    correct: "Correct",
    notQuite: "Not quite — the answer is:",
    iWasRight: "I was right",
    checkTitle: "Did you get it?",
    checkScore: "correct",
    checkRetry: "Try again",
  },
  ru: {
    read: "Чтение",
    review: "Повтор",
    check: "Проверка",
    showRu: "Показать перевод",
    hideRu: "Скрыть перевод",
    words: "Слова в этом фрагменте",
    known: "выучено",
    of: "из",
    gotIt: "Знаю",
    learning: "Учу",
    again: "Ещё раз",
    phrases: "Фразы, которые надо знать",
    reviewEmpty: "Пока нечего повторять. Нажимай на слова при чтении и помечай сложные «Учу».",
    reviewDone: "На сейчас всё — вернись позже за следующим кругом.",
    cardsLeft: "карточек осталось",
    tagLevel: "уровень",
    typePrompt: "Напечатай английское слово:",
    typePlaceholder: "твой ответ…",
    submit: "Проверить",
    correct: "Верно",
    notQuite: "Почти — правильный ответ:",
    iWasRight: "Я был прав",
    checkTitle: "Понял?",
    checkScore: "верно",
    checkRetry: "Ещё раз",
  },
};

export default function EnReader({ unit, lang }: Props) {
  const l = L[lang];
  const [tab, setTab] = useState<"read" | "review" | "check">("read");

  const allWords = useMemo<VocabWord[]>(
    () => unit.passages.flatMap((p) => p.words ?? []),
    [unit],
  );

  // Subscribe to the signal so the bank counters re-render on change.
  englishState.value; // subscribe to re-render on change
  const known = knownCount(allWords.map((w) => w.id));

  return (
    <section class="max-w-[760px] mx-auto">
      <div class="flex items-center gap-3 mb-4">
        <div class="text-[11px] font-mono uppercase tracking-[0.06em] text-muted border border-rule rounded-[2px] px-2 py-0.5">
          {l.tagLevel}: {unit.level}
        </div>
        <div class="text-[11px] font-mono uppercase tracking-[0.06em] text-muted border border-rule rounded-[2px] px-2 py-0.5">
          {unit.source[lang]}
        </div>
        <div class="ml-auto text-[12px] font-mono text-muted">
          {known} {l.of} {allWords.length} {l.known}
        </div>
      </div>

      <div class="h-1 w-full bg-card rounded-full overflow-hidden mb-6">
        <div
          class="h-full bg-ink transition-[width] duration-300"
          style={`width:${allWords.length ? (known / allWords.length) * 100 : 0}%`}
        />
      </div>

      <div class="flex gap-1 mb-6">
        {(["read", "review", "check"] as const).map((tt) => (
          <button
            key={tt}
            type="button"
            onClick={() => setTab(tt)}
            class={`font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border rounded-[2px] cursor-pointer transition-colors ${
              tab === tt
                ? "bg-ink text-paper border-ink"
                : "bg-transparent text-muted border-rule hover:text-ink"
            }`}
          >
            {tt === "read" ? l.read : tt === "review" ? l.review : l.check}
          </button>
        ))}
      </div>

      {tab === "read" ? (
        <ReadTab unit={unit} lang={lang} l={l} />
      ) : tab === "review" ? (
        <ReviewTab words={allWords} lang={lang} l={l} />
      ) : (
        <CheckTab unit={unit} lang={lang} l={l} />
      )}
    </section>
  );
}

function ReadTab({
  unit,
  lang,
  l,
}: {
  unit: ReadingUnit;
  lang: Locale;
  l: (typeof L)["en"];
}) {
  return (
    <div class="flex flex-col gap-8">
      {unit.passages.map((p, i) => (
        <PassageBlock key={i} idx={i} unitId={unit.id} en={p.en} ru={p.ru} words={p.words ?? []} lang={lang} l={l} />
      ))}

      <div class="mt-2 border-t border-rule pt-6">
        <div class="meta mb-3">{l.phrases}</div>
        <ul class="flex flex-col gap-2 m-0 p-0 list-none">
          {unit.phrases.map((ph) => (
            <li key={ph.id} class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <code class="text-[13px] font-mono text-ink bg-card border border-rule rounded-[2px] px-1.5 py-0.5">{ph.en}</code>
              <span class="text-[13px] text-ink">{ph.ru}</span>
              {ph.note ? <span class="text-[12px] text-muted">— {ph.note[lang]}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PassageBlock({
  idx,
  unitId,
  en,
  ru,
  words,
  lang,
  l,
}: {
  idx: number;
  unitId: string;
  en: string;
  ru: string;
  words: VocabWord[];
  lang: Locale;
  l: (typeof L)["en"];
}) {
  const [showRu, setShowRu] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  function toggleRu() {
    const next = !showRu;
    setShowRu(next);
    if (next) recordReveal(unitId, idx + 1);
  }

  function tapWord(id: string) {
    bumpSeen(id, now());
    setOpen((cur) => (cur === id ? null : id));
  }

  return (
    <div>
      <p class="text-[16px] leading-relaxed text-ink m-0">{en}</p>
      <button
        type="button"
        onClick={toggleRu}
        class="mt-2 text-[12px] font-mono text-muted hover:text-ink underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
      >
        {showRu ? l.hideRu : l.showRu}
      </button>
      {showRu ? <p class="mt-2 text-[14px] leading-relaxed text-muted m-0">{ru}</p> : null}

      {words.length ? (
        <div class="mt-3">
          <div class="meta mb-2">{l.words}</div>
          <div class="flex flex-wrap gap-2">
            {words.map((w) => {
              const status = (englishState.value, statusOf(w.id));
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => tapWord(w.id)}
                  class={`text-[13px] font-mono px-2 py-1 border rounded-[2px] cursor-pointer transition-colors ${chipClass(status, open === w.id)}`}
                >
                  {w.w}
                </button>
              );
            })}
          </div>
          {open ? (
            <WordCard word={words.find((w) => w.id === open)!} lang={lang} l={l} onDone={() => setOpen(null)} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function chipClass(status: string, active: boolean): string {
  if (active) return "bg-ink text-paper border-ink";
  if (status === "known") return "bg-transparent text-muted border-rule line-through";
  if (status === "learning") return "bg-card text-ink border-rule-strong";
  return "bg-transparent text-ink border-rule hover:border-rule-strong";
}

function WordCard({
  word,
  lang,
  l,
  onDone,
}: {
  word: VocabWord;
  lang: Locale;
  l: (typeof L)["en"];
  onDone: () => void;
}) {
  return (
    <div class="mt-3 bg-card border border-rule-strong rounded-[2px] p-4">
      <div class="flex items-baseline gap-2 flex-wrap">
        <span class="text-[16px] font-semibold text-ink">{word.w}</span>
        {word.ipa ? <span class="text-[12px] font-mono text-muted">/{word.ipa}/</span> : null}
        {word.pos ? <span class="text-[11px] font-mono uppercase text-muted">{word.pos}</span> : null}
      </div>
      <div class="text-[15px] text-ink mt-1">{word.ru}</div>
      <div class="text-[13px] text-muted mt-1">{word.gloss}</div>
      {word.example ? <div class="text-[13px] text-ink italic mt-2">“{word.example}”</div> : null}
      <div class="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => { gradeWord(word.id, "good", now()); onDone(); }}
          class="font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border border-ink bg-ink text-paper rounded-[2px] cursor-pointer"
        >
          {l.gotIt}
        </button>
        <button
          type="button"
          onClick={() => { gradeWord(word.id, "again", now()); onDone(); }}
          class="font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border border-rule-strong text-ink rounded-[2px] cursor-pointer hover:bg-card"
        >
          {l.learning}
        </button>
      </div>
    </div>
  );
}

/** Normalize an answer for forgiving comparison: lowercase, trim, collapse spaces. */
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,!?]+$/, "");
}

/**
 * Active-recall review. The prompt is the Russian meaning; the learner PRODUCES
 * the English word by typing it. This is retrieval + generation + word-level
 * output (Swain) — far stronger than flip-card recognition (Bjork).
 */
function ReviewTab({
  words,
  lang,
  l,
}: {
  words: VocabWord[];
  lang: Locale;
  l: (typeof L)["en"];
}) {
  const st = englishState.value;
  const due = useMemo(() => {
    const ids = new Set(dueWordIds(words.map((w) => w.id), now()));
    return words.filter((w) => ids.has(w.id));
  }, [words, st]);
  const learning = words.filter((w) => statusOf(w.id) === "learning");
  const deck = due.length ? due : learning;

  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [graded, setGraded] = useState<null | boolean>(null);

  if (deck.length === 0) {
    return <p class="text-[14px] text-muted">{l.reviewEmpty}</p>;
  }
  if (i >= deck.length) {
    return <p class="text-[14px] text-muted">{l.reviewDone}</p>;
  }

  const card = deck[i];

  function submit() {
    const ok = norm(val) === norm(card.w);
    setGraded(ok);
    gradeWord(card.id, ok ? "good" : "again", now());
  }

  function next(overrideCorrect?: boolean) {
    if (overrideCorrect) gradeWord(card.id, "good", now()); // learner self-corrects a typo
    setGraded(null);
    setVal("");
    setI((n) => n + 1);
  }

  return (
    <div class="max-w-[460px] mx-auto">
      <div class="text-[12px] font-mono text-muted text-right mb-3">
        {deck.length - i} {l.cardsLeft}
      </div>
      <div class="bg-card border border-rule-strong rounded-[2px] p-8 min-h-[180px] flex flex-col gap-3">
        <div class="text-[20px] font-semibold text-ink">{card.ru}</div>
        <div class="text-[13px] text-muted">{card.gloss}</div>

        <label class="text-[12px] font-mono text-muted mt-2">{l.typePrompt}</label>
        <input
          type="text"
          value={val}
          disabled={graded !== null}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          placeholder={l.typePlaceholder}
          onInput={(e) => setVal((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === "Enter" && graded === null) submit(); }}
          class="bg-paper border border-rule-strong rounded-[2px] px-3 py-2 text-[15px] text-ink font-mono outline-none focus:border-ink"
        />

        {graded === true ? (
          <div class="text-[14px] text-ink">✓ {l.correct}: <span class="font-semibold">{card.w}</span></div>
        ) : null}
        {graded === false ? (
          <div class="text-[14px] text-ink">{l.notQuite} <span class="font-semibold">{card.w}</span> {card.ipa ? <span class="text-muted font-mono">/{card.ipa}/</span> : null}</div>
        ) : null}
      </div>

      {graded === null ? (
        <div class="flex justify-center mt-4">
          <button
            type="button"
            onClick={submit}
            class="font-mono text-[11px] uppercase tracking-[0.04em] px-4 py-2 border border-ink bg-ink text-paper rounded-[2px] cursor-pointer"
          >
            {l.submit}
          </button>
        </div>
      ) : (
        <div class="flex gap-2 mt-4 justify-center">
          <button
            type="button"
            onClick={() => next()}
            class="font-mono text-[11px] uppercase tracking-[0.04em] px-4 py-2 border border-ink bg-ink text-paper rounded-[2px] cursor-pointer"
          >
            {l.gotIt}
          </button>
          {graded === false ? (
            <button
              type="button"
              onClick={() => next(true)}
              class="font-mono text-[11px] uppercase tracking-[0.04em] px-4 py-2 border border-rule-strong text-ink rounded-[2px] cursor-pointer hover:bg-card"
            >
              {l.iWasRight}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Comprehension check — pairs reading with retrieval (ER moderator effect). */
function CheckTab({
  unit,
  lang,
  l,
}: {
  unit: ReadingUnit;
  lang: Locale;
  l: (typeof L)["en"];
}) {
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [nonce, setNonce] = useState(0);

  const answered = unit.questions.filter((q) => picked[q.id] !== undefined);
  const score = unit.questions.filter((q) => picked[q.id] === q.answer).length;
  const allDone = answered.length === unit.questions.length;

  function reset() {
    setPicked({});
    setNonce((n) => n + 1);
  }

  return (
    <div class="max-w-[600px] mx-auto" key={nonce}>
      <div class="flex items-baseline justify-between mb-5">
        <div class="meta">{l.checkTitle}</div>
        {allDone ? (
          <div class="text-[12px] font-mono text-muted">
            {score} / {unit.questions.length} {l.checkScore}
          </div>
        ) : null}
      </div>

      <div class="flex flex-col gap-7">
        {unit.questions.map((q) => {
          const sel = picked[q.id];
          const locked = sel !== undefined;
          return (
            <div key={q.id}>
              <p class="text-[15px] text-ink m-0 mb-3">{q.q[lang]}</p>
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
                      {opt[lang]}
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
