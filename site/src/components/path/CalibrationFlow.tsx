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
  en: {
    depthKick: "Calibration · step 2 of 2", depthTitle: "Choose depth", rec: "recommended",
    expressTag: "Express", expressTime: "≈ 10 min",
    expressBlurb: "Probes only the most informative areas and stops the moment your level is clear. Best for a fast, honest first map.",
    expressEst: "≈ 12 questions", expressCta: "Express (~10 min)",
    fullTag: "Full coverage", fullTime: "≈ 25–30 min",
    fullBlurb: "Every area gets several questions, even strong ones. The most precise placement — slower, and thorough across the whole atlas.",
    fullEst: "up to ≈ 40 questions", fullCta: "Full coverage",
    skip: "Skip to my path →", question: "Question", progress: "Approximate progress",
  },
  ru: {
    depthKick: "Калибровка · шаг 2 из 2", depthTitle: "Выбери глубину", rec: "рекомендуем",
    expressTag: "Экспресс", expressTime: "≈ 10 мин",
    expressBlurb: "Прощупывает только самые информативные области и останавливается, как только уровень ясен. Лучшее для быстрой честной первой карты.",
    expressEst: "≈ 12 вопросов", expressCta: "Экспресс (~10 мин)",
    fullTag: "Полное покрытие", fullTime: "≈ 25–30 мин",
    fullBlurb: "Каждая область получает несколько вопросов, даже сильные. Самая точная оценка — медленнее и тщательнее по всему атласу.",
    fullEst: "до ≈ 40 вопросов", fullCta: "Полное покрытие",
    skip: "Сразу к пути →", question: "Вопрос", progress: "Приблизительный прогресс",
  },
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
      <div class="cal-flow" data-pt>
        <div class="pt-panel pt-rise">
          <div class="pt-panel-head">
            <span class="pph-kick">{t.depthKick}</span>
            <h3>{t.depthTitle}</h3>
          </div>
          <div class="depth-grid">
            <button class="depth-card is-rec" type="button" onClick={() => startDeep(true)}>
              <span class="dc-pick">{t.rec}</span>
              <span class="dc-kick"><span class="dc-tag">{t.expressTag}</span><span class="dc-time">{t.expressTime}</span></span>
              <span class="dc-title">{t.expressTag}</span>
              <span class="dc-blurb">{t.expressBlurb}</span>
              <span class="dc-gauge"><span class="dc-bar"><i style="width:30%" /></span><span class="dc-est">{t.expressEst}</span></span>
              <span class="dc-cta"><span class="btn btn-primary" role="presentation"><span>{t.expressCta}</span><span class="arrow">→</span></span></span>
            </button>
            <button class="depth-card" type="button" onClick={() => startDeep(false)}>
              <span class="dc-kick"><span class="dc-tag">{t.fullTag}</span><span class="dc-time">{t.fullTime}</span></span>
              <span class="dc-title">{t.fullTag}</span>
              <span class="dc-blurb">{t.fullBlurb}</span>
              <span class="dc-gauge"><span class="dc-bar"><i style="width:92%" /></span><span class="dc-est">{t.fullEst}</span></span>
              <span class="dc-cta"><span class="btn btn-secondary" role="presentation">{t.fullCta}</span></span>
            </button>
          </div>
          <div class="depth-foot"><a class="pt-skip" href={roadmap}>{t.skip}</a></div>
        </div>
      </div>
    );
  }

  if (phase === "run" && cur) {
    // nextConcept only returns concepts with cursor < bankSize, so this item always exists.
    const bank = content.diagnostics[cur.concept];
    const item = bank.items[cur.idx] as DiagItem & { prompt: Record<Locale, string>; choices?: Record<Locale, string>[] };
    const conceptLabel = content.conceptById.get(cur.concept)?.label[lang] ?? cur.concept;
    const fam = families().find((f) => f.key === familyOf(cur.concept));
    const areaName = fam?.label[lang] ?? familyOf(cur.concept);
    const s = st.current!;
    const num = s.totalAsked + 1;
    const pct = Math.min(96, Math.round((s.totalAsked / Math.max(1, deps.current!.maxItems)) * 100));
    const heading = (
      <>
        <div class="q-context">
          <span class="q-area"><span class="sq" /><span class="qa-name">{areaName}</span></span>
          <span class="q-concept">{conceptLabel}</span>
        </div>
        <div class="q-progress" aria-label={t.progress}>
          <span class="q-prog-track"><i style={`width:${pct}%`} /></span>
          <span class="q-prog-meta">{t.question} <b>{num}</b></span>
        </div>
      </>
    );
    const skip = (
      <>
        <span class="q-spacer" />
        <a class="pt-skip" href={roadmap}>{t.skip}</a>
      </>
    );
    return (
      <div class="cal-flow" data-pt>
        <div class="pt-panel lift pt-rise">
          <DiagItemView
            key={`${cur.concept}#${cur.idx}`}
            lang={lang}
            item={item}
            heading={heading}
            hue={fam?.hue}
            trailingActions={skip}
            onAnswer={(r) => onAnswer(cur.concept, item, r)}
          />
        </div>
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
