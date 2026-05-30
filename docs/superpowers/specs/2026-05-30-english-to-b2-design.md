# English → B2 — Design Spec

**Date:** 2026-05-30
**Status:** Approved design, pre-implementation
**Owner:** Artem
**Related:** `project_english-layer` (memory), `site/src/english/*` (shipped slice), player-progression branch (XP engine), github-auth branch (Pages Functions pattern)

## 1. Goal & frame

Take the user from **English A2 → B2 in ~6 months**, embedded in the existing curriculum site, alongside the parallel goal of reaching middle+ fullstack engineering. The English layer is the highest-leverage addition because the site is already bilingual (EN+RU) and English is the user's primary blocker for senior-level work (docs, PR review, communication, interviews).

**Constraints / inputs (decided in brainstorming):**
- Daily budget: **30–45 min/day → ~25 new words/day** target pace.
- Vocabulary source: **real published frequency lists (NGSL + NAWL)**, not model-invented.
- Output grading: **AI feedback via Claude API** in a Cloudflare Pages Function.
- Structure: **single daily driver ("Today")** that assembles each session.
- Progress: **merged into the existing XP/streak/progression** (player-progression), one streak for everything.
- SRS algorithm: **FSRS**, isolated behind a `Scheduler` interface so it can be swapped without touching UI.

**Non-goals (this spec):** native-grade pronunciation training, live conversation partner, certification/exam simulation. Listening is text+transcript only for now (audio is a later add).

## 2. Research basis

Design decisions trace to evidence gathered 2026-05-30:

- **Lexical coverage (Nation 2006):** 95% coverage = minimal comprehension, 98% = unassisted reading. ~3000 word families → ~95% of general text; **B2 unassisted reading needs ~98% → ~5000–6000 word families**. → frequency-ranked core deck sized to ~5–6k, taught highest-frequency-first.
- **Comprehensible input / i+1 (Krashen 1982):** input must be ~95–98% understandable. → graded reading; each text mostly inside the learner's known band with only 2–5% new, glossed words.
- **Extensive reading (Nakanishi 2015 meta-analysis; 2025 follow-ups):** one of the strongest-supported methods; effect **larger when paired with comprehension questions**. → high-volume graded reading stream + comprehension checks.
- **Spaced retrieval / testing effect (Kim 2022 meta-analysis):** medium-to-large effect for spacing; retrieval cuts forgetting (56% → 13%); **8–10 spaced encounters** minimum per item; expanding intervals. → FSRS scheduler, active recall.
- **Output hypothesis (Swain 1985):** input alone is insufficient; production forces syntactic processing and surfaces gaps. → output tasks promoted into the core for B2 (produce clear, detailed, argued text), with feedback.
- **Desirable difficulties (Bjork & Bjork):** spacing, interleaving, retrieval, generation, varied practice; storage vs retrieval strength. → review uses generation (type the word) not recognition; interleave word/topic types.

## 3. Content data model

Five content types. Vocab and grammar stay repo data modules. Reading and output start as data modules (like the shipped slice) and **may be promoted** to real Astro content collections once volume justifies it — at which point deliberate i18n-parity + sources lint rules are added (see §7.5). The promotion decision is deferred to the phase that builds the volume, not assumed here.

### 3.1 Vocab core
Frequency-ranked word families: NGSL (~2800) + NAWL (~960 academic) + a mid-frequency extension toward ~5–6k.

```
VocabEntry {
  id            // stable SRS key
  lemma         // surface form
  rank          // global frequency rank (from source list)
  band          // "A2" | "B1" | "B2"  (CEFR mapping by frequency)
  pos           // noun | verb | adj | adv | phrase | abbr
  ru            // Russian meaning (A2-friendly)
  gloss         // plain-English definition
  ipa?          // pronunciation
  examples      // 1–2 natural sentences
  collocations? // common partners
  domain?       // "general" | "engineering"
}
```
Source CSVs (NGSL, NAWL) checked into repo; enrichment (RU + gloss + examples + collocations) generated in reviewed batches.

### 3.2 Reading texts
Short graded texts, two streams (**general** broad-English, **engineering** PR/docs/RFC/incident). Each: `level (A2|B1|B2)`, `stream`, body, `targetWords[]` (glossed vocab references), `questions[]` (comprehension MCQs). i+1 enforced by keeping ≥95% of tokens inside the learner's known band.

### 3.3 Output tasks
Production prompts (write a PR comment, a standup update, a short design rationale, describe a bug). Each: prompt (Bi), `rubric[]`, optional `modelAnswer`, target `band`. Graded by Claude API → `{corrections[], betterVersion, scoreBand, noticingHints[]}`.

### 3.4 Grammar-in-context
B1/B2 structures (tenses, conditionals, relative clauses, passive, modality/hedging for engineering register). Each: short in-context explanation + cloze practice. Bilingual scaffolding.

### 3.5 Collocations / phrases
Engineering + general high-frequency collocations and idioms (extends the slice's `phrases`).

## 4. Engine

### 4.1 Scheduler (FSRS, isolated)
`Scheduler` interface: `next(card, grade) -> {due, state}` and `isDue(card, now)`. FSRS implementation stores per-card `stability`, `difficulty`, `lastReview`, `reps`, `lapses`. UI and state talk only to the interface; algorithm swap (FSRS ⇄ SM-2 ⇄ Leitner) touches one module. Targets 8–10 spaced encounters; expanding intervals.

### 4.2 Placement
Adaptive **vocab-size test** (yes/no recognition checklist sampled across frequency bands — the standard vocab-size estimation method, with pseudoword controls for guessing). Output: estimated known word-family count → starting band, so known words are not drilled. Mirrors the existing `Pretest` island pattern and writes into progression.

### 4.3 Daily driver ("Today")
A single page assembles the day's session:
1. **Due reviews** — all cards the scheduler marks due, active recall (type the word).
2. **New words** — paced (~25/day, configurable), drawn from the next frequency band.
3. **Reading** — one graded text at current level + comprehension questions.
4. **Output** — one task every few days (not daily).

Missed-day handling: the review queue **catches up** (due cards accumulate, capped per session to avoid overwhelm) and **never punishes** — streak logic rewards return, not perfection. Completing Today marks the day active → streak/XP.

## 5. Integration

- **Progression:** English actions emit XP / achievements / streak into the existing `user-state.progression`. One streak, one level. New achievements: word-count milestones (e.g. 500 / 2000 / 5000 known), first AI-graded output, band-up (A2→B1→B2), reading-volume milestones.
- **State graduation:** the slice's `english-state` (own localStorage key) graduates into `user-state` so it syncs via `account-sync`. Migration is additive and guarded in `mergeProgress` (no breaking of existing synced fields).
- **Routing / UI:** `/[lang]/english/` becomes the hub → **Today** (default) + module entries (Vocab, Reading, Output, Grammar). UI mirrors existing components (segmented controls, cards, islands). Hub is a 2-segment route, outside the lesson hydration cap; per-island hydration stays minimal (`client:visible`).

## 6. Output infrastructure

Cloudflare Pages Function `functions/api/english/grade.ts` (mirrors the github-auth Functions pattern):
- Calls Anthropic API with a key from an env secret (never shipped to client).
- Strict rubric system prompt (prompt-cached); user text + task rubric as input.
- Returns JSON `{corrections[], betterVersion, scoreBand, noticingHints[]}`.
- Rate-limited per session; input length-capped. Graceful degradation to self-assessment-against-model-answer if the function is unavailable.

## 7. Content generation pipeline (the large token spend)

1. Fetch real **NGSL / NAWL** lists → CSV in repo (`site/src/english/data/`).
2. Batched enrichment (Workflow / subagents) → `VocabEntry` per band (RU + gloss + IPA + examples + collocations); quality-reviewed; bilingual where the layer needs RU support.
3. Generate **graded reading** per band (general + engineering) with comprehension Qs, holding the ≥95%-known-tokens constraint.
4. Generate **grammar-in-context** micro-lessons (B1/B2 set) + collocation sets.
5. Lint: data modules sit outside content-collection rules; if reading/output are promoted into real collections, add **deliberate i18n-parity + sources rules** rather than letting them ride free.

Subagents authoring from web sources must distrust page content (prompt-injection) per `feedback_subagent-websearch-injection`.

## 8. Build order (phases)

- **P0 — Engine.** `Scheduler` (FSRS) behind interface, placement test, graduate `english-state` into `user-state`, XP/streak hooks. Code only, no large content. Upgrades the existing Review tab to scheduler-driven.
- **P1 — Vocab core.** Fetch NGSL/NAWL; enrich A2/B1 bands first (~1500 words); wire into Today + Review.
- **P2 — Reading.** Graded texts A2→B1 (general + engineering) + comprehension; extensive-reading stream.
- **P3 — Output.** Pages Function + AI grading + output task set.
- **P4 — Grammar / collocations + Vocab to B2.** Extend deck to ~5–6k; B2 reading.
- **P5 — Daily driver polish.** Achievements, dashboards, streak/catch-up tuning.

Each phase is independently shippable and leaves the build green.

## 9. Isolation boundaries

- `english/scheduler/*` — algorithm, no UI/DOM deps; pure functions + interface.
- `english/data/*` — content modules / CSVs; no logic.
- `english/state.ts` → merges into `user-state` with a clear English sub-slice.
- `components/english/*` — islands; depend on state + types only.
- `functions/api/english/*` — server; depends on nothing client-side.

Each unit answerable: what it does, how to use it, what it depends on. Files kept focused; split when they grow past one purpose.

## 10. Testing

- Scheduler: unit tests on interval progression, due calculation, lapse handling (deterministic, no Date.now in pure core — inject `now`).
- Placement: scoring + band estimation tests with pseudoword guess-correction.
- Output function: contract test on the JSON shape; mock Anthropic.
- Build: `bun run build` stays green (0 errors) each phase; reading/output collections (if promoted) pass parity.

## 11. Open questions (resolve during planning)

- NGSL/NAWL exact source URLs + license for repo inclusion (verify redistribution terms).
- New-words/day default and whether the user can tune it in settings.
- Where the Anthropic API key lives for local dev vs Cloudflare (env var naming, `.dev.vars`).
- CEFR-band cutoffs over the frequency rank (where A2/B1/B2 boundaries fall).
