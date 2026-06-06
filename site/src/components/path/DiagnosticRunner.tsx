// src/components/path/DiagnosticRunner.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content } from "~/scripts/path/path-io";
import { gradeMcq, gradeBlanks, fracOf } from "~/scripts/path/calibration";

const L = {
  en: { skip: "Not sure", next: "Next", concept: "Concept", of: "of", done: "Done" },
  ru: { skip: "Не уверен(а)", next: "Дальше", concept: "Концепт", of: "из", done: "Готово" },
} as const;

type Props = { lang: Locale; conceptIds: string[]; onConcept: (concept: string, correctFrac: number) => void; onDone: () => void };

export default function DiagnosticRunner({ lang, conceptIds, onConcept, onDone }: Props) {
  const t = L[lang];
  const ids = conceptIds.filter((id) => content.diagnostics[id]); // only diagnosable
  const [ci, setCi] = useState(0);       // current concept index
  const [ii, setIi] = useState(0);       // current item index
  const [results, setResults] = useState<boolean[]>([]);
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number | null>(null);

  if (ids.length === 0) { onDone(); return null; }
  const bank = content.diagnostics[ids[ci]];
  const item = bank.items[ii] as any;
  const label = content.conceptById.get(ids[ci])?.label[lang] ?? ids[ci];

  const advance = (correct: boolean) => {
    const nextResults = [...results, correct];
    if (ii + 1 < bank.items.length) {
      setResults(nextResults); setIi(ii + 1); setValue(""); setPicked(null); return;
    }
    onConcept(ids[ci], fracOf(nextResults));
    if (ci + 1 < ids.length) { setCi(ci + 1); setIi(0); setResults([]); setValue(""); setPicked(null); }
    else onDone();
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="text-xs uppercase tracking-wide text-stone-500">{label} · {t.concept} {ci + 1} {t.of} {ids.length}</div>
      <p class="font-medium text-stone-900">{item.prompt[lang]}</p>
      {item.type === "mcq" ? (
        <ul class="flex flex-col gap-2">
          {item.choices.map((ch: any, i: number) => (
            <li key={i}>
              <button class={`w-full rounded border px-3 py-2 text-left text-sm ${picked === i ? "border-sky-500 bg-sky-50" : "border-stone-300 hover:bg-stone-100"}`} onClick={() => setPicked(i)}>{ch[lang]}</button>
            </li>
          ))}
          <li class="flex gap-2">
            <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white disabled:opacity-40" disabled={picked === null} onClick={() => advance(gradeMcq(item, picked!))}>{t.next}</button>
            <button class="rounded border border-stone-300 px-3 py-1.5 text-sm" onClick={() => advance(false)}>{t.skip}</button>
          </li>
        </ul>
      ) : (
        <div class="flex gap-2">
          <input class="flex-1 rounded border border-stone-300 px-3 py-1.5 text-sm" value={value} onInput={(e) => setValue((e.target as HTMLInputElement).value)} />
          <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white" onClick={() => advance(gradeBlanks(item, value))}>{t.next}</button>
          <button class="rounded border border-stone-300 px-3 py-1.5 text-sm" onClick={() => advance(false)}>{t.skip}</button>
        </div>
      )}
    </div>
  );
}
