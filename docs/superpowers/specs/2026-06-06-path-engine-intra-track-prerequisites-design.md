# Path Engine — Intra-Track Semantic Prerequisites (debt slice)

**Date:** 2026-06-06
**Status:** design approved, ready for plan
**Branch:** `feat/path-engine-intra-track-edges`
**Predecessors:** P0 core, P1 content, P2 PathView, P3-A calibration, P3-B StateIO/overrides,
cross-track semantic prerequisites (all on `main`, latest SHA `538645b7`).

## 1. Problem

Inside each track, the concept graph carries only a **unit-level spine**. In
`build-path-data.mjs`, `unit.requires = [prevAnchor]` chains units linearly, and each concept's
base `requires = [prevAnchor(firstUnit(c))]` — i.e. every concept first-introduced in a unit points
to the **anchor of the previous unit** and nothing else.

Consequence: real intra-track concept dependencies are invisible. Within a unit there are **zero**
inter-concept edges; a concept first-taught in lesson 7 has no graph link to the concept it builds
on in lesson 6. The graph "knows" concept ordering only at unit granularity, and only through the
single previous-unit anchor.

The lesson authors **already declared** these dependencies: 760 lessons across 23 tracks carry a
non-empty `prereqs` frontmatter field (sibling lesson slugs, intra-unit). The P1 harvester parses
`prereqs` into `lists.prereqs` but **never consumes it**. This is a large, free, high-precision
signal sitting unused.

## 2. Goal & scope

Add a **deterministic, precision-first** set of intra-track concept→concept prerequisite edges,
harvested from lesson `prereqs`, so the path's **concept DAG** becomes correct (not merely linear):

1. **pulls the right prerequisite content in** — when a learner targets a concept, the specific
   within-unit prerequisite concepts (and their teaching lessons) enter the missing set, beyond the
   single previous-unit anchor; and
2. **propagates mastery correctly** — knowing a later concept implies knowing the specific
   within-unit foundations it declares a dependency on.

**Decided: content-pull only — no unit reordering.** Within a track, units are already a *total
linear chain* (`unit.requires = [prevAnchor]`), so intra-track edges cannot reorder units; a unit
supplement would be a no-op at best and a cycle risk at worst. The runtime's existing
`deriveUnitRequires` filter (`track(X) !== track(Y)`) already excludes intra-track edges from
`unit.requires`, so this requires **no runtime change** — intra edges flow into `concept.requires`
via `safeApply` and stop there.

**Deterministic-only (no LLM).** Edges are harvested from author-declared `prereqs`, not proposed
by subagents. Author-declared deps are the most precise source available; the cross-track slice's
discovery pipeline (keystones + sonnet + opus review) is **out of scope** here.

**Out of scope:**
- Cross-unit (skip-back) intra-track deps not expressible via sibling-lesson `prereqs` — those would
  need curation; deferred.
- Co-occurrence heuristics (concept[i] requires concept[i-1] within a lesson's list) — too noisy;
  rejected for precision.
- The `deepensInto` / `spiral` frontmatter fields — not prerequisite relations; ignored.
- Any change to P0 (`graph.ts`, `types.ts`, `knowledge.ts`, `planner.ts`, `schedule.ts`,
  `config.ts`, `diagnostic-select.ts`) or to the runtime (`overrides.ts`, `path-io.ts`).

## 3. How the two graph layers work (grounding)

| Layer | Source today | What an intra-track `addEdge X→Y` does |
|-------|--------------|----------------------------------------|
| **Concept DAG** (`concepts.requires` + override addEdges) | `safeApply` pre-applies override addEdges to `concept.requires` regardless of track; `missingConcepts` expands `ancestors()`; mastery propagates | Y enters the missing set when X is targeted → the lesson/unit teaching Y is pulled; mastery propagates. **This is the gain.** |
| **Unit ordering** (`induceUnitGraph`) | uses only `unit.requires`; `applyOverridesFull.deriveUnitRequires` supplements it **only** for cross-track edges (`track(X) !== track(Y)`) | **nothing** — intra-track edges are filtered out by the existing cross-track-only condition. Units stay ordered by the linear spine. |

So closing this debt is purely a **concept-DAG enrichment**. The unit schedule is unchanged by
design; concept-level readiness, content-pull, and mastery propagation become correct.

## 4. Architecture

### 4.1 Edge derivation (`prereqs` → concept→concept)

A new pure module `site/scripts/path/intra-track-derive.mjs` exports
`deriveIntraTrackEdges(units)`. `units` is the harvester's per-unit structure, extended so each
lesson record carries `prereqs` (the sibling-lesson slugs from frontmatter).

Algorithm:

- **Lesson sequence.** Order lessons within a unit by slug; order units by
  `meta.order`. Global lesson seq = `(unitOrder * 1000) + lessonIndexWithinUnit`.
- **`firstLesson(c)`** = the globally-earliest lesson (by seq, then unit id, then slug) that teaches
  `c`. A concept is *new in L* iff `firstLesson(c) === L`.
- **`anchor(P)`** = the first concept in `P`'s concept list (lesson order) with `firstLesson===P`;
  if `P` introduces nothing new, fall back to `P.concepts[0]` (mirrors the spine's anchor fallback).
- For each lesson `L` with `prereqs:[P₁…Pₖ]`:
  - resolve each `Pᵢ` to the sibling lesson in `L`'s **same unit** whose slug equals `Pᵢ`;
    if none → skip that prereq with a warning (keeps it intra-unit, hence intra-track, by
    construction);
  - for each `c ∈ newConcepts(L)` and each resolved `Pᵢ`: emit `{ concept: c, requires: anchor(Pᵢ) }`
    unless `c === anchor(Pᵢ)`.
- **Cycle safety.** Keep an edge `c → r` only if `r` is **strictly earlier** than `c` in the stable
  seq order (same rule as `breakCycles` in `build-path-data.mjs`). A forward or typo'd prereq is
  dropped, never emitted.
- **Output.** Dedup by `concept|requires`; return a sorted flat list of
  `{ concept, requires, via, track }`, where `via = "<L.slug>←<Pᵢ.slug>"` and `track` are provenance
  for human review (the merge and runtime ignore them).

Only author-declared `prereqs` drive edges; no co-occurrence inference.

### 4.2 Data & storage (mirrors the cross-track "committed source + builder-merge" pattern)

- **New generated-but-committed artifact** `site/src/content/path/intra-track-edges.json` — the flat
  edge list from §4.1. It is *generated* (not hand-curated), regenerated by the full harvest, and
  consumed as precomputed input by the lightweight regenerator. Diff-stable (sorted).

- **`build-intra-edges.mjs`** (**new** focused regenerator, the one actually run for this slice):
  walks lesson frontmatter (slug/track/unit/`concepts`/`prereqs`) + `units.json` order, calls
  `deriveIntraTrackEdges`, and writes **only** `intra-track-edges.json`. It does **not** rewrite
  `concepts.json` / `unit-concepts.json`, mirroring `build-overrides.mjs`'s "no full harvest"
  precedent (and avoiding the cross-track slice's documented concepts.json scope-creep risk). It is
  self-contained because `build-path-data.mjs` calls `main()` on import and cannot be reused as a
  library.

- **`build-path-data.mjs`** (full harvest, manual — not in `bun run build`; wired for future
  idempotency, not run in this slice):
  - the harvest loop captures `lists.prereqs` into each lesson record (currently it captures only
    `slug`, `level`, `concepts`, `words`);
  - after assembling `units`, call `deriveIntraTrackEdges(units)` and write `intra-track-edges.json`;
  - merge `intra-track-edges.json` + `cross-track-edges.json` into the generated
    `concept-overrides.json` `addEdges`, through the shared acyclic gate (§4.3).

- **`build-overrides.mjs`** (lightweight regenerator — reads `concepts.json` only, no lesson
  harvest): additionally read `intra-track-edges.json` and merge it alongside `cross-track-edges.json`
  into `addEdges`, through the same shared gate. It treats `intra-track-edges.json` as precomputed
  input (it cannot re-derive intra edges without harvesting lessons).

- **New pure merge** `site/scripts/path/intra-track-merge.mjs` exports
  `mergeIntraTrackEdges(rawEdges, conceptsOut) → { addEdges, skipped, warnings }` — the inverse of
  `cross-track-merge.mjs`: **keep** `track(concept) === track(requires)`; drop cross-track, unknown
  id, self-loop, duplicate, and **spine-dup** (an edge already present in the concept's base
  `requires` in `conceptsOut`). Never throws; counts skips with warnings so the build stays green.

- **Runtime load path unchanged.** `path-io` still imports `concept-overrides.json` as `committed`
  overrides. The file simply now carries intra-track addEdges in addition to cross-track ones.

### 4.3 Shared acyclic gate

A combined cross-track + intra-track + spine cycle is theoretically possible (a cross-track edge
returning through an intra-track path), so the acyclic gate must run over the **union** of spine +
cross + intra edges. To avoid drift between the two builders, extract the existing inline Kahn pass
from `build-overrides.mjs` into a small shared module
`site/scripts/path/acyclic-gate.mjs` exporting `isAcyclicWithEdges(concepts, addEdges) → { ok,
unplaced }`. Both `build-path-data.mjs` and `build-overrides.mjs` call it before writing
`concept-overrides.json`; on failure they log the offending count and exit non-zero (the path lint
rule remains the build-time gate on the generated output).

### 4.4 Runtime mechanics — none

`overrides.ts` (`safeApply`, `applyOverridesFull`, `deriveUnitRequires`), `path-io.ts`, and all P0
files are **unchanged**. `safeApply` already pre-applies every override `addEdge` to
`concept.requires`; `deriveUnitRequires` already filters to `track(X) !== track(Y)`, so intra-track
edges are content-pull only with zero code change. This is the key simplification over the
cross-track slice (which had to add `applyOverridesFull`).

## 5. Validation & tests

- **`intra-track-derive.test.mjs`** (pure): a fixture (one track, one unit, three lessons with
  `prereqs`) asserts — new-concept → prereq-lesson anchor; a reused concept gets no new edge; a
  forward/typo prereq is dropped (cycle safety); an unresolved sibling slug is skipped; the anchor
  fallback fires when a prereq lesson introduces nothing new.
- **`intra-track-merge.test.mjs`** (pure): keeps a valid intra-track edge; drops cross-track,
  unknown id, self-loop, duplicate, and spine-dup; tolerates `null`/non-array/junk elements (returns
  `[]`, never throws).
- **`path.test.ts`**: lint accepts a valid intra-track edge; flags an unknown id; flags a
  cross-track edge in the intra source.
- **Builder behaviour:** running `build-overrides.mjs` after the harvest produces a stable
  `concept-overrides.json` (byte-identical on rerun); `intra-track-edges.json` ids all resolve.
- **Final gate:** `cd site && bunx vitest run src/scripts/path/ scripts/path/ src/lint/rules/path.test.ts`
  then a full `astro build` (expected ~4849 pages, lint report 0 errors / 0 warnings).

## 6. File touch list

| File | Change |
|------|--------|
| `site/scripts/path/intra-track-derive.mjs` | **new** — pure `deriveIntraTrackEdges(units)` |
| `site/scripts/path/intra-track-derive.test.mjs` | **new** — derivation tests |
| `site/scripts/path/intra-track-merge.mjs` | **new** — pure `mergeIntraTrackEdges` (inverse filter + spine-dup drop) |
| `site/scripts/path/intra-track-merge.test.mjs` | **new** — merge tests |
| `site/scripts/path/acyclic-gate.mjs` | **new** — shared Kahn `isAcyclicWithEdges`, used by both builders |
| `site/src/content/path/intra-track-edges.json` | **new** — generated-committed edge list |
| `site/scripts/path/build-intra-edges.mjs` | **new** — focused regenerator (run-now): lesson `prereqs` → `intra-track-edges.json`, no full harvest |
| `site/scripts/path/build-path-data.mjs` | capture `prereqs` in lesson records; derive + write intra edges; merge intra+cross into `concept-overrides.json` via the shared gate (future full-harvest idempotency) |
| `site/scripts/path/build-overrides.mjs` | read + merge `intra-track-edges.json`; route its existing Kahn pass through `acyclic-gate.mjs` |
| `site/src/content/path/concept-overrides.json` | regenerated — `addEdges` now carries intra + cross |
| `site/src/lint/rules/path.ts` | validate `intra-track-edges.json` shape (ids exist + genuinely intra-track + not self) |
| `site/src/lint/rules/path.test.ts` | test for the new lint check |

P0 files and the runtime (`overrides.ts`, `path-io.ts`) are **not** modified.

## 7. Risks & decisions

- **Decision A — content-pull only, no unit reordering.** *Approved.* Units are already a total
  intra-track chain; the existing cross-track-only `deriveUnitRequires` filter makes this free.
- **Decision B — deterministic-only (prereqs harvest), no LLM curation.** *Approved.* Author-declared
  deps are the most precise source; subagent discovery is out of scope.
- **Decision C — anchor as the single representative of a prereq lesson.** Sparse, mirrors the
  spine's unit-anchor philosophy; precision-first. May slightly over- or under-connect versus an
  exhaustive cross-product, accepted as the defensible sparse choice.
- **Volume — est. 2000–3500 edges** after dedup / cycle-drop / spine-dup-drop (more than the
  cross-track 268, all author-declared). Density only enriches the concept DAG; because unit
  ordering is untouched, there is **no path-rigidity / over-serialization risk**. `safeApply`'s
  graph grows to ~7.5k edges — still O(V+E), memoized by overrides-signal identity.
- **Risk — combined cross+intra cycle.** Mitigated by the shared acyclic gate over spine + cross +
  intra in both builders, plus per-edge cycle-safety in the derivation.
- **Risk — baseline concept DAG changes for all users.** Intended: the graph becomes correct rather
  than linear-only. The unit *schedule* is unchanged (no unit reorder), so the visible path order is
  stable; only concept-level readiness / pull / mastery improve.
