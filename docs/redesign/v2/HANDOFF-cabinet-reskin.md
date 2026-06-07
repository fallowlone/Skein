# HANDOFF — Personal Cabinet re-skin (UI sections)

You build the **section components** + the screen stylesheet for the Open Atlas "Personal Cabinet" re-skin. The pure read-model, the Astro shell/tabs, and the shared `screen-kit.css` are **already done and committed** on the branch. This screen mostly **assembles existing working pieces** (auth, StateIO, the BYOK `KeyEntry`, the `SettingsDrawer` setters) into the editorial layout — recreate the mockup visually, wired to the real APIs. The controller verifies behind you.

## Start
```bash
git checkout feat/personal-cabinet-reskin   # has Tasks 1–4
cd site && bun install
```
Plan: `docs/superpowers/plans/2026-06-07-personal-cabinet-reskin.md` (your task is **Task 5**).
Spec: `docs/superpowers/specs/2026-06-07-personal-cabinet-reskin-design.md`.

## Pixel source + canonical pattern
- Pixel: `docs/redesign/v2/project/Personal Cabinet.html`, `cabinet.css`, `cabinet.js`.
- **Match the SHIPPED Planning + Progression re-skins exactly** for structure/idiom: `site/src/components/path/PathView.tsx`, `site/src/components/progression/ProfilePanel.tsx`, and `site/src/styles/{planning,progression}-screen.css` + `screen-kit.css`. One-island composition, `const L={en,ru}` maps, signal reads in render, block-`<div>` fills, `.screen-section`/`.sec-head`/`.sec-index`, CSS scoped under `.screen`.

## Done-APIs — build on these (do NOT add engines)
- **`~/scripts/account/overview.ts`**: `overviewCards(input): OverviewCard[]` — `input = { rank?:{label,rating}, cefr?:string, goal?:string, streak:{count,best}, due:number, marks:{earned,total} }`; `OverviewCard = { key, label:{en,ru}, value:string|null, sub:{en,ru}, href:(lang)=>string }`. A null `value` → render a neutral "—".
- **Identity (reuse `AccountPanel.tsx` logic verbatim):** `fetchMe()` from `~/scripts/account-sync` → `{login,nickname,avatarUrl,createdAt,termsAccepted,termsVersion}|null|undefined` (undefined=loading, null=signed-out). Sign-in: `<a href={`/api/auth/login?lang=${lang}`}>`. Terms: `POST /api/account/terms`. Nickname: `PATCH /api/account/nickname`. Delete: `DELETE /api/account` then `clearLocalProgress()`. `activateSyncIfSignedIn()` / `clearLocalProgress()` from `~/scripts/user-state`. **`/api/me` 404s locally → null → signed-out (NOT an error).**
- **Your data:** `exportState(Date.now())` (blob download) + `importState(text): {ok:true}|{ok:false,error}` from `~/scripts/path/path-io`; reset = `resetAll()` from `~/scripts/user-state`. Honest scope: the bundle covers the path graph + progression + settings (userState) — NOT the English-layer state. Say so; don't claim "everything".
- **Overview reads:** rank → `rankById(userState.value.pretest?.rank)`+`.rating` (`~/scripts/progression/ranks`); CEFR → `getPlacement()?.band` (`~/english/state`); goal → `config.value.goals[0]` + `content.goalById` (`~/scripts/path/path-io`); streak → `userState.value.progression.streak`; due → `dueCount(Date.now())` (`~/scripts/review-state`); marks → `evaluateAchievements(userState.value, ctx)` length + `ACHIEVEMENTS.length` (`~/scripts/progression/achievements`). Guard every missing value (fresh account) → pass `undefined` so the card shows "—".
- **Preferences (reuse `SettingsDrawer.tsx` behaviour):** theme → `document.documentElement.setAttribute("data-theme",v)` + `localStorage["awesome.theme"]=v`; density → `data-density` + `localStorage["awesome.density"]`; motion → `setMotion(v)`; reading-depth → `setTier(tier,true)` (reads `userState.value.tier`); interface language → link to the same path under the other locale.

## SECURITY — non-negotiable
The BYOK section MUST **embed the existing component**: `import KeyEntry from "~/components/english/KeyEntry"` and render `<KeyEntry lang={lang} />`. Do **NOT** re-implement the key UI, and do **NOT** re-type, paraphrase, move, or weaken its security disclosure text. The disclosure lives in `KeyEntry.tsx` and must stay there, unchanged. The mockup's "OpenAI / Local / Ollama" providers are not real (engine is Anthropic-only) — do not add them.

## Hard contracts
1. ONE island — all sections composed inside `CabinetPanel`; NO `client:*` anywhere; do NOT edit `account.astro`.
2. Real data only — NO `1,840` rating (use the real 0..1000), NO `47/112`/`38 cards` placeholders, NO fake "synced · 2 min ago" timestamp (show only honest synced / local-only states), NO extra BYOK providers. Omit anything not derivable.
3. EN+RU `L` maps on every component; light + dark.
4. a11y: `aria-pressed` on segmented toggles; labelled file input; honor reduced-motion.
5. No new `localStorage`/`Date.now()` beyond the existing setters (export's `now` = `Date.now()` in the click handler is fine).
6. Block-div fills; `cabinet-screen.css` scoped under `.screen`, relies on `screen-kit.css`; no unresolved `var(--*)`.

## Your files (create under `site/src/components/account/`) + rewrite + css
`IdentitySection.tsx`, `OverviewGrid.tsx`, `DataSection.tsx`, `ByokSection.tsx`, `PreferencesSection.tsx`; rewrite `CabinetPanel.tsx` (sectioned shell: 01 ACCOUNT / 02 OVERVIEW / 03 YOUR DATA / 04 AI KEY / 05 PREFERENCES; `cab-grid` two-column for Data+BYOK); fill `site/src/styles/cabinet-screen.css` (port `cabinet.css` scoped). Exact per-component contracts are in plan **Task 5**.

## Workflow
- Iterate with `bun run test` + `bunx astro check`; run full `bun run build` ONCE at the end → 0 errors / 0 warnings (`dist/lint-report.json`).
- Do NOT touch git. Leave changes in the working tree; the controller reviews + commits.
- Report: files changed, final build lint summary, test count, deviations, omissions.

## Done = build 0/0, tests green, real data both themes/locales, one island, BYOK disclosure intact via embedded KeyEntry.
