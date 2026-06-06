// src/components/path/CalibrationFlow.tsx
import { useState, useRef } from "preact/hooks";
import type { Locale } from "~/i18n";
import { knowledge, nextCalibrationProbe, unitProbeConcepts, applyDiagnosticResult } from "~/scripts/path/path-io";
import DiagnosticRunner from "./DiagnosticRunner";

const MAX_PROBES = 8;
const L = {
  en: { title: "Quick calibration", intro: "Answer a few checks so we can skip what you already know. About 5 minutes — you can stop anytime.", start: "Start", skip: "Skip to my path", done: "All set", doneBody: "Calibrated. Your path now reflects what you know.", toPath: "See my path", probed: "checks done" },
  ru: { title: "Быстрая калибровка", intro: "Ответь на несколько проверок, чтобы мы пропустили то, что ты уже знаешь. Около 5 минут — можно остановиться в любой момент.", start: "Начать", skip: "Сразу к пути", done: "Готово", doneBody: "Откалибровано. Твой путь теперь учитывает то, что ты знаешь.", toPath: "К моему пути", probed: "проверок пройдено" },
} as const;

export default function CalibrationFlow({ lang, unit: unitProp }: { lang: Locale; unit?: string }) {
  const unit = unitProp ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("unit") ?? undefined : undefined);
  const t = L[lang];
  const roadmap = `/${lang}/roadmap`;
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [probes, setProbes] = useState(0);
  const [current, setCurrent] = useState<string[]>([]);
  // Concepts already directly probed this session. A mid-band answer (0.3–0.7) leaves a concept
  // "ambiguous" so nextCalibrationProbe would re-pick the identical bank; stop instead of re-serving.
  const probed = useRef(new Set<string>());

  const nextProbe = () => {
    if (unit) return null; // unit mode runs once over the whole set
    if (probes >= MAX_PROBES) return null;
    const p = nextCalibrationProbe();
    return p && !probed.current.has(p) ? [p] : null;
  };

  const begin = () => {
    if (unit) { setCurrent(unitProbeConcepts(unit)); setPhase("run"); return; }
    const first = nextCalibrationProbe();
    if (!first) { setPhase("done"); return; }
    setCurrent([first]); setPhase("run");
  };

  const onConcept = (concept: string, frac: number) => { applyDiagnosticResult(concept, frac); probed.current.add(concept); };
  const onDone = () => {
    const np = nextProbe();
    setProbes((n) => n + current.length);
    if (np) setCurrent(np);
    else setPhase("done");
  };

  if (phase === "intro") {
    const noProbes = (unit ? unitProbeConcepts(unit) : (nextCalibrationProbe() ? [1] : [])).length === 0;
    return (
      <div class="max-w-xl flex flex-col gap-4">
        <h1 class="text-3xl font-extrabold">{t.title}</h1>
        <p class="text-stone-600">{t.intro}</p>
        <div class="flex gap-3">
          {!noProbes && <button class="rounded bg-sky-600 px-4 py-2 text-white" onClick={begin}>{t.start}</button>}
          <a class="rounded border border-stone-300 px-4 py-2" href={roadmap}>{t.skip}</a>
        </div>
      </div>
    );
  }
  if (phase === "run") {
    return (
      <div class="max-w-xl flex flex-col gap-4">
        <h1 class="text-2xl font-bold">{t.title}</h1>
        <DiagnosticRunner key={current.join(",")} lang={lang} conceptIds={current} onConcept={onConcept} onDone={onDone} />
        <a class="text-sm text-stone-500 underline" href={roadmap}>{t.skip}</a>
      </div>
    );
  }
  return (
    <div class="max-w-xl flex flex-col gap-4">
      <h1 class="text-3xl font-extrabold">{t.done}</h1>
      <p class="text-stone-600">{t.doneBody} · {probes} {t.probed} · {knowledge.value.size} concepts touched.</p>
      <a class="rounded bg-sky-600 px-4 py-2 text-white w-fit" href={roadmap}>{t.toPath}</a>
    </div>
  );
}
