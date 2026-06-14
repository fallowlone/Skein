// Single diagnostic item: renders one MCQ or blanks question, grades it client-side, and reports
// a bayes Response. Stateless across items — the parent controls identity via `key`, so a fresh
// item resets the local pick/value. Shared by DiagnosticRunner (whole-bank loop, used by UnitProbe)
// and CalibrationFlow's one-item-per-step placement run.
import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { Locale } from "~/i18n";
import { gradeMcq, gradeBlanks, type DiagItem } from "~/scripts/path/calibration";
import type { Response } from "~/scripts/path/bayes";

const L = {
  en: { dunno: "I don't know", next: "Next" },
  ru: { dunno: "Не знаю", next: "Дальше" },
} as const;

type ItemView = DiagItem & { prompt: Record<Locale, string>; choices?: Record<Locale, string>[] };

type Props = {
  lang: Locale;
  item: ItemView;
  heading?: ComponentChildren;
  onAnswer: (r: Response) => void;
};

export default function DiagItemView({ lang, item, heading, onAnswer }: Props) {
  const t = L[lang];
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const qid = `q-${item.id}`;

  return (
    <div class="flex flex-col gap-3">
      {heading}
      <p id={qid} class="font-medium text-stone-900">{item.prompt[lang]}</p>
      {item.type === "mcq" ? (
        <ul class="flex flex-col gap-2">
          {(item.choices ?? []).map((ch, i) => (
            <li key={i}>
              <button
                class={`w-full rounded border px-3 py-2 text-left text-sm ${picked === i ? "border-sky-500 bg-sky-50" : "border-stone-300 hover:bg-stone-100"}`}
                aria-pressed={picked === i}
                onClick={() => setPicked(i)}
              >{ch[lang]}</button>
            </li>
          ))}
          <li class="flex gap-2">
            <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              disabled={picked === null}
              onClick={() => onAnswer(gradeMcq(item, picked!) ? "correct" : "wrong")}>{t.next}</button>
            <button class="rounded border border-stone-300 px-3 py-1.5 text-sm"
              onClick={() => onAnswer("dont_know")}>{t.dunno}</button>
          </li>
        </ul>
      ) : (
        <div class="flex gap-2">
          <input class="flex-1 rounded border border-stone-300 px-3 py-1.5 text-sm" value={value}
            aria-labelledby={qid}
            onInput={(e) => setValue((e.target as HTMLInputElement).value)} />
          <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white"
            onClick={() => onAnswer(gradeBlanks(item, value) ? "correct" : "wrong")}>{t.next}</button>
          <button class="rounded border border-stone-300 px-3 py-1.5 text-sm"
            onClick={() => onAnswer("dont_know")}>{t.dunno}</button>
        </div>
      )}
    </div>
  );
}
