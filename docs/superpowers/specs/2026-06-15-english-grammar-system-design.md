# English Grammar System — Design Spec

**Date:** 2026-06-15
**Status:** approved (brainstorm) → ready for implementation plan
**Scope:** This is **Spec A** of a two-spec program. Spec A covers the grammar
content corpus, coverage audit, generative practice engine, and per-topic
animations (modules 1–4 + the design-prompt slice, module 6). The **adaptive
study planner** (module 5) is **Spec B**, authored separately; it depends on the
foundation laid here.

**Supersedes:** the B2-only grammar approach in
`2026-05-30-english-to-b2-p4-grammar-b2-design.md` (the current 18-point
`GrammarModule`). That module's data is replaced by the corpus below.

---

## 1. Background & motivation

The repo already ships an "English-for-Engineers" layer under
`site/src/english/` (vocabulary-first, FSRS-scheduled, bilingual EN/RU, placement
test, coverage meter, reading/output/speaking modules, a hub UI). Its grammar
support is the weak link:

- `site/src/english/data/grammar.ts` — **18** hand-authored grammar points,
  bands **B1/B2 only**, engineering-flavored, **2 cloze items each**.
- `components/english/GrammarModule.tsx` — a simple cloze runner.
- `englishState.grammarDone` — a **boolean** per point (no mastery, no SRS).

A donor project, `/Users/artemmac/dev/personal/steep/grammar/`, contains:

- **122 grammar topic JSONs** (`explanations/data/*.json`) — each with
  `topicId` + per-level (`A0`–`C2`) `content` (RU markdown explaining English
  grammar), `examples[]`, and a `tip`. Pedagogically deep.
- A **topic registry** (`topics/grammar-topics.ts`, ~79 KB) with CEFR levels and
  exercise types, plus `topics/cefr-utils.ts` (A0–C2).
- A working **algorithmic exercise engine** (`algorithm/`): `template-engine`,
  `topic-templates`, `word-lists`, `distractors-v2`, `mc-adapter`, `agreement`,
  `collocation`, `dedup`, `rng`, `detectors`, `grading`. Produces
  `fill_in_blank` / `word_order` / `multiple_choice` deterministically. Plus an
  AI generator (`exercises/ai-generator.ts`).
- Exercise types (`exercises/types.ts`): `fill_in_blank`, `multiple_choice`,
  `error_correction`, `sentence_transformation`, `word_order`.

This spec brings the steep corpus and engine into the site, scales the engine to
≥100 unique items per topic with cross-topic composition, adds per-topic
animations, audits zero→C2 coverage against an external syllabus, and produces a
design brief for the new UI surfaces.

**Audience framing:** Russian-speaking engineers learning English. The RU prose
is the *teaching* voice; EN is the *target-language exposure*. This matches the
existing layer's bilingual `Bi = { en; ru }` contract.

---

## 2. Goals & non-goals

### Goals

1. Import all 122 grammar topics into a typed, bilingual, CEFR-leveled corpus
   (A0–C2), preserving steep's RU prose verbatim and authoring EN counterparts.
2. A generative practice engine that produces **≥100 unique, key-verified items
   per topic** (effectively unbounded from a compact spec) and **composes topics**
   (cross-topic items), offline and deterministic, with a validated optional
   BYOK live layer.
3. A per-topic animation system: ~10–14 parametric Lottie archetypes + a handful
   of bespoke keystone animations, lazily rendered.
4. A coverage audit mapping the corpus to the **English Grammar Profile (EGP)**
   with a build gate; gaps are auto-authored as new topics or explicitly waived.
5. New reader UI: Grammar Atlas, Topic page, Practice runner, Coverage view.
6. A claude.ai/design prompt for the new UI surfaces.

### Non-goals (this spec)

- The adaptive study planner (goals/deadlines/results → self-correcting plan) —
  that is **Spec B**.
- Extending the **placement test** itself to emit A0/A1/C1/C2 bands — out of
  scope here (see §10 default). The atlas *displays* all bands; gating uses the
  existing A2/B1/B2 placement plus simple rules.
- Reworking vocabulary, reading, speaking, or output modules.

### Success criteria

- 122+ topics live, EN+RU, A0–C2, build-lint clean.
- `audit:grammar --gate` green: every topic's generator yields ≥100 unique
  key-verified items; `verify:grammar` green every build.
- `audit:coverage --gate` green: every CEFR band's required EGP areas are
  covered or waived with rationale.
- Topic page + practice render correctly in EN and RU; animations honor
  reduced-motion; hydration ≤5 islands/page; `bun run build` green.

---

## 3. Architecture overview

```
site/src/english/
  data/
    grammar/
      <topic-id>.ts          ← one GrammarTopic per topic (122+)
      index.ts               ← barrel (lazy-friendly)
      families.ts            ← GrammarFamily registry + grouping
    egp/
      inventory.ts           ← English Grammar Profile competencies (CEFR-mapped)
  practice-engine/
    types.ts                 ← TopicGenSpec, Exercise, pools
    template-engine.ts       ← ported from steep (slot fill, seeded RNG)
    rng.ts  dedup.ts         ← ported
    distractors.ts           ← ported distractors-v2 + mc-adapter + agreement + collocation
    generate.ts              ← generate(topicId, opts) → Exercise[]
    cross-topic.ts           ← topic composition combinator
    validate.ts              ← key re-derivation + level-fit + dedup (shared by gate & live)
    live.ts                  ← BYOK power-up (uses english/byok), gated by validate.ts
  animations/
    archetypes/*.json        ← ~10–14 Lottie archetypes (text-to-lottie)
    archetype-map.ts         ← topicId → { archetype, params }
    keystones/*.json         ← bespoke Lotties for a few topics
  state.ts                   ← + grammar FSRS cards (replaces grammarDone boolean)

site/src/components/english/
  GrammarAtlas.tsx           ← browse 122 topics by family × CEFR
  GrammarTopic.tsx           ← lesson + animation + examples + pitfalls + contrast
  GrammarPractice.tsx        ← engine-driven runner (mixed types, cross-topic, BYOK)
  GrammarAnimation.tsx       ← lottie-web player (dynamic import, client:visible)
  GrammarCoverage.tsx        ← EGP coverage gauge (CoverageMeter pattern)

site/src/pages/[lang]/english/
  grammar.astro              ← Atlas (replaces current GrammarModule mount)
  grammar/[topic].astro      ← Topic page route

scripts/
  grammar-import/            ← one-time steep → corpus mapper + EN authoring driver
  grammar-gen-audit/         ← audit:grammar --gate + LLM-judge driver
  coverage-audit/            ← audit:coverage --gate

docs/redesign/
  2026-06-15-grammar-system-design-prompt.md   ← claude.ai/design brief (§8 surfaces)
```

**Layering invariant (the central system-design decision):**

> Correctness and reproducibility are architectural invariants. They must **not**
> depend on a runtime LLM. Tokens are spent at **authoring & verification** time
> (offline, gated, committed), never at **serving** time.

Every served item — deterministic core *or* BYOK live — has a **computed,
re-derivable answer key** and passes the same `validate.ts` gate. The live LLM
*proposes*; the deterministic validator *disposes*.

---

## 4. Module 1 — Grammar corpus

### 4.1 Data model

Add to `site/src/english/types.ts` (or a new `grammar-types.ts` imported there):

```ts
export type Cefr = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type GrammarFamily =
  | "tenses" | "aspect" | "modals" | "conditionals" | "passive"
  | "articles" | "nouns" | "pronouns" | "adjectives" | "adverbs"
  | "prepositions" | "relative-clauses" | "reported-speech"
  | "questions" | "verb-patterns" | "phrasal-verbs" | "conjunctions"
  | "word-order" | "discourse"; // extend as the corpus dictates

export type GrammarLesson = {
  cefr: Cefr;
  explain: Bi;       // RU verbatim from steep; EN authored
  structure: Bi;     // the rule named
  examples: { en: string; ru: string; note?: Bi }[];
  tip: Bi;           // steep "tip"
  pitfalls?: { wrong: string; right: string; why: Bi }[]; // misconception axis
};

export type GrammarTopic = {
  id: string;                 // kebab from steep topicId, e.g. "present-simple"
  title: Bi;
  cefr: Cefr;                 // entry level
  levels: Cefr[];             // levels with authored lessons
  family: GrammarFamily;
  egp: string[];              // EGP competency ids this topic covers
  archetype: string;          // key into archetype-map
  archetypeParams?: Record<string, string | string[]>;
  lessons: Partial<Record<Cefr, GrammarLesson>>;
  gen: TopicGenSpec;          // §5
  related: string[];          // confusable/sibling topic ids (contrast)
  crossTopic: string[];       // topic ids this composes with
};
```

`Bi` already exists in `english/types.ts`. Reuse it.

### 4.2 Storage & loading

- One module per topic: `data/grammar/<id>.ts` exporting a `GrammarTopic`.
  Mirrors the existing `vocab-*.ts` data-module convention.
- `data/grammar/index.ts` — barrel exporting `grammarTopics: GrammarTopic[]` and
  a `byId` map. Keep it tree-shake/lazy friendly; the heavy `gen` specs and
  lessons are co-located per file so a single topic page can lazy-load just its
  topic if bundle size demands (decided at implementation time).
- `data/grammar/families.ts` — family metadata (title `Bi`, order) for the atlas.

### 4.3 Import pipeline (`scripts/grammar-import/`)

A one-time, re-runnable mapper:

1. **Deterministic map:** read each steep JSON → `GrammarTopic` skeleton.
   - `id` = kebab(topicId); `title.ru` from steep where present else authored.
   - For each level present: `lessons[level].explain.ru` = steep `content`
     **verbatim**; `examples` = steep `examples` (parse the `"EN (RU)"` form
     into `{en, ru}`); `tip.ru` = steep `tip`.
   - `levels` = sorted keys present.
2. **LLM authoring (Workflow):** for each topic, author the missing fields and
   commit them into the topic file:
   - `explain.en`, `structure.{en,ru}`, `title.en`, example `note`s,
     `pitfalls`.
   - `family`, `egp[]` tags, `archetype` + `archetypeParams`, `related[]`,
     `crossTopic[]`.
   - `gen` (the generative spec, §5) — templates, pools, transforms, key
     derivation, rationale, contrastive pairs.
3. **Verbatim guard:** the importer never rewrites a populated RU `explain`/`tip`
   /`examples` field — RU steep prose is gold. A test asserts RU fields equal the
   source for a sample.

The Workflow follows the repo's established "author → commit JSON → gate"
pattern (cf. scenario/sandbox/IRT campaigns). Authoring subagents are briefed to
distrust web content and never emit harness tags into prose (known contamination
modes; see project memory).

---

## 5. Module 3 — Generative practice engine

### 5.1 The generative-grammar model

A topic does not ship flat items. It ships a `TopicGenSpec` — a *generative
grammar* the engine expands:

```ts
export type Pool = {
  id: string;                 // referenced by slot
  tags: { level: Cefr[]; register?: ("neutral"|"engineering"|"academic")[] };
  items: string[];            // surface tokens/phrases (level-graded)
};

export type Template = {
  id: string;
  type: ExerciseType;         // fill_in_blank | multiple_choice | error_correction
                              // | sentence_transformation | word_order
  cefrMin: Cefr; cefrMax: Cefr;
  pattern: string;            // text with typed slots, e.g. "{subj} {verb:PRES} every day"
  slots: Record<string, { pool: string; feature?: string }>; // feature for cross-topic
  deriveKey: string;          // named derivation strategy → computed answer + alts
  rationale: Bi;              // explanation template (slot-interpolated)
  contrast?: { wrong: string; why: Bi }[]; // for error_correction / distractors
};

export type TopicGenSpec = {
  pools: Pool[];
  templates: Template[];
  features: string[];         // grammatical features this topic exercises (cross-topic tags)
};
```

The **answer key is computed** by `deriveKey` (a named strategy in the engine),
never authored as a literal per item and never produced by an LLM at serve time.
This is what makes unbounded generation safe.

### 5.2 Generation

`generate(topicId, { level, types, count, seed }): Exercise[]`

- Ported `TemplateEngine` fills templates from pools with a **seeded RNG**;
  `BatchDedup` rejects duplicate surfaces; distractors via ported
  `distractors-v2` + `mc-adapter` (+ `agreement`, `collocation`).
- Same `seed` → identical items (required for SRS identity, tests, debugging).
- A compact spec (a handful of templates × graded pools) reaches **≥100 unique**
  surfaces per topic comfortably; the engine targets ≥100 post-dedup across the
  topic's levels.

`Exercise` (extend steep's union) carries: `id`, `topicId`, `cefr`, `type`,
the surface, the **computed** `answer` + `alts`, and a bilingual `rationale`.

### 5.3 Cross-topic combinator (`cross-topic.ts`)

`composite(primaryId, secondaryId, opts): Exercise[]`

- Picks a primary template, then constrains one of its slots by a **feature** the
  secondary topic exercises (slots and pools are feature-tagged). Example:
  `present_perfect` × `passive` → primary perfect template, verb slot forced into
  the passive pool/feature → "the bug ___ already" ⇒ "has been fixed".
- The combinator only pairs topics listed in each other's `crossTopic[]` (or
  sharing compatible `features`), so combinations stay pedagogically sane.
- Key derivation composes: the secondary feature's transform is applied before
  `deriveKey` resolves the answer.

### 5.4 Mastery (state)

Extend `englishState` (`english/state.ts`):

- Replace the `grammarDone: Record<string, true>` boolean with **FSRS grammar
  cards** keyed per topic (and optionally per `error-type` for fine-grained
  remediation), reusing the existing `fsrsScheduler()` instance.
- Grading happens on practice answers (`good`/`hard`/`again`/`easy` mapped from
  correctness + reveal behavior, consistent with the existing word/chunk grading
  style).
- Migration: on load, treat a legacy `grammarDone[id] === true` as a single
  matured card seed so existing progress is not lost. Keep the load path
  tolerant (the layer already drops malformed records).
- This mastery signal is the hook the Spec-B planner will consume.

### 5.5 BYOK live layer (`live.ts`)

- Off by default; visible only when a key is present in the existing
  `english/byok`/`byo` infrastructure.
- Asks Claude for candidate items **in the same schema**, then runs every
  candidate through `validate.ts` (re-derive the key, check level fit, dedup vs
  the session's seen set). Only validated items are shown.
- A "generate more / from my own text" affordance in the practice runner.

### 5.6 Build-time gates

- `bun run audit:grammar --gate` (`scripts/grammar-gen-audit/`):
  - For every topic: assert `generate` yields **≥100 unique** items with
    re-derivable keys across its levels.
  - **LLM-judge pass** (offline): each template's sample output judged for
    grammaticality + key-correctness; verdicts committed to a
    `grammar-judge-verdicts.json`; the gate reads verdicts (no live LLM in CI).
  - Worklist/gate convention mirrors `audit:scenario` / `audit:sandbox`.
- `verify:grammar` (cheap, every build): a QuickJS-style assert that each
  template's `deriveKey` is internally consistent (the derived answer actually
  satisfies the template), in the spirit of `verify:samples` / `verify:scenario`.

---

## 6. Module 4 — Animations

### 6.1 Archetypes

`animations/archetypes/*.json` — ~10–14 Lottie (Bodymovin) JSON archetypes
authored with the **text-to-lottie** skill. Each maps to a recurring grammar
visualization and exposes **text slots** for labels/tokens:

- `timeline` (tenses: points/spans on a time axis)
- `contrast-2box` (X vs Y, e.g. present-perfect vs past-simple)
- `slot-fill` (word order / sentence building)
- `transform-arrow` (active→passive, direct→reported)
- `branch` (conditionals: if → result)
- `agreement-highlight` (subject–verb / determiner agreement)
- `stack-build` (noun phrases, adjective order)
- … (final set fixed during implementation; ~10–14)

`animations/keystones/*.json` — a small number of bespoke Lotties where a
generic archetype undersells the concept (e.g. the tense system overview, the
conditionals ladder).

`animations/archetype-map.ts` — `topicId → { archetype, params }` (defaults read
from `GrammarTopic.archetype` / `archetypeParams`).

### 6.2 Player

`components/english/GrammarAnimation.tsx`:

- Renders via **lottie-web** (SVG renderer), loaded by **dynamic import** so the
  runtime stays out of the base bundle. Mounted **`client:visible`**.
- **NOT** Skottie/CanvasKit — the canvaskit wasm payload (~MBs) is too heavy for
  a static content site's CWV budget.
- `prefers-reduced-motion` → render a **static poster frame** (no playback),
  satisfying the accessibility rules.
- One animation island per topic page → within the 5-island hydration cap.

---

## 7. Module 2 — Coverage audit

- `data/egp/inventory.ts` — the **English Grammar Profile** competency inventory,
  CEFR-mapped (A1–C2; A0 handled as our pre-A1 onboarding band), committed as
  typed data. Each entry: `{ id, cefr, category, can_do }`.
- `bun run audit:coverage --gate` (`scripts/coverage-audit/`):
  - Maps every `GrammarTopic.egp[]` tag onto the EGP inventory.
  - Per CEFR band: computes covered / missing competency areas.
  - **Gaps** are resolved one of two ways:
    1. **Auto-author** a new `GrammarTopic` to fill the gap (corpus grows beyond
       122 where the syllabus demands it), via the same import/authoring
       Workflow; or
    2. Added to `coverage-waivers.ts` with an explicit rationale (deliberately
       out-of-scope: archaic/marginal forms).
  - Gate exits 0 only when every band's required areas are **covered or waived**.
  - Report written to `dist/coverage-report.json` (mirrors `lint-report.json`).

---

## 8. Module — UI surfaces

Replace the current `GrammarModule.tsx` mount and `grammar.astro` body.

- **Grammar Atlas** (`GrammarAtlas.tsx`, route `/[lang]/english/grammar`) —
  browse 122+ topics grouped by `family` × CEFR; filter by placement band;
  per-topic progress from grammar mastery cards. Replaces the flat list.
- **Topic page** (`GrammarTopic.tsx`, route `/[lang]/english/grammar/[topic]`) —
  per-level lesson (RU teaching + EN), the topic animation, examples, `pitfalls`,
  and a contrast block linking `related` topics. `getStaticPaths` over the corpus
  × locales (uses the repo's `selectOther` incremental-build helper).
- **Practice runner** (`GrammarPractice.tsx`) — pulls from `generate` /
  `composite`; mixes exercise types; a **cross-topic toggle**; FSRS grading on
  each answer; a **BYOK "more"** button (hidden without a key).
- **Coverage view** (`GrammarCoverage.tsx`) — reuses the `CoverageMeter` gauge
  pattern over the EGP coverage numbers.

**Constraints:** all islands lazy (`client:visible`); ≤5 islands/page; every
string bilingual; new UI labels go into `i18n/ui.json`; new technical terms into
`i18n/glossary.json` (alphabetical, per the existing lint rule).

---

## 9. Module 6 — Design prompt (this spec's slice)

`docs/redesign/2026-06-15-grammar-system-design-prompt.md` — a claude.ai/design
brief covering the §8 surfaces (Atlas, Topic+animation, Practice runner, Coverage
view). It specifies: the site's editorial-cartographic visual language, the
existing CSS token vocabulary (`english-hub.css` + global tokens), both locales,
and all interaction states (loading, empty, locked, correct/incorrect, reduced
motion). Planner surfaces are deferred to Spec B's prompt.

---

## 10. Decisions locked & risks

| Decision | Resolution | Risk / mitigation |
|---|---|---|
| Serve-time correctness | Never depends on runtime LLM; computed keys + `validate.ts` gate | Core invariant; BYOK live items pass the same gate |
| EN prose | LLM-authored at import, committed | Quality variance → LLM-judge pass + verbatim RU gold retained |
| ≥100/topic | Generative spec + deterministic expansion + dedup | Gate `audit:grammar` enforces; compact specs reach the target |
| Cross-topic | Feature-tagged slots/pools + combinator over `crossTopic[]` | Pairs restricted to declared/compatible topics to stay sane |
| Animations | ~10–14 parametric Lottie archetypes + few bespoke | 122 bespoke rejected (authoring cost, uneven quality) |
| Lottie runtime | lottie-web, dynamic import, `client:visible` | Skottie/canvaskit rejected (wasm weight); reduced-motion → poster |
| Coverage yardstick | English Grammar Profile + `--gate` + auto-fill/waive | Matches repo's audit-gate convention |
| Corpus storage | 122 per-topic data modules + barrel | Large; barrel + lazy topic loading if bundle demands |
| Mastery | FSRS grammar cards replace `grammarDone` boolean | Legacy boolean migrated to a matured-card seed |
| Band A0–C2 vs placement | Atlas shows all bands; placement stays A2/B1/B2 | A0–A1 always open, C1–C2 gated behind B2; placement extension = follow-up/Spec B |

---

## 11. Testing strategy

- **Unit:** engine determinism (seed → identical items), `BatchDedup`, every
  `deriveKey` strategy, cross-topic constraint intersection, EGP mapping, FSRS
  grammar-card grading + legacy migration. (Schema/data tests use a local mirror
  of the content shape — `astro:content` is unavailable under Vitest, per repo
  convention.)
- **Gates:** `audit:grammar --gate` (≥100/topic + committed judge verdicts),
  `audit:coverage --gate`, `verify:grammar`, plus existing build lint (i18n
  parity, glossary alphabetical, sources, hydration cap).
- **Visual:** Topic page + Practice runner in EN and RU; animation reduced-motion
  poster fallback; atlas filtering by band.
- **Build:** `bun run build` green (expected page count grows by 122+ topic pages
  × 2 locales; confirm against the incremental-build gating).

---

## 12. Implementation phasing (for writing-plans)

The plan should phase to keep the foundation verifiable before the surfaces:

1. **Corpus foundation** — types, import pipeline, 122 topics imported (RU
   verbatim + EN authored + tags), barrel + families, RU-verbatim guard test.
2. **Coverage audit** — EGP inventory, `audit:coverage --gate`, fill/waive the
   gaps surfaced (corpus may grow). Gate green.
3. **Practice engine** — port steep engine, `TopicGenSpec` model, `generate`,
   `cross-topic`, `validate`, mastery state migration, `verify:grammar` +
   `audit:grammar --gate`. Gate green.
4. **Animations** — author archetypes (text-to-lottie), `archetype-map`,
   `GrammarAnimation` player, keystones.
5. **UI surfaces** — Atlas, Topic page (+ routes), Practice runner, Coverage
   view; i18n labels + glossary; replace the old `GrammarModule`.
6. **BYOK live layer** — `live.ts` wired into the practice runner.
7. **Design prompt** — author the claude.ai/design brief for §8 surfaces.

Each phase ends green (its gate + `bun run build`) before the next begins.

---

## 13. References

- Donor corpus: `/Users/artemmac/dev/personal/steep/grammar/explanations/data/*.json`
- Donor engine: `/Users/artemmac/dev/personal/steep/grammar/algorithm/`,
  `.../exercises/`
- Existing layer: `site/src/english/{types,state,coverage}.ts`,
  `site/src/english/scheduler/fsrs.ts`,
  `site/src/components/english/GrammarModule.tsx`,
  `site/src/components/english/hub/CoverageMeter.tsx`
- text-to-lottie skill: `~/.claude/skills/text-to-lottie/SKILL.md`
- English Grammar Profile (Cambridge) — external CEFR grammar inventory
- Repo audit-gate precedents: `verify:samples`, `verify:scenario`,
  `audit:scenario`, `audit:sandbox`
