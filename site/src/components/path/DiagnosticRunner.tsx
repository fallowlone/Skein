// src/components/path/DiagnosticRunner.tsx
// Whole-bank loop over one concept's diagnostic items: reports each answer via onResponse, then
// calls onDone once the bank is exhausted. Used by UnitProbe (unit pre-check / roadmap quick-check),
// whose correct-fraction grading depends on this whole-bank semantics — keep the contract stable.
// Item rendering/grading is delegated to the shared DiagItemView.
import { useState, useEffect } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content } from "~/scripts/path/path-io";
import type { DiagItem } from "~/scripts/path/calibration";
import type { Response } from "~/scripts/path/bayes";
import DiagItemView from "./DiagItemView";

const L = {
  en: { concept: "Concept" },
  ru: { concept: "Концепт" },
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

  const empty = !bank || bank.items.length === 0;
  useEffect(() => { if (empty) onDone(); }, [empty]);
  if (empty) return null;
  const item = bank.items[ii] as DiagItem & { prompt: Record<Locale, string>; choices?: Record<Locale, string>[] };

  const advance = (r: Response) => {
    onResponse(bank.items[ii], r);
    if (ii + 1 < bank.items.length) setIi(ii + 1);
    else onDone();
  };

  const heading = (
    <div class="text-xs uppercase tracking-wide text-stone-500">
      {label} · {t.concept} {ii + 1}/{bank.items.length}
    </div>
  );

  return <DiagItemView key={ii} lang={lang} item={item} heading={heading} onAnswer={advance} />;
}
