# Senior-Readiness Gaps — Problem Register

**Date:** 2026-06-05
**Lens:** What is *not yet built* on the site that blocks a learner (the site owner) from using it to actually become a senior fullstack engineer — as opposed to project-health gaps.

**Core thesis.** The site is a world-class **knowledge library**: 29 tracks, 274 units, ~1500 EN+RU lessons at middle+/senior depth, now CI-verified for runnable code. What it is thin on is the **transformation layer** — the machinery that turns "read correct explanations" into senior judgment, retention, and operating skill. Knowledge ≠ senior. Senior = *durable* knowledge + *judgment under ambiguity* + *integration* + *direction/self-knowledge* + a few specific muscles (reviewing, debugging live failures).

Each problem below has its own remediation plan under `docs/superpowers/plans/2026-06-05-*.md`. Severity = impact on the mid→senior transition. Effort = rough order of magnitude. "Reuses" flags existing infra that de-risks the build.

---

## P1 — Track depth is uneven (library has soft spots)

**Statement.** Lesson depth varies wildly by track, so the learner's experience is inconsistent: some domains are a deep dive, others are skeletal.

**Evidence.** 274 units across 29 tracks. **52 units are thin (<3 lessons), 28 are stubs (≤1 lesson)** — but the plan refines this: ~25 `00-start-here` orientation units and ~23 `NN-putting-it-together` capstones are short *by design* (capstones are P7's domain). The **substantive** thin units — ones that teach a real concept yet stop at ≤2 lessons — number ~20 and cluster in the pilot tracks: `node` 6 (`01,02,06,07,08,13`), `nest` 6, `aws` 4, `ci-cd` 3, `python` 1 + new. Against that, `networking` has 125 lessons, `algorithms` 128, `base-cs` 100. A learner who needs NestJS or AWS at senior depth hits a wall the networking learner never sees. (See the plan for the authoritative worklist.)

**Why it blocks senior.** Senior fullstack means depth across the stack, not a few deep islands. The thin tracks are exactly the applied/operational domains (Nest, AWS, CI/CD) a senior is expected to own.

**Severity:** High · **Effort:** Large (content authoring) · **Reuses:** existing `/infographic`+`/teach` pipeline, `docs/practice-campaign.md`, `docs/3-deep-track-prompts.md`, prior `project_track-deepening` playbook.
**Plan:** `2026-06-05-track-depth-evenness.md`

---

## P2 — No retention engine (spaced repetition)

**Statement.** Nothing schedules review of what the learner is about to forget. Lessons are read once.

**Evidence.** Progression layer has XP/ranks/streak/titles/ELO-rating and per-lesson `RetrievalDrawer` + a static `SpacedRevisitBanner`, but **no due-queue / scheduler**. No SM-2/Leitner state, no "what's due today" surface.

**Why it blocks senior.** A senior retrieves the right pattern instantly under pressure. 1500 deep lessons read once are ~90% forgotten within weeks. Retention is the difference between "a very good wiki" and "a tool that makes you senior."

**Severity:** High (top of the learning-science gap) · **Effort:** Medium · **Reuses:** `RetrievalDrawer` Q/A content, `practice` items as cards, `user-state.ts` + `progression/` for persistence.
**Plan:** `2026-06-05-spaced-repetition-engine.md`

---

## P3 — Judgment feedback is self-graded (you can't tell when you're wrong)

**Statement.** The practice that trains *judgment* has no objective feedback — the learner grades themselves against a reveal/rubric.

**Evidence.** 4114 practice tasks. By type: `diagnose` 1008, `predict` 927, `design` 672, `sandbox` 614, `fix` 495, `incident` 398. **~76% are self-assessed** (reveal/`self`/rubric); only `blanks` and `sandbox` give objective signal. The hardest senior skill — judgment on ambiguous tradeoffs — lives in `design`+`incident`+`diagnose` (~2078 tasks), all self-graded. A mid-level learner who is wrong often *cannot tell* (Dunning–Kruger). **A browser→Anthropic LLM grader already exists** (`site/src/english/byok/*`, `site/src/german/byok/grade.ts`: transient key, `postMessages`, `parseGrading`, system-prompt + `userBlock(task, text)` → `GradingResult`) but is wired only to the English/German *output* tasks — never to fullstack practice.

**Why it blocks senior.** Judgment improves only with feedback on judgment. Self-grading reinforces blind spots exactly where senior-ness is forged.

**Severity:** Highest *buildable-now* (engine exists) · **Effort:** Small–Medium · **Reuses:** the entire BYOK grading transport + parser; only a new system prompt + task→prompt mapping + an opt-in UI per `design`/`incident`/`diagnose` task.
**Plan:** `2026-06-05-llm-judgment-feedback.md`

---

## P4 — It's a library, not a program (no roadmap, no competency map)

**Statement.** 29 parallel tracks with no sequenced path to "senior" and no honest, ongoing diagnostic of the learner's weak domains.

**Evidence.** Routes: `english, german, glossary, learn, projects, account, profile, settings, terms`. `/profile` is gamified (ranks/XP). Rating is a **single global score** (`computeRating(s1,s2) → 0–1000`) from a **one-time pretest** — not a per-domain competency map. No "where am I / what's my weakest domain / what next" surface; no route that sequences tracks toward the "Become senior fullstack" goal in the original vision.

**Why it blocks senior.** Senior requires knowing your own gaps and closing them deliberately. A reference library leaves sequencing and self-assessment entirely to the learner.

**Severity:** High · **Effort:** Medium · **Reuses:** `progression/rating.ts`, `pretest-questions.ts`, `units.json`/`tracks.json` for the graph, `practice-state.ts` + lesson progress for evidence.
**Plan:** `2026-06-05-senior-roadmap-competency-map.md`

---

## P5 — Code review is never practiced (a senior muscle the site ignores)

**Statement.** The site teaches you to *write* code; it never has you *review* someone else's. Review appears only as prose advice inside reveals ("this would have been a code-review comment").

**Evidence.** No `review` task type in `site/src/content/practice/**`. Review is mentioned in passing in reveals (e.g. helm `--dry-run`, test "what bug would this catch?") but never as an exercise.

**Why it blocks senior.** Reviewing — spotting the bug, the missing test, the unstated tradeoff, the simpler design — is a defining senior activity and a distinct skill from authoring.

**Severity:** Medium-High (unique, untrained muscle) · **Effort:** Small–Medium · **Reuses:** practice schema + `PracticeSection`, the `diagnose`/`fix` patterns, optional LLM grader (P3) for open-ended review critique.
**Plan:** `2026-06-05-code-review-exercise-type.md`

---

## P6 — No live debugging / incident simulation

**Statement.** "Incident" practice is static prose; the learner never investigates a real failing artifact.

**Evidence.** 398 `incident` + 1008 `diagnose` tasks are text reveals. Live sandboxes exist (`JsSandbox.tsx`, `SqlSandbox.tsx`, `PracticeSection.tsx`) but aren't used to host "here is a broken thing + evidence, find the cause."

**Why it blocks senior.** Senior is forged in incidents — debugging unfamiliar failures under uncertainty. Reading a postmortem ≠ running the investigation.

**Severity:** Medium-High · **Effort:** Medium–Large · **Reuses:** existing sandboxes (`JsSandbox`/`SqlSandbox`), the new `run-code-samples` execution harness, `incident` content as scenario seeds.
**Plan:** `2026-06-05-live-debug-simulation.md`

---

## P7 — Capstones are static briefs, not a guided integrative path

**Statement.** Integration — where senior judgment forms — exists as ~20 project briefs, but not as a driven journey with checkpoints and feedback that weaves many lessons together.

**Evidence.** `site/src/content/projects/*.json` (~20: write-ahead-log, rate-limiter, oauth-mini, cache-stampede-lab, job-scheduler…) with fields `slug,title,pitch,tracks,category,difficulty,estDays,skills,deliverable,milestones,seniorStretch`. They already carry `milestones` + `seniorStretch` but render as static briefs (`/projects`); no staged progress, no checkpoint feedback, no link from the lessons that feed each project.

**Why it blocks senior.** Atomic exercises don't build system thinking; integration does (this lesson's caching interacts with that lesson's consistency). The raw material is there; the guided path is not.

**Severity:** Medium · **Effort:** Medium · **Reuses:** existing project content (already has `milestones`/`skills`/`tracks`), `practice-state.ts` for checkpoint progress, P3 grader for milestone review.
**Plan:** `2026-06-05-guided-capstone-path.md`

---

## Out of scope here (project-health, not learner-outcome)

- **Build scalability** — ~10-min single-threaded render of 4722 pages, linear in page count, historically near CF limits (mitigated by GH-Actions direct upload). Real, but it slows *iteration*, not the learner. Track separately; not given a senior-readiness plan.
- **Code-sample CI execution** — DONE 2026-06-04 (`ci_code-sample-execution`). Listed for completeness.

---

## Recommended sequencing

1. **P3 (LLM judgment feedback)** — highest leverage per unit effort; the grading engine already exists, and it directly attacks the mid→senior judgment gap on ~2078 existing tasks.
2. **P2 (spaced repetition)** — the retention foundation everything else compounds on.
3. **P4 (roadmap + competency map)** — turns the library into a program; also the home for P2's "due today" and P3's "weak-domain" signals.
4. **P5 (code-review type)** — small, unique muscle; composes with P3's grader.
5. **P7 (guided capstone path)** — integration; benefits from P3/P4.
6. **P6 (live debug simulation)** — highest build cost; do after the cheaper wins land.
7. **P1 (depth evenness)** — ongoing content campaign, runs in parallel with all of the above via the existing authoring pipeline.

Each plan is independently shippable. P3 → P2 → P4 is the recommended first arc.
