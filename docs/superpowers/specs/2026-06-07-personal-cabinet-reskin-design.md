# Personal Cabinet Re-skin — Design

**Date:** 2026-06-07
**Sub-project:** Redesign v2, screen 4 of 5 (after English Hub, Planning, Progression). Source: `docs/redesign/v2/`.
**Target:** `/[lang]/account` — the account control room (`AccountPanel.tsx`).
**Nature:** Re-skin that **assembles existing working pieces** (GitHub auth, StateIO export/import/reset, the BYOK `KeyEntry`, the `SettingsDrawer` preference setters) into the editorial "Personal Cabinet" layout, plus a real progress **Overview** that links into the other screens. No new auth/crypto/storage engines.

---

## 1. Data → mockup mapping (verified against source)

| Mockup region | Real source | Status |
|---|---|---|
| **01 Identity** — GitHub sign-in/out, sync, terms, nickname, delete | `AccountPanel.tsx` logic: `fetchMe()` (`account-sync`), `/api/auth/login`, `/api/account/{terms,nickname}`, `activateSyncIfSignedIn`, `clearLocalProgress` | exists — re-skinned |
| **02 Overview** — Rank / English CEFR / Goal / Streak / Due today / Marks | rank: `rankById(pretest.rank)`+`pretest.rating`; CEFR: `getPlacement().band` (english/state); goal: `config.goals[0]`+`goalById` (path-io); streak: `progression.streak`; due: `dueCount(now)` (review-state); marks: `evaluateAchievements` count | **new aggregate** `overview.ts` |
| **03 Your data** — export / import / reset | `exportState(now)` / `importState(text)` (path-io) + `resetAll()`/`clearLocalProgress` (user-state) | exists — re-skinned |
| **04 BYOK** — key status, save/replace/remove, model, **security disclosure** | **embed existing `KeyEntry.tsx`** (carries the verbatim disclosure + real device/passphrase flow + grading-model pick) | exists — embedded |
| **05 Preferences** — theme / motion / language / reading depth / width | `SettingsDrawer` setters: theme (`data-theme`+`awesome.theme`), motion (`setMotion`), reading-depth=`setTier`, density (`data-density`); language = locale route switch | exists — re-skinned |
| top "synced · 2 min ago" chip | sync state from `fetchMe`/`activateSyncIfSignedIn` (synced when signed-in+terms) | partial — honest states only |

**No fabricated data.** The mockup's `1,840` rating, `47 / 112` marks, `38 cards`, `@avolkova`, "synced · 2 min ago", and the OpenAI/Ollama providers are NOT carried — real values replace them; the rating uses the real 0–1000 scale, marks use the real achievement total, BYOK shows the real Anthropic-only provider. Underivable values are omitted.

### BYOK security (hard constraint)

The Cabinet must NOT re-implement the BYOK UI or its disclosure. It **embeds the existing `KeyEntry` component verbatim**, so the security disclosure (`KeyEntry.tsx:24` EN / `:30` RU) is carried unchanged by construction — never re-typed, never weakened. The mockup's "Anthropic / OpenAI / Local" provider row is cosmetic; the real engine is Anthropic-only (`api.anthropic.com`), so only the real provider is shown.

---

## 2. Decisions (locked, autonomous)

1. **Reuse `TrajectoryTabs`** (`active="cabinet"`) + `screen-kit.css`. New `cabinet-screen.css` for cabinet-specific rules.
2. **One island.** `account.astro` renders static screen-head + tabs + a single `<CabinetPanel client:only="preact">`. `CabinetPanel` composes the five sections.
3. **Identity reuses the tested auth flow.** A new `IdentitySection` calls the same `fetchMe`/`account-sync`/`user-state` APIs `AccountPanel` uses (loading → signed-out value-prop+GitHub button → signed-in: avatar/nickname/handle + terms gate + nickname edit + sync note + account delete). `AccountPanel.tsx` is retired after cutover (only `account.astro` used it).
4. **BYOK embeds `KeyEntry` verbatim** (disclosure unchanged). Only its outer container is wrapped in the cabinet panel; the component's text is untouched.
5. **Your data** reuses `exportState`/`importState`/`resetAll`. **Honest scope:** the existing bundle covers the path graph + progression + settings (userState); it does NOT include the English-layer state. The copy says exactly what's exported (no "everything" overclaim). Reset is two-step (type-to-confirm or explicit confirm), reusing the existing confirm flow.
6. **Preferences** reuse `SettingsDrawer` setters: Theme, Motion, Reading-depth (`setTier`), Density (the mockup's "reading width" maps to the real density token). Interface language = a link/toggle to the same page in the other locale (the real i18n mechanism). No new preference engine.
7. **Overview = real aggregates.** `overview.ts` (pure) formats the six cards from supplied raw values; the async identity/CEFR bits are read in the component. A card whose value is unavailable (e.g. not placed → no CEFR, no pretest → no rank) shows a neutral "—/not yet" and still links to where you'd earn it.
8. **Omit fabrications**: no fake sync timestamp (show only honest "synced"/"local-only" states), no OpenAI/Ollama, no invented counts.
9. **Bilingual EN+RU**, linter-enforced; **light + dark**.

---

## 3. Architecture

```
account.astro                          (Astro page)
  ├─ screen-kit.css + cabinet-screen.css
  ├─ screen-head (control-room kicker)        ← static
  ├─ <TrajectoryTabs active="cabinet"/>       ← static
  └─ <CabinetPanel client:only="preact"/>     ← THE island
        CabinetPanel (shell)
          ├─ IdentitySection      (fetchMe → signed-in/out; reuses account-sync/user-state APIs)
          ├─ OverviewGrid         (overview.ts cards → /roadmap, /english, /profile, /review)
          ├─ DataSection          (exportState / importState / resetAll)
          ├─ ByokSection          (embeds <KeyEntry/> — disclosure verbatim)
          └─ PreferencesSection   (SettingsDrawer setters, re-skinned)
```

### New pure module (TDD, local)
- **`src/scripts/account/overview.ts`** — `overviewCards(input): OverviewCard[]` where `input = { rank?: {label,rating}, cefr?: string, goal?: string, streak: {count,best}, due: number, marks: {earned,total} }` and `OverviewCard = { key, label:{en,ru}, value:string|null, sub:{en,ru}, href:(lang)=>string }`. Pure formatting + null-handling; unit-tested.

### Components (built in-process by a subagent vs the HANDOFF — cowork can't git)
`src/components/account/`: `CabinetPanel.tsx` (replaces `AccountPanel` as the island), `IdentitySection.tsx`, `OverviewGrid.tsx`, `DataSection.tsx`, `ByokSection.tsx`, `PreferencesSection.tsx`. New `cabinet-screen.css`. Embeds existing `KeyEntry` (english) untouched.

---

## 4. Data flow & error handling

- Identity is async (`fetchMe` → `/api/me`): three states — loading, signed-out, signed-in. **Locally `/api/me` 404s** (no CF Functions in dev) → treated as signed-out (the honest local-first default), never an error toast.
- Export builds a blob download (`exportState`); import reads a file → `importState(text)` → `{ok}|{ok:false,error}`; show the error message on failure (no silent fail). Reset requires explicit confirm; on success clears local progress.
- BYOK: all key handling stays inside `KeyEntry` (device/passphrase encrypt, `keyStatus`, `clearKey`) — the Cabinet never touches the key.
- Overview: every card guards missing data (no pretest, not placed, no goal) and renders a neutral state; never throws on a fresh account.
- Preferences mutate `data-theme`/`data-density` + `awesome.*` localStorage + `userState` (motion/tier) exactly as `SettingsDrawer` does — same setters, no divergence.
- No new `localStorage`/`Date.now()` paths in components beyond the existing setters (export's `now` comes from the island boundary).

---

## 5. Testing

- **Unit:** `overview.test.ts` — card formatting, null/neutral states (no rank, not placed, zero due), href per locale.
- **Build/lint:** `bun run build` 0/0; i18n parity; one island.
- **Visual:** Playwright clipped 2× shots, light+dark, EN+RU — identity (signed-out local-first), overview grid, data section, BYOK (disclosure visible + verbatim), preferences. Judge contrast on clips.
- **Security check (explicit):** diff-grep that the BYOK disclosure text is unchanged from `KeyEntry.tsx:24/30` and that no copy of it was introduced elsewhere; confirm `KeyEntry` is embedded, not re-implemented.
- **Hybrid verify-behind:** reviewer + gates + visual + dead-code cutover (`AccountPanel`) per `feedback_cowork-hybrid`.

---

## 6. Out of scope

- New auth/crypto/sync/storage engines (all reused).
- A multi-provider BYOK (engine is Anthropic-only).
- Including English-layer state in the export bundle (kept to the existing bundle; copy is honest about scope).
- The last screen (Achievements).
