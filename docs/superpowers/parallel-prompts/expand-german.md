# Expand the German learning layer (vocab + reading + grammar toward B1)

Branch: `expand-german`. First read `PROTOCOL.md` (for the build/commit/safety rules) AND `docs/superpowers/specs/2026-06-04-german-layer-sub-design.md` (the layer's architecture). The German layer is NOT a track of MDX lessons — it is data + components under `site/src/german/` and `site/src/components/german/`, route `/[lang]/german`. This is DATA EXPANSION, not new MDX lessons. Commit to `expand-german` only; do NOT merge/push.

## Goal: take the German layer from a thin seed (~116 vocab, 6 reading, 6 grammar, 8 output) toward a real A1→B1 daily-usable set.

## Work (each step independently buildable; commit after each)
1. **Vocab** — grow the three decks (`site/src/german/data/vocab-{a1,a2,b1}.ts`). Append entries (do NOT renumber existing; continue ranks). Target ~250 A1, ~250 A2, ~150 B1. **Every noun is article-bearing** ("der/die/das X") with the CORRECT gender — this is the #1 correctness bar. Mix everyday German + developer/engineering vocab. Each entry: id via `idFor(rank)`, unique ascending rank, band, pos, correct `ru`, short `gloss`, ≥1 natural example, domain. Keep the exact `VocabEntry` shape from `german/types.ts`. After adding, ensure `germanDeck` in `german/state.ts` still aggregates all three (it already spreads a1+a2+b1).
2. **Reading** — add ~8 more `ReadingUnit` across A1/A2/B1 × general/engineering under `site/src/german/data/reading/` (new files + register in `reading/index.ts`). `Passage = {de, ru}` (German in `.de`); Phrase/Question reuse `{en,ru}` with German in the `.en` slot (match the existing files). 3-5 passages + 2-3 comprehension MCQs each; seed `targetWords`.
3. **Grammar** — add ~8 more `GrammarPoint` to `german/data/grammar.ts`: Perfekt (haben/sein), modal verbs, adjective endings (the hard one), Genitiv, Präteritum, Passiv, Komparativ/Superlativ, Wechselpräpositionen (two-way prepositions Akk/Dat). Each: bilingual title/structure/explain, ≥2 examples ({de,ru}), ≥2 cloze with correct answers. **Verify every case form and cloze answer is grammatically correct** — wrong German teaches wrong things.
4. **Output** — add ~6 more `OutputTask` to `german/data/output/tasks.ts` across bands/types (German prompts, German modelAnswer + ru).
5. **(Optional, if time) German TTS** — add `site/src/german/speech/tts.ts` mirroring `site/src/english/speech/tts.ts` but `pickGermanVoice()` filtering `v.lang.startsWith("de")` (default de-DE), and wire a "play pronunciation" button into the German VocabModule. This is the only deferred feature worth pulling forward (cheap, high value for vocab). Do NOT pull in Whisper/STT.

## Correctness is paramount (you're teaching a real language)
- Every noun gender correct. Every case form / declension / cloze answer grammatically correct. German spelling with proper ß/ü/ö/ä (no ASCII substitutes in running German text). RU translations accurate and natural.
- After authoring, run a READ-ONLY German-correctness review subagent over the new data (genders, cases, cloze answers, spelling, RU) and fix all confirmed errors.

## Verify
- `cd site && bun run test src/german 2>&1 | tail` — German unit tests still pass (add/extend tests for new deck counts if useful).
- `cd site && bun run build 2>&1 | tail -10` — GREEN, 0 lint warnings; `/[lang]/german` still renders.
- Commit on `expand-german` (`content(german): expand vocab/reading/grammar toward B1`). Do NOT merge/push. Report branch + final SHA + counts.
