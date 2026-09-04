// site/src/components/assess/AssessFlow.tsx
// The island. Owns exactly three things the pure core deliberately does not: the
// clock (Date.now() at every dispatch), storage (assess-io.ts + the read-only
// goal/knowledge bridges below), and the item's content lookup (item-content.ts).
// Everything else — selection, scoring, block budgets, the report — delegates to
// scripts/assess/*.
import { useEffect, useRef, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { loadSession, saveSession, clearSession } from "~/scripts/assess-io";
import { reduce, startSession, type AssessState, type AssessAction, type SessionDeps } from "~/scripts/assess/session";
import { nextItem, indexPool, type PoolIndex } from "~/scripts/assess/select";
import { buildPool, type AssessIndex } from "~/scripts/assess/item-pool";
import { buildReport } from "~/scripts/assess/report";
import { buildConceptGraph, type ConceptGraph } from "~/scripts/path/graph";
import { resolveGoalTargets } from "~/scripts/path/goal-resolve";
import { mergeConfig } from "~/scripts/path/config";
import type { Concept, Goal, Band } from "~/scripts/path/types";
import { readProgress, type TaskStatus } from "~/scripts/practice-state";
// Tiny (4 KB) — the goal catalogue, not the 1.1 MB/4.6 MB content this file
// deliberately fetches instead of importing (Ruling 3). Safe to bundle.
import goalsJson from "~/content/path/goals.json";
import ScopePicker from "./ScopePicker";
import ItemView from "./ItemView";
import BlockVerdict from "./BlockVerdict";
import AssessReport from "./AssessReport";

// ── Two dependency phases (I7, task-12-report.md fix round 1) ──────────────
// A visitor who lands on /assess and bounces before picking a scope used to pay
// for both multi-megabyte fetches anyway. ScopePicker only needs the concept
// catalogue (tracks, for its buttons); the 4.6 MB item pool is deferred until
// there is an actual session to serve — either the learner presses Start, or a
// resumed session already exists on mount (assess-io.ts's loadSession()).
interface ScopeDeps {
  graph: ConceptGraph;
  tracks: string[];
  bandOf: (conceptId: string) => Band;
  candidatesFor: (scope: string[]) => string[];
  goalConcepts: string[];
  labelOf: (conceptId: string) => { en: string; ru: string };
}
interface ItemDeps {
  index: PoolIndex;
}
type Deps = ScopeDeps & ItemDeps;

// Mirrors path-io.ts's C_KEY. NOT imported from path-io.ts: that module's
// top-level imports bundle ~/content/path/concepts.json (1.1 MB) plus several
// other content files as side-effecting signals — importing even one named
// export from it would pull the whole module into /assess's chunk, exactly what
// Ruling 3 says not to do. mergeConfig/resolveGoalTargets below are path-io.ts's
// OWN dependencies (config.ts, goal-resolve.ts) and are type-only-light enough
// to import directly (see task-12-report.md for what was checked).
const PATH_CONFIG_KEY = "skein.path-config.v1";

/**
 * Ruling 4: the learner's active goal(s), read the same way path-io.ts's
 * `activeGoals()` does (config.goals → goalById), without its bundling cost.
 * `mergeConfig` applies DEFAULT_CONFIG's goal ("senior-fullstack") when nothing
 * is stored yet, so even a learner who has never opened Roadmap gets a real goal
 * here, not an empty list — simplified from path-io.ts's own loadConfig() in one
 * way: it does not replicate the K_KEY-based cold-start branch (which would swap
 * in "job-ready-junior" for a truly first-ever visit); that is a minor ranking
 * nicety, not a correctness requirement, and duplicating it would mean reading a
 * second storage key here. Degrades safely on any storage/parse failure.
 */
function readActiveGoalIds(): { id: string; priority: number }[] {
  try {
    const raw = localStorage.getItem(PATH_CONFIG_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return mergeConfig(stored && typeof stored === "object" ? stored : {}).goals;
  } catch {
    return mergeConfig({}).goals;
  }
}

async function loadScopeDeps(lang: Locale): Promise<ScopeDeps> {
  // Ruling 3: fetched as static JSON assets at runtime, never `import()`ed —
  // see src/pages/[lang]/assess-concepts.json.ts.
  const res = await fetch(`/${lang}/assess-concepts.json`);
  if (!res.ok) throw new Error(`assess-concepts.json: HTTP ${res.status}`);
  const concepts = (await res.json()) as Concept[];

  const bandById = new Map(concepts.map((c) => [c.id, c.band]));
  const trackById = new Map(concepts.map((c) => [c.id, c.track]));
  const labelById = new Map(concepts.map((c) => [c.id, c.label]));
  const tracks = [...new Set(concepts.map((c) => c.track))].sort();
  const graph = buildConceptGraph(concepts);

  const goalsById = new Map((goalsJson as Goal[]).map((g) => [g.id, g]));
  const activeGoals = readActiveGoalIds()
    .map((g) => goalsById.get(g.id))
    .filter((g): g is Goal => Boolean(g));
  const goalConcepts = [...new Set(activeGoals.flatMap((g) => resolveGoalTargets(g, concepts)))];

  // Cheap fold (fix round 1): candidatesFor(scope) was rescanning all ~5035
  // concepts on every dispatch and twice per serve. `state.scope` is fixed for
  // the life of a session, so a scope (joined as a key) is looked up at most
  // once per session, not once per call.
  const candidatesCache = new Map<string, string[]>();
  const candidatesFor = (scope: string[]): string[] => {
    const key = scope.join(" ");
    let cached = candidatesCache.get(key);
    if (!cached) {
      const scopeSet = new Set(scope);
      cached = [...trackById.entries()].filter(([, tr]) => scopeSet.has(tr)).map(([id]) => id);
      candidatesCache.set(key, cached);
    }
    return cached;
  };

  return {
    graph,
    tracks,
    bandOf: (id) => bandById.get(id) ?? "surface",
    candidatesFor,
    goalConcepts,
    labelOf: (id) => labelById.get(id) ?? { en: id, ru: id },
  };
}

async function loadItemDeps(lang: Locale): Promise<ItemDeps> {
  // Ruling 3: fetched as a static JSON asset, never `import()`ed — see
  // src/pages/[lang]/assess-items.json.ts.
  const res = await fetch(`/${lang}/assess-items.json`);
  if (!res.ok) throw new Error(`assess-items.json: HTTP ${res.status}`);
  const items = (await res.json()) as AssessIndex;

  // Ruling 2: readProgress(lessonKey) memoized so buildPool's ~6.5k items over
  // ~1.19k unique lesson keys hit localStorage+JSON.parse once per key, not once
  // per item (~5.5x redundant reads otherwise) — see task-12-report.md for the
  // measured startup numbers.
  const progressCache = new Map<string, Record<string, TaskStatus>>();
  const progressOf = (lessonKey: string): Record<string, TaskStatus> => {
    let cached = progressCache.get(lessonKey);
    if (!cached) {
      cached = readProgress(lessonKey);
      progressCache.set(lessonKey, cached);
    }
    return cached;
  };
  const pool = buildPool(items, progressOf);

  // Ruling 1: indexPool runs exactly once here, for the life of the session —
  // never inside the per-question effect below.
  return { index: indexPool(pool) };
}

/** Loading/error interstitial shared by both dependency phases (I3). */
function LoadGate({ lang, onRetry }: { lang: Locale; onRetry: () => void }) {
  return (
    <div class="assess-error">
      <p>{t("assess.error.load", lang)}</p>
      <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={onRetry}>
        {t("assess.error.retry", lang)}
      </button>
    </div>
  );
}

export default function AssessFlow({ lang }: { lang: Locale }) {
  const [state, setState] = useState<AssessState | null>(() => loadSession());
  const [scopeDeps, setScopeDeps] = useState<ScopeDeps | null>(null);
  const [scopeError, setScopeError] = useState(false);
  const [itemDeps, setItemDeps] = useState<ItemDeps | null>(null);
  const [itemError, setItemError] = useState(false);
  const itemFetchInFlight = useRef(false);

  const fetchScopeDeps = () => {
    setScopeError(false);
    void loadScopeDeps(lang).then(setScopeDeps).catch(() => setScopeError(true));
  };
  useEffect(fetchScopeDeps, []);

  // I7: the item pool is fetched only once there is an actual session to serve
  // — either a resumed one (checked once on mount) or the learner pressing
  // Start in ScopePicker (see below). Idempotent via the ref guard so a
  // resumed session and a fresh Start can't both trigger a duplicate fetch.
  const fetchItemDeps = () => {
    if (itemFetchInFlight.current) return;
    itemFetchInFlight.current = true;
    setItemError(false);
    void loadItemDeps(lang).then(setItemDeps).catch(() => {
      itemFetchInFlight.current = false;
      setItemError(true);
    });
  };
  useEffect(() => {
    if (state) fetchItemDeps();
    // Mount-only: a resumed session is known (or not) from the very first
    // render; ScopePicker's onStart is the other trigger for a fresh session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (state) saveSession(state); }, [state]);

  const deps: Deps | null = scopeDeps && itemDeps ? { ...scopeDeps, ...itemDeps } : null;

  const sessionDepsFor = (scope: string[]): SessionDeps => ({
    index: deps!.index, candidates: deps!.candidatesFor(scope), bandOf: deps!.bandOf, graph: deps!.graph,
  });
  const dispatch = (action: AssessAction) => {
    setState((prev) => (prev && deps ? reduce(prev, action, sessionDepsFor(prev.scope)) : prev));
  };

  // Serve the next item whenever we are asking and have none in hand — after
  // "serve", after "answer" (current reset to null), and on first mount of a
  // resumed session (assess-io.ts always restores `current: null`).
  useEffect(() => {
    if (!state || !deps || state.phase !== "asking" || state.current) return;
    const candidates = deps.candidatesFor(state.scope);
    const item = nextItem({
      index: deps.index, cells: state.cells, candidates,
      bandOf: deps.bandOf, askedIds: state.asked, recentKinds: state.recentKinds,
    });
    const sdeps = sessionDepsFor(state.scope);
    setState(item
      ? reduce(state, { type: "serve", item, atMs: Date.now() }, sdeps)
      : reduce(state, { type: "stop", atMs: Date.now() }, sdeps));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionDepsFor closes over `deps`, already a dep
  }, [state, deps]);

  if (scopeError) return <LoadGate lang={lang} onRetry={fetchScopeDeps} />;
  if (!scopeDeps) return <p class="assess-loading">{t("assess.item.loading", lang)}</p>;

  if (!state) {
    return (
      <ScopePicker
        lang={lang}
        tracks={scopeDeps.tracks}
        onStart={(scope) => { fetchItemDeps(); setState(startSession(scope, Date.now())); }}
      />
    );
  }

  if (itemError) return <LoadGate lang={lang} onRetry={fetchItemDeps} />;
  if (!deps) return <p class="assess-loading">{t("assess.item.loading", lang)}</p>;

  if (state.phase === "report") {
    // Ruling 6: `scopeConcepts` is the SAME candidate set the session actually
    // drew from (deps.candidatesFor(state.scope)) — not a different or wider
    // list — so "untested" in the report means exactly what the session could
    // have asked but didn't, never concepts outside its own scope.
    const model = buildReport(state.cells, {
      scopeConcepts: deps.candidatesFor(state.scope),
      goalConcepts: deps.goalConcepts,
    });
    return (
      <AssessReport
        lang={lang} model={model} cells={state.cells} labelOf={deps.labelOf}
        onRestart={() => { clearSession(); setState(null); }}
      />
    );
  }

  const progress = (
    // The answered count sits in its own element (not just leading text in the
    // paragraph) so it can be asserted precisely — "block N" also contains a
    // digit, and a substring match against the whole paragraph would pass even
    // if the count itself regressed (I1, task-12-report.md fix round 1).
    <p class="assess-progress">
      <span class="assess-progress-count">{state.asked.size}</span> {t("assess.progress.answered", lang)}
      {" · "}{t("assess.progress.block", lang)} {state.blockIndex + 1}
    </p>
  );

  if (state.phase === "block-verdict") {
    return (
      <>
        {progress}
        <BlockVerdict
          lang={lang} state={state} labelOf={deps.labelOf}
          onContinue={() => dispatch({ type: "next-block", atMs: Date.now() })}
          onStop={() => dispatch({ type: "stop", atMs: Date.now() })}
        />
      </>
    );
  }

  // phase === "asking": `current` is momentarily null right after "serve"/
  // "answer" until the effect above re-serves — render an interstitial rather
  // than crash ItemView on a null item.
  if (!state.current) return <>{progress}<p class="assess-loading">{t("assess.item.loading", lang)}</p></>;

  return (
    <>
      {progress}
      <ItemView
        key={state.current.id}
        lang={lang}
        item={state.current}
        hintsUsed={state.hintsUsed}
        onHint={() => dispatch({ type: "hint", atMs: Date.now() })}
        onAnswer={(response, meta) => dispatch({ type: "answer", response, meta, atMs: Date.now() })}
        onStop={() => dispatch({ type: "stop", atMs: Date.now() })}
        labelOf={deps.labelOf}
        cells={state.cells}
        bandOf={deps.bandOf}
      />
    </>
  );
}
