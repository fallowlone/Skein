# Project State Brief — 2026-06-01

A snapshot of where the curriculum site actually is, written from repo numbers
(not memory), with a recommendation on where to spend the next effort.

---

## 1. What the project is now

The site has **pivoted away from the original 16-pillar "pieces" model**. The
`book/` content tree is **empty (0 files)** — the tiered fullstack "piece" format
(`/infographic`) is effectively legacy. All real content now lives in the **19-track
linear "lessons" model** (`/teach`, `/learn/<track>`).

> ⚠️ `CLAUDE.md` and several memories still describe the pillar/piece model and
> "4/16 pillars ready". That is **stale** — the actual product is the 19 tracks
> below. CLAUDE.md should be updated to match.

### Corpus (verified)

- **19 tracks**, ~130 units.
- **1,279 EN lessons / 1,278 RU lessons** — near-perfect i18n parity.
- **3,976 built pages**, build clean (0 errors).

Tracks: ai-llm (41), algorithms (128), apis (46), backend (81), base-cs (100),
browser (83), caching (46), data-engineering (41), databases (79), deployment (33),
distributed (46), engineering-practice (57), frontend (46), math (63),
networking (125), observability (87), performance (85), queues (46), security (46).

The fullstack domain is fully represented — the "pillars" survived as tracks, just
delivered in the linear lesson format instead of the tiered piece format.

---

## 2. Stage

**Content breadth: essentially done.** 1,279 lessons covering the full role map,
bilingual, building clean. This is no longer a "write more lessons" project — the
skeleton of the whole curriculum exists.

**Depth/reinforcement layers: partially built, uneven.** This is where the gaps are.

Shipped and solid:
- English-for-Engineers layer — complete (vocab A2–B2 ~3.7k, reading, grammar,
  output/BYOK, speaking, and now FSRS review + pronunciation).
- Assessment: ~166 units carry both a quiz and a project.
- Algorithms drill: 214 drill occurrences (LeetCode ladders).
- Atlas redesign: shipped to production.
- Player progression + GitHub auth: built (on branches / partially live).

---

## 3. The two real gaps (with numbers)

### Gap A — Practice files: ~1,271 / 1,279 lessons missing one

Every ready lesson has the skeleton's **inline** Practice step (≥4 problems, lint-
enforced). But the **dedicated expanded practice-file** artifact (the `/practice`
output) is **absent on 1,271 of 1,279 lessons** — that is the entire 1,271-warning
lint backlog (`practice-count: ready lesson "X" has no practice file`).

So: learners get a handful of inline problems per lesson, but the deeper practice
set that turns reading into retention is missing almost everywhere.

### Gap B — Visuals: ~63% of lessons have no declared visual

- **470 / 1,279 (37%)** lessons carry a `data-lesson-visual` marker.
- **~122 (10%)** actually import a diagram-kit component (FlowDiagram,
  SequenceDiagram, StackDiagram, StructureFigure, MachineFigure, ComplexityChart…).
- Coverage is lopsided: **base-cs ~41%**, almost everything else **<2%**.

> The earlier "97% already visualized" note was a per-pilot-batch figure, not the
> global picture. Globally, visuals are a real gap on ~60% of lessons.

The diagram **infrastructure is done** (B1 kit + B2 author/verify pipeline). What's
missing is **rollout** — running the pipeline across the ~800 lessons that have no
visual. The kit and the bot loop already exist, so this is throughput, not design.

---

## 4. Recommendation: deepen existing, don't add new lessons

**Do not author new lessons right now.** Breadth is sufficient; adding more lessons
widens the practice/visual debt instead of paying it down.

Spend the next effort, in priority order:

1. **Practice layer rollout (highest leverage).** Author practice-file sets for the
   1,271 lessons that lack one, via the existing `/practice` skill + subagent fan-out.
   This is the single biggest lever on actual learning outcomes and it zeroes the
   lint backlog. Batch by track, EN+RU, verify each batch with a build.

2. **Diagram rollout (B3).** Run the existing author→verify diagram pipeline across
   the ~800 visual-less lessons, flagging the genuinely text-only ones rather than
   forcing art. Target a meaningful lift (e.g. 37% → 70%) on conceptual tracks first
   (networking, databases, distributed, algorithms) where a diagram earns its place.

3. **Polish what shipped.** English review/pronunciation (just landed), speaking
   module weights, player-progression + github-auth final wiring.

4. **Housekeeping.** Update `CLAUDE.md` (pillars→tracks), prune stale memories, port
   the 1 missing RU lesson (`algorithms/12-toolbox/01-bit-manipulation`).

### Suggested sequencing

Run **practice and diagrams as two parallel subagent campaigns** — they touch
different artifacts (a sibling `practice/` file vs. an inline `<Diagram>` in the
lesson MDX), so they don't contend. Practice first if forced to choose: it's the
larger gap (1,271 vs ~800) and the more direct retention lever.

---

## 5. One-line answer to "new lessons or improve existing?"

**Improve existing.** The lessons exist; the practice and visuals that make them
*stick* do not. Pay down practice (1,271 lessons) and visuals (~800 lessons) before
writing a single new lesson.
