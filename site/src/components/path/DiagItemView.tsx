// Single diagnostic item rendered as the Skein question card (q-card). One MCQ or one
// free-text blank. Select-then-submit: picking an option / "I don't know" / typing only arms the
// answer; it is sent on Next (a real third "dont_know" answer, never scored wrong). The parent
// controls identity via `key`, so a fresh item resets local state. Shared by DiagnosticRunner
// (whole-bank loop, UnitProbe) and CalibrationFlow's one-item-per-step placement run.
import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { Locale } from "~/i18n";
import { gradeMcq, gradeBlanks, type DiagItem } from "~/scripts/path/calibration";
import type { Response } from "~/scripts/path/bayes";

const L = {
  en: { dunno: "I don't know", next: "Next", hint: "one line · spelling-tolerant", ph: "Type your answer…" },
  ru: { dunno: "Не знаю", next: "Дальше", hint: "одна строка · допускает опечатки", ph: "Введи ответ…" },
} as const;

const KEYS = ["A", "B", "C", "D", "E", "F"];

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

type ItemView = DiagItem & { prompt: Record<Locale, string>; choices?: Record<Locale, string>[] };

type Props = {
  lang: Locale;
  item: ItemView;
  /** Context strip + progress (q-context / q-progress) rendered above the question text. */
  heading?: ComponentChildren;
  /** Area hue token (e.g. "--d-backend") for the card's left accent. Defaults to the accent. */
  hue?: string;
  /** Extra nodes appended to the actions row (e.g. the placement "skip" link). */
  trailingActions?: ComponentChildren;
  onAnswer: (r: Response) => void;
};

export default function DiagItemView({ lang, item, heading, hue, trailingActions, onAnswer }: Props) {
  const t = L[lang];
  const [picked, setPicked] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [dunno, setDunno] = useState(false);
  const qid = `q-${item.id}`;

  const isMcq = item.type === "mcq";
  const armed = dunno || (isMcq ? picked !== null : value.trim().length > 0);

  const submit = () => {
    if (!armed) return;
    if (dunno) return onAnswer("dont_know");
    if (isMcq) return onAnswer(gradeMcq(item, picked!) ? "correct" : "wrong");
    onAnswer(gradeBlanks(item, value) ? "correct" : "wrong");
  };

  const cardStyle = hue ? `--d:var(${hue})` : undefined;

  return (
    <div class="q-card q-swap-body is-entering" style={cardStyle}>
      {heading}
      <p class="q-text" id={qid}>{item.prompt[lang]}</p>

      {isMcq ? (
        <div class="q-options" role="group" aria-labelledby={qid}>
          {(item.choices ?? []).map((ch, i) => (
            <button
              key={i}
              class="q-opt"
              type="button"
              aria-pressed={picked === i}
              onClick={() => { setPicked(i); setDunno(false); }}
            >
              <span class="qo-key">{KEYS[i] ?? i + 1}</span>
              <span class="qo-label">{ch[lang]}</span>
              <span class="qo-tick"><Check /></span>
            </button>
          ))}
        </div>
      ) : (
        <div class={`q-blank${value.trim() && !dunno ? " is-filled" : ""}`}>
          <label class="qb-field">
            <span class="qb-pre">&gt;</span>
            <input
              type="text"
              aria-labelledby={qid}
              value={value}
              placeholder={t.ph}
              onInput={(e) => { setValue((e.target as HTMLInputElement).value); setDunno(false); }}
            />
          </label>
          <span class="qb-hint">{t.hint}</span>
        </div>
      )}

      <div class="q-actions">
        <button class="btn btn-primary" type="button" disabled={!armed} aria-disabled={!armed} onClick={submit}>
          <span>{t.next}</span><span class="arrow">→</span>
        </button>
        <button
          class="btn btn-secondary q-dunno"
          type="button"
          aria-pressed={dunno}
          onClick={() => { setDunno((d) => !d); setPicked(null); }}
        >{t.dunno}</button>
        {trailingActions}
      </div>
    </div>
  );
}
