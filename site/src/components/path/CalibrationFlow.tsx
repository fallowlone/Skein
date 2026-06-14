// src/components/path/CalibrationFlow.tsx
// Probabilistic placement orchestrator (4 stages: Aim → Mode → Deep run → Result).
//
// Aim   — pick a goal + coarse per-family self-placement (AimStage).
// Mode   — express (cap per family) vs full coverage (run until every concept settles-or-exhausts).
// Run    — adaptive Bayesian probing: each STEP asks one item of the unsettled concept with the
//          highest expected info-gain, updates its posterior, and propagates PASS/FAIL to
//          prereqs/dependents. A concept leaves the pool once it settles OR its bank is exhausted;
//          a global cap (MAX_PLACEMENT_ITEMS) backstops termination. Selection + termination is the
//          pure, unit-tested placement-runner — guaranteeing the run ends and never repeats an item.
// Result — writes posteriors back to KnowledgeState, then shows the report (PlacementResult).
//
// The legacy `?unit=` pre-check is preserved (UnitMode): a single linear pass over a unit's
// diagnosed concepts via the shared UnitProbe.
import { useState, useRef } from "preact/hooks";
import type { Locale } from "~/i18n";
import {
  content, seedPriors, itemIrt, conceptIrt, familyConcepts, families,
  writePlacementPosteriors,
} from "~/scripts/path/path-io";
import {
  posterior, propagatePriors, PASS, FAIL,
  type SelfPlace, type Response,
} from "~/scripts/path/bayes";
import {
  initState, nextConcept, applyAsked, MAX_PLACEMENT_ITEMS,
  type RunnerDeps, type RunnerState,
} from "~/scripts/path/placement-runner";
import type { DiagItem } from "~/scripts/path/calibration";
import DiagItemView from "./DiagItemView";
import UnitProbe from "./UnitProbe";
import AimStage from "./AimStage";
import PlacementResult from "./PlacementResult";

const EXPRESS_CAP = 5; // items per family in express mode
const L = {
  en: { mode: "Choose depth", express: "Express (~10 min)", full: "Full coverage", family: "Area", skip: "Skip to my path" },
  ru: { mode: "Выбери глубину", express: "Экспресс (~10 мин)", full: "Полное покрытие", family: "Область", skip: "Сразу к пути" },
} as const;

type Phase = "aim" | "mode" | "run" | "result";
type Cursor = { concept: string; idx: number };

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
  const deps = useRef<RunnerDeps | null>(null);
  const st = useRef<RunnerState | null>(null);
  const [cur, setCur] = useState<Cursor | null>(null);

  const familyOf = (id: string): string => {
    const track = content.conceptById.get(id)?.track as string;
    for (const f of families()) if (f.tracks.includes(track)) return f.key;
    return "";
  };

  const buildDeps = (candidates: string[], express: boolean): RunnerDeps => ({
    candidates,
    bankSize: (c) => content.diagnostics[c]?.items.length ?? 0,
    familyOf,
    irtOf: (c) => conceptIrt(c),
    express,
    expressPerFamily: EXPRESS_CAP,
    maxItems: MAX_PLACEMENT_ITEMS,
  });

  // Move to the next probe, or finish when the runner reports the pool is drained.
  const advanceTo = (concept: string | null) => {
    if (!concept) { finish(); return; }
    setCur({ concept, idx: st.current!.cursor.get(concept) ?? 0 });
    setPhase("run");
  };

  const startDeep = (express: boolean) => {
    const sel = self.current!;
    const cand: string[] = [];
    for (const f of families()) {
      if ((sel[f.key] ?? "never") === "never") continue; // skip untouched families entirely
      cand.push(...familyConcepts(f.key));
    }
    const d = buildDeps(cand, express);
    deps.current = d;
    st.current = initState(d, seedPriors(cand, sel));
    advanceTo(nextConcept(d, st.current));
  };

  const onAnswer = (concept: string, item: DiagItem, r: Response) => {
    const d = deps.current!;
    const s = st.current!;
    const p0 = s.priors.get(concept) ?? 0.5;
    const p1 = posterior(p0, r, itemIrt(concept, item as any));
    let priorsAfter = new Map(s.priors);
    priorsAfter.set(concept, p1);
    if (p1 >= PASS || p1 <= FAIL) priorsAfter = propagatePriors(priorsAfter, content.graph, concept, p1, r);
    st.current = applyAsked(d, s, concept, priorsAfter);
    advanceTo(nextConcept(d, st.current));
  };

  const finish = () => {
    writePlacementPosteriors(st.current!.priors, Date.now());
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
          <button type="button" class="btn btn-primary" onClick={() => startDeep(true)}>{t.express}</button>
          <button type="button" class="btn btn-secondary" onClick={() => startDeep(false)}>{t.full}</button>
        </div>
        <a class="cf-link" href={roadmap}>{t.skip}</a>
      </div>
    );
  }

  if (phase === "run" && cur) {
    // nextConcept only returns concepts with cursor < bankSize, so this item always exists.
    const bank = content.diagnostics[cur.concept];
    const item = bank.items[cur.idx] as DiagItem & { prompt: Record<Locale, string>; choices?: Record<Locale, string>[] };
    const label = content.conceptById.get(cur.concept)?.label[lang] ?? cur.concept;
    const heading = <div class="text-xs uppercase tracking-wide text-stone-500">{label}</div>;
    return (
      <div class="cal-flow">
        <div class="cf-family">{t.family}: {familyOf(cur.concept)}</div>
        <DiagItemView
          key={`${cur.concept}#${cur.idx}`}
          lang={lang}
          item={item}
          heading={heading}
          onAnswer={(r) => onAnswer(cur.concept, item, r)}
        />
        <a class="cf-link" href={roadmap}>{t.skip}</a>
      </div>
    );
  }

  // phase === "result" (also the fallback if a run lands with no current concept).
  return <PlacementResult lang={lang} priors={st.current?.priors ?? new Map()} />;
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
