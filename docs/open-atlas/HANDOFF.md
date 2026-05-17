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
  STILL PENDING — **plan 2: definition backfill**. 571 terms total, only 132 have a
  definition; 439 need `defEn`+`defRu` authored (+ `seeAlso` for key terms). The page
  renders "definition pending" for the rest. Backfill is its own plan (batched,
  subagent-driven) — not yet written.
- `~/.claude/launch.json` — Claude Preview server config, name `atlas-preview`, serves
  `site/dist` on port 4400 (python http.server). Build first, then preview.
- Earlier fixes (committed-state unknown — verify with git): networking RU piece 12
  retranslated (was macaronic + had CJK leaks); RFC 7748 factual error fixed in
  `03-tcp-handshake` EN+RU; new linter rule `site/src/lint/rules/cjk-leak.ts` wired into
  `site/src/lint/index.ts`.

## Work queue (in order)

1. **Glossary — plan 2: definition backfill (IN PROGRESS).** Author `defEn`+`defRu`
   for the 439 terms in `glossary.json` that lacked a definition. Plan written:
   `docs/superpowers/plans/2026-05-17-glossary-backfill.md` — 30 research batches of
   ~15 terms, subagent-driven, full WebSearch/Context7 research per term.
   DONE: Task 1 (merge/check tooling) + Batch B01 (networking). glossary now
   147/571 defined. RESUME at Task 3 / Batch B02 — see the PROGRESS note at the top
   of the plan file. `seeAlso` field stays unpopulated (optional, future polish).
2. **Base CS foundations track** — the missing rung between Mathematics and Algorithms
   (the algorithms track currently assumes "knows one programming language"). Broad
   "base CS": programming + how computers work. Code language = TS/JS. New track #3 in
   `foundations`. One open question remains (see below).
3. **Migration: 3-tier → single-level lessons** — large. Convert the authored
   networking pillar (12 pieces × 3 tiers, EN+RU) into single-level connected lessons;
   rework the linter, the `/infographic` command, and `TierAccordion`. Do this now,
   while only 1 of 16 pillars is authored. Give it its own written plan.

## Open questions

- **Base-CS lesson skeleton** (queue #3): one skeleton with an optional Code beat, vs
  two skeletons (coding / concept), vs reuse the existing two skeletons. Undecided.
- A whole-graph "connections page" was rejected (hairball). A personal "your path /
  what's next" planner is optional, later.

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
