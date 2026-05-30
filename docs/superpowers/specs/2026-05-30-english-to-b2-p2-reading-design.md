# English → B2 — P2 Design Addendum: Graded Reading

> Addendum to the approved parent spec `docs/superpowers/specs/2026-05-30-english-to-b2-design.md` and the P1 addendum `…-p1-vocab-placement-design.md`.
> P0 (FSRS engine) and P1 (vocab core + placement) are merged to `main`. This addendum locks the P2-specific decisions made during brainstorming so the implementation plan has no open forks. Parent sections referenced inline (§3.2 reading, §4.3 daily driver, §8 P2, §9 isolation, §10 testing).

## 1. Scope

P2 delivers a corpus of **graded reading texts** across two CEFR bands (A2, B1) and two streams (general broad-English, engineering), a **Reading feed** to browse/track them, and reading→vocab reinforcement that feeds the shared FSRS deck.

**In scope:**
1. Extend `ReadingUnit` with `stream` and `targetWords`.
2. ~40 graded texts (~10 per band×stream cell), staged A2 first then B1, as committed data modules.
3. A `ReadingFeed` surface: lists texts at the learner's band, stream toggle, read/unread progress, opens a text in the existing `EnReader`.
4. Reading→deck reinforcement: marking a text read seeds its `targetWords` into the FSRS deck (`bumpSeen`).
5. Read-state tracking in english state.
6. A Today reading slot (one unread text at band) and hub wiring.

**Out of scope (later phases, unchanged):** output/BYOK (P3), grammar + vocab→B2 + B2 reading (P4), Today polish/dashboards (P5). **Also deferred:** promoting reading into a real Astro content collection (parent §3.2 allows this once volume justifies; P2 keeps data modules and does not add content-collection lint rules); account-sync graduation of english-state (still own-key).

## 2. Type changes (`site/src/english/types.ts`)

Extend `ReadingUnit` additively (existing fields unchanged: `id`, `level`, `title`, `blurb`, `source`, `passages`, `phrases`, `questions`):
```
ReadingUnit {
  …existing…
  stream: "general" | "engineering"
  targetWords?: string[]   // VocabEntry ids (from P1 deck) the text teaches/reinforces
}
```
`level` stays `"A2" | "B1" | "B2"` (P2 authors A2 + B1 only). The inline `Passage.words` (ad-hoc `VocabWord` glosses) stay as-is for readability; `targetWords` is the separate link into the frequency deck.

## 3. Data layout (`site/src/english/data/reading/`)

Split by cell to keep each file focused (parent §9):
- `a2-general.ts`, `a2-engineering.ts`, `b1-general.ts`, `b1-engineering.ts` — each exports a typed `ReadingUnit[]` (~10 units).
- `index.ts` exports:
  - `readingUnits: ReadingUnit[]` — all cells concatenated, including the migrated seed unit `code-review-101` (it is A2/engineering; it moves into `a2-engineering.ts`).
  - `unitsByBandStream(band, stream): ReadingUnit[]`
  - `unitById(id): ReadingUnit | undefined`

The existing `site/src/english/units.ts` becomes a thin re-export of `index.ts` (`export { readingUnits, unitById } from "./data/reading"`) so current imports keep working. EnReader, the hub, and any other consumer repoint to the aggregate; nothing hardcodes `readingUnits[0]` after P2.

Each `ReadingUnit` is fully bilingual (title/blurb/source/passages/questions/phrases all `Bi`), matching the seed. `targetWords` reference real ids present in P1's `vocabA2`/`vocabB1`.

## 4. Reading feed (`site/src/components/english/ReadingFeed.tsx`)

A new island, the reading surface:
- Reads the learner's band from placement (`getPlacement()?.band ?? "A2"`). Shows texts at that band (and, for comfort, the band below if any).
- A stream toggle: **general** / **engineering**.
- Lists each text as a card: title, source tag, level/stream, and a **read/unread** marker.
- Selecting a card opens that text rendered by the existing `EnReader` (Read + inline vocab + Check tabs). A back control returns to the list.
- `EnReader` is reused unchanged as the reader except for the read-completion hook (§5).

## 5. Reading → vocab + read tracking (`site/src/english/state.ts`, additive)

State gains:
- `readUnits: Record<string, true>` — texts the learner has completed.

New API:
- `isUnitRead(id): boolean`
- `markUnitRead(id, targetWords, now)` — sets `readUnits[id] = true` and calls `bumpSeen(word, now)` for each id in `targetWords` (first exposure → the word enters the FSRS deck and becomes due, so reading reinforces vocab). Idempotent: re-marking a read unit re-bumps nothing new (`bumpSeen` already no-ops on existing words).

Completion trigger: a text is "read" when the learner finishes its comprehension Check (the natural end of EnReader's flow). EnReader gains a small `onComplete?(unit)` prop the feed wires to `markUnitRead(unit.id, unit.targetWords ?? [], Date.now())`. All additions are additive to the P1 state shape; `load()` defaults `readUnits` to `{}`; `resetEnglish()` clears it.

## 6. Today + hub

- **Today** gains a reading slot: pick one unread text at the learner's band (prefer the engineering stream for this audience, fall back to general; alternate if both exhausted) and link into the feed. If none unread remain, show a done state.
- **Hub** `/[lang]/english/`: Today + the **Reading feed** (replacing the single hardcoded-seed `EnReader` section). Per-island hydration stays `client:visible`; the hub is a 2-segment route outside the piece hydration cap.

## 7. Grading / i+1 (lightweight proxy)

True ≥95%-token in-band coverage analysis is too heavy for P2. Instead:
- Each text is authored to stay mostly within at/below its band's vocabulary, with a small set of new words (the `targetWords`) glossed inline.
- A validity test enforces a **proxy**: `targetWords.length` is bounded (≤ 12 per text), every `targetWord` resolves to a real `VocabEntry` id, and `level` matches the file's band. This bounds new-word density without full token analysis. Documented as a proxy, not a guarantee.

## 8. Content generation

~40 texts via subagent fan-out (the P1 enrichment pattern), staged: **A2 (20: 10 general + 10 engineering) first, then B1 (20)**. Per text a subagent authors: 3–6 bilingual passages (en + ru + inline glossed `words`), 1–4 `phrases`, 3–4 comprehension MCQs (bilingual, valid `answer` index, few options), and `targetWords` referencing real band vocab ids. Subagents authoring from any web reference must distrust page content (prompt-injection) per `feedback_subagent-websearch-injection`. Engineering-stream texts mimic real artifacts (PR threads, RFC excerpts, incident notes, docs); general-stream texts are everyday broad-English. Each batch is gated by the validity test + a sample spot-check before commit.

## 9. Isolation (parent §9)

- `english/data/reading/*` — pure data modules + index/helpers; no logic.
- `components/english/ReadingFeed.tsx` — island; depends on reading data + state + types.
- `english/state.ts` — extended additively; still the only persistence owner.
- `components/english/EnReader.tsx` — reused; gains only an optional `onComplete` prop.

## 10. Testing (parent §10)

- **Reading data validity:** every unit well-formed — unique id; `level` ∈ {A2,B1,B2}; `stream` ∈ {general,engineering}; title/blurb/source/passages/questions/phrases bilingual + non-empty; ≥2 passages (each en+ru); ≥3 questions (each ≥2 options, valid `answer` index, bilingual); `targetWords` (if present) ≤12 and every id resolves to a real `vocabA2`/`vocabB1` entry. ~10 units per band×stream cell.
- **State:** `markUnitRead` sets read + bumps targetWords into the deck (assert a targetWord becomes a tracked word); `isUnitRead`; `load()` defaults `readUnits`; `resetEnglish()` clears it.
- **Build:** `bun run build` stays green (0 errors; warnings ≤ baseline 1271).

## 11. Open questions — resolved for P2

- **Reading surface:** new `ReadingFeed` island (list+progress) that opens texts in the reused `EnReader`. ✓
- **Corpus size:** ~10 per band×stream cell (~40 total), staged A2→B1. ✓
- **Vocab linkage:** inline glossing + `targetWords` → FSRS deck on read. ✓
- **Streams:** both general and engineering. ✓
- **i+1 enforcement:** proxy (bounded glossed targetWords + band match), not full token coverage. ✓

## 12. Build order within P2

1. Type extension (`stream`, `targetWords`) + reading-data scaffolding (dir, `index.ts`, migrate seed, helpers) + validity test (fails until data lands).
2. Generate A2 general + A2 engineering (~20), gated.
3. Generate B1 general + B1 engineering (~20), gated.
4. State read-tracking (`readUnits`, `markUnitRead`, `isUnitRead`) + tests.
5. `EnReader` `onComplete` hook (minimal).
6. `ReadingFeed` island.
7. Today reading slot + hub restructure.
8. Full build green; i18n labels.

Each step leaves the build green; content steps (2–3) are gated by the validity test + sample review before commit.
