# Personalized Path Engine — Design Spec

**Date:** 2026-06-05
**Status:** Approved design, pre-plan
**Supersedes:** `competency.ts` / `competency-inputs.ts` / `CompetencyMap.tsx` (the P4 senior-roadmap competency model is replaced by this engine)

## 1. Purpose

Build an advanced, maximally personalized and configurable engine that decides **what a learner should study, in what order, and on what schedule** across the 29-track / 274-unit / 1279-lesson curriculum.

The current system (placement pretest → per-track competency score → senior-gap ranking → next-unit-by-`order`) has three structural gaps this engine closes:

1. **No dependency graph** — sequencing is `order` within a track + a coarse cross-track gap rank. No "networking before distributed", "math before algorithms", no "you already know X, skip it".
2. **No learner goals** — the target is hardcoded ("become senior fullstack"). Learners cannot aim at "backend job", "interview prep", "AI engineer", or a custom mix.
3. **No configurability** — blend weights, depth, pace are hardcoded constants. No time/deadline awareness.

## 2. Decisions (locked during brainstorming)

| Axis | Decision |
|---|---|
| Goal model | **Hybrid** — selectable goals + priorities + full manual override + configurable knobs |
| Dependency model | **Concept/skill graph** — units tagged `teaches`/`requires` concepts; prereqs derived from a concept DAG; learner state = set of known concepts |
| Knowledge signal | **Diagnostic-led** — per-concept objective concept-quizzes are primary; pretest seeds; lesson/practice activity is secondary; per-concept `confidence 0..1` with decay |
| Runtime engine | **Deterministic core** (graph algorithms, client-side, offline, testable) + **LLM only at build/opt** (bootstrap + optional "explain my path") |
| Config surface | **All four knob groups**: goal/focus, pace/volume (+ **deadline mode**), depth tier, expert signal-weights |
| Persistence | **localStorage + export/import JSON** (no server; GitHub-sync explicitly future) |
| Ontology authoring | **LLM bootstrap, auto-accept** + deterministic build validators + `concept-overrides.json` patch file |
| Relationship to `competency.ts` | **Replace** — concept model is the single source; cold-start handled by pretest seed + optional calibration |

## 3. Architecture overview

```
                build-time (LLM, committed to repo)          runtime (deterministic, client-side)
  lesson MDX ──► bootstrap-*.mjs ──► concepts.json           ┌──────────────────────────────────┐
                                     unit-concepts.json ─────► path-io.ts (impure adapter)        │
                                     diagnostics/*.json       │   reads UserState, practice-state,│
                                     goals.json               │   content bundle, localStorage    │
                                     concept-overrides.json   └──────────────┬───────────────────┘
                                          │                                  │ pure inputs
                                  src/lint/rules/path.ts                     ▼
                                  (validators, build gate)        graph │ knowledge │ diagnostic-select
                                                                  planner │ schedule │ config  (pure core)
                                                                            │ Path + dated plan
                                                                            ▼
                                                          PathView / CalibrationFlow / GoalPicker /
                                                          PathConfigDrawer / StateIO  (UI islands)
```

All LLM output is committed to the repo. The runtime engine reads only committed JSON + localStorage — no network, fully offline, fully testable.

## 4. Data artifacts (build-time, LLM-bootstrapped, committed)

Location: `site/src/content/path/` (new content dir; not part of an Astro collection that page-builds — plain JSON imported by route + scripts).

### 4.1 `concepts.json` — the concept ontology (DAG)
```jsonc
[
  {
    "id": "tcp-handshake",
    "label": { "en": "TCP handshake", "ru": "TCP-рукопожатие" },
    "track": "networking",          // primary track affinity (summaries + weighting)
    "band": "middle",               // foundations | surface | middle | advanced
    "requires": ["ip-addressing", "ports-sockets"]   // concept-level DAG edges
  }
]
```

### 4.2 `unit-concepts.json` — unit↔concept sidecar (does NOT bloat `units.json`)
```jsonc
{
  "networking/03-tcp": {
    "teaches":  ["tcp-handshake", "tcp-flow-control"],
    "requires": ["ip-addressing"],
    "estMin":   42                  // build-computed time cost (see 4.6)
  }
}
```
The **unit DAG** is induced, not authored: unit A → unit B iff `B.requires ∩ A.teaches ≠ ∅` (closure over the concept DAG).

### 4.3 `diagnostics/<concept>.json` — per-concept objective check bank
```jsonc
{
  "concept": "tcp-handshake",
  "items": [
    {
      "id": "tcp-handshake-q1",
      "type": "mcq",                // mcq | blanks (objective, client-gradable, no runtime LLM)
      "prompt": { "en": "...", "ru": "..." },
      "choices": [ { "en": "...", "ru": "..." } ],
      "answer": 1,
      "difficulty": 0.5,            // optional, for adaptive item selection
      "discrimination": 0.8         // optional
    }
  ]
}
```

### 4.4 `goals.json` — goal catalog
```jsonc
[
  {
    "id": "senior-fullstack",
    "label": { "en": "Become senior fullstack", "ru": "Стать senior fullstack" },
    "target": { "rule": "band>=middle" },   // rule OR explicit targetConcepts[]
    "trackWeights": { "distributed": 1.0, "databases": 1.0, "frontend": 0.8 }
  },
  { "id": "backend-job",   "label": {…}, "target": { "concepts": ["…"] }, "trackWeights": {…} },
  { "id": "interview-prep","label": {…}, "target": { "concepts": ["…"] }, "trackWeights": {…} },
  { "id": "ai-engineer",   "label": {…}, "target": { "concepts": ["…"] }, "trackWeights": {…} }
]
```
`custom` goal is not a file entry — it is a user-built target set (selected tracks/concepts) stored in `PathConfig`.

### 4.5 `concept-overrides.json` — post-bootstrap patch layer
```jsonc
{
  "addEdges":    [ { "concept": "tcp-handshake", "requires": "ip-addressing" } ],
  "removeEdges": [ { "concept": "x", "requires": "y" } ],
  "retag":       [ { "unit": "networking/03-tcp", "teaches": ["…"], "requires": ["…"] } ]
}
```
Applied after loading the auto-accepted bootstrap output. Honored by both planner and validators. This is the cheap fix path for dirty auto-accept data ("wrong prereq" reports → an override entry, not a re-bootstrap).

### 4.6 Time estimates (`estMin`)
Computed at build by the bootstrap step, written into `unit-concepts.json`:
`estMin = readingMin + practiceMin`, where
- `readingMin = ceil(lessonWordCount / WPM)` summed over the unit's ready lessons, scaled by depth tier (junior < middle < senior reading volume),
- `practiceMin = Σ task.estMin` over the unit's practice files (the `estMin` field already exists on practice tasks).
WPM constant documented and tunable.

## 5. Pure core (`site/src/scripts/path/`) — TDD, no I/O, no `Date.now()`

Every function takes its inputs (including `nowMs`) explicitly, mirroring the `competency.ts` discipline that is being replaced. No localStorage, no content reads, no clock.

### 5.1 `types.ts`
`Concept`, `UnitConcepts`, `Diagnostic`, `Goal`, `KnowledgeState`, `ConceptMastery`, `PathConfig`, `PathStep`, `Path`, `Schedule`, `Feasibility`.

### 5.2 `graph.ts`
- `buildConceptGraph(concepts, overrides)` → normalized adjacency + reverse adjacency.
- `topoSort(graph)`, `ancestors(id)`, `descendants(id)`, `validateAcyclic(graph)`.
- `induceUnitGraph(unitConcepts, conceptGraph)` → unit-level edges.

### 5.3 `knowledge.ts`
`KnowledgeState = Map<conceptId, { confidence: number /*0..1*/, source: "pretest"|"diagnostic"|"activity"|"declared", lastAt: number }>`
- `seedFromPretest(answers, pretestToConcept)` → seed confidences (replaces `PRETEST_DOMAIN` track-mapping with pretest→concept mapping).
- `applyDiagnostic(state, concept, correctFrac, now)` → set confidence; **propagate**: a confirmed advanced concept raises its prereqs' confidence (down the closure); a failed basic concept lowers dependents (up the closure).
- `applyActivity(state, unit, weight, now)` → bump confidence of taught concepts, **capped below diagnostic-confirmed level** (activity is weaker evidence than a passed check).
- `applySelfDeclare(state, concept, known, now)`.
- `decay(state, now, config)` → age confidence toward a band-dependent floor; a never-touched concept takes no penalty.
- `masteryOf(state, concept)` → 0..1; `isKnown(state, concept, threshold)` → bool.

### 5.4 `diagnostic-select.ts`
- `nextProbe(state, goalFrontier, graph, config)` → the unknown-confidence concept nearest the goal frontier whose resolution prunes the most graph (max information gain). Drives the calibration onboarding and the pre-unit "quick check". Returns `null` when the frontier is sufficiently calibrated.

### 5.5 `planner.ts` — the core
- `targetFrontier(goals, priorities, graph, config)` → goal target concepts, minus locked/excluded tracks.
- `missingConcepts(frontier, state, graph, threshold)` → topo-ordered list = target concepts ∪ their not-yet-known prereqs (closure).
- `conceptsToUnits(missing, unitConcepts)` → units that teach ≥1 missing concept.
- `orderUnits(units, knobs)` → sort by: all-prereqs-known first → goal-priority weight → band/senior weight → breadth↔depth knob (depth = finish current track; breadth = round-robin tracks) → stable tie-break by unit `order`.
- `interleaveReviews(path, srsDue, aggressiveness)` → splice SRS-due reviews into the path per the knob.
- `buildPath(state, goals, config, content, now)` → `Path` = next **N steps** (N from pace, or from schedule when deadline set). Each `PathStep = { unit, unlocks: conceptId[], reason, kind: "learn" | "review" | "check" }`.

### 5.6 `schedule.ts` — deadline / exam-prep mode (pure)
Active when `config.deadline` is set; otherwise the pace knob governs N.
- `studyDays(nowMs, targetMs, perWeekdayHours, blackoutDates, tzOffsetMin)` → enumerate civil study days (pure: derived from passed-in ms + tz offset, no argless `Date`).
- `availableMinutes(...)` → Σ per-day hours over study days.
- `feasibility(requiredMinutes, availableMinutes)` → `{ verdict: "fits"|"over"|"under", deltaMin }`.
- **Over-budget triage**: drop lowest-ROI concepts where `ROI = goalPriority × seniorWeight ÷ estMin`; **return the dropped set explicitly** (no silent truncation — consistent with the build-linter culture). Surface "realistically reach X by the date, not Y".
- **Under-budget**: offer added depth (raise depth tier) or breadth (more tracks).
- `schedulePlan(path, budgetCfg, now)` → assign path steps to calendar days honoring per-day hours, interleaving SRS reviews → per-day plan + countdown + on/behind-track delta.

### 5.7 `config.ts`
`PathConfig` (localStorage-persisted, versioned like `UserState`), DEFAULTS, clamp/validate:
```ts
type PathConfig = {
  version: number;
  goals: { id: string; priority: number }[];     // multiple goals + priorities
  customTargets?: string[];                        // concepts/tracks for the custom goal
  excludedTracks: string[];                        // lock/hide tracks
  breadthVsDepth: number;                          // 0 = depth-first … 1 = breadth-first
  depthTier: Tier | Partial<Record<Track, Tier>>;  // global or per-track
  pace: { stepsAhead: number; srsAggressiveness: number };
  weights?: { prior: number; lessons: number; practice: number; recency: number;
              masteryThreshold: number; decayFloor: number };   // expert, hidden under "advanced"
  deadline?: {
    targetDateMs: number;
    perWeekdayHours: number[];   // length 7, Mon..Sun; 0 = day off → encodes "how many hours" + "which days"
    blackoutDates?: string[];    // ISO dates excluded entirely
    tzOffsetMin: number;
  };
};
```

## 6. Impure adapter

`path-io.ts` (mirrors `competency-inputs.ts`): reads `UserState`, practice-state, and a route-assembled content bundle (concepts, unit-concepts, diagnostics index, goals) → pure-core inputs. Owns localStorage persistence of `KnowledgeState` + `PathConfig` under versioned keys. All clock/I/O lives here; the core stays pure.

## 7. LLM build scripts (`site/scripts/`, run manually / CI — NOT in the page build)

- `bootstrap-concepts.mjs` — read all lesson MDX → LLM → `concepts.json` + `unit-concepts.json` (auto-accept). Temp 0, sorted/stable output so reruns diff cleanly. Idempotent, batched.
- `bootstrap-diagnostics.mjs` — per concept → LLM → `diagnostics/<concept>.json`.
- `bootstrap-goals.mjs` — derive goal target sets + track weights.
- `estMin` computation runs in `bootstrap-concepts.mjs` (word counts + practice `estMin`).

These are the only LLM touchpoints. Output is committed; runtime is deterministic and offline.

## 8. Build validators (`src/lint/rules/path.ts`, joins the existing linter)

- Concept DAG is acyclic (after overrides applied).
- Every `requires` concept exists.
- Every concept is taught by ≥1 unit (no orphan target).
- Every concept referenced by a diagnostic / goal exists; every diagnosed concept has a diagnostics file.
- Every goal target resolves.
- i18n parity on all `label` fields (en+ru), consistent with existing glossary/i18n rules.
- `concept-overrides.json` references only valid ids.
Failures fail the build, exactly like the current 9 lint rules.

## 9. UI (`site/src/components/path/` + pages)

- `CalibrationFlow.tsx` — adaptive diagnostic onboarding (reuses Pretest UI patterns), driven by `nextProbe`; seeds `KnowledgeState`; resumable; skippable.
- `/roadmap` → `PathView.tsx` (**replaces** `CompetencyMap`): ordered path (cards: unit + concepts unlocked + "why"); concept-mastery overview (clusters by track, confidence); manual pin / skip / reorder; "I already know this" per concept/unit; recompute. When `deadline` set: countdown, "on track / behind by N h", per-day plan, dropped-scope notice.
- `GoalPicker.tsx` — goals + priorities + custom (track/concept selection) + exclude/lock tracks + **deadline setup** (date picker + per-weekday hours grid + blackout dates).
- `PathConfigDrawer.tsx` (reuse `SettingsDrawer`) — four knob groups; expert weights hidden under "advanced".
- Pre-unit hook: "Quick check — you may already know this" → mini-diagnostic → skip on pass.
- `StateIO.tsx` — export/import JSON (knowledge-state + config + history).

Hydration cap (5 islands/page) is respected: PathView composes one island; CalibrationFlow, GoalPicker, ConfigDrawer, StateIO are separate routes/drawers, not co-mounted on the reader page.

## 10. Removals & preserved systems

**Remove:** `competency.ts`, `competency-inputs.ts`, `CompetencyMap.tsx` + their tests.
**Preserve / rewire:**
- **Pretest** — kept; now seeds concept `KnowledgeState` via a pretest→concept map (replaces `PRETEST_DOMAIN` track mapping).
- **SRS** (`srs.ts`, `/review`) — feeds `interleaveReviews`.
- **Player progression** (XP/rank/streak/titles) — untouched; completing a path step may award XP.
- **Bands** (`track-band.ts`) — reused as `concept.band` + senior weighting.

**Cold-start** (empty `KnowledgeState`): pretest seed → if absent, optional 5-minute calibration → if skipped, start at the foundations frontier of the chosen goal (default `senior-fullstack`). With a deadline set and a tight budget, triage narrows the frontier and states what is reachable.

## 11. Phasing (one spec, four phases; vertical-slice: engine before content)

- **P0 — Engine core (pure, TDD).** `graph` / `knowledge` / `diagnostic-select` / `planner` / `schedule` / `config` against a **hand-seeded mini concept graph for 3 tracks** (networking, databases, distributed) as fixtures. Full unit tests. No UI. Proves the loop end-to-end before paying the bootstrap cost.
- **P1 — Content bootstrap.** LLM scripts → `concepts.json`, `unit-concepts.json`, `diagnostics/*`, `goals.json` across all 274 units (auto-accept) + `estMin` + validators + lint rule + `concept-overrides.json`. Build green.
- **P2 — UI.** CalibrationFlow, PathView (replaces CompetencyMap on `/roadmap`), GoalPicker (incl. deadline setup), PathConfigDrawer, pre-unit check, StateIO. Visual verification EN+RU.
- **P3 — Polish.** export/import hardening; optional LLM "explain my path" + NL-goal→concepts (BYOK, opt-in); feedback→override loop; decay tuning; XP hooks. GitHub-sync out of scope (future).

## 12. Testing

- **Core** — pure unit tests (TDD): DAG acyclicity/topo; knowledge propagation + decay; planner ordering under each knob; diagnostic info-gain selection; schedule day-enumeration / feasibility / over-budget triage (asserting the dropped set); cold-start. Use the local-fixture pattern (no `astro:content` in Vitest — known constraint).
- **Validators** — lint-rule tests.
- **Bootstrap scripts** — golden-output self-test on a tiny fixture corpus.

## 13. Open defaults (chosen; flag to change)

- Diagnostics are **objective** (client-gradable, no runtime LLM).
- Path shows **N steps ahead**, not the whole route (N from pace, or from schedule when a deadline is set).
- Cold-start default goal = **senior-fullstack**.
- Calendar math operates on **civil local days** via passed-in `tzOffsetMin`; DST edge nuance is out of scope for v1 (documented).
- `masteryThreshold` (concept "known" cutoff) default and `decayFloor` per band default are tunable expert weights.
```
