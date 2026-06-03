# German Learning Layer — Sub-Design (reuses the English engine)

Date: 2026-06-04
Status: design only. Part of the `learning-expansion-tracks-german` program (Phase E).
Scope: a parallel **German** layer (vocab A1→B1, reading, output/writing, grammar incl.
cases), self-only, BYOK for LLM calls, no new server infra, no auth changes. The shipped
English layer (`site/src/english/`) must not be modified or broken.

## Executive summary — reuse strategy
- The reusable core is small + clean: **import as-is** the FSRS scheduler (`english/scheduler/`), the BYOK singleton + transport (`english/byok/index.ts`, `byok/converse.ts` `postMessages`, `byok/grading.ts` `parseGrading`), `~/i18n`, `~/scripts/user-state` (`recordActiveDay`), `~/layouts/Topic.astro`.
- **No `targetLang` abstraction exists** (grep-confirmed); English is hardcoded throughout. So German is **disciplined duplication of a thin, well-factored pattern** (state/stats/placement/components are siblings), importing the 3–4 genuinely shared modules. Do NOT refactor the shipped English layer.
- Data is **plain TS arrays of typed records, not Astro content collections** → `src/content.config.ts` UNCHANGED, and **no lint rule references `english/`** (German `.ts/.tsx` is covered by tsc + tests only).
- **State namespacing:** German `state.ts` uses `KEY="awesome.german.v1"`; BYOK key is **shared** (one Anthropic key, reuse `english/byok`); German calls shared `recordActiveDay()` (keeps the global streak). **Defer** writing `progression.germanSummary` (would touch shared progression/account-sync types).
- **v1 scope cut:** vocab+reading+grammar+output, German **local-only** dashboard. DEFER speech (English-voice + Whisper-wasm), global progression sync, `de-*` achievements, collocations.

## Reuse map
**Import as-is (no copy):** `english/scheduler/fsrs.ts` + `scheduler/types.ts`; `english/byok/index.ts` (singleton), `byok/converse.ts` (`postMessages`), `byok/grading.ts` (`parseGrading`); `~/i18n`; `~/scripts/user-state` (`recordActiveDay`); `~/layouts/Topic.astro`; optionally `~/components/english/KeyEntry` and `english/xp`.
**Sibling (copy-adapt, point at German data/state/key):** `state.ts`, `stats.ts`, `placement/` (scoring math copied, German inputs), `byok/grade.ts` (German coach SYSTEM prompt reusing `postMessages`+`parseGrading`), all `data/*`, all components.
**Defer:** `speech/*`, `sync.ts`→`germanSummary`, `de-*` achievements, `collocations.ts`.

## Data shapes (German-local types in `german/types.ts`)
Mirror the English record types but German-local so the lowest band is **A1** and reading text fields read naturally:
- `GerBand = "A1" | "A2" | "B1"`.
- `VocabEntry { id ("de:0042"), lemma (article-bearing: "das Verzeichnis"), rank, band: GerBand, pos, ru, gloss, ipa?, examples[], collocations?, domain? }`.
- `Passage { de: string; ru: string }`; `ReadingUnit { id, level: GerBand, stream, title{en,ru}, blurb{en,ru}, source{en,ru}, passages: Passage[], phrases[], questions[], targetWords?: string[] }`.
- `GrammarPoint { id, band: GerBand, title{en,ru}, structure{en,ru}, explain{en,ru}, examples:{de,ru,note?}[], cloze: ClozeItem[]≥2, register? }` — covers cases (one point per Nominativ/Akkusativ/Dativ/Genitiv), gender/articles (der/die/das), word order (V2, subordinate verb-final), separable verbs, all via `cloze`.
- `OutputTask { id, band: GerBand, type, prompt{en,ru}, rubric: string[], modelAnswer?:{de,ru}, hint? }`.
- Re-export `Grade`, `CardState`, `GradingResult` from `english` (identical).
- German `data/bands.ts`: own `BAND_SIZE` (e.g. A1:600, A2:1000, B1:1500) + `idFor("de", rank)`.

## New files (exact paths)
```
site/src/german/
  types.ts  state.ts (KEY="awesome.german.v1")  stats.ts  xp.ts
  placement/{placement.ts, sample-words.ts, pseudowords.ts}
  byok/grade.ts
  data/bands.ts
  data/{vocab-a1.ts, vocab-a2.ts, vocab-b1.ts}
  data/grammar.ts
  data/output/tasks.ts
  data/reading/{index.ts, a1-general.ts, a1-engineering.ts, a2-*, b1-*}
site/src/pages/[lang]/german/index.astro
site/src/components/german/{GermanDashboard,Today,PlacementTest,VocabModule,ReviewSession,ReadingFeed,DeReader,GrammarModule,OutputModule}.tsx
```
Plus: `i18n/ui.json` add flat keys `"nav.german"` (en/ru); `components/atlas/TopNav.astro` add one German link + `isGerman` flag. Hydration cap: German index ≤5 `client:visible` islands (mirror English: Dashboard, Today, Reading, Grammar, Output).

## Seed amounts (start small, grow by appending)
Vocab ~120 (60 A1 / 40 A2 / 20 B1, article-bearing). Reading 6 units (2 per band, mix general/engineering). Grammar 6 points (der-die-das · Akkusativ · Dativ · V2 word order · subordinate verb-final · separable verbs). Output 8 tasks. Placement ~30 real + ~10 pseudowords across bands. Collocations 0 (defer).

## Build / lint / config implications
- `content.config.ts`: NO CHANGE (plain TS data). Lint: NO CHANGE (no rule touches the learning layers). Routes auto-discovered by Astro file router. CSP: none (no wasm/speech in v1).
- Tests: mirror the English `*.test.ts` for German scheduler usage, state mutators, placement, data counts.

## Task breakdown (ordered, each leaves build green)
1. `german/types.ts` (GerBand + record types; re-export Grade/CardState/GradingResult). 2. `german/data/bands.ts` + test. 3. `german/data/vocab-a1.ts` seed ~60 + test. 4. `german/state.ts` (copy english, KEY=awesome.german.v1) + test. 5. `german/stats.ts` + `xp.ts`. 6. `german/placement/*` (math copy + German words) + test. 7. components `PlacementTest`+`VocabModule`+`ReviewSession`. 8. `Today.tsx` orchestrator. 9. `pages/[lang]/german/index.astro` + `GermanDashboard` + `nav.german` ui key + TopNav link → **first end-to-end usable build**. 10. `data/grammar.ts` (6) + `GrammarModule`. 11. `data/reading/*` (6) + `ReadingFeed`+`DeReader`. 12. `data/output/tasks.ts` + `byok/grade.ts` + `OutputModule` (reuse `KeyEntry`). 13. full build+lint green, hydration ≤5, visual EN+RU check.
Deferred slice: German sync (`germanSummary`), `de-*` achievements, speech (tts `de` + scenarios), collocations.

## Risks / scope cuts
Defer speech (English-voice + Whisper wasm/CSP cost). Defer global progression integration (editing `progression/types.ts` pulls in account-sync) — German local-only in v1, streak still via shared `recordActiveDay()`. No German frequency CSV committed → seed is hand-authored/reviewed (approximate ranks, fine — bands are heuristic). German-local types (`GerBand`, `Passage{de,ru}`) chosen deliberately so the lowest band is A1 and reading reads naturally; German components are siblings anyway so renamed fields cost nothing. Cloze checker is case-insensitive (won't enforce German noun capitalization) — note correct caps in `hint`, use `alts` for variants. Never extract a `targetLang` abstraction from the shipped English layer.
