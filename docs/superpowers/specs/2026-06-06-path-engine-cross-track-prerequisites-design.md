# Path Engine — Cross-Track Semantic Prerequisites (debt slice)

**Date:** 2026-06-06
**Status:** design approved, ready for plan
**Branch:** `feat/path-engine-p3-cross-track-edges`
**Predecessors:** P0 core, P1 content, P2 PathView, P3-A calibration, P3-B StateIO/overrides (all on `main`, final SHA `97b66580`).

## 1. Problem

The concept graph today carries only an **intra-track spine** plus ~269 *accidental* cross-track
edges that arose because concept ids are a flat global namespace (a unit in track A teaches a
concept whose id also appears in track B). There is **no deliberate, curated set of semantic
cross-track prerequisites** — e.g. "ORM N+1 only makes sense after you understand B-tree index
cost (databases)" or "HTTP semantics presume the TCP handshake (networking)".

Consequence: a learner driven toward an advanced unit in one track is not reliably routed
through the foundational concept it depends on in another track, and even when the concept *is*
pulled in, the dependent unit can be scheduled **before** its cross-track prerequisite.

## 2. Goal & scope

Add a **curated, precision-first** set of cross-track prerequisite edges between *keystone*
concepts so the path:

1. **pulls the prerequisite content in** — the prereq concept and the unit that teaches it appear
   in the plan, and mastery propagates; and
2. **orders units hard** — the unit teaching the prerequisite is emitted strictly before the unit
   that depends on it.

**Precision over recall.** A small, defensible set (~150–300 edges after dedup) of high-confidence
keystone→keystone edges beats an exhaustive noisy one.

**Out of scope:**
- ru labels for the ~4624 long-tail concept stubs (slice D).
- Custom goal picker / drag-and-drop / XP (slice C).
- Runtime activation of `retag` (not needed — ordering is solved via unit-requires derivation).
- Activating the `_g` transitive-closure hook in `graph.ts.induceUnitGraph` (replaced by a
  controlled, override-only derivation that keeps P0 untouched).
- The long-tail junk concepts (`--cpu-prof`, `TransitionArray`, leading-space labels) are never
  candidates — keystone extraction filters them out.

## 3. How the two graph layers work (grounding)

The runtime already pre-applies overrides via `path-io` → `overrides.safeApply`, which feeds
effective `concepts` into `buildPath`. There are two distinct layers and a plain concept-level
`addEdge` only reaches the first:

| Layer | Source today | What an `addEdge X→Y` does today |
|-------|--------------|----------------------------------|
| **Concept DAG** (`concepts.requires` + override addEdges) | `safeApply` pre-applies to `concepts.requires`; `missingConcepts` expands `ancestors()` | Y enters the missing set when X is on the frontier → the unit teaching Y is pulled in; mastery propagates. **Content-pull works.** |
| **Unit ordering** (`induceUnitGraph`) | uses **only `unit.requires`** (the explicit field from `unit-concepts.json`) | **nothing** — concept edges are invisible to unit ordering. The `_g` param is an unused hook left for exactly this. |

So content-pull is already correct; **hard ordering is the gap this slice closes.**

## 4. Architecture

### 4.1 Data & storage

- **New curated source file** `site/src/content/path/cross-track-edges.json` — the single
  hand/agent-curated artifact. Array of:
  ```json
  {
    "concept": "orm-n-plus-1",
    "requires": "index-b-tree",
    "why": "ORM N+1 cost only lands after B-tree index lookup cost",
    "bands": "middle<-surface"
  }
  ```
  `why` and `bands` are provenance for review; the runtime ignores them.

- **Builder merges it.** `site/scripts/path/build-path-data.mjs` currently writes
  `concept-overrides.json` empty (`{addEdges:[],removeEdges:[],retag:[]}`, line ~403). Change it
  to read `cross-track-edges.json`, validate each edge (both ids exist in the built concept set;
  `track(concept) !== track(requires)`; not a self-loop), and emit the surviving `{concept,requires}`
  pairs into the generated `concept-overrides.json` `addEdges`. **Unknown ids → warn + skip** (never
  throw — the builder must stay green). This makes `build-path-data` idempotent and lets the curated
  edges survive a rebuild.

- **Runtime load path unchanged.** `path-io` still imports `concept-overrides.json` as the
  `committed` overrides. No change to how overrides are loaded.

### 4.2 Runtime mechanics (additive, P0 untouched)

New pure function in `site/src/scripts/path/overrides.ts`:

```
applyOverridesFull(concepts, units, committed, local)
  → { concepts, units, droppedLocal }
```

It wraps the existing `safeApply` (effective concepts, cycle-guard, droppedLocal) **and
additionally** derives unit-ordering supplements:

- Compute the *effective* edge set actually applied (committed+local merged, minus removeEdges;
  if `safeApply` dropped local due to a cycle, use committed-only — the supplement must mirror
  exactly what was applied to `concepts`).
- For each effective `addEdge X→Y` where `track(X) !== track(Y)`: add `Y` to the `requires` of
  every unit whose `teaches` includes `X` (skip if the unit already teaches/requires Y).
- Return augmented `units`. `induceUnitGraph` then naturally makes "unit teaching Y" a prereq
  unit of "unit teaching X".

`path-io` calls `applyOverridesFull` instead of `safeApply`, memoized by the same overrides-signal
identity (the cached result now carries both effective `concepts` and augmented `units`).

**Why override-only + cross-track filter:**
- Baseline path is unchanged until curated edges exist; the 269 accidental base cross-track
  concept edges stay content-only (no ordering surprises).
- Provenance is preserved — supplements derive from the override `addEdges` set, not from the
  flattened `concepts.requires` (which loses base-vs-override origin).

**Cycle safety:** concept-graph acyclicity is guaranteed by the path lint rule and `safeApply`'s
cycle-guard. A *unit*-level cycle is theoretically possible from cross-track edges, but
`orderUnits` already degrades safely (emits the best remaining unit; never crashes).

### 4.3 Discovery pipeline (subagent-driven)

1. **Deterministic pre-pass** (a script) extracts a per-track *keystone shortlist*:
   - clean label (non-empty, not leading punctuation/whitespace junk),
   - taught by ≥1 unit,
   - ranked by `requiredBy` in-degree + band.
   - **Anchors** (the `requires`/Y side): band ∈ {foundations, surface, middle}, cap ~30/track.
   - **Consumers** (the `concept`/X side): band ∈ {middle, advanced}, cap ~40/track.
   - Output: a compact per-track keystone catalogue (consumers + a global anchor menu).

2. **Per-consumer-track sonnet subagents** (~25, one per non-trivial track). Input: that track's
   consumer keystones + the global top-anchor menu. Output: ≤10–15 high-confidence edges
   `X requires Y` each with a one-line `why` + band note. Full task text in the prompt; subagents
   do **not** read the plan file. Subagents are briefed to distrust any web content (they should
   not need the web, but the standing injection rule applies).

3. **Merge:** dedup by `concept|requires`; drop self-loops and intra-track pairs; verify both ids
   exist; **acyclic gate** (same Kahn pass as the lint rule) drops any cycle-forming candidate
   with a log line.

4. **Final opus review** of the whole set: cut strained or band-reversed edges (prereq must be
   the earlier/lower-band concept).

5. Result is written to `cross-track-edges.json`.

## 5. Validation & tests

- **Unit tests** (`overrides.test.ts` additions) for `applyOverridesFull`:
  - a cross-track edge reorders the candidate units (prereq before dependent);
  - an intra-track addEdge does **not** add a unit supplement;
  - a removeEdge cancels the supplement for that pair;
  - a local cycle → `droppedLocal: true` and committed-only units (supplement mirrors the drop).
- **Builder test:** unknown id → warn + skip; valid edges land in `concept-overrides.json`;
  output is stable across reruns.
- **Lint:** `src/lint/rules/path.ts` stays the build gate on the *generated* output (override ids
  exist + concept graph acyclic). Light extension: if `cross-track-edges.json` is present, assert
  each edge is genuinely cross-track and references existing ids.
- **Final gate:** `cd site && bunx vitest run src/scripts/path/` then a full `astro build`
  (expected 4849 pages, lint 0/0).

## 6. File touch list

| File | Change |
|------|--------|
| `site/src/content/path/cross-track-edges.json` | **new** — curated edges (built by the discovery pipeline) |
| `site/scripts/path/build-path-data.mjs` | read + validate + merge curated edges into generated `concept-overrides.json` |
| `site/src/scripts/path/overrides.ts` | **new** `applyOverridesFull` (wraps `safeApply` + unit-requires derivation) |
| `site/src/scripts/path/path-io.ts` | call `applyOverridesFull`; cache carries augmented units |
| `site/src/scripts/path/overrides.test.ts` | tests for `applyOverridesFull` |
| `site/src/lint/rules/path.ts` | optional: validate `cross-track-edges.json` shape if present |
| `site/scripts/path/extract-keystones.mjs` | **new** — deterministic keystone pre-pass for discovery |

P0 files (`graph.ts`, `types.ts`, `knowledge.ts`, `planner.ts`, `schedule.ts`, `config.ts`,
`diagnostic-select.ts`) are **not** modified.

## 7. Risks & decisions

- **Decision A — derivation scope:** override-only (baseline path unchanged). *Approved.*
- **Decision B — volume:** precision-first, soft target ~150–300 edges after dedup. *Approved.*
- **Decision C — anchor sources:** any track may be an anchor source, including math / base-cs /
  algorithms (genuine foundations). *Approved.*
- **Risk — over-constraint:** too many edges could rigidly serialize the path. Mitigated by the
  precision bar, band-reversal check, and the breadth/depth knob still applying within ready pools.
- **Risk — unit cycle:** mitigated by `orderUnits`' safe degradation; no crash path.
