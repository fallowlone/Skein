# style-guide.md Accuracy Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `## Curriculum site component vocabulary` section of `/Users/artemmac/dev/awesome-everything/style-guide.md` — it describes a component set and authoring-rules schema that no longer exists (retired in the same 2026-05 migration and later "Atlas redesign" that a sibling plan already fixed in `CLAUDE.md`), while the rest of the file (the ByteByteGo visual-style rules for the legacy SVG infographics pipeline) is unrelated and confirmed still accurate for its own scope.

**Architecture:** Documentation-only edit to a single file, `style-guide.md`, touching only its final section (`## Curriculum site component vocabulary`, currently lines 156–209). No site code, schema, or command changes. Two tasks: rewrite the section against live-verified component/schema facts, then a consistency sweep + confirmation that the untouched ByteByteGo section (lines 1–154) is legitimately out of scope.

**Tech Stack:** Markdown. Correctness is checked by reading the live `site/src/components/` tree and `site/src/content.config.ts` schema directly — not by trusting any fact already gathered during this plan's discovery, since the site is actively developed and facts drift between plan-writing and execution time.

**Spec:** No separate spec doc. This plan is the third in a series fixing the same staleness pattern discovered across `curriculum.md` (fixed: `docs/superpowers/plans/2026-08-15-curriculum-md-fix.md`, commits `1f7bb7032`/`8b2fa1753`) and root `CLAUDE.md` (fixed: `docs/superpowers/plans/2026-08-15-root-claude-md-fix.md`, commits `5e7692323`..`8c3928c48`). Both are on `main`. This plan's discovery already confirmed several concrete facts (below) that ground the task boundaries; every fact actually WRITTEN into the file must still be re-verified live inside its task, per the established pattern in both prior plans.

**Facts already confirmed during discovery (starting point for Task 1, re-verify before writing):**
- Dead: `Chapter.astro` (layout — doesn't exist, `layouts/` is `Atlas.astro`/`Lesson.astro`/`Topic.astro`), `TierAccordion.tsx` (doesn't exist anywhere), `PillarGrid.astro` (doesn't exist), `ChapterSidebar.astro` + `ChapterSidebarTOC.tsx` (don't exist — `nav/` is now `GlobalSearch.astro`/`KeyboardShortcuts.astro`/`PersonaLegend.astro`).
- Fabricated: the Authoring rules' claim that lessons declare `depth: { mechanism, tradeoff, failure_mode, numbers }` in frontmatter — the real `lessons` collection schema (`site/src/content.config.ts:35-61`) has no `depth` field at all; real fields are `slug, lang, track, unit, order, title, summary, estMin, status, lessonType, level, deepensInto, spiral, prereqs, mathPrereqs, concepts, sources`.
- Wrong number: the Authoring rules' "Hydration cap = 5 islands per piece page" — the live linter rule (`site/src/lint/rules/hydration-budget.ts`) enforces `BUDGET = 8` for lesson pages today (its own top-of-file comment notes it was rewritten from a retired 4-segment pieces-model path match to the live `dist/<lang>/learn/<track>/<unit>/<lesson>/index.html` 6-segment lesson route).
- Miscategorized, not dead: `PrereqBadge.tsx` is listed under "Layout primitives (panels and cards)" but actually lives in `src/components/pedagogy/`, not `src/components/layout/`.
- Still accurate, do NOT rewrite: the persona cast list (Bea/Rex/Rita/Sven/Cara/Otto/Patty) matches `site/src/content/personas.json` exactly. The `SpiralCue.astro` four threads (encapsulation, multiplexing, statefulness, latency) match `site/src/components/prose/SpiralCue.astro`'s `Thread` type exactly.
- New directories not represented in the old vocabulary at all: `src/components/atlas/` (Altimeter, HomeResume, LessonRow, Meridian, ResumeCTA, Summit, TopNav, TopicHeader, UnitMarker, World, next-track.ts, track-band.ts) and `src/components/lesson/` (AltitudeGauge, ApplyThis, Check, Code, Complexity, ConnectedLessons, Explanation, Goal, Hook, Idea, Inset, LessonPlate, LessonQuestion, NextLessonCard, PrereqLinks, Recap, RightRail, Step, Topbar, Trace, WorkedExample) — both post-date the old vocabulary and are structurally significant (Lesson.astro imports heavily from `lesson/`; the homepage imports heavily from `atlas/`).
- `brand/` grew: now `LangSwitch.astro, SeoHead.astro, SiteFooter.astro, SourcesFooter.astro, StreakBadge.tsx, ThemeBoot.astro, ThemeToggle.astro, TitleBar.astro, Toast.astro` (old vocab only listed `TitleBar.astro`, `LangSwitch.astro`, `SourcesFooter.astro`).
- `diagram/` grew: old vocab listed `Connector, Node, Pulse, Reveal, PacketDot, CountUp, TypingText`; live dir also has `DiagramFrame.astro, EditorialDiagram.astro, FlowDiagram.astro, Infographic.astro, SequenceDiagram.astro, StackDiagram.astro, flow-layout.ts`.
- `pedagogy/` grew far beyond the old vocab's 12 named widgets — live dir also has `Quiz.astro, DragOrder.astro, JsSandbox.tsx, SqlSandbox.tsx, GradeWithAi.tsx, ProjectBrief.astro, MetaphorComplete.astro, NumberDrill.astro, DesignPrompt.astro, AnimationStep.astro, DebugLog.astro, CodeDrawer.tsx, PracticeSection.tsx, ReviewSession.tsx, parametric-registry.ts` (some of these may not have existed when this list was compiled — re-verify count and names live, don't assume this list is exhaustive or current either).
- Out of scope, confirmed unrelated: the ByteByteGo visual-style rules (lines 1–154, canvas/palette/iconography/typography/composition-pattern rules for the *legacy SVG infographics pipeline*) — root `CLAUDE.md`'s Directory layout (already fixed) correctly labels `infographics/`, `assets/exports/`, `drafts/`, `figma/` as "Old SVG+PNG infographics workflow (kept for historical reference)." This section documents that legacy pipeline's visual rules, not the live lesson component set, and is a different concern entirely — do not touch it, do not "modernize" it.

## Global Constraints

- Do not touch `site/` code, `tracks.json`, `units.json`, `content.config.ts`, or any content file — this is a docs-only fix to `style-guide.md`.
- Do not touch lines 1–154 (everything from the top of the file through the `---` divider before `## Curriculum site component vocabulary`) — confirmed unrelated legacy-pipeline content, out of scope.
- Do not re-add any reference to `Chapter.astro`, `TierAccordion.tsx`, `PillarGrid.astro`, `ChapterSidebar.astro`, `ChapterSidebarTOC.tsx`, or "piece"/"chapter" as a content unit (the word "piece" specifically as a synonym for what's now a "lesson"; general English usage like "a piece of the puzzle" would be fine but is not expected to occur here).
- Every component name, file path, schema field, and numeric limit (hydration cap, text budgets) written into the rewritten section must be re-verified against the live filesystem/`content.config.ts`/lint-rule source in the same task, not copied from this plan's "Facts already confirmed" list without re-checking — that list is a starting point from discovery, not a value to blindly transcribe, exactly as both sibling plans required for their own discovery facts.
- Keep the section's existing subsection structure where it still makes sense (Layout / Brand / Prose primitives / Layout primitives / Diagram primitives / Pedagogy widgets / Navigation / Authoring rules) but rename or merge subsections if the live component set no longer fits that taxonomy (e.g. `PrereqBadge.tsx` needs to move out of "Layout primitives" since it doesn't live in `layout/`; "Navigation" needs new content since its two named components are both dead).

---

### Task 1: Rewrite the "Curriculum site component vocabulary" section

**Files:**
- Modify: `style-guide.md` — the block from `## Curriculum site component vocabulary` (currently line 156) through the end of the file (currently line 209, "Cross-link prereqs at the top, 'next piece' at the bottom.").
- Reference (read-only): `site/src/components/` (all subdirectories), `site/src/content.config.ts` (lessons schema, lines ~35–61), `site/src/lint/rules/hydration-budget.ts`, `site/src/lint/rules/text-budgets.ts`, `site/src/content/personas.json`, `site/src/components/prose/SpiralCue.astro`, `site/src/i18n/glossary.json` (existence check only).

**Interfaces:**
- Consumes: nothing from another task in this plan.
- Produces: an accurate component-vocabulary section that Task 2's sweep will grep for any remaining dead terms.

- [ ] **Step 1: Re-derive the live component tree — do not trust the "Facts already confirmed" list without checking**

Run, and read every line of output:
```bash
cd /Users/artemmac/dev/awesome-everything/site
for d in layout layouts brand prose layout diagram pedagogy nav atlas lesson; do
  echo "=== components/$d ==="; ls "src/components/$d" 2>/dev/null
done
echo "=== layouts/ (top-level, not components/layout) ==="
ls src/layouts/
```
(Note: `src/layouts/` — the page-chrome layouts like `Topic.astro`/`Lesson.astro`/`Atlas.astro` — is a different directory from `src/components/layout/` — the panel/card primitives like `Card.astro`/`Stage.astro`. The old vocabulary's "Layout" subsection describes the former; "Layout primitives" describes the latter. Keep this distinction in the rewrite.)

- [ ] **Step 2: Re-derive the live lesson frontmatter schema**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
sed -n '/^const lessons = defineCollection/,/^});/p' src/content.config.ts
```
Use the real field list from this output for the rewritten Authoring rules — do not carry forward the old `depth: { mechanism, tradeoff, failure_mode, numbers }` claim unless this command's output actually shows it (it did not during discovery).

- [ ] **Step 3: Re-derive the live hydration cap and text-budget numbers**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
grep -n "BUDGET" src/lint/rules/hydration-budget.ts
cat src/lint/rules/text-budgets.ts
```
Use these live numbers, not the old vocabulary's "5" (hydration) or whatever the old text-budget numbers claim if they've drifted. Cross-check against `curriculum.md`'s `## Depth bar` / the already-fixed `CLAUDE.md`'s `## Primary command` section for consistency — if this file's live-derived number disagrees with what those two already-fixed files say, that's worth a `DONE_WITH_CONCERNS` note (a cross-file discrepancy this task can't resolve alone), not a silent pick-one-and-go.

- [ ] **Step 4: Re-verify the two "still accurate" facts before keeping them**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
cat src/content/personas.json
cat src/components/prose/SpiralCue.astro
```
Confirm the persona cast list and the four spiral-thread names still match what's currently in `style-guide.md` (Bea/Rex/Rita/Sven/Cara/Otto/Patty; encapsulation/multiplexing/statefulness/latency) before leaving those two facts unchanged in the rewrite — if either has drifted since discovery, update accordingly.

- [ ] **Step 5: Write the replacement section**

Using `Edit`, replace everything from `## Curriculum site component vocabulary` through the end of the file with a rewritten section that:
- **Layout** subsection: describes `site/src/layouts/` (Atlas.astro, Lesson.astro, Topic.astro per Step 1's live output — with a one-line real role for each, not "outer page chrome" boilerplate copied from the old Topic-only description; check each file's own top-of-file imports/comments the way the sibling `CLAUDE.md` plan's Task 2 did if the role isn't obvious from the name).
- **Brand** subsection: `site/src/components/brand/` per Step 1's live listing (expect the file list to have grown — describe each with the same one-line style as the old entries).
- **Prose primitives**: `site/src/components/prose/` per Step 1 (Crux, Callout, KeyTakeaway, Sidenote, Term, SpiralCue — confirm all still there; keep SpiralCue's thread list per Step 4 if unchanged).
- **Layout primitives**: `site/src/components/layout/` per Step 1 — remove `PrereqBadge.tsx` from this subsection (it doesn't live here) and note where it actually belongs instead (fold into Pedagogy widgets, per Step 1's finding).
- **Diagram primitives**: `site/src/components/diagram/` per Step 1 — the vanilla-TS/no-Preact framing may still be accurate (verify by checking a couple of the newer files like `EditorialDiagram.astro`/`FlowDiagram.astro` don't import Preact) or may need updating if any newer diagram component does use Preact.
- **Pedagogy widgets**: `site/src/components/pedagogy/` per Step 1 — this list has grown substantially; don't attempt to describe all ~25+ widgets in full prose detail (match the old section's brevity level, one line each, similar density to what's there now) but do NOT invent descriptions for widgets you haven't looked at — a one-line factual description (e.g. "`Quiz.astro` — multiple-choice exercise widget") beats a padded one. Include `PrereqBadge.tsx` here per Step 1/5's finding.
- **Navigation** subsection: replace the two dead component references entirely with `site/src/components/nav/` per Step 1's live listing (`GlobalSearch.astro`, `KeyboardShortcuts.astro`, `PersonaLegend.astro` — verify names/roles) plus `site/src/components/atlas/` (the new homepage/track-chrome components — per Step 1's listing, one line each covering the load-bearing ones like `TopNav.astro`, `HomeResume.astro`; you don't need to describe all 10 files individually if several are clearly minor sub-pieces of the same feature — use judgment matching the old section's density) and `site/src/components/lesson/` (the lesson-article components — per Step 1's listing, similar treatment).
- **Authoring rules**: rewrite all 6 numbered rules against live facts:
  1. Replace the fabricated `depth: {...}` frontmatter claim with the real schema fields from Step 2 relevant to authoring (e.g. `sources` requirement, `level`, `concepts`).
  2. Fix the hydration cap number from Step 3, and fix "piece page" → "lesson page"; fix the stale baseline-widget names in the parenthetical (the old text says "3 in-content + 2 baseline (`SpacedRevisitBanner` + `ChapterSidebarTOC`)" — `ChapterSidebarTOC` doesn't exist; find its live replacement, if any, or drop the specific baseline breakdown if it's no longer a fixed pair).
  3. "EN and RU pieces share the same slug" → "EN and RU lessons share the same slug."
  4. Glossary rule — verify `site/src/i18n/glossary.json` still exists and is still the described mechanism (likely unchanged, but confirm).
  5. Fix the text-budget numbers per Step 3 if they've drifted from Crux ≤140/KeyTakeaway ≤220/Misconception ≤320/Card annot ≤240.
  6. "Cross-link prereqs at the top, 'next piece' at the bottom" → reword using the real `prereqs`/`deepensInto` schema fields from Step 2 and "next lesson" instead of "next piece" (check `NextLessonCard.astro`'s existence in `lesson/` from Step 1 as the live mechanism this rule describes).

- [ ] **Step 6: Verify no dead terms remain in the rewritten section**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
sed -n '/## Curriculum site component vocabulary/,$p' style-guide.md | grep -n "Chapter\.astro\|TierAccordion\|PillarGrid\.astro\|ChapterSidebar\|\bpiece\b\|\bpieces\b"
```
Expected: no hits (watch for "piece" as a standalone word — "pieces" as a synonym for lessons is exactly the defect class; unrelated English usage is not expected to occur in this technical section, so any hit should be treated as real).

- [ ] **Step 7: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add style-guide.md
git commit -m "docs(style-guide): rewrite component vocabulary section for the live track/unit/lesson component set"
```

---

### Task 2: Consistency sweep — confirm scope boundary and no residual staleness

**Files:**
- Modify: `style-guide.md` only if Step 1 finds something Task 1 missed.
- Reference (read-only): the fully-edited `style-guide.md` from Task 1.

**Interfaces:**
- Consumes: the fully-edited `style-guide.md` from Task 1.
- Produces: nothing new — this is the final gate for this plan (a small plan; no separate final-whole-branch-review task is warranted beyond this sweep, given the scope is one file/one section, but if Task 1 required a fix-loop round, treat this task's own review as the equivalent of the final check).

- [ ] **Step 1: Full-file dead-term sweep**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -n "Chapter\.astro\|TierAccordion\|PillarGrid\.astro\|ChapterSidebar\|content/book/\|content/pillars/\|content/chapters\.json\|\bpiece\b\|\bpieces\b" style-guide.md
```
Expected: no hits anywhere in the file (not just the section Task 1 rewrote — this catches a miss if the dead terms somehow appeared elsewhere too, though discovery found them confined to the vocabulary section).

- [ ] **Step 2: Confirm the ByteByteGo section (lines 1–154) is genuinely untouched**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
git diff main -- style-guide.md | grep -E '^@@'
```
(Or, if this plan's commits are the only ones on `main` since Task 1 started, use `git diff <Task-1-BASE-SHA> HEAD -- style-guide.md | grep -E '^@@'`.) Confirm every hunk's line range falls at or after line 156 in the pre-Task-1 file — i.e., nothing in the ByteByteGo canvas/palette/iconography/typography/composition sections was touched.

- [ ] **Step 3: Cross-check against the two already-fixed sibling files for consistency**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -n "hydration" CLAUDE.md curriculum.md style-guide.md
```
Read the three results side by side. If `style-guide.md`'s newly-written hydration cap number disagrees with what `CLAUDE.md`'s already-fixed `## Primary command` section states (that section says the cap per `.claude/commands/infographic.md`, which may differ from the live lint rule's `BUDGET` constant — Task 1 Step 3 flagged this as a possible cross-file discrepancy), do not silently resolve it by editing `CLAUDE.md` or `curriculum.md` (out of scope for this plan) — report it clearly in this task's report as a finding for the human to decide on: the live linter is ground truth for what's enforced, but the command's stated policy cap could be intentionally more conservative, or could itself be stale. State which files disagree and by what specific numbers.

- [ ] **Step 4: Full read-through**

Read the complete final `style-guide.md` once, start to finish. Confirm: the ByteByteGo section and the component-vocabulary section, while covering unrelated topics, don't contradict each other (they shouldn't reference the same facts at all, but confirm neither leaks stale terminology into the other), and the file overall reads as two coherent, clearly-separated reference documents under one file.

- [ ] **Step 5: Commit (only if Step 1 found something to fix)**

```bash
cd /Users/artemmac/dev/awesome-everything
git add style-guide.md
git commit -m "docs(style-guide): consistency sweep — remaining dead-component references"
```

If Step 1 found nothing, skip this commit — Task 1's commit already covers the work.

---

## Self-Review Notes

- **Spec coverage:** every stale item found during discovery (dead `Chapter.astro`/`TierAccordion.tsx`/`PillarGrid.astro`/`ChapterSidebar.astro`+`ChapterSidebarTOC.tsx`, the fabricated `depth` frontmatter field, the wrong hydration-cap number, the `PrereqBadge.tsx` miscategorization, the missing `atlas/`/`lesson/` component categories, the grown `brand/`/`diagram/`/`pedagogy/` directories) has an assigned fix inside Task 1's Step 5. The two facts confirmed still-accurate (persona cast, spiral threads) are explicitly protected from unnecessary rewriting. The ByteByteGo section is explicitly out of scope with a stated reason (unrelated legacy-pipeline concern, already correctly labeled legacy elsewhere).
- **Placeholder scan:** every Task 1 step gives an exact command and instructs writing from that command's live output — consistent with both sibling plans' established pattern, for the same reason (a second generation of hand-written, soon-to-be-stale facts would recreate this exact defect one edit later). Step 3's instruction to report a cross-file discrepancy rather than silently resolving it is deliberate, not a gap — this plan's scope is one file, and a discrepancy against an already-shipped sibling file is a finding for a human, not something this plan should decide unilaterally.
- **Type/name consistency:** "track/unit/lesson" terminology used throughout, matching both already-fixed sibling files' vocabulary exactly.
