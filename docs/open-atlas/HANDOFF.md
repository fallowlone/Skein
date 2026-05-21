# open atlas — session handoff

This file is the source of truth for the **open atlas** redesign. Any new chat must
read this file first, then continue from the Work queue. Keep it updated.

## What this is

`open atlas` — an open-source learning platform: one site, zero → senior, modular,
interconnected. Built inside the existing `awesome-everything` Astro repo (`site/`).
A reader at zero knowledge should be able to reach senior-level *theory* of any topic
by following a connected path of lessons. Practice is deferred (theory first).

## Locked decisions (do not relitigate)

1. **Wedge — Вариант 1.** A thin zero→senior slice through the whole spine, built
   zero-level-first across all topics, then thickened upward.
2. **Content model — Model A.** A topic is a connected chain/graph of **single-level**
   lessons spanning zero→senior. NOT the 3-tier-in-one-document model. This is the
   foundations linear-lesson model, extended to every topic and all the way to senior.
   Each lesson targets ONE level; optional collapsible `<Inset>` deep-dives are fine,
   but never three full tiers in one doc.
3. **The spine** (dependency order, low → high): Mathematics → Base CS → Algorithms →
   How Networks Work → Databases → Systems & OS → Security. **Design System** is an
   off-spine island, reachable any time.
4. **Direction law — advanced = UP, everywhere.** Home atlas: zero at bottom, senior at
   top. Topic page: normal scroll down → camera rises → more-advanced content enters
   from the top of the viewport. Never invert the scroll.
5. **Two zones.** (a) Dark cosmic navigation: home, topic/ascent pages. (b) Light
   editorial reading: lesson pages, glossary.
6. **Design language.** Celestial star-atlas; editorial/typographic base; serious
   (19th-century star chart, not cartoon). No gamification — no XP, streaks, mascot,
   hearts. Engagement loop = interactivity (explorable explanations), not points.
   Teal accent `#1FBFA8` / `#2fd6bd`.
7. **Same-topic links are mandatory.** Because Model A splits e.g. "TCP basics"
   (junior) and "TCP internals" (senior) into separate lessons, they MUST be explicitly
   linked (a "deepens" relation) or learners lose the thread.
8. Topics are covered zero→senior in **theory**; practice is out of scope for now.

## Built so far

- `site/src/pages/[lang]/index.astro` — the **HOME** (celestial atlas). Done, verified
  desktop + mobile. Dark cosmic, self-contained (theme-independent). Spine of topic
  constellations + bright meridian + named per-topic constellations (Custodia, Machina,
  Memoria, Nexus, Logica, Fundamenta, Numerus, Forma) + background constellation
  starfield + Design System island. Topic data is a static inline list (sample) — wire
  to content collections later.
- `site/src/pages/lesson-preview.astro` — lesson reading-page **shell** preview (light
  zone), route `/lesson-preview`. Done, **Model A**: no tier selector; the level is
  shown as an altitude gauge (zero→senior climb position, junior marked here); a
  "Connected lessons" block surfaces four relations — builds-on (prereqs in),
  unlocks (next out), deepens-into (same-topic spiral up), appears-again-in
  (cross-topic spiral). Verified desktop + mobile, build clean (484 pages).
  Known minor issue: on narrow mobile the topbar breadcrumb crowds the
  "Back to the climb" link — fix when polishing.
- `site/src/pages/topic-preview.astro` — the **TOPIC page** = the ascent scroll
  scene (dark cosmic), route `/topic-preview`. Done. Standalone English-only preview,
  like `lesson-preview`. Sample topic: networking ("How Networks Work", constellation
  Nexus, 12 lessons). Locked decision #4 honoured: DOM order zero→senior top→bottom,
  normal scroll down = camera rises. A `position:fixed` parallax world (400vh strip,
  4 zones space/sky/grass/underground) slides from -300vh→0 as the page scrolls — the
  camera flies up. Fixed altimeter gauge + a rope/meridian with per-lesson markers +
  band horizons (zero/junior/middle/senior, colour-coded) + summit section. Scroll
  driver is a plain `scroll`-listener (no rAF — rAF is frozen in the preview browser).
  The "you are here" lesson links to `/lesson-preview/`. Build clean (485 pages).
  NOTE: the preview screenshot tool can't capture this page mid-scroll (env quirk,
  not a bug); verified via inspect + a tall-viewport full-page shot. Static sample
  data inline — wire to content collections + i18n + the real `[lang]/[pillar]` route
  later.
- **Glossary** — redesigned, light zone. `site/src/pages/[lang]/glossary/index.astro`
  (A–Z index: sticky letter rail, term rows with definition excerpts + relation chips,
  live client-side search) + `[lang]/glossary/[term].astro` (per-term hub: definition,
  other-lang label, right rail with introduced-in / used-in / see-also). Old flat
  `[lang]/glossary.astro` removed; URL `/[lang]/glossary/` unchanged. Relations are
  derived at build time: `site/src/scripts/glossary-index.ts` (pure, unit-tested —
  scans `<Term k="…">` markup, 12 tests) + `site/src/scripts/glossary-data.ts` (Astro
  glue: collection scan, altitude rank, ref resolver). `glossary.json` gained an
  optional `seeAlso` field (manual, validated — build fails on a dangling ref). Done
  on branch `glossary-redesign`, build clean (1627 pages), verified EN+RU + mobile.
  Spec: `docs/superpowers/specs/2026-05-17-glossary-redesign-design.md`. Plan:
  `docs/superpowers/plans/2026-05-17-glossary-page.md`.
  **Plan 2: definition backfill — DONE.** All 571 glossary terms now have authored,
  researched `defEn`+`defRu`. Done via `docs/superpowers/plans/2026-05-17-glossary-backfill.md`
  — 30 subagent-driven research batches (B01–B30) + merge/check tooling, each batch
  spec-reviewed then accuracy-reviewed. Build clean (1627 pages), lint clean
  (`i18n-parity` + `cjk-leak` cover glossary EN/RU). The `seeAlso` field is still
  unpopulated — optional future polish, the page handles its absence.
- `~/.claude/launch.json` — Claude Preview server config, name `atlas-preview`, serves
  `site/dist` on port 4400 (python http.server). Build first, then preview.
- Earlier fixes (committed-state unknown — verify with git): networking RU piece 12
  retranslated (was macaronic + had CJK leaks); RFC 7748 factual error fixed in
  `03-tcp-handshake` EN+RU; new linter rule `site/src/lint/rules/cjk-leak.ts` wired into
  `site/src/lint/index.ts`.
- **Base CS foundations track — COMPLETE (P0–P3).** Third `foundations` track (`base-cs`), the
  spine rung between Mathematics and Algorithms. Theory-focused (theory of computation +
  theory of programming constructs, hardware-led); not a hands-on language course.
  P0 shipped on branch `algorithms-units-06-12`: track registered in `tracks.json`
  (order 2; algorithms shifted to 3) + 12 units in `units.json`; new optional
  `lessonType: concept | coding` schema field; layout emits `data-lesson-type`; the
  linter (`lessons.ts`) gained a `base-cs` branch with two skeletons (concept = math
  shape; coding = algo shape minus Complexity), TDD-tested; new static widget
  `MachineFigure` (`components/algo/`); `/teach` domain lock extended to base-cs.
  Unit 01 "What a computer is" fully authored EN+RU (5 lessons: bits-and-binary,
  counting-in-binary, encoding-the-world, boolean-logic, logic-gates). Spec:
  `docs/superpowers/specs/2026-05-18-foundations-base-cs-track-design.md`. Plan:
  `docs/superpowers/plans/2026-05-18-foundations-base-cs-track.md`.
  **P1 DONE** (branch `base-cs-p1`, off main, NOT yet merged) — the rest of the
  machine arc, units 02–04, authored EN+RU, each lesson spec+quality reviewed with
  review fixes applied. All 14 P1 lessons are `lessonType: concept`:
  - Unit 02 "Memory" — 4 lessons: addressable-cells, the-byte, value-vs-address,
    stack-and-heap.
  - Unit 03 "The processor" — 5 lessons: the-instruction, fetch-decode-execute,
    registers, machine-code, a-toy-cpu. Review fix: the toy-CPU ISA was made
    internally consistent (2-byte instructions — opcode byte + 8-bit operand byte);
    `MachineFigure` gained an optional `lang` prop so the `kind="cpu"`
    Fetch/Decode/Execute strip localizes for RU lessons.
  - Unit 04 "From machine code to a language" — 5 lessons: the-assembler-idea,
    why-high-level-languages, compilation-vs-interpretation, the-runtime,
    source-to-running-program. 14 glossary terms added (assembler, compiler,
    interpreter, jit, runtime_system, garbage_collection, …).
  units.json lesson lists for units 02–04 are filled. `base-cs-p1` was merged into
  main (fast-forward) and the branch deleted.
  **P2 DONE** (branch `base-cs-p2`, off main, NOT yet merged) — the programming-theory
  arc starts, units 05–08, authored EN+RU, each unit implementer→quality-review→fix
  cycle complete, build clean (1849 pages, lint 0/0). 23 commits. P2 introduced the
  first `coding`-skeleton lessons; both skeletons verified rendering end-to-end:
  - Unit 05 "Values and types" — 4 lessons: what-a-value-is (concept),
    types-interpret-bits (concept), primitive-types (coding), why-types-exist
    (concept). 17 glossary terms added (hyphen-keyed).
  - Unit 06 "Variables and state" — 4 lessons: a-variable-is-a-named-cell (concept),
    assignment (coding), mutation-and-state (concept), references-vs-values (coding).
    14 glossary terms added (underscore-keyed).
  - Unit 07 "Control flow" — 4 lessons: what-flow-means, conditionals-as-branches,
    loops-as-repeated-jumps (all concept), tracing-a-program (coding).
  - Unit 08 "Functions and the call stack" — 5 lessons: what-a-function-is (concept),
    the-call-stack (coding), parameters-and-return (coding), scope (concept),
    recursion-preview (coding). 7 glossary terms added.
  units.json lesson lists for units 05–08 are filled.
  Note: base-cs glossary keys are mixed-convention (Unit 05 used hyphens, Units 06/08
  used underscores); the lessons linter does not gate glossary coverage for
  `lessons/`, so this is cosmetic — normalise if a future task touches the glossary.
  `base-cs-p2` was merged into main (fast-forward) and the branch deleted.
  **P3 DONE** (branch `base-cs-p3`, off main, NOT yet merged) — the final arc,
  units 09–12, authored EN+RU, each unit implementer→quality-review→fix cycle complete.
  Build clean (1947 pages, lint 0/0). The full 12-unit Base CS track (52 lessons EN +
  52 RU) is now authored; the algorithms track confirmed still building at `order: 3`.
  - Unit 09 "Data in memory" — 4 lessons: arrays-as-contiguous-cells (coding),
    indexing-and-offsets (concept), objects-as-key-value (coding), collections-in-memory
    (concept). 7 glossary keys added.
  - Unit 10 "Abstraction" — 4 lessons: what-abstraction-is (concept),
    bundling-data-and-behaviour (coding), modules (concept), why-abstraction-exists
    (concept). 4 glossary keys added.
  - Unit 11 "When a program fails" — 4 lessons: errors-vs-exceptions (concept),
    the-stack-trace (coding), undefined-behaviour (concept), debugging-as-reasoning
    (concept). 12 glossary keys added.
  - Unit 12 "Time and concurrency" — 4 lessons: why-async-exists (concept),
    blocking-vs-non-blocking (concept), the-event-loop (coding), concurrency-vs-
    parallelism (concept). 10 glossary keys added.
  units.json lesson lists for units 09–12 are filled. New P3 glossary keys all use the
  underscore convention. NEXT STEP: merge `base-cs-p3` into main (or open a PR).

## Work queue (in order)

1. **Migration: 3-tier → single-level lessons** — COMPLETE 2026-05-21. The
   3-tier `book/` model is fully retired. All 16 pillars now expose single-level
   connected lessons (open-atlas Model A) via `lessons/{en,ru}/<track>/<unit>/<lesson>/`.
   - Spec: `docs/superpowers/specs/2026-05-19-tier-to-single-level-migration-design.md`
   - Plan: `docs/superpowers/plans/2026-05-19-tier-to-single-level-migration.md`
   - Phase A (additive infra) COMPLETE 2026-05-19.
   - Phase B (content: 51 ready units) COMPLETE 2026-05-21. 5 ready pillars
     (networking 12, browser 8, databases 8, observability 8, performance 8) +
     7 lone ready pieces (apis/06-graphql-n-plus-one, backend/05-idempotency-retries,
     caching/03-stampede, distributed/02-raft-outline, frontend/02-data-fetching,
     queues/01-delivery-guarantees, security/02-oauth-oidc).
   - Phase C (stubs: 81 units) COMPLETE 2026-05-21. Per-pillar batches: `bfda814`
     ai-llm, `944d8d5` data-engineering, `a94c7d5` deployment, `4d850f4`
     engineering-practice, `432fd8f` apis, `389a87d` backend, `0ec500f` caching,
     `232e42a` distributed, `5a0eaa5` frontend, `b240a74` queues, `2f2ef86` security.
   - Phase D (teardown) COMPLETE 2026-05-21. `01add9f` D1 piece-only lint rules
     dropped (`depth-checkpoints`, `tier-accordion`, `tier-word-budgets`,
     `exercise-counts`; `EXERCISE_COMPONENTS` moved to shared `exercise-components.ts`).
     `f5d9c46` D2 piece routes removed; `Chapter.astro` deleted, `Topic.astro` kept
     (still imported by Lesson/glossary/settings/threads/learn pages). `2cac861` D3
     `book`/`pillars`/`chapters` collections + data files retired, orphan nav components
     cleaned, `PillarGrid`/`GlobalSearch`/home page repointed at tracks/lessons.
     `e1f4520` D4 `TierAccordion.astro` + `3-tier-piece.mdx` + `tier-persist.spec.ts`
     deleted. `378f43e` D5 final cleanup of piece-era orphan components + dead CSS;
     stale-reference grep clean.
   - **Final state**: build 2359 pages, lint 0/0. 19 tracks (3 foundations + 16
     fullstack pillars). 132 units (51 ready + 81 stub). On branch
     `interesting-antonelli-002bf7`, NOT yet merged to main; separate merge task.

   Carry-forward notes (still relevant for future work):
   - `08-putting-it-together` slug recurs across many tracks; performance dedupes
     with `-perf` suffix in `units.json` to avoid collision. Other tracks left as-is —
     non-fatal slug warning at build time.
   - `personas.json` is still used (`PersonaTag`, `PersonaLegend`, lint rule) — not
     deleted in D3.
   **Traps learned during Phase B (encode into every subagent prompt):**
   - MDX parses `<1`, `<2`, `<5` etc as JSX → build fails. Use `&lt;1` or "under 1".
   - Bare `>` in prose → `&gt;`.
   - `\"` backslash escapes inside JSX string attrs → use `&quot;`.
   - Curly-brace runs like `{trace_id}` outside JSX attrs → wrap as `{"{trace_id}"}`.
   - `~` chars inside HTML table cells → `&#126;` (markdown strikethrough parse).
   - `MetaphorComplete` widget props are `pieceSlug`/`setup`/`accepted`/`canonical`/
     `explanation` — NOT `lessonSlug`/`pairs`/`prompt`.
   - Length norms (linter measures rendered stripped text — converge by trim iterations):
     Crux ≤140, KeyTakeaway EN ≤~240 RU ≤~440, Misconception body ≤310 raw (renders ≤320
     after "heads-up" prefix), summary ≤~280.
   - All component imports via `~/` alias — never `..` relative segments.
   **Subagent timeout pattern (2026-05-20):** sonnet implementer occasionally hits "API
   Error: Stream idle timeout" after ~17-20 min while authoring ~14 lesson files.
   Observed twice this session (07-sharding, 02-structured-logging). Recovery: do NOT
   redo from scratch — dispatch a focused reconcile subagent that takes existing
   EN/RU orphan files as the starting point and finishes missing files + units.json
   entry + build gate + git rm source + commit. Both reconciles completed cleanly
   (commits `9b312c6`, `0b87822`).

## Open questions

- A whole-graph "connections page" was rejected (hairball). A personal "your path /
  what's next" planner is optional, later.

(Resolved: the Base-CS lesson-skeleton question — settled on **two skeletons**,
`concept` and `coding`, selected per-lesson via the `lessonType` frontmatter field.)

## Continuity protocol — running this across chats

- **Every new chat: read this file first.** Then continue from the Work queue.
- For multi-step work (especially the migration), use the `writing-plans` skill to
  produce a plan file under `docs/superpowers/plans/`; track progress inside that file
  so any chat can resume mid-plan.
- **Keep this file current.** When a queue item is done, move it to "Built so far".
  When a decision changes, update "Locked decisions".
- **Context rotation.** When the chat's context approaches ~75–80% full: stop cleanly,
  update this file with the exact current state and the next concrete step, finish the
  current small unit of work, then the user starts a fresh chat. The new chat reads
  this file and resumes. Rotate deliberately — do not rely on auto-compaction.
- Offload big investigation/build sub-tasks to subagents (general-purpose, or the
  caveman `cavecrew` agents whose output is compressed) so the main chat's context
  lasts longer.
- Keep caveman ultra mode on for token efficiency.

## Skills to use

- `superpowers:brainstorming` — before any new page/feature design (topic page,
  base-CS track, glossary).
- `superpowers:writing-plans` — for the migration and any multi-step build.
- `superpowers:executing-plans` — to execute a written plan across sessions with
  review checkpoints.
- `superpowers:subagent-driven-development` / `dispatching-parallel-agents` — for
  parallel independent work (e.g. authoring many lessons at once).
- `superpowers:verification-before-completion` — always, before claiming done.
- `frontend-patterns`, `design-system` — UI and component work.
- `superpowers:test-driven-development` — for linter rules and logic.

## Verify / preview

- Build: `cd site && bun run build` (expect ~484 pages, lint clean).
- Preview: launch the `atlas-preview` server (Claude Preview); it serves `site/dist`
  on port 4400. Home at `/en/`, lesson shell at `/lesson-preview/`.

## ⚠️ CONCURRENCY COLLISION — 2026-05-19, networking/01-physical-link

A scheduled `proceed-work` run started while another claude-code session was already
actively authoring `networking/01-physical-link` in this same worktree
(`interesting-antonelli-002bf7`). Two agents migrated the same unit at once — confirmed
by lesson files appearing / being overwritten every ~2 min from another process, and
by this HANDOFF being edited mid-run. **Only ONE session must touch this worktree.**

State of `01-physical-link` as the scheduled run withdrew (NOTHING committed):
- EN lessons present: `01-bits-on-the-wire`, `02-modulation-and-shannon`,
  `03-latency-math`, `04-bufferbloat-and-congestion`, `05-datacenter-and-800g`.
- RU lessons present: `01`, `02`, `03` only — `04` and `05` RU twins MISSING.
- The scheduled run deleted two of its own orphan lessons (`05-the-datacentre-fabric`,
  `06-the-physical-frontier`) that duplicated the other agent's cut, and repointed
  `04`'s `deepensInto` to `05-datacenter-and-800g`. `01`/`02` cruxes trimmed to ≤140.
- Known build breakage: `03-latency-math` (EN+RU) has `<1 ms` in a Markdown table —
  MDX parses `<1` as a JSX tag, vite build fails. RU `02` URLLC line has the same
  `<1` bug. Fix: `&lt;1` or "under 1 ms".

Before resuming this unit, one agent must: reconcile/confirm the cut plan + slugs,
finish RU twins for `04`+`05`, fix the `<1` MDX bug, add the `units.json` entry,
`cd site && bun run build` to lint 0/0, delete `book/{en,ru}/networking/01-physical-link/`,
then commit. Verify each lesson before declaring it `ready`.

## ⚠️ CONCURRENCY COLLISION — 2026-05-20, mid-session lock loss

During an autonomous Phase B run (this session, databases + observability + perf 01-04
on 2026-05-20), another claude session committed `59cdb76`
(`docs(open-atlas): refresh CONTINUE-PROMPT to 26/51 + add POST-MIGRATION-PROMPT`) and
silently removed `docs/open-atlas/.migration-lock/` while the primary session held it.
The concurrent commit was docs-only (`CONTINUE-PROMPT.md` + `POST-MIGRATION-PROMPT.md`)
— not a content collision. The primary session reacquired the lock and continued. No
content corruption resulted. Going forward: the lock dir is the ONLY coordination
signal; do not bypass it. If the concurrent process is your own scheduled-run
refresher, gate it behind a lock check too — it must NOT `rm -rf` a lock it does not
own.
