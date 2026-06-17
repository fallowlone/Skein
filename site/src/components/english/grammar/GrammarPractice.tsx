// GrammarPractice — the exercise loop for one topic. Generates items on the fly
// from the topic's committed gen spec (pure, seeded engine), one at a time, with
// calm correct/incorrect feedback. FSRS grades behind the scenes. Cross-topic
// mixing widens the pool; BYOK affordance shows only when a key is connected.
import { useEffect, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { Bi } from "~/english/types";
import type { Cefr, TopicGenSpec } from "~/english/grammar-types";
import type { GeneratedExercise } from "~/english/practice-engine/types";
import { generateFromSpec } from "~/english/practice-engine/generate";
import { compositeFromSpecs } from "~/english/practice-engine/cross-topic";
import { gradeGrammarTopic } from "~/english/state";
import { keyStatus } from "~/english/byok";
import { gt } from "./strings";

export type CrossSpec = { id: string; spec: TopicGenSpec };

type Props = {
  lang: Locale;
  topicId: string;
  title: Bi;
  cefr: Cefr;
  hue: string;
  spec: TopicGenSpec;
  level?: Cefr;
  crossSpecs?: CrossSpec[];
  byok?: boolean;
  onExit?: () => void;
};

const SESSION_LEN = 8;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export default function GrammarPractice({
  lang, topicId, title, cefr, hue, spec, level, crossSpecs = [], byok = false, onExit,
}: Props) {
  const [seedBase] = useState(() => Math.floor(Date.now() % 1_000_000) + 1);
  const [round, setRound] = useState(0);
  const [cross, setCross] = useState(false);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [value, setValue] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  // BYOK affordance shows once an Anthropic key is connected on THIS device. The
  // key lives only client-side (IndexedDB), so the SSR-passed `byok` prop is
  // always false — detect after mount. Mirrors KeyEntry's keyStatus() probe.
  const [keyConnected, setKeyConnected] = useState(false);
  useEffect(() => {
    let alive = true;
    keyStatus().then((s) => { if (alive && s !== "none") setKeyConnected(true); });
    return () => { alive = false; };
  }, []);
  const showByok = byok || keyConnected;

  function draw(stepN: number, useCross: boolean, rnd: number): GeneratedExercise | null {
    const seed = seedBase + rnd * 9973 + stepN * 7;
    if (useCross && crossSpecs.length && stepN % 2 === 1) {
      const sib = crossSpecs[stepN % crossSpecs.length];
      const items = compositeFromSpecs(topicId, spec, sib.id, sib.spec, { count: 1, seed, level });
      if (items.length) return items[0];
    }
    // Prefer items at the selected level. But a topic's templates span only part
    // of its CEFR range (e.g. A1–A2 templates under an A0-default selector), so a
    // level filter can match zero templates and strand the runner on the spinner.
    // Fall back to the unfiltered pool so practice always has items to draw.
    let items = generateFromSpec(topicId, spec, { count: 1, seed, level });
    if (!items.length) items = generateFromSpec(topicId, spec, { count: 1, seed });
    return items[0] ?? null;
  }

  const [item, setItem] = useState<GeneratedExercise | null>(() => draw(0, false, 0));

  const complete = step >= SESSION_LEN;
  const isMc = item?.type === "multiple_choice" && !!item.options?.length;

  function correctness(): boolean {
    if (!item) return false;
    if (isMc) {
      if (chosen === null) return false;
      const picked = item.options![chosen];
      return norm(picked) === norm(item.answer) || item.alts.some((a) => norm(a) === norm(picked));
    }
    return norm(value) === norm(item.answer) || item.alts.some((a) => norm(a) === norm(value));
  }

  function check() {
    if (!item || answered) return;
    const ok = correctness();
    gradeGrammarTopic(topicId, ok ? "good" : "again", Date.now());
    setResults((r) => [...r, ok]);
    setAnswered(true);
  }

  function next() {
    const n = step + 1;
    setAnswered(false);
    setValue("");
    setChosen(null);
    setStep(n);
    if (n < SESSION_LEN) setItem(draw(n, cross, round));
  }

  function again() {
    const r = round + 1;
    setRound(r);
    setStep(0);
    setResults([]);
    setValue("");
    setChosen(null);
    setAnswered(false);
    setItem(draw(0, cross, r));
  }

  function toggleCross() {
    const c = !cross;
    setCross(c);
    if (!answered) setItem(draw(step, c, round)); // re-draw the pending item with the new pool
  }

  const track = Array.from({ length: SESSION_LEN }, (_, i) =>
    i < results.length ? (results[i] ? "done" : "wrong") : i === step ? "cur" : "",
  );
  const rightCount = results.filter(Boolean).length;
  const bestStreak = results.reduce(
    (acc, ok) => {
      const run = ok ? acc.run + 1 : 0;
      return { run, best: Math.max(acc.best, run) };
    },
    { run: 0, best: 0 },
  ).best;
  const pct = Math.round((rightCount / SESSION_LEN) * 100);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div class="practice">
      <div class="practice-bar">
        <span class="pb-topic" style={{ "--fam": hue }}>
          <span class="sq" />
          {title[lang]}
          <span class="cefr-badge" style={{ "--fam": hue, marginLeft: 4 }}>{cefr}</span>
        </span>
        <span class="pb-spacer" />
        <span class="session-track" aria-hidden="true">
          {track.map((s, i) => <i key={i} class={s} />)}
        </span>
        <span class="session-count">{results.length}/{SESSION_LEN}</span>
        {crossSpecs.length > 0 && (
          <button type="button" class="cross-toggle" aria-pressed={cross} onClick={toggleCross}>
            <span class="tog" />{gt("prac_cross", lang)}
          </button>
        )}
      </div>

      {complete ? (
        <SessionDone lang={lang} pct={pct} right={rightCount} best={bestStreak} onAgain={again} onExit={onExit} />
      ) : !item ? (
        <div class="item-card">
          <div class="gen-state">
            <span class="gen-spinner" />
            <span class="gen-label">{gt("prac_generating", lang)}</span>
            <span class="gen-sub">{gt("prac_gen_sub", lang)}</span>
          </div>
        </div>
      ) : (
        <div class="item-card">
          <div class="item-kind">
            <span class="ik-tag"><span class="sq" />{gt(isMc ? "prac_mc" : "prac_cloze", lang)}</span>
            {cross && crossSpecs.length > 0 && <span class="ik-cross">+ {gt("prac_cross", lang)}</span>}
          </div>

          {isMc ? (
            <McItem item={item} chosen={chosen} answered={answered} onPick={setChosen} />
          ) : (
            <ClozeItem item={item} value={value} answered={answered} onInput={setValue}
              onEnter={check} placeholder={gt("prac_type_here", lang)} />
          )}

          {answered && <Feedback ok={results[results.length - 1]} item={item} lang={lang} />}

          <div class="item-actions">
            {!answered ? (
              <>
                {!isMc && <a class="btn btn-ghost btn-sm" href="#" onClick={(e) => { e.preventDefault(); next(); }}>{gt("prac_skip", lang)}</a>}
                <span class="ia-spacer" />
                <button type="button" class="btn btn-primary"
                  disabled={isMc ? chosen === null : !value.trim()}
                  onClick={check}>{gt("prac_check", lang)}</button>
              </>
            ) : (
              <>
                <span class="ia-spacer" />
                <button type="button" class="btn btn-primary" onClick={next}>
                  {gt("prac_next", lang)} <span class="arrow">→</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showByok && !complete && (
        <div class="byok-more">
          <span class="bm-key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <circle cx="8" cy="15" r="4" /><path d="M11 12l8-8 2 2-2 2 2 2-2 2-2-2-2 2" />
            </svg>
          </span>
          <span class="bm-text">
            <span class="bm-title">{gt("byok_title", lang)}</span>
            <span class="bm-sub">{gt("byok_sub", lang)}</span>
          </span>
          <span class="bm-exp">{gt("byok_exp", lang)}</span>
        </div>
      )}
    </div>
  );
}

function ClozeItem(
  { item, value, answered, onInput, onEnter, placeholder }:
  { item: GeneratedExercise; value: string; answered: boolean; onInput: (v: string) => void; onEnter: () => void; placeholder: string },
) {
  const parts = item.prompt.split("___");
  const hasBlank = parts.length > 1;
  return (
    <>
      <div class="item-prompt">
        {hasBlank
          ? parts.map((p, i) => (
              <span key={i}>
                {p}
                {i < parts.length - 1 && (
                  <span class={"blank" + (answered ? " filled" : "")}>{answered ? item.answer : " "}</span>
                )}
              </span>
            ))
          : item.prompt}
      </div>
      {!answered && (
        <div class="cloze-input">
          <input
            value={value}
            onInput={(e) => onInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onEnter(); }}
            placeholder={placeholder}
            aria-label={placeholder}
          />
        </div>
      )}
    </>
  );
}

function McItem(
  { item, chosen, answered, onPick }:
  { item: GeneratedExercise; chosen: number | null; answered: boolean; onPick: (i: number) => void },
) {
  const options = item.options ?? [];
  const answerIdx = options.findIndex((o) => norm(o) === norm(item.answer));
  return (
    <>
      <div class="item-prompt">{item.prompt}</div>
      <div class="mc-options">
        {options.map((opt, i) => {
          let cls = "mc-opt";
          if (answered) {
            if (i === answerIdx) cls += " correct";
            else if (i === chosen) cls += " incorrect";
          } else if (i === chosen) cls += " selected";
          return (
            <button type="button" class={cls} key={i} disabled={answered} onClick={() => onPick(i)}>
              <span class="key">{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
              {answered && i === answerIdx && (
                <span class="mc-mark" style={{ color: "var(--ok)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                </span>
              )}
              {answered && i === chosen && i !== answerIdx && (
                <span class="mc-mark" style={{ color: "var(--danger)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Feedback({ ok, item, lang }: { ok: boolean; item: GeneratedExercise; lang: Locale }) {
  return (
    <div class={"feedback " + (ok ? "correct" : "incorrect")}>
      <div class="fb-head">
        <span class="fb-icon">
          {ok
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 8v5M12 16v.5" /><circle cx="12" cy="12" r="9" /></svg>}
        </span>
        <span class="fb-title">{gt(ok ? "prac_correct" : "prac_incorrect", lang)}</span>
        {ok && (
          <span class="fb-strength">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l5-5 4 4 8-9" /><path d="M16 7h4v4" /></svg>
            {gt("prac_stronger", lang)}
          </span>
        )}
      </div>
      {!ok && <div class="fb-answer">{gt("prac_answer", lang)}: <span class="ans">{item.answer}</span></div>}
      <div class="fb-rationale">
        <span class="fr-ru">{item.rationale.ru}</span>
        <span class="fr-en">{item.rationale.en}</span>
      </div>
    </div>
  );
}

function SessionDone(
  { lang, pct, right, best, onAgain, onExit }:
  { lang: Locale; pct: number; right: number; best: number; onAgain: () => void; onExit?: () => void },
) {
  const R = 40;
  const C = 2 * Math.PI * R;
  return (
    <div class="session-done">
      <div class="sd-ring">
        <svg width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={R} fill="none" stroke="color-mix(in srgb, var(--ink) 11%, transparent)" stroke-width="6" />
          <circle cx="46" cy="46" r={R} fill="none" stroke="var(--ok)" stroke-width="6" stroke-linecap="round"
            stroke-dasharray={C} stroke-dashoffset={C * (1 - pct / 100)} />
        </svg>
        <span class="sd-num">{pct}<span style={{ fontSize: "0.42em", color: "var(--muted)" }}>%</span></span>
      </div>
      <h3>{gt("prac_done_title", lang)}</h3>
      <div class="sd-stats">
        <div class="sd-stat"><b>{right}/{SESSION_LEN}</b><span>{gt("sd_right", lang)}</span></div>
        <div class="sd-stat"><b>{best}</b><span>{gt("sd_streak", lang)}</span></div>
      </div>
      <p class="sd-line">{gt("prac_done_line", lang)}</p>
      <div class="sd-actions">
        {onExit && <button type="button" class="btn btn-secondary" onClick={onExit}>{gt("prac_back_topic", lang)}</button>}
        <button type="button" class="btn btn-primary" onClick={onAgain}>
          <span>{gt("prac_again", lang)}</span><span class="arrow">→</span>
        </button>
      </div>
    </div>
  );
}
