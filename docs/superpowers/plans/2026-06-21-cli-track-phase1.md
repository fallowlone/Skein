# CLI Track — Phase 1 (beginner core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the beginner core of a new bilingual `cli` track (units `01`–`05`) on the curriculum site, starting with a track-scaffold + unit-01 vertical slice that proves the wiring, then units `02`–`05`.

**Architecture:** A new linear `/teach`-style track (`math`/`algorithms`/`base-cs` skeleton). Lessons are authored through the existing `/teach` pipeline, NOT hand-written here. This is a CONTENT plan: each task's "test cycle" is the build linter + `astro sync` + `lint:src` (plus EN/RU parity, a structural diagram per lesson, and `level` frontmatter), not unit tests.

**Tech Stack:** Astro 5 content collections, MDX, the `/teach` linear lesson skeleton + `<Inset>`, the existing diagram kit (DiagramFrame/Flow/Sequence/Stack), the `practice` collection.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-21-cli-track-design.md`.
- Bilingual EN+RU parity on every lesson (i18n glossary respected).
- Target: bash / POSIX, Linux-first; macOS/BSD-vs-GNU differences only in `<Inset>` asides.
- Practice CANNOT execute a real shell. Allowed task types: `predict`, `diagnose`, `review`, `design`, and `sandbox` ONLY when it faithfully MODELS shell behaviour in JS with a real check. Never fake shell execution.
- Every ready lesson carries `level` frontmatter (`zero`/`junior` for these units) and exactly one structural diagram.
- A new track must be wired into ALL FIVE coupled seams or TypeScript/zod reject it: (1) `src/types/index.ts` — add `cli` to BOTH the `Track` union type AND the `TRACKS` array (single source the zod `Track` enum derives from); (2) `src/content/tracks.json` — track entry (keyed by `slug`, e.g. `{slug:"cli", order:39, color:"sky", title, blurb}`); (3) `src/content/units.json` — units (merges union-dedup-by-id); (4) `src/components/atlas/track-band.ts` `TRACK_BAND` → `"cli": "foundations"`; (5) `src/scripts/track-meta.ts` `TRACK_ABBR` → `"cli": "CLI"`. TRACK_BAND/TRACK_ABBR are exhaustive `Record<Track,…>`, so adding to the `Track` union FORCES matching entries in both (else a TS error). Do NOT register the track with zero units — an empty track ships a broken/empty page and can fail track/unit tests; Task 1 lands the scaffold + unit 01 together as one coherent slice.
- Gate per task: `bun run build`'s linter clean (or at minimum `bunx astro sync` + `bun scripts/lint-src.mjs` clean for content-only increments) + EN/RU parity.

---

### Task 1: Track scaffold + unit 01 vertical slice

**Deliverable:** the `cli` track renders with unit `01-the-shell` fully authored EN+RU; the wiring is proven end-to-end before scaling.

**Files:**
- Modify: `site/src/content/tracks.json` — add the `cli` track entry (mirror an existing foundations track entry: id `cli`, bilingual title "Command line"/"Командная строка", crux, order).
- Modify: `site/src/content/units.json` — add `cli/01-the-shell` (id, slug, track `cli`, order 1, bilingual title, crux, lessons list).
- Modify: `site/src/types/index.ts` — add `cli` to the `Track` union type AND the `TRACKS` array (the zod `Track` enum derives from `TRACKS`; this is the gating seam).
- Modify: `site/src/components/atlas/track-band.ts` — `TRACK_BAND` → `"cli": "foundations"`.
- Modify: `site/src/scripts/track-meta.ts` — `TRACK_ABBR` → `"cli": "CLI"`.
- Create (via `/teach cli/01-the-shell/<lesson>`): `site/src/content/lessons/{en,ru}/cli/01-the-shell/{01-what-is-a-terminal,02-the-prompt-and-commands,03-where-am-i}/index.mdx`.
- Create: `site/src/content/practice/cli/01-the-shell/*.json` (one per lesson).

**Unit 01 lessons:** `01-what-is-a-terminal` (terminal vs shell vs prompt), `02-the-prompt-and-commands` (command, arguments, flags; `ls`), `03-where-am-i` (`pwd`, `cd`, the filesystem tree).

- [ ] **Step 1: Wire all 5 seams together** (see Global Constraints): `cli` into `src/types/index.ts` (`Track` union + `TRACKS`), `tracks.json` (the `cli` entry), `units.json` (the `cli/01-the-shell` unit), `track-band.ts` `TRACK_BAND`, and `track-meta.ts` `TRACK_ABBR`. Copy an existing foundations track's shape verbatim; only values change. Land this WITH unit 01 content (Steps 3–4) in the same commit — never register an empty track.
- [ ] **Step 2: Verify wiring resolves.** Run: `cd site && bunx astro sync`. Expected: clean (collections validate; `cli` track + unit recognized).
- [ ] **Step 3: Author unit 01 lessons** via `/teach cli/01-the-shell/01-what-is-a-terminal` (then `02`, `03`). Each: linear skeleton, EN+RU, one diagram, `level: zero`, illustrative shell in fenced blocks, macOS notes in `<Inset>`.
- [ ] **Step 4: Author unit 01 practice** — for each lesson a `practice/cli/01-the-shell/<lesson>.json` with 3–5 tasks drawn from {predict output, diagnose the command/flag, review a one-liner, design a small task}. Bilingual.
- [ ] **Step 5: Gate.** Run: `cd site && bunx astro sync && bun scripts/lint-src.mjs`. Expected: both clean, EN/RU parity holds, diagram + practice present on each lesson.
- [ ] **Step 6: Commit.** `git add site/src/content && git commit -m "content(cli): scaffold track + unit 01 the-shell EN+RU"`

---

### Task 2: Unit 02 — files and paths

**Files:** Modify `site/src/content/units.json` (+`cli/02-files-and-paths`). Create lessons `{en,ru}/cli/02-files-and-paths/{01-paths-absolute-and-relative,02-making-and-moving,03-reading-files}/index.mdx` + matching practice JSON.

**Lessons:** `01-paths-absolute-and-relative` (`.`/`..`/`~`, the tree), `02-making-and-moving` (`mkdir`,`cp`,`mv`,`rm` — and the `rm -rf` footgun in an `<Inset>`), `03-reading-files` (`cat`,`less`,`head`,`tail`).

- [ ] **Step 1:** Add `cli/02-files-and-paths` to `units.json`.
- [ ] **Step 2:** `bunx astro sync` → clean.
- [ ] **Step 3:** Author the 3 lessons via `/teach`, EN+RU, diagram + `level: zero/junior` each.
- [ ] **Step 4:** Author practice per lesson (predict/diagnose/review/design).
- [ ] **Step 5:** `bunx astro sync && bun scripts/lint-src.mjs` → clean; EN/RU parity.
- [ ] **Step 6:** Commit `content(cli): unit 02 files-and-paths EN+RU`.

---

### Task 3: Unit 03 — streams and pipes

**Files:** Modify `units.json` (+`cli/03-streams-and-pipes`). Create lessons `{01-stdin-stdout-stderr,02-redirection,03-pipes-and-grep,04-counting-and-slicing}` EN+RU + practice.

**Lessons:** stdin/stdout/stderr model; `>`/`>>`/`<` redirection; `|` + `grep`; `wc`/`head`/`tail`. This unit is the best home for a JS-modelled `sandbox` ("predict the output of `... | sort | uniq -c`").

- [ ] **Step 1:** Add `cli/03-streams-and-pipes` to `units.json`.
- [ ] **Step 2:** `bunx astro sync` → clean.
- [ ] **Step 3:** Author the 4 lessons via `/teach`, EN+RU, diagram each (a Flow/Sequence diagram fits the pipe data-flow).
- [ ] **Step 4:** Author practice; include one `sandbox` that models a pipeline in JS with a real `stdout-equals` check.
- [ ] **Step 5:** `bunx astro sync && bun scripts/lint-src.mjs` → clean. If a runnable sample/sandbox was added, also `bun run verify:samples`.
- [ ] **Step 6:** Commit `content(cli): unit 03 streams-and-pipes EN+RU`.

---

### Task 4: Unit 04 — finding things

**Files:** Modify `units.json` (+`cli/04-finding-things`). Create lessons `{01-globs-and-wildcards,02-find,03-grep-recursive,04-which-and-type}` EN+RU + practice.

- [ ] **Step 1:** Add `cli/04-finding-things` to `units.json`.
- [ ] **Step 2:** `bunx astro sync` → clean.
- [ ] **Step 3:** Author the 4 lessons via `/teach`, EN+RU, diagram + `level` each.
- [ ] **Step 4:** Author practice (a `design` "find all X under Y" pipeline task fits well).
- [ ] **Step 5:** `bunx astro sync && bun scripts/lint-src.mjs` → clean; EN/RU parity.
- [ ] **Step 6:** Commit `content(cli): unit 04 finding-things EN+RU`.

---

### Task 5: Unit 05 — permissions and users

**Files:** Modify `units.json` (+`cli/05-permissions-and-users`). Create lessons `{01-rwx-and-chmod,02-ownership-and-chown,03-sudo-and-root}` EN+RU + practice.

**Lessons:** rwx bits + `chmod` (numeric + symbolic); ownership + `chown`; `sudo`/root and least-privilege. This unit explicitly bridges to the Linux track.

- [ ] **Step 1:** Add `cli/05-permissions-and-users` to `units.json`.
- [ ] **Step 2:** `bunx astro sync` → clean.
- [ ] **Step 3:** Author the 3 lessons via `/teach`, EN+RU, diagram + `level: junior` each.
- [ ] **Step 4:** Author practice (a `diagnose` "what does `chmod 640` mean" + a `review` of a too-permissive `chmod 777`).
- [ ] **Step 5:** `bunx astro sync && bun scripts/lint-src.mjs` → clean; EN/RU parity.
- [ ] **Step 6:** Commit `content(cli): unit 05 permissions-and-users EN+RU`.

---

### Task 6: Phase-1 completeness pass

**Deliverable:** the `cli` track is coherent and discoverable as a 5-unit beginner arc.

- [ ] **Step 1:** Verify `tracks.json`/`units.json`/`TRACK_BAND`/`TRACK_ABBR` all list `cli` + its 5 units; track appears on `/learn` and routes resolve.
- [ ] **Step 2:** Run the full gate: `cd site && bun run build` (linter clean, expected page count up by the new lessons × 2 langs).
- [ ] **Step 3:** Spot-check render EN + RU of one lesson per unit (dev server + curl), confirm diagram + practice render.
- [ ] **Step 4:** Commit any fixes `content(cli): phase-1 completeness pass`.

---

## Self-Review

- **Spec coverage:** units 01–05 (beginner core) ✔; two-tier (Phase 2 = 06–10, separate plan) ✔; bash/POSIX Linux-first + `<Inset>` for macOS ✔; no-shell-exec practice via predict/diagnose/review/design + JS-modelled sandbox ✔; wiring seams (tracks.json/units.json/TRACK_BAND/TRACK_ABBR) ✔; diagram + `level` per lesson ✔; bilingual ✔.
- **Placeholders:** lesson bodies are authored by `/teach` at execution (correct for this codebase — the pipeline owns content), not stubbed text; wiring + verification steps are concrete.
- **Type/seam consistency:** the four wiring seams are named identically in every task; unit slugs match the spec's outline.
- **Scope:** Phase 1 only; Task 1 is the small validating slice (scaffold + unit 01) before units 02–05.
