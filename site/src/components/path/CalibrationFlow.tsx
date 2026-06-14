// src/components/path/CalibrationFlow.tsx
// Probabilistic placement orchestrator (4 stages: Aim → Mode → Deep run → Result).
//
// Aim   — pick a goal + coarse per-family self-placement (AimStage).
// Mode   — express (cap per family) vs full coverage (run until every concept settles).
// Run    — adaptive Bayesian probing: each step picks the unsettled concept with the highest
//          expected info-gain, updates its posterior per answer, and propagates PASS/FAIL to
//          prereqs/dependents. Express stops a family at EXPRESS_CAP; full runs to settle.
// Result — writes posteriors back to KnowledgeState, then shows the report (PlacementResult).
//
// The legacy `?unit=` pre-check is preserved verbatim (UnitMode): a single linear pass over a
// unit's diagnosed concepts, folding the correct-fraction into knowledge via applyDiagnosticResult.
import { useState, useRef } from "preact/hooks";
import type { Locale } from "~/i18n";
import {
  content, seedPriors, itemIrt, conceptIrt, familyConcepts, families,
  writePlacementPosteriors,
} from "~/scripts/path/path-io";
import {
  posterior, propagatePriors, variance, expectedInfoGain, SETTLE_VAR, PASS, FAIL,
  type SelfPlace, type Response,
} from "~/scripts/path/bayes";
import type { DiagItem } from "~/scripts/path/calibration";
import DiagnosticRunner from "./DiagnosticRunner";
import UnitProbe from "./UnitProbe";
import AimStage from "./AimStage";
import PlacementResult from "./PlacementResult";

const EXPRESS_CAP = 5; // items per family in express mode
const L = {
  en: { mode: "Choose depth", express: "Express (~10 min)", full: "Full coverage", family: "Area", skip: "Skip to my path" },
  ru: { mode: "Выбери глубину", express: "Экспресс (~10 мин)", full: "Полное покрытие", family: "Область", skip: "Сразу к пути" },
} as const;

type Phase = "aim" | "mode" | "run" | "result";

export default function CalibrationFlow({ lang, unit: unitProp }: { lang: Locale; unit?: string }) {
  const unit = unitProp ?? (typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("unit") ?? undefined : undefined);

  // `?unit=` runs the legacy single-unit pre-check; the 4-stage flow is the default.
  // Split into two components so every hook stays unconditional (rules-of-hooks).
  if (unit) return <UnitMode lang={lang} unit={unit} />;
  return <PlacementMachine lang={lang} />;
}

function PlacementMachine({ lang }: { lang: Locale }) {
  const t = L[lang];
  const roadmap = `/${lang}/roadmap`;
  const [phase, setPhase] = useState<Phase>("aim");
  const self = useRef<Record<string, SelfPlace> | null>(null);
  const express = useRef(false);
  const priors = useRef(new Map<string, number>());
  const order = useRef<string[]>([]);
  const famCount = useRef(new Map<string, number>());
  const [curConcept, setCurConcept] = useState<string | null>(null);

  const familyOf = (id: string): string => {
    const track = content.conceptById.get(id)?.track as string;
    for (const f of families()) if (f.tracks.includes(track)) return f.key;
    return "";
  };

  // Adaptive selection: among unsettled candidates (and, in express mode, families under the cap),
  // pick the concept whose next answer is expected to shed the most entropy.
  const pickNext = (): string | null => {
    let best: string | null = null, bestGain = -1;
    for (const id of order.current) {
      const p = priors.current.get(id) ?? 0.5;
      if (variance(p) < SETTLE_VAR) continue;
      if (express.current && (famCount.current.get(familyOf(id)) ?? 0) >= EXPRESS_CAP) continue;
      const gain = expectedInfoGain(p, conceptIrt(id));
      if (gain > bestGain) { bestGain = gain; best = id; }
    }
    return best;
  };

  const startDeep = () => {
    const sel = self.current!;
    const cand: string[] = [];
    for (const f of families()) {
      if ((sel[f.key] ?? "never") === "never") continue; // skip untouched families entirely
      cand.push(...familyConcepts(f.key));
    }
    order.current = cand;
    priors.current = seedPriors(cand, sel);
    famCount.current = new Map();
    const first = pickNext();
    if (!first) { finish(); return; }
    setCurConcept(first);
    setPhase("run");
  };

  const onResponse = (item: DiagItem, r: Response) => {
    const id = curConcept!;
    const p0 = priors.current.get(id) ?? 0.5;
    const p1 = posterior(p0, r, itemIrt(id, item as any));
    const fam = familyOf(id);
    const updated = new Map(priors.current);
    updated.set(id, p1);
    priors.current = (p1 >= PASS || p1 <= FAIL)
      ? propagatePriors(updated, content.graph, id, p1, r)
      : updated;
    famCount.current.set(fam, (famCount.current.get(fam) ?? 0) + 1);
  };

  const onConceptDone = () => {
    const nxt = pickNext();
    if (nxt) setCurConcept(nxt);
    else finish();
  };

  const finish = () => {
    writePlacementPosteriors(priors.current, Date.now());
    setPhase("result");
  };

  if (phase === "aim") {
    return <AimStage lang={lang} onDone={(s) => { self.current = s; setPhase("mode"); }} />;
  }

  if (phase === "mode") {
    return (
      <div class="cal-flow">
        <h1 class="cf-title">{t.mode}</h1>
        <div class="cf-actions">
          <button type="button" class="btn btn-primary" onClick={() => { express.current = true; startDeep(); }}>{t.express}</button>
          <button type="button" class="btn btn-secondary" onClick={() => { express.current = false; startDeep(); }}>{t.full}</button>
        </div>
        <a class="cf-link" href={roadmap}>{t.skip}</a>
      </div>
    );
  }

  if (phase === "run" && curConcept) {
    const label = content.conceptById.get(curConcept)?.label[lang] ?? curConcept;
    return (
      <div class="cal-flow">
        <div class="cf-family">{t.family}: {familyOf(curConcept)}</div>
        <DiagnosticRunner
          key={curConcept}
          lang={lang}
          concept={curConcept}
          label={label}
          onResponse={onResponse}
          onDone={onConceptDone}
        />
        <a class="cf-link" href={roadmap}>{t.skip}</a>
      </div>
    );
  }

  // phase === "result" (also the fallback if a run lands with no current concept).
  return <PlacementResult lang={lang} priors={priors.current} />;
}

// Legacy `?unit=` pre-check: one linear pass over a unit's diagnosed concepts, delegated to the
// shared UnitProbe (folds each concept's correct-fraction into knowledge). Wraps it with the
// post-done OK → roadmap UI that the placement flow's UnitMode has always shown.
function UnitMode({ lang, unit }: { lang: Locale; unit: string }) {
  const [done, setDone] = useState(false);
  const roadmap = `/${lang}/roadmap`;
  if (done) return <div class="cal-flow"><a class="btn btn-primary" href={roadmap}>OK</a></div>;
  return <div class="cal-flow"><UnitProbe lang={lang} unit={unit} onComplete={() => setDone(true)} /></div>;
}
