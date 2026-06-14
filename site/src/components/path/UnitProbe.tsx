// src/components/path/UnitProbe.tsx
// Shared unit-probe loop: serve every diagnosable concept of one unit, grade each by
// correct-fraction, persist via applyDiagnosticResult (legacy ?unit= pre-check semantics),
// then call onComplete(). Both PathView's /roadmap quick-check modal and CalibrationFlow's
// UnitMode drive DiagnosticRunner through this single component.
import { useState, useRef, useEffect } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content, unitProbeConcepts, applyDiagnosticResult } from "~/scripts/path/path-io";
import DiagnosticRunner from "./DiagnosticRunner";
import type { DiagItem } from "~/scripts/path/calibration";
import type { Response } from "~/scripts/path/bayes";

type Props = { lang: Locale; unit: string; onComplete: () => void };

export default function UnitProbe({ lang, unit, onComplete }: Props) {
  const ids = unitProbeConcepts(unit);
  const [ci, setCi] = useState(0);
  const got = useRef<Response[]>([]);

  const done = ids.length === 0 || ci >= ids.length;
  useEffect(() => { if (done) onComplete(); }, [done]);
  if (done) return null;

  const id = ids[ci];
  const label = content.conceptById.get(id)?.label[lang] ?? id;
  const onResponse = (_item: DiagItem, r: Response) => { got.current.push(r); };
  const onDone = () => {
    const frac = got.current.length ? got.current.filter((r) => r === "correct").length / got.current.length : 0;
    applyDiagnosticResult(id, frac);
    got.current = [];
    setCi((c) => c + 1);
  };

  return <DiagnosticRunner key={id} lang={lang} concept={id} label={label} onResponse={onResponse} onDone={onDone} />;
}
