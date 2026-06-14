// src/components/path/DiagnosticRunner.tsx
import { useState, useEffect } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content } from "~/scripts/path/path-io";
import { gradeMcq, gradeBlanks, type DiagItem } from "~/scripts/path/calibration";
import type { Response } from "~/scripts/path/bayes";

const L = {
  en: { dunno: "I don't know", next: "Next", concept: "Concept" },
  ru: { dunno: "Не знаю", next: "Дальше", concept: "Концепт" },
} as const;

type Props = {
  lang: Locale;
  concept: string;
  label: string;
  onResponse: (item: DiagItem, r: Response) => void; // per item
  onDone: () => void;                                 // bank exhausted
};

export default function DiagnosticRunner({ lang, concept, label, onResponse, onDone }: Props) {
  const t = L[lang];
  const bank = content.diagnostics[concept];
  const [ii, setIi] = useState(0);
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number | null>(null);

  const empty = !bank || bank.items.length === 0;
  useEffect(() => { if (empty) onDone(); }, [empty]);
  if (empty) return null;
  const item = bank.items[ii] as DiagItem & { prompt: Record<Locale, string>; choices?: Record<Locale, string>[] };

  const advance = (r: Response) => {
    onResponse(bank.items[ii], r);
    if (ii + 1 < bank.items.length) { setIi(ii + 1); setValue(""); setPicked(null); }
    else onDone();
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="text-xs uppercase tracking-wide text-stone-500">
        {label} · {t.concept} {ii + 1}/{bank.items.length}
      </div>
      <p id={`q-${concept}-${ii}`} class="font-medium text-stone-900">{item.prompt[lang]}</p>
      {item.type === "mcq" ? (
        <ul class="flex flex-col gap-2">
          {(item.choices ?? []).map((ch, i) => (
            <li key={`${ii}-${i}`}>
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
              onClick={() => advance(gradeMcq(item, picked!) ? "correct" : "wrong")}>{t.next}</button>
            <button class="rounded border border-stone-300 px-3 py-1.5 text-sm"
              onClick={() => advance("dont_know")}>{t.dunno}</button>
          </li>
        </ul>
      ) : (
        <div class="flex gap-2">
          <input class="flex-1 rounded border border-stone-300 px-3 py-1.5 text-sm" value={value}
            aria-labelledby={`q-${concept}-${ii}`}
            onInput={(e) => setValue((e.target as HTMLInputElement).value)} />
          <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white"
            onClick={() => advance(gradeBlanks(item, value) ? "correct" : "wrong")}>{t.next}</button>
          <button class="rounded border border-stone-300 px-3 py-1.5 text-sm"
            onClick={() => advance("dont_know")}>{t.dunno}</button>
        </div>
      )}
    </div>
  );
}
