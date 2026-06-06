# English Hub re-skin — handoff for Tasks 10–13 (+14)

**Branch:** `feat/english-hub-reskin` (pushed to origin, off `main`).
**Plan:** `docs/superpowers/plans/2026-06-07-english-hub-reskin.md` — the authority. Do Tasks **10, 11, 12, 13, 14** exactly.
**Spec:** `docs/superpowers/specs/2026-06-07-english-hub-reskin-design.md`.
**Pixel source:** `docs/redesign/v2/project/English Hub.html` + `hub.css` (section line ranges are in the plan).

## What is DONE (Tasks 1–9, committed + pushed)

All the logic, data, styling, and sub-routes the UI tasks depend on. Build the UI on top of these — do NOT re-create them.

| Done | Use it via |
|------|-----------|
| `src/styles/english-hub.css` | every hub class (`.hub-bar`, `.coverage`, `.gauge-*`, `.band-row`, `.path-list`, `.action.is-{own,delegate,curate}`, `.byo`, `.pipeline`, `.module`, `.launchpad`, `.library`, `.honest`, `.reuse-grid` …). **Import once** on the landing page (Task 13 Step 2). Tokens all resolve against live `global.css`. |
| `src/english/register.ts` | `import { register, setRegister, type Register } from "~/english/register"` — signal; read `register.value` in render. |
| `src/english/coverage.ts` | `import { liveCoverage } from "~/english/coverage"` → `{ bands: [{band,known,total,pct}], overallPct, corpusTotal }`. Call `liveCoverage(register.value)` inside the island. |
| `src/english/byo/tokenize.ts` | `tokenizeToLemmas(text) → {lemma,count}[]` |
| `src/english/byo/classify.ts` | `classifyLemmas(lemmas, bank, isKnown) → {known,newWords,technical,counts}`; `bankIndex(entries)` |
| `src/english/byo/cards.ts` | `commitByoCards(ids: string[], now: number)` — creates real SRS cards for new-word ids |
| `src/english/byo/exercises.ts` | `generateExercises(text) → Promise<GenExercises>` (BYOK; throws if no key/err — catch + show "add key") |
| `src/english/data/listening.ts` | `import { listening } from "~/english/data/listening"` → `ListenItem[]` (`{title,url,kind,minutes,band,how:{en,ru}}`) |
| sub-routes | `/[lang]/english/{review,reading,grammar,writing}` exist — point CTAs at them. `/english/speaking` already existed. |

17 new unit tests pass; full english suite 127/127; new files type-clean.

## What REMAINS — Tasks 10–13 (UI) + 14 (gate)

- **Task 10** — `HubBar.tsx` + `CoverageMeter.tsx`. (CoverageMeter gauge math + the in-flow `<div>` band fills are spelled out in the plan — heed the band-fill note: **block div with inline `width:%`**, never a span-in-inline.)
- **Task 11** — `NextPath.tsx`, `OwnedModules.tsx`, `Launchpads.tsx`, `CuratedLibrary.tsx`, `HonestStrip.tsx`.
- **Task 12** — `ByoPipe.tsx` (wires tokenize→classify→commitByoCards→generateExercises; paste-only v1; graceful no-key).
- **Task 13** — `HubLanding.tsx` (ONE `client:visible` island composing the section components) + rewrite `src/pages/[lang]/english/index.astro` (import `english-hub.css`, mount `<HubLanding client:visible lang={lang} />`); retire the now-unused `Today.tsx`/`EnglishDashboard.tsx` mounts.
- **Task 14** — `bunx vitest run src/english/` + full `bun run build` (expect lint 0/0, +8 pages) + opus diff review. Do NOT merge/push to main without the owner.

## Non-negotiable contracts (don't break these)

1. **Security disclosure** — the BYOK key copy in `src/components/english/KeyEntry.tsx` (EN line ~24 / RU line ~30) is a legal/security statement: carry verbatim, never weaken. It already ships on `/english/writing` via `OutputModule`. The BYO exercise call reuses the audited `withKey()` — no new key handling, no new egress.
2. **Real data, not placeholder numbers.** Every stat must derive from state (`liveCoverage`, `dueWordIds(Object.keys(englishState.value.words), Date.now())`, `getPlacement()?.band ?? "A2"`, `userState.value.progression.streak.count`, `hasKey()`) or be honestly labeled. Where the mockup shows a number you can't derive (e.g. "89% retained over 30 days"), derive it or omit — don't hardcode.
3. **Single hydration boundary** — the landing mounts exactly one island (`HubLanding`); section components are plain Preact rendered inside it, not their own `client:*` islands. Heavy drills stay on the sub-routes.
4. **i18n** — inline `const L = lang === "en" ? {...} : {...}`; every new string EN+RU; verify Russian reflow (no clipping) in the dense layouts.
5. **Themes/a11y** — light+dark via tokens (free); focus rings, aria on toggles/gauge, `prefers-reduced-motion` (set gauge dashoffset directly, no JS animation), external links `rel="noopener"`.

## Gotchas already resolved (mirror them)

- `Grade` lives in `~/english/scheduler/types`; the "Again" grade literal is `"again"` (used in `cards.ts`).
- `ReviewSession` takes `{ lang, ids }` and snapshots ids — that's why `ReviewRoute.tsx` computes due ids client-side (Astro can't). Follow the same pattern for any client-state read.
- The BYO tokenizer fold is deliberately minimal (plural `s` + `ies→y`, `ss` guarded) — imperfect recall by design (unmatched → "technical"), never wrong merges.
