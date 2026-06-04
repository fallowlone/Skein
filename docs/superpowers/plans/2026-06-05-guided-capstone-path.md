# Plan P7 — Guided Capstone Path

**Date:** 2026-06-05
**Register:** `docs/superpowers/specs/2026-06-05-senior-readiness-gaps-register.md` (problem **P7 — Capstones are static briefs, not a guided integrative path**)
**Effort:** Medium
**Severity:** Medium
**Status:** Planned

> **REQUIRED SUB-SKILL:** This plan is executed with the agentic workflow. Before writing any
> implementation code, invoke **`superpowers:test-driven-development`** for every TDD phase
> (Phases 1–3 below). Reds-first, greens-second, refactor-third — no production line is written
> before a failing test names what it must do. For multi-task fan-out, optionally invoke
> **`superpowers:subagent-driven-development`**, but the schema/store TDD phases must stay
> serial (they share the projects schema).

---

## Problem

Integration — where senior judgment actually forms — exists on the site only as ~14 static
project briefs (`site/src/content/projects/*.json`). They already carry `milestones`,
`skills`, `tracks`, and `seniorStretch`, but they render as a flat read-only page
(`/[lang]/projects/<slug>` via `[slug].astro`): no staged progress, no checkpoint, no
definition-of-done, no link back to the lessons that teach each milestone, no review/feedback.

Atomic practice tasks don't build system thinking; a *driven* capstone does (this milestone's
caching interacts with that milestone's consistency). The raw material is present; the guided
path is not. This plan turns each project into a **tracked path**: staged milestones with
per-milestone progress, a definition-of-done checklist per stage, links from the feeder
lessons, and optional review (self-checklist v1; LLM critique via P3 later).

## Goal

1. Extend the project `milestones` schema to a **guided** shape (additive, backward-compatible).
2. Validate guided milestones at build time with a new lint rule (EN/RU parity on milestone
   text + each `definitionOfDone` item), mirroring `lab.ts` / `practice.ts`.
3. Track **per-milestone completion** persistently (`capstone-state.ts`, localStorage, mirroring
   `practice-state.ts`).
4. Render a **project path UI** at `/[lang]/projects/<slug>`: milestone checklist with a progress
   bar, per-milestone goal, definition-of-done, links to the `feedsFrom` lessons, and
   `seniorStretch`.
5. Upgrade **3–4 existing briefs** (rate-limiter, write-ahead-log, oauth-mini, + job-scheduler)
   to the guided shape as seeds, filling `feedsFrom` from real `units.json` lesson keys.

Non-goals (v1): auto-verified builds / CI of the learner's repo; an LLM grader call (that is the
P3 dependency — leave a `reviewPrompt` hook only). v1 review = a self-checklist
definition-of-done.

---

## Verified anchors (read before executing)

- **Project content & schema (additive target).**
  `site/src/content.config.ts` → `ProjectSchema` (lines ~197–219). Today `milestones` is
  `z.array(BiText).min(2)` where `BiText = { en: min1, ru: min1 }`. `seniorStretch` is
  `z.array(BiText).min(1)`. `tracks: z.array(Track).min(1)`. Existing JSON has milestones as a
  plain array of `{ en, ru }` (see `rate-limiter.json`, `job-scheduler.json`). The new guided
  shape must remain accepted alongside this plain shape.
- **Rendering.** Hub: `site/src/pages/[lang]/projects.astro` (uses `ProjectsFilter.tsx`,
  `client:visible`). Detail: `site/src/pages/[lang]/projects/[slug].astro` — already renders
  `milestones` as an `<ol>` of `tt(m.en, m.ru)`; this is the file the path UI replaces/extends.
  Layout is `~/layouts/Atlas.astro`; `tt(en, ru)` helper picks locale.
- **State pattern.** `site/src/scripts/practice-state.ts` (localStorage, `keyFor`,
  `readProgress`/`setTaskStatus`, try/catch swallow) + its test `practice-state.test.ts`
  (`beforeEach(() => localStorage.clear())`). `capstone-state.ts` mirrors this exactly.
  Test runner: `bun run test` (Vitest), JSDOM `localStorage` via `site/src/test-setup.ts`.
- **Lint pattern to mirror.** `site/src/lint/rules/lab.ts` — `biTexts()` recursive
  `{en,ru}`-pair walker, `UNTRANSLATED_MIN_LEN = 25` (flag `en===ru` only on prose-length
  fields), `LANG_NEUTRAL_FIELDS` exemption, per-file `lint*Data` + aggregate, async
  `read*`/`check*`. Test: `lab.test.ts`. Registration: `site/src/lint/index.ts` imports
  `checkLab` and pushes `labRes.errors/warnings` in the `astro:build:done` hook (lines ~88–93).
- **feedsFrom key format.** `units.json` entries are `{ track, slug, lessons: [...] }`. The
  practice layer's `lessonKey` is `<track>/<unit-slug>/<lesson-slug>` (verified: a real
  practice file has `lessonKey: "databases/03-execution-plans/03-join-algorithms"`). `feedsFrom`
  reuses this exact key so it can later be cross-referenced with practice/lesson progress.
- **Seed track facts (verified).** rate-limiter → `["apis","backend"]`; write-ahead-log →
  `["databases","distributed"]`; oauth-mini → `["security","apis"]`; job-scheduler →
  `["backend","queues"]`. Example real feeder keys exist, e.g.
  `backend/05-idempotency-retries/03-retry-strategies` (apply real keys at author time by
  reading `units.json`).
- **P3 hook.** P3 grader (`site/src/scripts/practice-grade-llm.ts`, when it lands) consumes a
  task + write-up → `GradingResult`. v1 only stores `reviewPrompt` per milestone; no call.

---

## Phase 0 — Design (no code; produces the schema contract)

- [ ] **0.1 Guided milestone shape.** Each milestone becomes an object (additive over the plain
      `{en,ru}`):
      ```ts
      GuidedMilestone = {
        id: string,                          // /^[a-z0-9-]+$/, unique within a project
        title: { en, ru },                   // BiText
        goal: { en, ru },                    // BiText — what this stage achieves
        definitionOfDone: Array<{ en, ru }>, // min 1; the v1 self-checklist
        feedsFrom?: string[],                // lessonKeys: "<track>/<unit>/<lesson>"
        reviewPrompt?: { en, ru },           // optional; consumed by P3 later, ignored in v1
      }
      ```
- [ ] **0.2 Backward-compat decision.** `milestones` accepts a **union** per element:
      `z.union([ BiText, GuidedMilestone ])`. Old briefs (plain `{en,ru}`) keep validating; new
      briefs use the object form. A tiny normaliser (`normalizeMilestone`) lifts a plain
      `{en,ru}` into `{ id: <index>, title, goal: title, definitionOfDone: [] }` at render/state
      time so the UI handles both. Discriminator = presence of `id`/`definitionOfDone`.
- [ ] **0.3 Completion state shape.** Add to `UserState` a new top-level map
      `capstones: Record<string /*projectSlug*/, Record<string /*milestoneId*/, boolean>>`,
      defaulting to `{}` in `defaults` (so `mergeProgress`/sync keep working). The dedicated
      `capstone-state.ts` module reads/writes this slice; it does **not** require the full
      `UserState` migration machinery (it degrades to localStorage like `practice-state.ts`),
      but the field is added to `UserState`'s `defaults` so account-sync can carry it.
      *Decision:* keep `capstone-state.ts` self-contained (own key `awesome.capstone.<slug>`)
      mirroring `practice-state.ts`, and ALSO add the `capstones` field to `UserState.defaults`
      for forward-compat with P4/sync — the store module is the source of truth for the UI in v1.
- [ ] **0.4 feedsFrom integrity policy.** `feedsFrom` keys are validated for *shape*
      (`<track>/<unit>/<lesson>`, track ∈ TRACKS) by the lint rule. v1 does **not** assert the
      lesson file exists (avoids coupling lint to the full lesson glob + keeps seeds cheap);
      note this as a known limitation and a P4 follow-up (roadmap can resolve+link feeders).
- [ ] **0.5 Confirm hydration budget.** The path UI is one Preact island
      (`CapstonePath.tsx`, `client:visible`). Project detail pages are not piece pages; confirm
      the hydration-cap lint (`checkHydrationBudget`) does not flag `/[lang]/projects/<slug>`
      (it targets piece/lesson pages). If it does, exempt the projects route like the lab page
      exemption (see memory note: lab-page hydration exemption).

---

## Phase 1 (TDD) — Schema + lint rule for guided milestones

> Invoke `superpowers:test-driven-development`. Tests first; watch them fail; implement; green.

- [ ] **1.1 (RED) Lint-rule tests.** New file `site/src/lint/rules/capstones.test.ts`,
      mirroring `lab.test.ts`. Cases:
      - a valid guided project (object milestones + `definitionOfDone` with en/ru pairs) →
        `lintCapstoneData(file, data).errors` is `[]`.
      - a milestone missing its `ru` title (`title: { en: "x", ru: "" }`) → error mentions
        whitespace / untranslated.
      - a milestone with an `en===ru` `goal` over `UNTRANSLATED_MIN_LEN` → "untranslated" error.
      - a `definitionOfDone` item with `en===ru` long prose → "untranslated" error.
      - a duplicate milestone `id` within one project → aggregate error mentions "duplicated".
      - a plain-`{en,ru}` (legacy) milestone array → `errors` is `[]` (back-compat: rule skips
        non-guided milestones).
      - a malformed `feedsFrom` key (e.g. `"not-a-key"`) → warning mentions "feedsFrom".
- [ ] **1.2 (GREEN) Implement `site/src/lint/rules/capstones.ts`.** Mirror `lab.ts`:
      - `biTexts()` recursive pair-walker (copy or factor a shared helper — prefer copy to keep
        rules independent, matching the repo's existing duplication between `lab.ts`/`practice.ts`).
      - `lintCapstoneData(file, data)`: only inspect milestones that are guided (have `id`);
        whitespace check (error) + `en===ru` length check (error) on every `{en,ru}` under each
        guided milestone (title, goal, definitionOfDone items, reviewPrompt). Reuse
        `UNTRANSLATED_MIN_LEN = 25`.
      - `feedsFrom` shape check → **warning** (per 0.4), regex `^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$`
        and first segment ∈ `TRACKS` (import from `~/types`).
      - `aggregateCapstones(all)`: duplicate-`id` detection within a project (error).
      - `readCapstones(siteSrc)` + `checkCapstones(siteSrc)` reading
        `content/projects/*.json` (top-level dir, no recursion needed — but reuse the `walk`
        shape from `lab.ts` for symmetry).
- [ ] **1.3 (RED) Schema test.** Extend/author `site/src/content/projects` validation coverage:
      a Vitest that imports `ProjectSchema` (export it from `content.config.ts` if not already —
      `ProjectData` type is exported; add a named `ProjectSchema` export) and asserts:
      - a guided-milestone project `.parse()` succeeds.
      - a legacy plain-`{en,ru}`-milestone project `.parse()` still succeeds.
      - a guided milestone missing `ru` in `title` → `.safeParse().success === false`.
      Place at `site/src/content.config.test.ts` (or `site/src/scripts/__tests__` if that is the
      house pattern — check existing test locations first; `*.test.ts` next to source is the
      norm here).
- [ ] **1.4 (GREEN) Extend `ProjectSchema` in `content.config.ts`.**
      - Add `GuidedMilestone` zod object (per 0.1): `id` regex `^[a-z0-9-]+$`, `title` BiText,
        `goal` BiText, `definitionOfDone: z.array(BiText).min(1)`, `feedsFrom: z.array(z.string()).optional()`,
        `reviewPrompt: BiText.optional()`.
      - Change `milestones` to `z.array(z.union([BiText, GuidedMilestone])).min(2)`.
      - Export `ProjectSchema` (named) so tests can import it.
      - Leave `seniorStretch` unchanged.
- [ ] **1.5 (GREEN) Register the rule.** In `site/src/lint/index.ts`: `import { checkCapstones }`
      and, alongside the `checkLab` block, push `capRes.errors`/`capRes.warnings`.
- [ ] **1.6 Run.** `bun run test` (rule + schema tests green) — do **not** run the full build yet.

---

## Phase 2 (TDD) — Capstone progress store

> Invoke `superpowers:test-driven-development`.

- [ ] **2.1 (RED) `site/src/scripts/capstone-state.test.ts`**, mirroring
      `practice-state.test.ts` (`beforeEach(() => localStorage.clear())`):
      - `readCapstone(slug)` returns `{}` when nothing stored.
      - `setMilestoneDone(slug, milestoneId, true)` persists `{ [milestoneId]: true }`.
      - toggling `false` removes/sets the milestone to incomplete.
      - state is scoped per `slug` (writing `a` leaves `b` empty).
      - `percentDone(slug, totalMilestones)` returns `0` at empty, `50` at 1/2, `100` at 2/2
        (rounded int).
      - storage failure (mock `setItem` throw) is swallowed (no throw).
- [ ] **2.2 (GREEN) Implement `site/src/scripts/capstone-state.ts`** mirroring
      `practice-state.ts`:
      ```ts
      const keyFor = (slug: string) => `awesome.capstone.${slug}`;
      export function readCapstone(slug): Record<string, boolean> { … }
      export function setMilestoneDone(slug, milestoneId, done): void { … }
      export function percentDone(slug, total: number): number { … } // round(done/total*100)
      ```
      try/catch swallow on every localStorage touch.
- [ ] **2.3 Run.** `bun run test` green.

---

## Phase 3 (non-TDD) — Project path UI

- [ ] **3.1 `site/src/components/projects/CapstonePath.tsx`** (Preact island, `client:visible`):
      props `{ lang, slug, milestones, seniorStretch }` (milestones already normalised to guided
      shape by the page — see 3.3). Renders:
      - a **progress bar** + `N/total done` (reads `readCapstone(slug)` + `percentDone`).
      - each milestone as a card: number, `title`, `goal`, a **definition-of-done checklist**
        (each item a checkbox the learner ticks — local UI signal, NOT persisted; persistence is
        at the milestone level), and a **"Mark milestone done"** toggle that calls
        `setMilestoneDone` and re-renders the bar.
      - a **"Feeds from"** list: each `feedsFrom` key rendered as a link
        `/<lang>/learn/<track>/<lesson-slug>` (derive from the key: split on `/` →
        `[track, unit, lesson]`; the learn route is `/[lang]/learn/<track>/<lesson>` per
        CLAUDE.md routing). Show the human label as the lesson slug for v1 (no title lookup —
        keeps the island prop-only; a P4 enhancement can resolve titles).
      - the milestone-level `reviewPrompt`, if present, shown as a collapsed "Self-review"
        prompt with the definition-of-done as the checklist (v1: self-graded; P3 wires the LLM).
      Use existing Atlas/token classes (`text-muted`, `border-rule`, `text-ok`,
      `font-mono`) seen in `[slug].astro` — no new design language.
- [ ] **3.2 Bilingual labels.** Add UI strings via the existing `t()`/`i18n` path (see
      `projects.astro` using `t("projects.*", lang)`), or inline `tt(en, ru)` as `[slug].astro`
      does. New keys: `projects.progress`, `projects.milestoneDone`, `projects.definitionOfDone`,
      `projects.feedsFrom`, `projects.selfReview`, `projects.markDone`, `projects.done` — EN+RU.
      (Match whichever convention the file already uses; `[slug].astro` uses inline `tt`, so
      inline `tt` is acceptable and lowest-risk.)
- [ ] **3.3 Wire the detail page.** In `site/src/pages/[lang]/projects/[slug].astro`: replace the
      static `<ol>` of milestones with `<CapstonePath client:visible … />`. In the page
      frontmatter, normalise `p.milestones` via `normalizeMilestone` (plain `{en,ru}` → guided
      stub per 0.2) so the island always receives the guided shape; legacy briefs render as a
      single-DoD-less checklist (still trackable). Keep `seniorStretch`, `skills`, `stack`,
      `resources`, `brief`, `deliverable` sections unchanged.
- [ ] **3.4 (optional) Hub badge.** In `ProjectsFilter.tsx`, optionally show a small
      "guided" pill on projects whose milestones are objects (have `id`). Low priority — gate
      behind time; do not block the phase.

---

## Phase 4 — Seeds (upgrade 3–4 briefs)

- [ ] **4.1 Read `units.json`** and collect real lesson keys per seed project's `tracks` to fill
      `feedsFrom` accurately (don't guess; cite actual `<track>/<unit>/<lesson>` keys).
- [ ] **4.2 Upgrade `rate-limiter.json`** (tracks `apis`,`backend`): convert its 3 milestones to
      guided objects (`id`, `title`, `goal`, `definitionOfDone` 2–3 items each, `feedsFrom` real
      keys from apis/backend units e.g. status-codes/idempotency). Keep `seniorStretch`,
      `skills`, etc.
- [ ] **4.3 Upgrade `write-ahead-log.json`** (tracks `databases`,`distributed`): 3 guided
      milestones, `feedsFrom` from databases (durability/WAL/MVCC units) + distributed
      (replication/consistency units).
- [ ] **4.4 Upgrade `oauth-mini.json`** (tracks `security`,`apis`): 2→guided milestones (schema
      min is 2), `feedsFrom` from security (oauth/tokens/csrf units) + apis.
- [ ] **4.5 Upgrade `job-scheduler.json`** (tracks `backend`,`queues`): 3 guided milestones,
      `feedsFrom` from backend (idempotency-retries) + queues (delivery/visibility units).
- [ ] **4.6** Each upgraded milestone's `goal` and every `definitionOfDone` item is real
      EN **and** RU (no en===ru ≥25 chars; the lint rule will catch lazy copies). Add one
      optional `reviewPrompt` to the senior-est milestone of each seed (exercises the P3 hook
      without calling it).

---

## Phase 5 — Verify

> Invoke `superpowers:verification-before-completion` — evidence before claims.

- [ ] **5.1** `bun run test` — all new + existing Vitest green (schema, lint rule, store).
- [ ] **5.2** `cd site && bun run build` — full build + linter; `dist/lint-report.json` shows
      **0 errors**; guided-milestone parity validated; no new hydration-cap errors on the
      projects route. Expected page count unchanged (no new routes; same `[slug]` paths).
- [ ] **5.3** Visual check (per CLAUDE.md): open `/en/projects/rate-limiter` and
      `/ru/projects/rate-limiter` — progress bar renders, ticking a milestone persists across
      reload (localStorage), feedsFrom links resolve to learn routes, RU reads as RU.
- [ ] **5.4** No `console.log` left; types clean (`bun run build` covers `astro check` if wired —
      otherwise run the project's typecheck). No git commit unless the user explicitly asks.

---

## File structure (new / changed)

```
site/src/content.config.ts                         CHANGE  GuidedMilestone zod + milestones union; export ProjectSchema
site/src/content.config.test.ts                    NEW     schema accepts guided + legacy; rejects missing-ru
site/src/lint/rules/capstones.ts                   NEW     lintCapstoneData/aggregateCapstones/checkCapstones
site/src/lint/rules/capstones.test.ts              NEW     parity + dup-id + feedsFrom-shape cases
site/src/lint/index.ts                             CHANGE  import + register checkCapstones
site/src/scripts/capstone-state.ts                 NEW     read/setMilestoneDone/percentDone (localStorage)
site/src/scripts/capstone-state.test.ts            NEW     store behaviour + scoping + percent
site/src/scripts/user-state.ts                     CHANGE  add `capstones: {}` to UserState type + defaults (sync-forward)
site/src/components/projects/CapstonePath.tsx      NEW     island: progress bar + milestone cards + DoD + feedsFrom links
site/src/pages/[lang]/projects/[slug].astro        CHANGE  normalise milestones + render <CapstonePath/>
site/src/content/projects/rate-limiter.json        CHANGE  guided seed
site/src/content/projects/write-ahead-log.json     CHANGE  guided seed
site/src/content/projects/oauth-mini.json          CHANGE  guided seed
site/src/content/projects/job-scheduler.json       CHANGE  guided seed
site/src/components/projects/ProjectsFilter.tsx    (opt)   "guided" pill on object-milestone projects
```

---

## Success criteria

- [ ] `ProjectSchema` accepts **both** legacy `{en,ru}` milestones and the new guided-object
      milestones; a guided milestone missing `ru` fails `.safeParse`.
- [ ] The capstones lint rule flags missing-RU / `en===ru` milestone text + `definitionOfDone`
      items and duplicate milestone ids; warns on malformed `feedsFrom`; passes clean guided seeds;
      registered in the build pass.
- [ ] `capstone-state.ts` persists per-`(slug, milestoneId)` completion to localStorage with a
      `percentDone` helper; fully unit-tested; survives storage failure.
- [ ] `/[lang]/projects/<slug>` renders a milestone checklist with a live progress bar, each
      milestone's goal + definition-of-done, links to its `feedsFrom` lessons, and `seniorStretch`;
      completion persists across reload.
- [ ] 3–4 seed projects upgraded with real `feedsFrom` keys drawn from `units.json`.
- [ ] `bun run test` green; `cd site && bun run build` green with **0 lint errors**; EN/RU parity
      holds on all new milestone text.

---

## Dependencies & composition

- **P3 (LLM judgment feedback)** — `reviewPrompt` per milestone is the seam. v1 stores it and
  shows the self-checklist; P3 later maps `(reviewPrompt, milestone write-up) → GradingResult`
  via the existing BYOK transport. No P3 code is required to ship this plan.
- **P4 (senior roadmap / competency map)** — the roadmap can surface "next capstone" and resolve
  `feedsFrom` keys to lesson titles + progress. `capstones` added to `UserState.defaults` so P4
  and account-sync can read capstone completion as competency evidence.

## Risks & mitigations

- **Backward-compat with existing briefs.** Mitigation: `milestones` is a `union`; the rule
  *skips* non-guided (plain `{en,ru}`) milestones; the page normalises legacy → guided stub.
  Verified that all current JSON uses plain `{en,ru}` milestones, so nothing breaks on day one.
- **`feedsFrom` accuracy.** Mitigation: keys are author-filled from real `units.json` at seed
  time; the rule validates *shape* (warning) only — it does not assert lesson existence in v1
  (documented limitation; P4 follow-up resolves+links). Wrong-but-well-formed keys degrade to a
  dead-ish link, not a build break.
- **Scope creep into auto-verification.** Mitigation: v1 definition-of-done is an explicit
  self-checklist; no repo/CI introspection of the learner's build. The LLM critique path is
  deferred to P3 behind the `reviewPrompt` field.
- **Hydration / route lint.** Mitigation: single island, `client:visible`; confirm the projects
  route isn't under the piece/lesson hydration cap (Phase 0.5), exempt like the lab page if needed.

---

## Conventions

- No git commit/push unless the user explicitly asks; if asked and on `main`, branch first.
- TDD phases: failing test first, minimal green, refactor — no production line ahead of a test.
- Prefer `bun`. Component imports use the `~/` alias; no `..` relative segments.
- Before claiming done: `bun run test` + `cd site && bun run build` both green, no `console.log`,
  types clean, EN/RU parity verified in `dist/lint-report.json`.
- Additive only on shared schema (`ProjectSchema`, `UserState`) — never remove or rename existing
  fields.
