# Skein visual style guide

The live site uses an editorial technical style. `site/src/styles/tokens.css` is the source of truth for colors. The former ByteByteGo pastel poster palette is retired for new site and lesson work.

## Palette

- Light: white page and cards, neutral gray secondary surfaces, near-black text and primary controls.
- Dark: near-black page, charcoal surfaces, near-white text and primary controls.
- Use domain colors as small labels, strokes, or precise diagram accents. Do not fill whole panels with pastel color or make blue the brand base.
- Semantic success, warning, and danger colors keep their meaning; pair them with text or shape so color is never the only signal.
- Use `--on-accent` for text on `--accent`/`--accent-bright` in both themes. Keep readable contrast for muted labels and controls.

## Lessons and diagrams

- Keep article prose readable and narrow; give the key mechanism diagram room to breathe. Use hierarchy, rules, captions, and whitespace instead of repeated decorated cards.
- Build mechanism-specific figures with thin strokes, anchored callouts, source/state labels, and an explicit causal path. A light grid or layered view is useful only when it clarifies the mechanism.
- Avoid generic flow boxes and summary posters when the lesson needs a concrete structure or state transition. A table is fine when it explains the comparison better.
- Design EN and RU together. Check both at desktop and mobile widths, in light and dark themes. Keep accessible text equivalents.
- The user's reference and detailed figure guidance live in [JS engine visual reference](docs/design/js-engine-visual-reference.md). Existing figure patterns live in `site/src/components/schematic/`.

## Curriculum site component vocabulary

The live content model is track → unit → lesson (the older three-tier pillar
model is retired; `site/src/content/book/` is empty). Components live under
`site/src/components/`; page-chrome layouts live one level up, under
`site/src/layouts/`. Each component has one responsibility.

### Layout (`site/src/layouts/`)
- `Atlas.astro` — homepage/track-hub chrome: inlines critical CSS (tokens +
  chrome) so first paint needs no stylesheet round-trip, then loads the full
  sheet async; wraps `TopNav`. Used by home, `/projects`, `/assess`, and the
  track index/lab pages.
- `Topic.astro` — general app-page chrome (global CSS, `TopNav`, `SiteFooter`,
  `SourcesFooter`, `ThemeBoot`, `Toast`, `KeyboardShortcuts`,
  `SpacedRevisitBanner`, SEO head). Used by most utility/account pages
  (settings, profile, roadmap, review, calibrate, English hub, etc.).
- `Lesson.astro` — wraps `Topic`; adds the lesson-specific chrome (`Topbar`,
  `AltitudeGauge`, `LessonPlate`, `RightRail`, `ConnectedLessons`,
  `NextLessonCard`) around the lesson article route.

### Brand (`site/src/components/brand/`)
- `TitleBar.astro` — sticky header with logo wedge, headline, named `aside` slot.
- `LangSwitch.astro` — toggle between EN and RU; resolves the twin URL via `swapLocale()`.
- `SourcesFooter.astro` — footer listing external sources for a ready lesson.
- `SiteFooter.astro` — global site footer.
- `SeoHead.astro` — shared `<head>` block (title, description, canonical, Open Graph, Twitter card, en/ru hreflang); used by both `Topic` and `Atlas`.
- `StreakBadge.tsx` — ambient daily-habit indicator, reads `userState`.
- `ThemeBoot.astro` — sets theme/density attributes before first paint (reads `awesome.theme` / `awesome.density` from `localStorage`) to avoid a flash.
- `ThemeToggle.astro` — light/dark toggle.
- `Toast.astro` — global toast container, mounted once in `Topic.astro`; triggered via a `toast` `CustomEvent`.

### Prose primitives (`site/src/components/prose/`)
- `Crux.astro` — ≤180-char opening question, neutral panel with a domain accent.
- `Callout.astro`, `KeyTakeaway.astro`, `Sidenote.astro`, `Term.astro` — inline emphasis primitives.
- `SpiralCue.astro` — chip linking to a thread page; threads: encapsulation, multiplexing, statefulness, latency.

### Layout primitives (`site/src/components/layout/`)
- `Stage.astro`, `Pill.astro`, `StepBadge.astro` — stage panel, small labels, and numbered steps.
- `Card.astro` — generic bordered card; variants default/yellow/highlight.
- `Misconception.astro` — red-bordered alert card; body ≤320 chars.
- `NumbersCard.astro` — table of label/value pairs.

(`PrereqBadge.tsx` lives in `pedagogy/`, not here — see Pedagogy widgets.)

### Diagram primitives (`site/src/components/diagram/`, vanilla TS/no Preact)
- `Connector.astro`, `Node.astro`, `Pulse.astro`, `Reveal.astro`, `PacketDot.astro`, `CountUp.astro`, `TypingText.astro` — small visual primitives.
- `DiagramFrame.astro`, `SequenceDiagram.astro`, `StackDiagram.astro`, `FlowDiagram.astro`, `EditorialDiagram.astro`, `Infographic.astro` — structural diagram shells; `flow-layout.ts` is the shared layout-computation logic behind `FlowDiagram`.
- None of the `.astro`/`.ts` diagram components import Preact — the only Preact import in this directory is in `editorial-diagram.test.tsx` (a test using `preact-render-to-string` to render for assertions), so the "no client-side framework" framing still holds for the shipped components.

### Pedagogy widgets (`site/src/components/pedagogy/`, Preact islands unless noted)
- `Pretest.tsx` — diagnostic that sets the learner's initial rank/tier.
- `FadedExample.tsx` — worked-example stepper (Renkl/Shin fading).
- `RetrievalDrawer.tsx` — open-recall textareas with reveal-answer buttons.
- `ReactiveDiagram.tsx` — slider→compute→render shell (Distill-style).
- `Sequencer.tsx` — play/pause/step timeline with `data-active-step` for sibling SVG actors.
- `Sandbox.tsx` — chrome for a parametric interactive exercise; `sandboxes/` holds the concrete implementations (`RequestBudgetSandbox.tsx`, `DBLeverSandbox.tsx`), named in `parametric-registry.ts` and referenced by a practice task's `parametric.component` field.
- `PersonaTag.astro` — Bea/Rex/Rita/Sven/Cara/Otto/Patty cast tag.
- `ProgressMeter.tsx` — ring + bar progress variants; reads `userState.history`.
- `SpacedRevisitBanner.tsx` — sticky strip surfacing lessons due for retrieval.
- `SettingsDrawer.tsx` — tier/motion/reset/retake controls.
- `PrereqBadge.tsx` — green/amber pill showing N/M prerequisites complete.
- `Quiz.astro`, `RFCQuiz.astro` — multiple-choice exercise widgets (the latter RFC-citation flavored).
- `DesignPrompt.astro`, `DebugLog.astro`, `DragOrder.astro`, `MetaphorComplete.astro`, `NumberDrill.astro`, `TraceScenario.astro`, `TradeoffMatrix.astro`, `AnimationStep.astro`, `ProjectBrief.astro` — additional Astro-shell practice-task widget types (open-response design prompt, incident/debug log, ordering drill, fill-in-the-metaphor, numeric drill, step-trace scenario, tradeoff comparison table, animation step marker, project brief).
- `PracticeSection.tsx` — the practice-task renderer/grader that lazily mounts the right widget per task type and runs self-grading (`checkBlank`, exec checks).
- `CodeDrawer.tsx` / `JsSandbox.tsx` / `SqlSandbox.tsx` — docked code-editor workspace (CodeMirror 6, lazy-loaded on open) for JS and SQL practice tasks.
- `GradeWithAi.tsx` — opt-in "Grade with AI (BYOK)" control for design/incident/self-diagnose tasks.
- `ReviewSession.tsx` — the spaced-repetition "due today" review island (SM-2 grading: again/hard/good/easy).

### Navigation
- `site/src/components/nav/`: `GlobalSearch.astro` (lazy-loads `/search-index.json` on first open), `KeyboardShortcuts.astro` (shortcut cheat-sheet overlay), `PersonaLegend.astro` (persona-cast legend, reads `personas.json`).
- `site/src/components/atlas/`: `TopNav.astro` (sticky top bar — search, theme toggle, streak badge, account menu, lang switch), `World.astro` (parallax/orbit backdrop layer), `TopicHeader.astro` (track header), `UnitMarker.astro` / `LessonRow.astro` (unit and lesson rows on the track map), `HomeResume.astro` / `ResumeCTA.astro` (resume-where-you-left-off chrome), `Altimeter.astro` / `Summit.astro` / `Meridian.astro` (progress/milestone/decorative-divider visuals).
- `site/src/components/lesson/`: the linear lesson skeleton — `Hook.astro`, `Goal.astro`, `Explanation.astro`, `WorkedExample.astro`, `Trace.astro`, `Code.astro`, `Complexity.astro`, `ApplyThis.astro`, `Check.astro`, `Recap.astro`, `Step.astro`, `Inset.astro` (collapsible why/practice/mistake/edgecase block) — plus chrome (`Topbar.astro`, `AltitudeGauge.astro`, `LessonPlate.astro`, `RightRail.astro`), cross-linking (`PrereqLinks.astro` renders "Before this lesson" from `prereqs`/`mathPrereqs`; `NextLessonCard.astro` renders the next/prior lesson from unit order; `ConnectedLessons.astro` surfaces `deepensInto`/`appearsAgainIn` spiral connections), and `LessonQuestion.tsx` (reader question submission island).

### Authoring rules
1. Frontmatter (`site/src/content.config.ts`, `lessons` collection) has no `depth` field. Relevant fields for authoring: `sources` (array of URLs, `min(1)` — required), `level` (`zero`/`junior`/`middle`/`senior`, optional), `lessonType` (`concept`/`coding`/`topic`, optional), `concepts`, `prereqs`, `mathPrereqs`, `deepensInto`, `spiral` (all string arrays, default `[]`).
2. Hydration cap = 5 `<astro-island>` elements per lesson page **excluding** the `PracticeSection` orchestrator (linter-enforced in `site/src/lint/rules/lessons.ts`); `PracticeSection` itself is capped separately at 1 per page (`site/src/lint/rules/practice.ts`). A looser raw ceiling of 8 total `<astro-island>` tags also applies (`site/src/lint/rules/hydration-budget.ts`) but rarely binds once the two caps above are respected. Hub/nav pages (home, track overview, projects) are exempt from the raw ceiling since they legitimately render one island per listed item.
3. EN and RU lessons share the same `slug`; bilingual or refuse.
4. RU bodies use canonical translations from `site/src/i18n/glossary.json`. Extend the glossary alphabetically when new terms appear.
5. Text budgets (`site/src/lint/rules/text-budgets.ts`): Crux ≤180, KeyTakeaway ≤220, Misconception ≤320, Card annot ≤240.
6. Cross-link prerequisites at the top via `prereqs`/`mathPrereqs` (rendered by `PrereqLinks.astro`); the next lesson is resolved by unit order and rendered at the bottom by `NextLessonCard.astro`.
