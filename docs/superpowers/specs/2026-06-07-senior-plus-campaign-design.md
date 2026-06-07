# Senior+ Campaign — design spec

- **Date:** 2026-06-07
- **Status:** approved (design); first plan (A — Depth-Audit) to follow via writing-plans
- **Owner:** Artem Hrechuk
- **Inputs:** `docs/audit/2026-06-07-project-weaknesses.md` (Phase 0 audit)
- **Predecessor:** Phase 0 (weaknesses doc, German removal, build sharding) — PR #6

## 1. Problem

The site is an exceptional **foundations engine** with strong **practice
infrastructure**, but it does not yet reliably take a learner to **senior+**:

- Depth is uneven — ~47% of units are `stub`; depth is senior-grade in some tracks
  (Algorithms, Networking, Databases, Observability) and junior-to-middle or absent
  in others (Testing, Security, APIs, Backend depth).
- Core senior tracks are missing or stub-only: **testing strategy, debugging,
  microservices, concurrency**.
- Practice covers only **57%** of lessons (962/1686) and skews easy; too few
  senior-shaped `incident`/`stretch` tasks grounded in real failure.
- No machine-checkable **depth bar** → the gap is estimated by eye, not measured.
- No **integrated capstone** carrying one feature idea → design → code → test →
  deploy → observe → incident → post-mortem across the stack.

## 2. Goal & success criteria

Bring a coherent **Senior+ Core Path** to a measurable senior+ bar — theory *and*
practice — so a learner who completes it is genuinely senior-ready, not just
mid-level in isolated domains.

**Done (measurable), scoped to the Core Path:**
- 0 `stub` units on the Core Path.
- 100% practice coverage of Core-Path lessons.
- Every Core-Path unit scores **≥ bar** on the LLM depth audit (re-graded after authoring).
- The four missing core tracks (testing, debugging, microservices, concurrency)
  exist on the path at senior depth.
- One integrated cross-stack **capstone** shipped (EN+RU, status `ready`).
- Build green via sharding; i18n parity preserved; all quality gates pass.

Out of scope (deferred, not abandoned): breadth-first stub elimination across all 29
tracks; specialization deep-dives (sql-postgres, js-engine, typescript, aws, python,
node, nest) beyond what the Core Path needs; German.

## 3. Strategy

**Measure → Core-Path depth-first.** Build the measurement first, let data pick the
path, then bring that path to 100% before widening. Avoids boiling the ocean and gives
a learner a real, coherent junior→senior+ spine.

## 4. Components

### 4.1 Depth-Audit (`scripts/depth-audit/`)
LLM-grades **every lesson** (EN canonical) via a Workflow fan-out with schema output.

- **Rubric dimensions** (0–5 each): `mechanism`, `tradeoff`, `failure-mode`,
  `real-numbers`, `senior-tier-depth`, `practice-coverage-and-difficulty`.
- **Per-lesson score** → aggregate to **unit score** (min/mean per dimension; a unit
  is only as deep as its weakest load-bearing lesson).
- **Bar:** a unit passes when its weighted score ≥ threshold (threshold tuned on a
  hand-labeled calibration set of ~15 known-good and ~15 known-thin units).
- **Outputs:** `docs/audit/depth-scores.json` (per-lesson + per-unit, with dimension
  breakdown and the model's one-line justification) + a human-readable report sorted
  by gap. Re-runnable; the same harness serves as the post-authoring **re-grade gate** (4.4).
- Token cost accepted (explicit user decision: accuracy over cost).

### 4.2 Core-Path selector
From audit scores × the path-engine track graph, rank tracks by
**centrality on the junior→senior spine × gap size**, propose a ~12-track Core Path,
**user confirms/trims**. The four missing tracks are inserted at their graph position.

### 4.3 Quality bar (machine + LLM)
Per Core-Path unit:
- **Theory:** unit passes the depth audit (≥ bar); `status: ready`; sources present.
- **Practice:** 100% of the unit's lessons have a practice set; task-type mix includes
  ≥1 `incident` or `stretch` grounded in a **real, original** case (§6); difficulty
  spans `apply`→`stretch`.

### 4.4 Authoring pipeline (hybrid, gated)
1. Audit gap → **dense per-unit brief** (auto-generated from scores: which dimensions
   are thin, target depth, required practice task mix, sources to anchor).
2. Draft:
   - **cowork** (high limits) for monotonous volume — `stub→ready` theory, practice JSON.
   - **in-session Workflow** for the hard senior cases, the capstone, and the four new tracks.
3. **Gate chain (nothing below bar merges):** zod/schema validate → `bun run build` +
   lint → `bun run verify:samples` → **LLM re-grade ≥ bar** → human spot-sample.
   A failed gate bounces the unit back with the specific deficiency.
4. Controller commits (cowork may not push; see §6).

### 4.5 Missing-track scaffolds
`testing`, `debugging`, `microservices`, `concurrency` — scaffold with the existing
track-creation pattern (tracks.json + units.json + lesson skeletons), then author
through 4.4. Each must also patch the path-engine band/order and TRACK_BAND.

### 4.6 Capstone
One integrated cross-stack path: feature idea → design → code → test → deploy → observe
→ incident → post-mortem, reusing Core-Path tracks. Lives as a capstone unit/lab; EN+RU.

## 5. Build order

| Step | Deliverable | Depends on |
|------|-------------|------------|
| **A** | Depth-Audit tool + first run → scores + report | — (first writing-plans plan) |
| **B** | Confirm Core Path from data | A |
| **C** | Quality bar + brief generator + re-grade gate harness | A, B |
| **D** | Backfill Core-Path theory + practice (cowork + in-session), gated, batched by track | C |
| **E** | Author the four missing tracks at senior depth | C |
| **F** | Capstone | D, E |
| **G** | Done-criteria check (all of §2) | D, E, F |

**Only A is planned now.** Backfill briefs (D/E) cannot be written until the audit has
actually measured the content — so after A we re-plan B–G from real scores.

## 6. Quality gates & risks (from project memory)

- **Cowork:** dense handoff + its own verify/gate; **may not push** → controller verifies
  `git status` and commits orphaned work; **leaves sandbox junk** → scan before build.
- **Originality / licensing:** real-world cases are **original**, inspired by *public*
  postmortems / RFCs / incident write-ups. Never copy copyrighted problem text. Sources cited.
- **Subagent contamination:** authoring agents leak harness tags / bare-JSX in prose /
  doubled slug dirs → scan before build (known 3-rebuild cost).
- **Volume-over-quality:** the LLM re-grade gate (4.4 step 3) is the backstop — a unit is
  not "done" until re-grade ≥ bar, independent of who/what authored it.
- **i18n:** EN authored + graded as canonical; RU mirrors; the `i18n-parity` lint
  (source-level) enforces twin presence; never let authoring delete widgets.
- **Build scale:** sharding (Phase 0) absorbs the added pages; new tracks land within it.
- **WebSearch injection:** brief sourcing agents to distrust fetched page content.

## 7. Open questions (resolved downstream, not blocking A)

- Exact Core-Path track list — decided from audit data in step B (user confirms).
- Re-grade bar threshold — calibrated in A against the hand-labeled set.
- Per-unit practice task-count minimum — set in C once the bar is calibrated.
