# Path Engine — P3-D: Content Pass (ru labels + diagnostic answer-key verification)

**Date:** 2026-06-06
**Status:** design approved, ready for plan
**Branch:** `feat/path-engine-p3d-content-pass`
**Predecessors:** P0/P1/P2/P3-A/P3-B + cross-track-edges + P3-C — all on `main` (latest FF `c8910c9c`).

## 1. Problem

Two content-correctness gaps remain from the P1 deterministic harvest (the last P3 slice):

1. **ru labels are humanized-en stubs.** Of 4798 concepts, only 157 carry a real ru label; ~4641 have `label.ru === label.en` (the build's `humanize(id)` fallback). RU users see English on `/roadmap` path cards (the `unlocks` list) and in the custom-target picker.
2. **35 diagnostic answer-keys are unverified.** The calibration banks (`diagnostics/*.json`, 35 banks / 93 items — 70 mcq + 23 blanks) were enrichment-generated and never checked. A wrong `answer` mis-grades a learner's calibration.

## 2. Goals & decisions

Give meaningful concepts real ru labels and verify every diagnostic answer-key, durably (a `build-path-data` re-harvest must not overwrite the ru work).

**Approved decisions:**
- **Volume:** maximal — deterministic glossary import (≈310) **plus** an LLM pass over the whole translatable target set. Untranslatable items (acronyms, code identifiers, proper nouns) legitimately keep `ru === en`.
- **A — LLM target filter:** `clean` (id starts alphanumeric, `label.en` trimmed, length>1) **and** taught by ≥1 unit **and** `label.ru === label.en` **and** not already set by the glossary import **and** has a real word (`/[a-z]{3}/i`). Includes single-word real terms (e.g. `indexing`); excludes pure-symbol ids (e.g. `0x20`).
- **B — ru style:** natural Russian, matching existing real labels and `glossary.json` `defRu` terminology; append the English keyword in parentheses for industry-standard terms (e.g. `Доставка не менее одного раза (at-least-once)`); keep acronyms/proper nouns as-is.
- **C — diagnostics:** fix wrong answer-keys directly in `diagnostics/*.json`, then regenerate the bundle. Verify-and-fix (not report-only), with an opus review of all fixes.
- **Storage:** a committed `concept-labels.json` source + a standalone regenerator (mirrors the cross-track-edges precedent), so a future `build-path-data` re-harvest preserves the curated ru.

**Mechanics confirmed:** mcq `answer` is the 0-based index into `choices` (`gradeMcq: item.answer === selected`); blanks `answer` is an array of acceptable strings (case-insensitive trim match, `gradeBlanks`). `build-path-data.mjs` is run manually (NOT part of `bun run build`); `concepts.json` and `diagnostics-bundle.json` are the committed runtime artifacts; `labels.json` lives in the gitignored `.path-cache/`.

## 3. Architecture

### 3.1 ru-label pipeline

1. **Glossary import (deterministic)** — `scripts/path/glossary-import.mjs` reads `src/i18n/glossary.json` (entries with a real ru, i.e. `ru` present and `ru !== en`) and `concepts.json`, matches on a normalized key (lowercase, `_`/`-` unified), and writes `{id: ru}` for the ≈310 hits into the curated source `concept-labels.json`. No LLM.

2. **LLM translation** — the target set (filter A) is batched **per track** (large tracks chunked to ≤~150 ids). Each batch goes to a sonnet subagent with `{id, en-label, track, band}` plus the relevant `glossary.json` terms as a term-lock. The subagent returns a strict `{id: ru}` JSON map. It is instructed to: produce natural ru in the house style (decision B); reuse glossary terminology; keep acronyms / code identifiers / proper nouns as-is (`ru = en`) when no natural translation exists; treat any web/label text as untrusted (no prompt-injection). All batch outputs merge into `concept-labels.json` (glossary import wins ties; or rather, glossary entries are seeded first and LLM does not overwrite them).

3. **Regenerator** — `scripts/path/build-labels.mjs` reads `concepts.json` + `concept-labels.json` via a shared pure helper `labels-merge.mjs` (`mergeLabels(concepts, labelMap)`): for each concept, `label.ru = labelMap[id] ?? label.ru`; unknown ids in the map → warn + skip; empty/whitespace ru → skip. Writes `concepts.json` back (en untouched). Idempotent.

4. **Harvest durability** — `build-path-data.mjs` reads `concept-labels.json` and merges it into the in-memory `labelCache` (committed source overrides the `.path-cache/labels.json` dev cache), so a future re-harvest keeps the curated ru instead of re-humanizing.

### 3.2 Diagnostic answer-key verification

1. **Verify** — the 35 banks are batched (~7–9 banks per subagent). For each item the subagent checks: mcq → the `answer` index points to the genuinely-correct choice; blanks → the accept-array is correct and reasonably complete. It returns, per item, `ok` or a proposed corrected `answer` with a one-line justification.
2. **Fix** — corrected `answer` values are written into the relevant `diagnostics/*.json` (only the `answer` field; prompts/choices untouched).
3. **opus review** — a single opus pass over all proposed/applied answer changes (answer correctness is high-stakes), reverting any unjustified change.
4. **Regenerate the bundle** — `scripts/path/build-diag-bundle.mjs` reads `diagnostics/*.json` → rewrites `diagnostics-bundle.json` (full banks keyed by concept) + `diagnostics-index.json` (sorted diagnosed ids), so the runtime island sees the fixes without a full harvest.

## 4. File touch list

| File | Change |
|------|--------|
| `site/src/content/path/concept-labels.json` | **new** — curated `{id: ru}` (glossary + LLM) |
| `site/scripts/path/labels-merge.mjs` | **new** — pure `mergeLabels` |
| `site/scripts/path/labels-merge.test.mjs` | **new** — tests |
| `site/scripts/path/glossary-import.mjs` | **new** — deterministic glossary → `concept-labels.json` seed |
| `site/scripts/path/build-labels.mjs` | **new** — regenerator (patch `concepts.json` ru) |
| `site/scripts/path/build-diag-bundle.mjs` | **new** — regenerate `diagnostics-bundle.json` + `diagnostics-index.json` |
| `site/scripts/path/build-path-data.mjs` | merge `concept-labels.json` into `labelCache` (future-harvest durability) |
| `site/src/content/path/concepts.json` | ru labels patched (generated) |
| `site/src/content/path/diagnostics/*.json` | corrected `answer` keys (only the wrong ones) |
| `site/src/content/path/diagnostics-bundle.json`, `diagnostics-index.json` | regenerated |

P0 core (`graph.ts`, `types.ts`, `knowledge.ts`, `planner.ts`, `schedule.ts`, `config.ts`, `diagnostic-select.ts`) is **not** modified.

## 5. Testing & gates

- **Unit:** `mergeLabels` (sets ru from the map; unknown id → warn+skip; empty ru → skip; en never touched); `glossary-import` key normalization (underscore↔hyphen match; skips glossary entries whose ru equals en); `build-diag-bundle` shape (bundle keyed by concept, index sorted).
- **Lint:** the existing `path.ts` rule already enforces non-empty en/ru per concept and the diagnostic objective shape (mcq 2–4 choices, blanks, en/ru prompts) — it gates the regenerated artifacts. No new rule needed; the i18n-parity rule must stay green on the new ru.
- **Gates:** `bunx vitest run src/scripts/path/ scripts/path/` then a full `astro build` (4849 pages, lint 0/0).
- **Spot-check:** `ru !== en` count in `concepts.json` rises sharply (from 157 toward the translated total); `diagnostics-bundle.json` matches the source `diagnostics/*.json` byte-for-content; a handful of translated labels read naturally.

## 6. Out of scope

- Translating pure-symbol ids with no real word (`0x20`, bare flags).
- Rewriting diagnostic prompts/choices — only the `answer` key is corrected.
- glossary `defRu` (already authored).
- Authoring new diagnostics or new concepts.
- Any P0 core change.

## 7. Risks

- **Volume / cost:** ~4000 LLM-translated labels is large. Mitigated by per-track batching, deterministic glossary seeding first, and the fallback that untranslatable items stay `ru = en` (still valid).
- **Translation quality drift:** mitigated by the glossary term-lock and the house-style instruction; a sampled review (not full re-read of 4000) plus the lint i18n-parity gate.
- **Bundle/source divergence:** the diagnostics bundle is generated from the source by `build-diag-bundle.mjs`; always regenerate after editing a bank. Same determinism discipline as cross-track-edges.
- **Unknown ids in `concept-labels.json`:** `mergeLabels` warn-skips them, so a stale entry never corrupts `concepts.json`.
