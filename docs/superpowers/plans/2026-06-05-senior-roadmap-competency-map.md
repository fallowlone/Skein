# Plan — Senior Roadmap + Per-Domain Competency Map (P4)

**Date:** 2026-06-05
**Register:** `docs/superpowers/specs/2026-06-05-senior-readiness-gaps-register.md` → **P4** ("It's a library, not a program").
**Effort:** Medium.
**Status:** DRAFT — not started.

> **REQUIRED SUB-SKILL:** `superpowers:test-driven-development` for every TDD phase below.
> The deterministic core (`competency.ts`) MUST be built test-first: write a failing
> Vitest spec with real cases, watch it fail, implement, watch it pass. Do not write
> implementation before its test exists.

## Conventions

- **No `git commit` / `git push` / branch creation unless the operator explicitly asks.**
  Leave the working tree dirty; the operator integrates.
- Work in `site/`. Prefer `bun` (`bun run test`, `bun run build`).
- Import via the `~/` alias (`~` → `site/src/`); never `..` relative segments.
- New deterministic logic = pure functions in a module + a colocated `*.test.ts`.
  No DOM, no `localStorage`, no `Date.now()` inside pure functions — pass time/now in.
- UI islands are Preact `.tsx`, hydrated `client:only="preact"` like `ProfilePanel.tsx`.
- Bilingual EN+RU for every user-visible string (inline ternary on `lang` like the
  existing islands, OR a key in `src/i18n/ui.json` — match the surrounding file's style).
- Before declaring done: `bun run test` green, `bun run build` green (Astro + linter,
  lint-report.json clean), no `console.log` left in committed code, types check.
- This plan is **additive**. Do not change `computeRating`, `ranks.ts`, the pretest, the
  gamified `/profile` semantics, or any lesson content. The competency map sits *beside*
  the existing rating, it does not replace it.

---

## Phase 0 — Design the competency model (concrete, no code yet)

The output of this phase is the locked spec the TDD phases implement. Write the decisions
into this plan file (edit the "DESIGN DECISIONS (locked)" block below) before any code.
This is design only — verify interfaces by reading, write nothing executable.

### 0.1 — What is a "domain"

A **domain = one track** (the 29 entries in `tracks.json` / keys of `TRACK_BAND` in
`site/src/components/atlas/track-band.ts`). We do NOT invent a new taxonomy; the track
*is* the competency unit. This keeps sequencing (units.json is keyed by track) and the
map aligned.

- [ ] Confirm the track list = `Object.keys(TRACK_BAND)` and that every `tracks.json`
      slug appears in `TRACK_BAND` (read both; note any drift as a pre-req fix).
- [ ] Decide v1 scope of domains shown: **all tracks that have ≥1 `status:"ready"` unit**
      in `units.json`. Foundations tracks (`math`, `base-cs`, `algorithms`) are included
      but flagged `band:"foundations"` so the roadmap can de-prioritize them for a learner
      whose goal is *senior fullstack* (they still show, just low senior-weight).

### 0.2 — The competency formula (v1, deliberately simple + documented)

For a domain `d`, `computeDomainScore` takes these inputs (all already derivable from
existing state — see 0.4) and returns `{ score: 0..1, confidence }`:

```
score(d) = clamp01(
    w_prior   * prior(d)          // pretest-derived prior, 0..1 (cold-start anchor)
  + w_lessons * lessonFrac(d)     // fraction of ready lessons in d the learner has opened
  + w_pract   * practiceScore(d)  // practice outcomes in d, 0..1 (objective + subjective)
) * recencyMul(d)                 // gentle decay if the domain hasn't been touched in a while
```

v1 weights (sum of the three additive weights = 1.0, documented as tunable constants in
the module):

| term        | weight | rationale                                                         |
|-------------|--------|-------------------------------------------------------------------|
| `w_prior`   | 0.25   | the pretest is a one-time, coarse signal — a *prior*, not proof.  |
| `w_lessons` | 0.35   | reading the domain's lessons is the bulk of demonstrated coverage.|
| `w_pract`   | 0.40   | doing > reading; practice is the strongest available v1 signal.   |

Term definitions (v1):

- `prior(d)` — from the pretest. Pretest questions are **domain-flavored but not 1:1 to
  tracks** (IDs: `tcp`, `db-index`, `react`, `http`, `adv-mvcc`, `adv-consensus`,
  `adv-http-cache`, `adv-event-loop`, `adv-cap`). Define a small explicit
  `PRETEST_DOMAIN: Record<string /*qId*/, Track>` map (e.g. `tcp→networking`,
  `db-index→databases`, `adv-mvcc→databases`, `react→frontend`, `http→networking`,
  `adv-http-cache→caching`, `adv-consensus→distributed`, `adv-cap→distributed`,
  `adv-event-loop→js-engine`). For a domain with mapped questions:
  `prior(d) = mean(answerWeight/3)` over its questions. For a domain with **no** mapped
  question (most tracks): fall back to the **global** prior =
  `clamp01(rating/1000)` from `pretest.rating` (so cold start is never 0, it inherits the
  learner's overall level). Documented limitation: the prior is coarse for unmapped tracks.
- `lessonFrac(d)` — `readyLessonsOpened(d) / readyLessonsTotal(d)`. "Opened" = the lesson
  slug appears in `UserState.history` (history keys are `"<track>/<unit>/<lesson>"`-shaped
  — verify the exact key convention in 0.4; it is the same key `recordVisit` writes).
  Counts only `status:"ready"` units' lessons (exclude `quiz-*`/`project` pseudo-lessons
  from the denominator — they are assessment, not coverage).
- `practiceScore(d)` — over the domain's lessons that have practice:
  - **objective** tasks (`blanks`, `sandbox`): `done` status counts as correct signal.
  - **subjective** tasks (everything else, self-graded today): `attempted`/`done` counts
    as *engagement* only, weighted at **half** an objective `done` (documented: until P3's
    LLM grader lands, we cannot trust subjective correctness, only effort).
  - `practiceScore(d) = clamp01( (objDone + 0.5*subjEngaged) / max(1, totalTasks(d)) )`.
  - **P3 hook (documented, not built here):** when an objective grade exists for a
    subjective task (P3's grader), upgrade its contribution from 0.5*engaged to a real
    correctness fraction. Leave a clearly-commented seam.
- `recencyMul(d)` — `1.0` if the domain was touched within `RECENCY_FRESH_DAYS` (v1: 30),
  decaying linearly to a floor `RECENCY_FLOOR` (v1: 0.85) by `RECENCY_STALE_DAYS` (v1: 120).
  Never below the floor — recency *nudges*, it does not erase earned competency. `now` is
  passed in (pure). A domain never touched uses its prior with full recency (no penalty
  before first contact — you can't be "stale" on something you started today).

- [ ] Lock the weights, the `PRETEST_DOMAIN` map, and the recency constants in the
      DESIGN DECISIONS block. They are v1 and explicitly tunable — over-engineering the
      formula is a named risk; keep it linear and commented.

### 0.3 — Confidence per domain (extend `confidenceOf`)

`confidenceOf` (in `rating.ts`) currently returns `"high" | "medium"` from answer-weight
variance. Per-domain confidence is about **evidence volume**, not variance:

```
domainConfidence(d):
  evidence = lessonsOpened(d) + practiceTasksTouched(d) + (mapped pretest qs for d)
  if evidence === 0           -> "none"     // cold: pure prior / global fallback
  if evidence <  LOW_EVIDENCE -> "low"      // v1: < 4
  if evidence <  MED_EVIDENCE -> "medium"   // v1: < 12
  else                        -> "high"
```

- [ ] Add `"none" | "low" | "medium" | "high"` as the domain confidence type. Do NOT widen
      the existing `confidenceOf` return (other code depends on the 2-value union); add a
      new `domainConfidenceOf(evidenceCount)` in `competency.ts` instead. Document that the
      global `confidenceOf` is unchanged.

### 0.4 — Inputs: confirm every signal already exists in state

- [ ] **Pretest prior:** `UserState.pretest` (`PretestResult` with `stage1.answers`,
      optional `stage2.answers`, `rating`). `pretest-questions.ts` exports
      `pretestQuestions` + `advancedQuestions` with `.choices[i].weight`.
- [ ] **Lesson coverage:** `UserState.history: Record<slug, {firstAt,lastAt,tiersOpened,...}>`.
      **Verify the slug key shape** by reading `recordVisit` call sites (e.g. the lesson
      reader route) — confirm whether keys are `"<track>/<unit>/<lesson>"` or `"<track>/<piece>"`.
      The competency module must parse `track` out of the key the SAME way ProfilePanel does:
      `Object.keys(history).map(k => k.split("/")[0])`. Pin this in DESIGN DECISIONS.
- [ ] **Practice outcomes:** `practice-state.ts` `readProgress(lessonKey)` →
      `Record<taskId, "seen"|"attempted"|"done">`, key `atlas.practice.<lessonKey>`. Task
      *types* live in the practice JSON (`site/src/content/practice/**`) — the module needs
      a `(lessonKey) → {taskId,type}[]` lookup to classify objective vs subjective. Decide
      v1 source: pass the practice task metadata IN as a plain array (the route/island
      collects it from the content collection at build/hydrate time) so `competency.ts`
      stays pure and content-agnostic. Pin the input shape.
- [ ] **Content graph:** `units.json` (`{id,slug,track,order,title,lessons[],status}`),
      lesson frontmatter `prereqs` (cross-unit dependency edges — confirm field name by
      reading a lesson MDX), `next-lesson.ts` `resolveNextLesson`, `next-track.ts`
      `nextTrackByOrder`, `track-band.ts` `TRACK_BAND`/`bandOf`.

### 0.5 — "Biggest gap" definition

```
seniorWeight(track) = SENIOR_WEIGHT[band(track)]   // weight a band by senior-importance
gapScore(d) = (1 - score(d)) * seniorWeight(track(d))
biggest gap = argmax gapScore over shown domains
```

v1 `SENIOR_WEIGHT` by band (reuse `TRACK_BAND`'s four bands; documented + tunable):

| band          | weight | rationale                                                        |
|---------------|--------|------------------------------------------------------------------|
| `middle`      | 1.0    | systems concerns (distributed, security, system-design, obs) are the senior core. |
| `surface`     | 0.9    | day-to-day fullstack — must be solid, slightly below systems.    |
| `advanced`    | 0.8    | specialist orbit (ai-llm, perf, deployment) — important, narrower.|
| `foundations` | 0.4    | math/base-cs/algorithms — prerequisite, not the senior frontier. |

- [ ] Lock `SENIOR_WEIGHT`. Tie-break equal `gapScore` deterministically by track `order`
      then slug, so output is stable for tests.

### 0.6 — Storage shape in `UserState`

The competency map is **derived**, so it does not strictly need persistence — it can be
recomputed from `history` + `practice-state` + `pretest` on every render. v1 decision:

- [ ] **Compute-on-read, do not persist the scores.** Add NO new heavy field to `UserState`.
      Rationale: avoids a stale cache and a migration; inputs already persist. The island
      computes the map from existing state each mount/update (cheap: ~29 tracks).
- [ ] **One small optional persisted field** for UX continuity:
      `UserState.roadmap?: { lastRecommendedTrack?: Track; dismissedAt?: number }` — so the
      roadmap can avoid re-nagging a just-dismissed recommendation. Optional (`?`) so old
      payloads stay valid (the `load()` merge in `user-state.ts` tolerates missing keys).
      Add a no-op-safe setter `setRoadmapDismissal(track)` mirroring `dismissRevisit`.

### DESIGN DECISIONS (locked) — fill during Phase 0, cite in code comments

```
DOMAIN            = one track (keys of TRACK_BAND)
SHOWN domains     = tracks with >=1 ready unit in units.json
WEIGHTS           = { prior:0.25, lessons:0.35, practice:0.40 }
PRETEST_DOMAIN    = { tcp:networking, http:networking, db-index:databases,
                      adv-mvcc:databases, react:frontend, adv-http-cache:caching,
                      adv-consensus:distributed, adv-cap:distributed,
                      adv-event-loop:js-engine }   // verify ids in 0.4
PRIOR fallback    = clamp01(rating/1000) when domain has no mapped question
SUBJECTIVE weight = 0.5 * objective (until P3)
RECENCY           = fresh<=30d:1.0  -> linear -> stale>=120d:floor 0.85
CONFIDENCE        = none(0) / low(<4) / medium(<12) / high(>=12)  by evidence count
SENIOR_WEIGHT     = { middle:1.0, surface:0.9, advanced:0.8, foundations:0.4 }
HISTORY key→track = key.split("/")[0]   // confirm in 0.4
STORAGE           = compute-on-read; only UserState.roadmap?{lastRecommendedTrack,dismissedAt}
```

---

## Phase 1 (TDD) — `competency.ts` core: `computeDomainScore`

> Sub-skill: `superpowers:test-driven-development`.

Create `site/src/scripts/progression/competency.ts` and
`site/src/scripts/progression/competency.test.ts`.

- [ ] **RED.** Write `competency.test.ts` first with concrete cases for
      `computeDomainScore(inputs): { score, confidence }`:
  - cold start (no lessons, no practice, no mapped pretest q) → score ≈ global prior,
    `confidence: "none"`, never 0 when rating > 0.
  - mapped pretest q present (e.g. `networking` with weight-3 answers) raises prior term.
  - full lesson coverage + many objective `done` tasks → score near (but not necessarily
    1.0 due to weights) the high end; assert it exceeds the cold-start score.
  - subjective `done` contributes **half** an objective `done` (two paired cases differing
    only in task type → assert the objective case scores higher).
  - recency: same inputs, `now` 200 days after `lastAt` → score multiplied toward the
    0.85 floor but not below it; `now == lastAt` → no penalty.
  - confidence buckets: evidence counts 0/3/8/20 → `none/low/medium/high`.
  - all scores `clamp01`-bounded (inject extreme inputs, assert ∈ [0,1]).
- [ ] Define the input type explicitly (pure, no globals), e.g.:
  ```ts
  export type DomainInputs = {
    track: Track;
    priorWeights: number[];        // mapped pretest answer weights 0..3 (may be empty)
    globalRating: number;          // 0..1000, fallback prior source
    readyLessonsTotal: number;
    readyLessonsOpened: number;
    practice: { objDone: number; subjEngaged: number; totalTasks: number };
    lastTouchedMs: number | null;  // most recent history.lastAt in this domain, or null
    nowMs: number;
  };
  export type DomainScore = {
    track: Track; score: number;   // 0..1
    confidence: "none" | "low" | "medium" | "high";
    parts: { prior: number; lessons: number; practice: number; recencyMul: number };
  };
  ```
  Export the weight/recency/confidence constants so tests assert against the documented
  values (no magic numbers duplicated in tests).
- [ ] **GREEN.** Implement `computeDomainScore` + `domainConfidenceOf(evidence)` as pure
      functions matching the locked formula. Comment each term with its Phase-0 rationale
      and the P3 seam on the subjective term.
- [ ] **VERIFY.** `bun run test` → this spec green.

## Phase 2 (TDD) — `competency.ts`: `rankGaps`

- [ ] **RED.** Tests for `rankGaps(domains: DomainScore[], bandOf): RankedGap[]`:
  - orders by `gapScore = (1 - score) * SENIOR_WEIGHT[band]` descending.
  - a low-score `middle`-band track outranks an equally-low `foundations` track.
  - tie-break by track `order` then slug (deterministic — assert exact order on a tie).
  - returns `{ track, score, gapScore, band, confidence }[]`; empty input → `[]`.
  - export `SENIOR_WEIGHT` and assert ranking against it.
- [ ] **GREEN.** Implement `rankGaps` + `SENIOR_WEIGHT`. `bandOf` is injected (don't import
      `track-band` into the pure module if it pulls Astro/content — pass the lookup in;
      verify `track-band.ts` is import-safe first. It reads as a plain `Record`, so a direct
      import is fine — confirm and decide).
- [ ] **VERIFY.** `bun run test` green.

## Phase 3 (TDD) — `competency.ts`: `recommendNextUnit`

- [ ] **RED.** Tests for `recommendNextUnit(track, opened, units, prereqsOf): UnitRec | null`:
  - within a track's ready units (sorted by `order`), recommend the **first unit not yet
    fully opened** whose prereqs are all satisfied.
  - a unit with an unmet cross-unit prereq is **skipped** in favor of the prereq unit
    (assert: recommend the prerequisite, not the blocked unit).
  - a fully-completed track → `null` (caller then advances to the next track via
    `rankGaps`/`nextTrackByOrder`).
  - returns `{ track, unit, lessonSlug }` pointing at the first unopened lesson in the
    chosen unit (reuse the *spirit* of `resolveNextLesson`; the lesson granularity is the
    actionable CTA target).
  - `prereqsOf(unitId) → unitId[]` injected (built from frontmatter in the non-TDD phase).
- [ ] **GREEN.** Implement honoring prereqs (topological-ish: don't recommend a unit before
      its prereqs). Keep it a simple in-track scan + prereq guard; cross-track sequencing is
      `rankGaps`'s job, not this function's.
- [ ] **VERIFY.** `bun run test` green. Full `competency.test.ts` suite green.

## Phase 4 (non-TDD) — Wire real inputs (adapter, browser-side)

Create `site/src/scripts/progression/competency-inputs.ts` — the **impure adapter** that
reads live state + content and produces `DomainInputs[]` for the pure core. Keep ALL
`localStorage`/`history`/content access here, not in `competency.ts`.

- [ ] `buildDomainInputs(state: UserState, content, nowMs): DomainInputs[]`:
  - `content` = a build-time-collected, serializable bundle the island passes in:
    per track → `{ readyUnits: {id,slug,order,lessons[]}[], prereqsByUnit, practiceByLesson:
    {lessonKey, tasks:{id,type}[]}[] }`. Assemble it in the Astro route from
    `getCollection`/`units.json` (NOT inside the pure module).
  - derive `priorWeights` via `PRETEST_DOMAIN` + `pretest.stage1/stage2.answers`.
  - derive `readyLessonsOpened` by intersecting `Object.keys(state.history)` (split on `/`,
    match track + lesson) with the track's ready lesson set.
  - derive `practice` counts via `readProgress(lessonKey)` × task-type classification
    (objective set = `["blanks","sandbox"]`, everything else subjective).
  - `lastTouchedMs` = max `history[*].lastAt` whose key starts with the track slug.
- [ ] `computeCompetencyMap(state, content, now)` convenience: inputs → `computeDomainScore`
      → `rankGaps` → `{ scores, gaps, topGap, nextUnit }` (the island's single data source).
- [ ] Confirm objective/subjective task-type split against real practice JSON (read 2–3
      files under `site/src/content/practice/**` to confirm the `type` field values match
      the register's list: `diagnose/predict/design/sandbox/fix/incident` + `blanks`).

## Phase 5 (non-TDD) — `/[lang]/roadmap` route + competency-map island

- [ ] Add `site/src/pages/[lang]/roadmap.astro` mirroring `profile.astro`
      (`getStaticPaths` for `en`+`ru`, wraps `Topic`, hydrates the island `client:only`).
      In the frontmatter, assemble the serializable `content` bundle (ready units, prereqs
      from frontmatter, practice task metadata) and pass it to the island as a prop — the
      island stays content-agnostic; the route does the content I/O.
- [ ] Add `site/src/components/progression/CompetencyMap.tsx`:
  - reads `userState.value`, calls `computeCompetencyMap(state, content, Date.now())`.
  - renders per-domain rows: track label, a **bar** (score 0..1, hue from `DOMAIN_HUE`/
    track color), confidence pill (`none/low/medium/high` → bilingual label), grouped or
    sorted by band (senior-weighted bands on top — reuse the home-page direction law).
  - a prominent **"Next: <unit>"** CTA from `topGap` + `nextUnit` linking to
    `/learn/<track>/<lessonSlug>` (verify the lesson route shape from existing `/learn`
    links). Include a one-line "why" ("biggest gap: <domain>, <band>").
  - cold-start copy when `!pretest`: invite the placement test (link to `/profile`),
    still show the map seeded by the global prior so it's never empty.
  - a "dismiss / show another" affordance writing `setRoadmapDismissal`.
  - hydration: this is ONE island on the page → within the 5-island lesson/page cap
    (roadmap is not a lesson page; confirm the linter's hydration rule applies and that
    one island is fine — read the relevant lint rule).
- [ ] **Bilingual labels** in `site/src/i18n/ui.json` (EN + RU blocks, i18n parity is
      linter-enforced): keys e.g. `roadmap.title`, `roadmap.subtitle`, `roadmap.next`,
      `roadmap.biggestGap`, `roadmap.confidence.none|low|medium|high`,
      `roadmap.takePretest`, `roadmap.allCaughtUp`. Add to BOTH `en` and `ru`.
- [ ] Add a nav entry to `roadmap` where `profile`/`learn` are linked (find the nav source
      — likely `Topic.astro`/a header component — and add EN+RU labels `nav.roadmap`).

## Phase 6 (non-TDD) — `/profile` competency widget

- [ ] Add a compact competency summary to `ProfilePanel.tsx` **below** the existing rank/XP
      block (do not disturb gamification): top-3 weakest domains as mini-bars + the single
      "Next: <unit>" CTA linking to the full `/roadmap`. Reuse `computeCompetencyMap`.
  - This is still ONE island (ProfilePanel) — no new hydration island added; just more
    render inside it. Confirm it stays within `/profile` budget.
- [ ] Bilingual via the same `ui.json` keys / inline ternaries already used in the file.

## Phase 7 — Verify, polish, hand off

- [ ] `bun run test` — all green (competency suite + existing 400+ tests unaffected).
- [ ] `bun run build` — green; `dist/lint-report.json` clean (i18n parity for new keys,
      hydration cap, glossary). Page count increases by 2 (`/en/roadmap`, `/ru/roadmap`).
- [ ] Manual: open `/en/roadmap` and `/ru/roadmap` — map renders, bars + confidence show, a
      concrete "Next: <unit>" CTA links to a real lesson. Open a lesson / mark a practice
      task `done`, return to roadmap → the affected domain's bar moves (proves live wiring).
- [ ] Cold-start pass: with no pretest + empty history, the map still renders (global-prior
      seeded), the copy is honest-but-not-discouraging (a starting point, not a verdict),
      and the CTA points somewhere sensible.
- [ ] No `console.log` in committed code; types check. **Do not commit** unless asked.

---

## File structure

```
site/src/scripts/progression/
  competency.ts              NEW  pure: computeDomainScore, domainConfidenceOf,
                                  rankGaps, recommendNextUnit + WEIGHTS/SENIOR_WEIGHT/
                                  RECENCY/PRETEST_DOMAIN constants
  competency.test.ts         NEW  Vitest specs (Phases 1–3, written first)
  competency-inputs.ts       NEW  impure adapter: state+content → DomainInputs[];
                                  computeCompetencyMap()
  rating.ts                  unchanged (confidenceOf NOT widened; domain confidence is new)
  types.ts                   EDIT only if a shared type is genuinely reused (prefer
                                  competency-local types)

site/src/scripts/
  user-state.ts              EDIT  add optional UserState.roadmap?{lastRecommendedTrack,
                                  dismissedAt} + setRoadmapDismissal() (additive, migration-safe)

site/src/components/progression/
  CompetencyMap.tsx          NEW  island: per-domain bars + confidence + "Next: <unit>" CTA
  ProfilePanel.tsx           EDIT  append compact top-3-weakest + roadmap CTA

site/src/pages/[lang]/
  roadmap.astro              NEW  route; assembles serializable content bundle, hydrates island

site/src/i18n/
  ui.json                    EDIT  roadmap.* + nav.roadmap keys, EN + RU (parity-enforced)

(nav source, likely site/src/layouts/Topic.astro or a header component)
                             EDIT  add /roadmap link
```

## Success criteria

- `computeDomainScore`, `rankGaps`, `recommendNextUnit`, `domainConfidenceOf` are pure,
  documented, and fully covered by `competency.test.ts` (TDD: tests written first, red→green).
- `/en/roadmap` and `/ru/roadmap` render a per-domain competency map (bar + confidence per
  domain, band-grouped) **and** surface a single concrete next step (a specific unit/lesson
  closing the biggest senior-weighted gap, honoring prereqs).
- The map and CTA **update** as the learner opens lessons and completes practice (live wired
  to `history` + `practice-state`, no manual refresh of any cache).
- `/profile` shows a compact competency summary without disturbing the gamified rank/XP.
- Bilingual EN+RU throughout; `bun run test` and `bun run build` both green, lint clean.

## Dependencies & composition

- **Composes with P2 (spaced repetition):** the roadmap is the natural home for P2's
  "due today" queue — leave a clearly-marked slot/comment in `roadmap.astro` /
  `CompetencyMap.tsx` for a future "Review due" section; do not build it here.
- **Composes with P3 (LLM judgment feedback):** P3's objective grades on `design`/
  `incident`/`diagnose` tasks sharpen `practiceScore(d)` — the subjective term's
  `0.5*engaged` contribution has a documented seam to swap in a real correctness fraction
  once P3 lands. No coupling required for P4 to ship.
- **Reuses (verify before citing):** `progression/rating.ts` (prior via `pretest.rating`),
  `pretest-questions.ts`, `units.json`/`tracks.json` + lesson `prereqs` for the graph,
  `practice-state.ts` (`readProgress`) + `UserState.history` for evidence,
  `track-band.ts` (`TRACK_BAND`/`bandOf`) for senior-weighting, `next-lesson.ts`/
  `next-track.ts` for sequencing spirit, `ProfilePanel.tsx`/`profile.astro` as the
  route+island convention template, `track-meta.ts` (`DOMAIN_HUE`, `coord`) for visuals.

## Risks & mitigations

- **Honest but not discouraging.** A wall of low bars on day one demoralizes. Mitigate:
  cold-start copy frames the map as "a starting map, not a verdict"; confidence pills make
  "we don't know yet" explicit (`none`/`low`); never render a domain at literal 0 (global
  prior floor); lead with the single actionable next step, not the deficit list.
- **Cold start.** Most tracks have no pretest signal. Mitigate: global-rating prior
  fallback so every domain has a non-zero, learner-appropriate starting estimate; the map
  is never empty even with zero history.
- **Over-engineering the formula.** Named risk. Mitigate: v1 is a single linear blend with
  ≤6 documented, exported constants; no per-track tuning, no ML, no hidden weights. Every
  constant is in one place and commented with its Phase-0 rationale, ready to tune later.
- **History key drift.** If the `history` key shape isn't `"<track>/<unit>/<lesson>"`, the
  lesson-coverage term silently reads 0. Mitigate: Phase 0.4 verifies the exact key by
  reading `recordVisit` call sites and pins it; a `competency-inputs.test`-style sanity
  check (or an assertion in the adapter) catches drift.
- **Pretest→track mapping is lossy.** Documented limitation, not a bug: the prior is coarse
  and only nudges (weight 0.25); demonstrated coverage/practice dominate as evidence grows.
```
