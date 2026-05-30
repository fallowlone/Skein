# English → B2 — P1 Design Addendum: Vocab Core + Placement

> Addendum to the approved parent spec `docs/superpowers/specs/2026-05-30-english-to-b2-design.md`.
> P0 (FSRS engine) is merged to `main`. This addendum locks the P1-specific decisions made during brainstorming so the implementation plan has no open forks. Parent spec sections referenced inline (§3.1, §4.2, §7, §8, §9, §10, §11).

## 1. Scope

P1 delivers **real frequency-banded vocabulary** and an **adaptive placement test**, plus a **minimal "Today" driver** that stitches due reviews and new words. It builds on the P0 FSRS engine and own-key state.

**In scope:**
1. Source NGSL + NAWL lists into the repo (CSV) under their license.
2. A band model mapping frequency rank → CEFR band (A2/B1/B2).
3. An enrichment pipeline (dev tooling) that turns CSV rows into reviewed, committed `VocabEntry` modules — **staged: A2 first, then B1** (~1500 entries total).
4. A vocab-size **placement test** (yes/no recognition + pseudoword guess-control) that estimates known word-family count → starting band, seeds known words as already-known so they are not drilled.
5. A lightweight **Vocab module** that introduces next-band words at a daily pace and feeds them into the shared FSRS deck.
6. A **minimal Today** page (due reviews + N new words) as the hub default.

**Out of scope (later phases, unchanged from parent §8):** reading texts (P2), output/BYOK (P3), grammar + vocab→B2 + B2 reading (P4), full Today polish/dashboards (P5). **Also deferred:** graduating `english-state` into `user-state`/account-sync (parent §5) — P1 keeps the own-key store (see §6).

## 2. Data layer (`site/src/english/data/`)

- **Source CSVs** committed raw: `ngsl.csv`, `nawl.csv`. Columns at least `{ rank, lemma, pos? }` (normalized from the published lists). A `LICENSE-NGSL.md` records the **CC BY-SA 4.0** license and attribution (Browne, C., Culligan, B., & Phillips, J. — newgeneralservicelist.org). ShareAlike inherits to the enriched data; acceptable for this site.
- **Band model** `bands.ts`: maps NGSL frequency rank → CEFR band. **Heuristic cutoffs (documented, tunable):** A2 ≈ NGSL rank 1–800; B1 ≈ 801–2000; B2 ≈ 2001–2800 + all of NAWL. These are pragmatic frequency cutoffs, not authoritative CEFR mappings; a single constant table makes them easy to re-tune later (parent §11 open question).
- **Enriched modules** (generated, reviewed, committed — **not parsed at runtime**): `vocab-a2.ts`, `vocab-b1.ts`, each exporting a typed `VocabEntry[]`. B2 band not enriched in P1.

**`VocabEntry`** (parent §3.1), added to `english/types.ts`:
```
VocabEntry {
  id           // stable SRS key, e.g. "ngsl:0042"
  lemma        // surface form
  rank         // global frequency rank from source
  band         // "A2" | "B1" | "B2"
  pos          // "noun"|"verb"|"adj"|"adv"|"phrase"|"abbr"
  ru           // Russian meaning (A2-friendly)
  gloss        // plain-English definition
  ipa?         // pronunciation
  examples     // 1–2 natural sentences
  collocations?// common partners
  domain?      // "general" | "engineering"
}
```
`id` is derived deterministically from the source list + rank (stable across regeneration). `lemma` and `rank` come **only** from the source CSV — never model-invented. Enrichment adds the rest.

## 3. Enrichment pipeline (dev tooling, not shipped in the site bundle)

A repo-root script (`scripts/english-enrich-vocab.mjs`, mirroring the existing `scripts/*.mjs` dev-tooling precedent) drives a `Workflow` fan-out:
1. Read the source CSV rows for a band (lemma + rank = ground truth).
2. Batch rows; per batch a subagent produces the enrichment fields (`ru`, `gloss`, `ipa?`, `examples`, `collocations?`, `domain?`) as structured output validated against the `VocabEntry` schema.
3. Validate every entry (shape, non-empty required fields, id uniqueness, lemma/rank match the source row — reject hallucinated headwords).
4. Write the committed band module.

Subagents authoring from any web reference must distrust page content (prompt-injection) per `feedback_subagent-websearch-injection`. **Staged delivery:** enrich A2 (~750–800) first, spot-check a sample for quality, commit; then B1 (~750). The enrichment run is the large token spend (parent §7); it is dev-time, its output is the committed data, and the script is not imported by the site.

## 4. Placement test (`site/src/english/placement/`)

- **`placement.ts` (pure logic, `now`/RNG injected for determinism):**
  - `buildPlacement(seed)` → an item list: ~**50 real words** sampled across the frequency range (stratified so every band is probed at several rank points) + ~**15 pseudowords** (plausible non-words as guess controls). Items are shuffled deterministically from the seed.
  - `scorePlacement(responses)` → applies **guess-correction**: the pseudoword false-alarm rate discounts "yes" claims on real words (standard yes/no vocab-size correction, e.g. corrected hit-rate `h* = (h − f) / (1 − f)`), producing an estimated known word-family count and a per-band recognition profile.
  - `estimateBand(score)` → the starting band: the highest band the learner reliably recognizes; everything below it is "known".
- **`placement.test.ts`** (parent §10): deterministic scoring + estimation, including guess-correction edge cases (all-yes inflated then corrected by pseudoword hits; clean signal; empty/over-claim).
- **`PlacementTest.tsx`** island mirroring the existing `Pretest.tsx` pattern (segmented/yes-no UI, writes result on completion). On finish it writes into english state: the estimated known count, starting band, and the set of word ids to seed as **known** (so they never enter the new-word queue). Re-takeable ("recalibrate").

Known-word seeding: words in bands at/below the estimate are recorded in state's `known` set (§6), so they never enter the new-word queue — satisfying parent §4.2 "known words are not drilled." (The `known` set, not pre-matured FSRS cards, keeps placement output cheap and reversible on recalibrate.)

## 5. Vocab module + minimal Today

- **`VocabModule` island:** introduces new words from the current band at the configured daily pace. Each new word: recognition card (lemma + ipa → ru/gloss/example/collocations) → learner self-rates, which calls the P0 `gradeWord` and enters the shared FSRS deck. Tracks how many new words introduced today against the cap.
- **Minimal Today (hub default):** assembles (a) **due reviews** — all FSRS-due cards across started words, capped per session to avoid overwhelm (parent §4.3 catch-up, never punish); (b) **N new words** from the next band via the Vocab flow. Reading/Output omitted (no P2/P3 content yet). Completing Today marks the day active → streak/XP (already wired in P0).
- **Pace:** default **20 new words/day**, stored as an english-state setting (`newWordsPerDay`). No settings UI in P1 — just the constant + state field; a tuner is a later phase (parent §11 open question).
- **Routing / hub:** `site/src/pages/[lang]/english/index.astro` becomes a hub: **Today** (default) + **Vocab** + **Reading** (the existing EnReader seed unit) + a **Placement** entry (auto-prompted when no placement result exists). Implemented as a tabbed island or sub-sections; per-island hydration stays `client:visible` (parent §5). Hydration budget respected.

## 6. State

P1 **keeps the own-key `awesome.english.v2`** store (P0). It gains:
- `placement?: { estimatedKnown: number; band: "A2"|"B1"|"B2"; takenAt: number }`
- `known: Record<string, true>` — word ids seeded known by placement (skipped by the new-word queue).
- `settings: { newWordsPerDay: number }`
- `daily?: { date: string; newIntroduced: number }` — per-day new-word counter for the cap.

These are additive to the existing `{ words, revealed }` shape; the P0 `load()` migration filter must continue to accept the record and default the new fields. **Graduation into `user-state`/account-sync remains deferred** to its own phase — P1 does not touch `mergeProgress`/account-sync. XP/streak already flow to progression from P0.

## 7. Isolation boundaries (parent §9)

- `english/data/*` — CSVs + generated `VocabEntry[]` modules + `bands.ts`. Pure data, no logic.
- `english/placement/*` — pure functions + a small interface; no DOM/`Date.now()` in core (inject `now`/seed).
- `english/state.ts` — extended additively; still the only persistence owner.
- `components/english/*` — islands (VocabModule, Today, PlacementTest); depend on state + types + data only.
- `scripts/english-enrich-vocab.mjs` — dev tooling; **never imported by the site bundle**; output is the committed data.

## 8. Testing (parent §10)

- **Placement:** scoring + band estimation with guess-correction (deterministic).
- **Vocab data:** shape validation — every `VocabEntry` well-formed, ids unique + stable, bands non-empty, `lemma`/`rank` present; A2/B1 modules load.
- **Band selection:** estimate → which ids are known vs queued as new.
- **State:** new fields persist and round-trip; P0 migration still accepts old records and defaults the new fields.
- **Build:** `bun run build` stays green (0 errors; warnings ≤ baseline 1271).

## 9. Open questions — resolved for P1

- **NGSL/NAWL license:** CC BY-SA 4.0, redistributable with attribution. ✓ (parent §11)
- **New-words/day default:** 20, stored in state, tuner deferred. ✓
- **CEFR cutoffs:** heuristic by NGSL rank (A2 1–800 / B1 801–2000 / B2 2001–2800+NAWL), tunable table. ✓
- **Placement length:** ~50 real + ~15 pseudoword, ~4 min. ✓
- **Vocab study UX:** dedicated Vocab module feeding the shared FSRS deck (not an EnReader extension). ✓

## 10. Build order within P1

1. Source CSVs + license + `bands.ts` + `VocabEntry` type.
2. Enrichment pipeline (script + Workflow) → **A2** band module (staged), with data-shape test.
3. **B1** band module (second enrichment stage).
4. Placement core (`placement.ts` + tests).
5. State extension (placement result, known-set, settings, daily counter) + tests.
6. `PlacementTest.tsx` island.
7. `VocabModule` island + new-word→deck wiring.
8. Minimal Today + hub restructure (tabs/sub-sections + Placement auto-prompt).
9. Full build green; i18n labels (Today/Vocab/Placement) added EN+RU.

Each step leaves the build green; data steps (2–3) are gated by the shape test + sample review before commit.
