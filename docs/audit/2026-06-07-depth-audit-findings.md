# Depth-audit findings — verdict (2026-06-07)

Supersedes the pessimistic premises of `2026-06-07-project-weaknesses.md`. That doc was
built from start-of-session estimates; this one is the conclusion of the **full LLM depth
audit** (every one of the 1686 EN lessons graded on a 6-dimension senior rubric by Claude
cowork, one agent per unit, calibrated to two anchors and spot-checked faithful). Tool +
data: `site/scripts/depth-audit/`, `depth-scores.json`, `grades.json` (local).

## Headline
**The curriculum is already comprehensive and senior-grade.** The large "Senior+ backfill"
the campaign was scoped around is not needed — its driving premises do not survive
measurement.

## Premise vs. measurement
| Original premise | What the full audit shows |
|---|---|
| ~47% of units are stubs | **0 stubs** — all 276 units authored, all 1686 lessons `status:ready` |
| Uneven depth; weak spine (frontend/security/apis) | **0 weak teaching units.** Per-track *teaching-lesson* mean overall = 3.61–4.86 across every spine track. frontend 4.14, security 4.01, apis 4.22 — the earlier "2.9" figures were an artifact of auxiliary entries dragging unit means |
| Practice ~57%, thin, needs sourcing | **100% of teaching lessons have practice, all high quality (practiceCoverage 4–5).** The 2026-06-02 practice campaign closed it. The "57%" counted auxiliary entries (quiz/project/drill) as lessons-without-practice |
| Missing core tracks: testing / debugging / microservices / concurrency | **All covered**, distributed across tracks (see below), not as standalone tracks |

## The auxiliary-entry artifact (why the original audit was wrong)
Each unit contains teaching lessons **plus** auxiliary entries: `00-start-here/01-overview`
(navigation), `quiz-choice/quiz-code/quiz-short`, `project`, and `drill` (algorithms).
These legitimately score low — an overview is brief by design; a quiz/drill is an exercise,
not exposition, so it scores 0 on practiceCoverage and low on realNumbers/failureMode.
Averaged into unit-level means, they pulled units down 1–1.5 points and produced the false
"weak spine" signal. Measured on teaching lessons only, the content is uniformly deep.

## Coverage of the "missing" topics
- **Testing:** engineering-practice/01-tdd-property, /02-contract-testing; ci-cd/02-testing-in-ci, /03-delivery; node/06-testing; nest/06-testing. (22 `*test*` lesson dirs.)
- **Debugging:** observability/07-profiling; performance/01-profile-first, /02-hot-paths. Diagnostic discipline covered; a dedicated debugger-usage (gdb/breakpoints/stepping) treatment is light.
- **Microservices:** distributed/06-sagas; queues/08 (event-driven service mesh); nest/08-microservices-and-graphql; performance/05-n+1.
- **Concurrency:** base-cs/12-time-and-concurrency; browser/01-event-loop, /04-workers; backend/03-async-blocking, /04-pooling, /06-circuit-breakers; caching/07-dogpile; sql-postgres/07-transactions-concurrency. (Practical concurrency covered; lock-free / memory-ordering theory is absent — niche.)

## Foundations
math (1.85), base-cs (2.42), algorithms (3.01) score low **by design** — they are the
beginner `/learn` tracks, not the senior fullstack spine. They are excluded from the senior
bar. Within every unit, junior-tier lessons intentionally score 2–3 (the bottom rung of the
junior→senior progression); that is the tiered pedagogy, not a weakness.

## Genuine remaining value-adds (all optional, additive — not fixes)
1. **Integrated capstone** (spec §F): one cross-stack path idea→design→code→test→deploy→
   observe→incident→postmortem. The clearest net-new value.
2. **Niche depth:** a unified concurrency-theory deep-dive (threads/processes, memory
   ordering, lock-free) and a dedicated debugger-usage lesson — the only genuinely thin
   spots, both advanced/optional.
3. **typescript** (teaching-mean 3.61, lowest spine track) — a marginal nudge if desired.
4. **start-here overviews** — thin by design (navigation); optional light enrichment.

## Caveat
This is one calibrated LLM grader's judgment (anchors landed exactly; spot-checks cited
real lesson content, so it is trustworthy — but not ground truth). A human spot-read of a
few top-scored units would confirm. The grader differentiated honestly (junior intros 2–3,
auxiliary 0–2, senior ops lessons 5), which is the signal that the high teaching-lesson
scores are real.

## Recommendation
Do **not** run the large backfill (Steps C–G as originally scoped). Pivot to: confirm with
a human spot-read if desired, then pick from the optional value-adds (capstone first). The
campaign's measurement phase succeeded — it proved the content is already where the user
wanted it.
