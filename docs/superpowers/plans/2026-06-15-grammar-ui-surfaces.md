# Grammar UI Surfaces (P5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, the controller holds full design+repo context) with a final code-reviewer pass + `bun run build` gate. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the four English-grammar UI surfaces from the claude.ai/design handoff (Grammar Section.html) on the real Astro 5 + Preact site, wired to the existing 122-topic corpus, practice-engine, FSRS mastery, EGP coverage, and the already-built `GrammarAnimation` Lottie island.

**Architecture:** Three file-routes under `[lang]/english/grammar` mounting Preact islands; practice runs as an embedded view inside the topic island. A self-contained `grammar.css` (ported from the design, scoped under `.gsurface`, all real tokens). Chrome (TopNav, main wrapper, theme, locale) is provided by the existing `Topic.astro` layout — the design's GNav/SurfaceNote/DesignCanvas are dropped.

**Tech Stack:** Astro 5, Preact + `@preact/signals`, lottie-web (existing island), TypeScript, vitest (`bun run test`), existing design tokens in `global.css`.

---

## Source of truth

- Design bundle: `/tmp/grammar-design-x/awesome-everything/project/` (atlas.jsx, topic.jsx, practice.jsx, coverage.jsx, shell.jsx, posters.jsx, grammar.css, data.jsx). Recreate the **visual output**, not the prototype structure.
- Design brief: `docs/redesign/2026-06-15-grammar-system-design-prompt.md`.

## Real-codebase contracts (verified)

- Tokens: ALL design tokens exist verbatim in `src/styles/global.css` (`--paper --card --ink --accent --d-* --s-* --fs-* --r-* --dur-* --ease --hairline* --ok --warn --danger --contour-opacity` …). Dark via `[data-theme="dark"]` (ThemeBoot).
- Corpus: `src/english/data/grammar/index.ts` → `grammarTopics: GrammarTopic[]`, `grammarById: Map`. `GrammarTopic = { id, title:Bi, cefr:Cefr, levels:Cefr[], family:GrammarFamily, egp:string[], archetype, archetypeParams?, lessons:Partial<Record<Cefr,GrammarLesson>>, gen?:TopicGenSpec, related:string[], crossTopic:string[] }`. `GrammarLesson = { cefr, explain:Bi, structure:Bi, examples:{en,ru,note?}[], tip:Bi, pitfalls?:{wrong,right,why:Bi}[] }`. `import.meta.glob` works in Astro server + client builds (only standalone bun scripts need the readdir loader).
- Families: `src/english/data/grammar/families.ts` → `FAMILIES: {id,title:Bi}[]` (19 families).
- Engine: `src/english/practice-engine` → `generate(topicId,opts)`, `generateFromSpec(topicId,spec,opts)`, `generateSetFromSpec(topicId,spec,opts,composites?)`, `composite(a,b,opts)`, `compositeFromSpecs(aId,aSpec,bId,bSpec,opts)`, `generateTopicSet(topicId,opts)`. `GenerateOpts={level?,types?,count,seed}`. `GeneratedExercise={id,topicId,cefr,type,prompt,answer,alts,options?,rationale:Bi}`. Pure/seeded, runs client-side. `generate*`/`composite` (corpus-backed) pull from `grammarById` (bundles corpus); prefer the `*FromSpec` variants in islands fed specs via props.
- Mastery: `src/english/grammar-mastery.ts` → `gradeGrammar(m,topicId,rating,now):GrammarMastery`, `isTopicDue(card,now)`. `englishState.grammar: GrammarMastery` (Record<topicId,CardState>) already wired in `state.ts`. `CardState={due,stability,difficulty,elapsed_days,scheduled_days,reps,lapses,state,last_review}`. Grade = "again"|"hard"|"good"|"easy".
- Coverage: `src/english/grammar-coverage.ts` → `computeGrammarCoverage(topics, EGP_INVENTORY, COVERAGE_WAIVERS): { bands:{cefr,total,covered,waived,missing:string[],pct}[], overallPct, missingTotal }`. Inventory `src/english/data/egp/index.ts` (`EGP_INVENTORY`), waivers `src/english/data/egp/waivers.ts`.
- Animation: `src/english/animations/archetype-map.ts` → `resolveAnimation(topic): {archetype, doc:()=>LottieDoc} | null`. Island `src/components/english/GrammarAnimation.tsx` props `{ doc:LottieDoc; reducedMotion?; label? }` (doc MUST be a stable/memoized ref).
- Layout: `src/layouts/Topic.astro` imports `global.css`, renders `<TopNav>` + `<main class="max-w-[1600px] mx-auto px-6 md:px-12 …"><slot/></main>`.
- Routing: pages under `src/pages/[lang]/english/`; `getStaticPaths` uses `selectOther([{params:{lang:"en"}},{params:{lang:"ru"}}])` from `~/scripts/build-incremental`. Locale: `Astro.params.lang` + `isLocale`. i18n: `t(key, lang)` from `~/i18n`, strings in `src/i18n/ui.json` shaped `{ en:{key:val}, ru:{…} }`.

## File structure

- Create `src/components/english/grammar/grammar.css` — surface styles, all under `.gsurface`.
- Create `src/components/english/grammar/ui.ts` — `FAMILY_META` (hue+note per 19 families), `familyHue`, `familyNote`, `masteryView`, `cefrRange`, `BANDS`, `coverageSegments`.
- Create `src/components/english/grammar/ui.test.ts` — unit tests for the pure helpers.
- Create `src/components/english/grammar/MasteryRing.tsx` — calm strength ring + `CefrBadges`, `LockGlyph`.
- Create `src/components/english/grammar/GrammarAtlas.tsx` — browse showcase (Layout A) + filters + empty.
- Create `src/components/english/grammar/GrammarTopic.tsx` — study screen; embeds practice view.
- Create `src/components/english/grammar/GrammarPractice.tsx` — exercise runner.
- Create `src/components/english/grammar/GrammarCoverage.tsx` — coverage view.
- Modify `src/english/state.ts` — add `gradeGrammarTopic`, `grammarCardOf`.
- Modify `src/i18n/ui.json` — add `grammar.*` keys (en+ru).
- Rewrite `src/pages/[lang]/english/grammar.astro` — mount `GrammarAtlas`, wide layout, import grammar.css.
- Create `src/pages/[lang]/english/grammar/[topic].astro` — per-topic study route.
- Create `src/pages/[lang]/english/grammar/coverage.astro` — coverage route.
- Leave `GrammarModule.tsx` + old `grammar.ts` in place (become unreferenced; separate cleanup).

---

### Task 1: i18n keys
Modify `src/i18n/ui.json`. Add `grammar.*` keys (en+ru) mirroring `data.jsx` GUI strings (RU verbatim/gold): crumb, atlas title/lede/stats, filters, empty, locked/placement, topic teaching labels, structure/examples/tip/pitfall/why, confusables/contrast, plate caption, practice CTA + items-ready, mastery label + states, due, runner (check/next/skip/correct/incorrect/answer/cross/stronger/generating/cloze/mc/type-here/done+stats/back/again, byok), coverage (title/lede/covered/not-yet/waived/egp/drill/overall). Verify JSON parses.

### Task 2: pure UI helpers + tests
Create `ui.ts` + `ui.test.ts`. `FAMILY_META` (hue cycling `--d-*`+`--accent`, bilingual note, `unclassified`→`--muted`); `familyHue`/`familyNote`; `masteryView(card?)` → state(new/learning/review/mature)+strength(0-100, clamp round(scheduled_days/21*100), new=0)+dueDays; `cefrRange(levels)`; `coverageSegments(band)`; `BANDS` (A0..C2, C1/C2 locked). Tests for all. `bun run test …/ui.test.ts` → PASS.

### Task 3: state wrappers
Modify `src/english/state.ts`: add `grammarCardOf(topicId)` reader + `gradeGrammarTopic(topicId, grade, now)` (immutable update via `gradeGrammar`, `recordActiveDay` guarded).

### Task 4: grammar.css
Create `grammar.css`. Port the design surfaces (Atlas Layout A, Topic, Practice, Coverage). Add needed primitives ALL scoped under `.gsurface` (btn family, contour-field, domain-tag, cefr-badge, kicker, callout.misconception). Existing tokens only. `.gsurface` root; drop the prototype's fixed-height/background hacks.

### Task 5: shared island primitives
Create `MasteryRing.tsx`: `MasteryRing({state,strength,hue,size?,stroke?})`, `CefrBadges`, `LockGlyph`.

### Task 6: GrammarAtlas
Create `GrammarAtlas.tsx`. Props `{lang; topics: AtlasTopic[]}` (`{id,title,cefr,levels,family}`). Subscribe state; band via `getPlacement()?.band`; mastery via `grammarCardOf`→`masteryView`. `locked = (cefr C1|C2) && band!=="B2"`. Masthead + controls (search/band/family) + Layout A family regions; topic entry is `<a href=/${lang}/english/grammar/${id}>`. Empty state.

### Task 7: GrammarPractice
Create `GrammarPractice.tsx`. Props `{lang;topicId;spec;level?;crossSpecs?;byok?;onExit?}`. Generate one item per step (`generateSetFromSpec`; cross → `compositeFromSpecs`), session of 8, cloze/MC, check→correct/incorrect+rationale, complete ring+stats. Grade behind scenes (correct→good, incorrect→again via `gradeGrammarTopic`). Cross toggle; BYOK only if `byok`. Answer compare case/space-insensitive vs answer+alts; MC by index.

### Task 8: GrammarTopic
Create `GrammarTopic.tsx`. Props `{lang;topic;related;crossSpecs;byok}`. View `study|practice`. Study: header + domain-tag + level segments (C1/C2 locked unless band B2) + Plate (`useMemo(resolveAnimation(topic)?.doc())` → `<GrammarAnimation>`; else contour placeholder) + RU-primary/EN-secondary teaching + structure + examples (`<b>` via dangerouslySetInnerHTML — authored, safe) + pitfalls + side rail (practice CTA if `topic.gen`, mastery card, confusables). CTA → practice view; back returns.

### Task 9: GrammarCoverage
Create `GrammarCoverage.tsx`. Props `{lang;coverage;topicsByBand}`. Gauge(overallPct) + legend + per-band 3-seg bars (`coverageSegments`) + drill expand → covering topics (link). C1/C2 locked.

### Task 10: routes
Rewrite `grammar.astro` (mount Atlas, slim metas, wide wrapper, links to coverage + hub). Create `grammar/[topic].astro` (getStaticPaths topics×langs, `grammarById`, related+crossSpecs+byok, mount GrammarTopic, 404-guard). Create `grammar/coverage.astro` (compute coverage + topicsByBand, mount GrammarCoverage). All import grammar.css.

### Task 11: build + review gate
`cd site && bun run test` green. `cd site && bun run build` lint 0/0, page count grows. Fix type/lint. Dispatch code-reviewer over new files; fix CRITICAL/HIGH. Visual check EN+RU light+dark at 1440+375.

## Notes / risks
- Topics without `gen`: hide practice CTA (study+mastery only).
- `dangerouslySetInnerHTML` only for authored `<b>` emphasis (not user input).
- Pass slim metas to Atlas + single topic to topic island (bundle); coverage server-side.
- Layout B (CEFR matrix) + loading skeleton were canvas-only; omit v1.
- `GrammarModule.tsx`+`grammar.ts` become unreferenced; leave for separate cleanup.
