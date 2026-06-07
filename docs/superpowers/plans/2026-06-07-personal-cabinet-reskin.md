# Personal Cabinet Re-skin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans. Steps use `- [ ]`.

**Goal:** Re-skin `/[lang]/account` (`AccountPanel.tsx`) into the editorial "Personal Cabinet" layout from `docs/redesign/v2/`, assembling existing pieces (auth, StateIO, BYOK `KeyEntry`, `SettingsDrawer` setters) + a real progress Overview. No new engines.

**Architecture:** One Preact island (`CabinetPanel`, `client:only`) composing five sections (Identity, Overview, Your data, BYOK, Preferences). Static screen-head + tabs in `account.astro`. One new pure module (`overview.ts`) feeds the overview grid; everything else reuses existing APIs. The BYOK section EMBEDS the existing `KeyEntry` so its security disclosure is carried verbatim.

**Tech Stack:** Astro 5, Preact + signals, Tailwind + CSS-var tokens, Vitest, bun.

**Hybrid split:** LOCAL = `overview.ts` (TDD) + `account.astro` shell + `cabinet-screen.css` placeholder + handoff + verify/merge. Subagent = the five section components + `CabinetPanel` + `cabinet-screen.css` fill. Order: LOCAL 1–4 → 5 handoff → subagent 6 → LOCAL 7.

**Branch:** `feat/personal-cabinet-reskin` off `main`.

**Verified facts (from source):**
- `AccountPanel.tsx` auth flow: `fetchMe()` (`~/scripts/account-sync`) → `Me|null|undefined`; signed-out → `<a href="/api/auth/login?lang=…">`; signed-in → avatar/nickname/`me.login`/`me.createdAt`, terms gate (`/api/account/terms`), nickname `PATCH /api/account/nickname`, delete `DELETE /api/account`+`clearLocalProgress`, `activateSyncIfSignedIn`. `/api/me` 404s locally → `me===null` → signed-out (NOT an error).
- BYOK: `KeyEntry.tsx` (`~/components/english/KeyEntry`) — full device/passphrase flow + grading model + the **verbatim** disclosure (EN `:24`, RU `:30`). Embed as-is.
- StateIO: `exportState(now: number)` triggers a JSON blob download; `importState(text: string): {ok:true}|{ok:false,error}`; both in `~/scripts/path/path-io`. Reset: `resetAll()` (`~/scripts/user-state`) + `clearLocalProgress()`. (Read `StateIOPanel.tsx` — it already wires export/import/reset; reuse its handlers' shape.)
- Preferences (from `SettingsDrawer.tsx`): theme → `document.documentElement.setAttribute("data-theme",v)` + `localStorage["awesome.theme"]`; density → `data-density` + `localStorage["awesome.density"]`; motion → `setMotion(v)` (userState); reading-depth → `setTier(tier,true)` (userState `s.tier`). Language → navigate to the same path under the other locale.
- Overview sources: `rankById`/`nextRank` + `userState.pretest.{rank,rating}`; `getPlacement()?.band` (`~/english/state`); `config.value.goals[0]` + `content.goalById` (path-io); `userState.progression.streak.{count,best}`; `dueCount(Date.now())` (`~/scripts/review-state`); `evaluateAchievements(state,ctx)` length + the `ACHIEVEMENTS` total (`~/scripts/progression/achievements`).
- `TrajectoryTabs` already supports `active="cabinet"`. `screen-kit.css` holds the shared chrome.

---

## Task 1: [LOCAL] `overview` pure module

**Files:** Create `site/src/scripts/account/overview.ts` + `overview.test.ts`.

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { overviewCards } from "./overview";

const base = { streak: { count: 23, best: 61 }, due: 38, marks: { earned: 12, total: 112 } };

describe("overviewCards", () => {
  it("formats all six cards from real values", () => {
    const cs = overviewCards({ ...base, rank: { label: "Engineer III", rating: 470 }, cefr: "B1", goal: "Senior fullstack" });
    expect(cs).toHaveLength(6);
    const by = Object.fromEntries(cs.map((c) => [c.key, c]));
    expect(by.rank.value).toBe("Engineer III · 470");
    expect(by.cefr.value).toBe("B1");
    expect(by.goal.value).toBe("Senior fullstack");
    expect(by.streak.value).toBe("23");
    expect(by.due.value).toBe("38");
    expect(by.marks.value).toBe("12 / 112");
  });
  it("renders neutral values when data is absent (fresh account)", () => {
    const cs = overviewCards({ ...base, streak: { count: 0, best: 0 }, due: 0, marks: { earned: 0, total: 112 } });
    const by = Object.fromEntries(cs.map((c) => [c.key, c]));
    expect(by.rank.value).toBeNull();   // no rank → null (component shows a neutral dash)
    expect(by.cefr.value).toBeNull();
    expect(by.goal.value).toBeNull();
    expect(by.due.value).toBe("0");
  });
  it("hrefs are locale-prefixed", () => {
    const cs = overviewCards({ ...base, rank: { label: "X", rating: 1 } });
    expect(cs.find((c) => c.key === "rank")!.href("ru")).toBe("/ru/profile");
    expect(cs.find((c) => c.key === "due")!.href("en")).toBe("/en/review");
  });
});
```

- [ ] **Step 2:** `cd site && bun run test -- account/overview` → FAIL.
- [ ] **Step 3: Implement**

```ts
// site/src/scripts/account/overview.ts
export interface OverviewInput {
  rank?: { label: string; rating: number };
  cefr?: string;
  goal?: string;
  streak: { count: number; best: number };
  due: number;
  marks: { earned: number; total: number };
}
export interface OverviewCard {
  key: "rank" | "cefr" | "goal" | "streak" | "due" | "marks";
  label: { en: string; ru: string };
  value: string | null;            // null → component shows a neutral "—"
  sub: { en: string; ru: string };
  href: (lang: "en" | "ru") => string;
}

export function overviewCards(i: OverviewInput): OverviewCard[] {
  return [
    { key: "rank", label: { en: "Rank", ru: "Ранг" },
      value: i.rank ? `${i.rank.label} · ${i.rank.rating}` : null,
      sub: { en: "Progression →", ru: "Прогресс →" }, href: (l) => `/${l}/profile` },
    { key: "cefr", label: { en: "English (CEFR)", ru: "Английский (CEFR)" },
      value: i.cefr ?? null,
      sub: { en: "English Hub →", ru: "English Hub →" }, href: (l) => `/${l}/english` },
    { key: "goal", label: { en: "Current goal", ru: "Текущая цель" },
      value: i.goal ?? null,
      sub: { en: "Planning →", ru: "Планирование →" }, href: (l) => `/${l}/roadmap` },
    { key: "streak", label: { en: "Streak", ru: "Серия" },
      value: String(i.streak.count),
      sub: { en: `best ${i.streak.best} →`, ru: `рекорд ${i.streak.best} →` }, href: (l) => `/${l}/profile` },
    { key: "due", label: { en: "Due today", ru: "Сегодня к повтору" },
      value: String(i.due),
      sub: { en: "review →", ru: "повторить →" }, href: (l) => `/${l}/review` },
    { key: "marks", label: { en: "Marks earned", ru: "Знаки получены" },
      value: `${i.marks.earned} / ${i.marks.total}`,
      sub: { en: "Achievements →", ru: "Достижения →" }, href: (l) => `/${l}/profile` },
  ];
}
```

> Note: marks/cefr/goal link to `/profile` (Achievements has no route yet); update marks href to `/achievements` when that screen ships.

- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(account): overview read-model for the cabinet`.

---

## Task 2: [LOCAL] `account.astro` shell + empty `cabinet-screen.css`

**Files:** Modify `site/src/pages/[lang]/account.astro`; create `site/src/styles/cabinet-screen.css`.

- [ ] **Step 1:** Create `cabinet-screen.css` (header comment only).
- [ ] **Step 2:** Rewrite `account.astro`: load `screen-kit.css` + `cabinet-screen.css`; render screen-head (kicker "Your trajectory · the control room" / "Твоя траектория · центр управления", title "Personal Cabinet" / "Личный кабинет", sub from the mockup, translated) + `<TrajectoryTabs active="cabinet"/>` + `<CabinetPanel client:only="preact"/>`. Keep `getStaticPaths`/`isLocale`.

```astro
---
import Topic from "../../layouts/Topic.astro";
import CabinetPanel from "../../components/account/CabinetPanel.tsx";
import TrajectoryTabs from "../../components/path/planning/TrajectoryTabs.astro";
import { type Locale, isLocale, t } from "../../i18n";
import "../../styles/screen-kit.css";
import "../../styles/cabinet-screen.css";

export function getStaticPaths() { return [{ params: { lang: "en" } }, { params: { lang: "ru" } }]; }
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
const head = lang === "ru"
  ? { kicker: "Твоя траектория · центр управления", title: "Личный кабинет", sub: "Личность, твои данные и настройки в одном месте. Local-first по умолчанию — прогресс живёт на твоём устройстве; вход только добавляет синхронизацию." }
  : { kicker: "Your trajectory · the control room", title: "Personal Cabinet", sub: "Identity, your data, and preferences in one place. Local-first by default — your progress lives on your machine; sign-in only adds sync." };
---
<Topic title={t("account.title", lang)} lang={lang}>
  <main class="page"><div class="wrap screen">
    <section class="screen-head"><div>
      <div class="kicker">{head.kicker}</div>
      <h1 class="sh-title">{head.title}</h1>
      <p class="sh-sub">{head.sub}</p>
    </div></section>
    <TrajectoryTabs lang={lang} active="cabinet" />
    <CabinetPanel client:only="preact" lang={lang} />
  </div></main>
</Topic>
```

- [ ] **Step 3:** Create a stub `site/src/components/account/CabinetPanel.tsx` that renders a placeholder (so the build resolves before the subagent fills it):

```tsx
import { type Locale } from "~/i18n";
export default function CabinetPanel({ lang }: { lang: Locale }) {
  return <p class="meta">{lang === "ru" ? "Кабинет…" : "Cabinet…"}</p>;
}
```

- [ ] **Step 4:** `bun run build` → 0/0. **Step 5:** Commit `feat(account): cabinet screen shell + tabs`.

---

## Task 3: [LOCAL] confirm reuse seams (read-only)

- [ ] Read `StateIOPanel.tsx` (export/import/reset handler shapes), `account-sync.ts` (`fetchMe` + `Me` type), `english/state.ts` (`getPlacement`), `progression/achievements.ts` (`ACHIEVEMENTS` total). Confirm the subagent has exact signatures; add any tiny missing export LOCAL and note it in the handoff. No commit unless a seam needs an export.

---

## Task 4: [LOCAL] Write the subagent HANDOFF

**Files:** Create `docs/redesign/v2/HANDOFF-cabinet-reskin.md`.

Mirror the Progression handoff: branch, pixel source (`Personal Cabinet.html`/`cabinet.css`/`cabinet.js`), the Planning/Progression re-skins as the canonical pattern, done-APIs (`overview.ts`; the auth flow from `AccountPanel`; `exportState`/`importState`/`resetAll`; `KeyEntry` to EMBED; `SettingsDrawer` setters), and the **hard contracts**:
- ONE island; real data only (no `1,840`/`47/112`/`38 cards`/fake sync timestamp/OpenAI/Ollama); EN+RU; light+dark; a11y; no new `localStorage`/`Date.now()` beyond existing setters.
- **SECURITY (non-negotiable):** the BYOK section MUST embed the existing `KeyEntry` component — do NOT re-implement the key UI and do NOT re-type or alter its disclosure text. The disclosure stays exactly as in `KeyEntry.tsx`.
- Identity: reuse the `AccountPanel` auth flow exactly (loading/signed-out/signed-in, terms gate, nickname, delete); `/api/me` 404 locally = signed-out, not an error.
- block-div fills; `cabinet-screen.css` scoped under `.screen`, relies on `screen-kit.css`.

Component contracts = Task 6 verbatim. Commit `docs(redesign): cabinet re-skin handoff`.

---

## Task 5: [COWORK→subagent] Build the sections + `cabinet-screen.css`

**Files (create under `site/src/components/account/`):** `IdentitySection.tsx`, `OverviewGrid.tsx`, `DataSection.tsx`, `ByokSection.tsx`, `PreferencesSection.tsx`; rewrite `CabinetPanel.tsx`; fill `site/src/styles/cabinet-screen.css`.

**Contracts:**
- **`CabinetPanel.tsx`** — island shell; composes the five sections in `.screen-section` blocks with `.sec-head`/`.sec-index` (01 ACCOUNT, 02 OVERVIEW, 03 YOUR DATA, 04 AI KEY, 05 PREFERENCES); `cab-grid` two-column for Data+BYOK like the mockup; keep `{lang}`.
- **`IdentitySection.tsx`** — reuse the `AccountPanel` auth logic verbatim (fetchMe, states, terms, nickname, delete, sign-in href, `activateSyncIfSignedIn`); re-skin into the `.identity` panel (signed-out value-prop + GitHub button + terms; signed-in id-card avatar/name/handle + sync chip + sign-out + local-first note). `/api/me` 404 → signed-out.
- **`OverviewGrid.tsx`** — build `overviewCards(...)` from real reads (rank via `rankById`+pretest; `getPlacement().band`; goal via `config.goals[0]`+`content.goalById`; `progression.streak`; `dueCount(Date.now())`; `evaluateAchievements` length + `ACHIEVEMENTS.length`). Render `.overview` `.ov-card` links; a null value shows a neutral "—".
- **`DataSection.tsx`** — export (`exportState(Date.now())`), import (file input → `importState(text)`, show `.error` on failure), reset (confirm → `resetAll()`). Honest scope copy (path + progression + settings; not English-layer). `.set-list`/`.set-row` layout.
- **`ByokSection.tsx`** — `.panel` wrapper that **renders `<KeyEntry lang={lang}/>`** (imported from `~/components/english/KeyEntry`). Do NOT re-implement; the disclosure comes from KeyEntry untouched. Optionally a heading; nothing that duplicates the disclosure.
- **`PreferencesSection.tsx`** — `.set-list` rows: Theme (`data-theme`+`awesome.theme`), Motion (`setMotion`), Reading depth (`setTier`), Density (`data-density`+`awesome.density`), Interface language (links to the other-locale route). Reuse the exact setter behaviour from `SettingsDrawer`; `aria-pressed` segments.
- **`cabinet-screen.css`** — port `cabinet.css` scoped under `.screen` (identity/id-card/sync chip, overview grid, set-list/set-row, byok status/field/security, cab-grid, preferences); rely on `screen-kit.css`; no unresolved `var(--*)`; light+dark.

**Hard contracts:** ONE island; real data only (no mockup numbers/sync-timestamp/extra providers); EN+RU; **BYOK disclosure via embedded `KeyEntry`, never re-typed/weakened**; block-div fills; a11y; light+dark.

**Done:** `bun run build` 0/0, `bun run test` green, screen renders real data, one island. Commit per component.

---

## Task 6: [LOCAL] Verify-behind + cutover + merge

- [ ] Pull/clean junk; independent reviewer; fix findings.
- [ ] **Security gate:** grep-confirm the BYOK disclosure text appears ONLY in `KeyEntry.tsx` (not copied into any account component) and `ByokSection` imports/embeds `KeyEntry`.
- [ ] Gates: `bun run test` (incl. Task 1) + `bun run build` 0/0.
- [ ] Visual: Playwright clipped shots, light+dark, EN+RU (seed a placed pretest + knowledge + a streak) — identity (signed-out local-first), overview, data, BYOK (disclosure visible), preferences. Confirm other screens unaffected.
- [ ] Cutover: delete `AccountPanel.tsx` once `account.astro` no longer imports it (grep-confirmed).
- [ ] Commit, push `feat/personal-cabinet-reskin`. **FF-merge to main ONLY on explicit owner command.**

---

## Self-Review

**Coverage:** identity → T5; overview → T1+T5; your-data → T5; BYOK (verbatim disclosure) → T5 (embed KeyEntry); preferences → T5; tabs → reuse; shell → T2; one-island → T2+T5; honest framing → T1,T5; EN+RU → all; security gate → T6. All spec §1–§5 covered.

**Placeholders:** `overview.ts` (T1) + shell (T2) complete; section components (T5) are contracts + handoff + pixel source (intended hybrid).

**Type consistency:** `OverviewCard`/`OverviewInput` T1↔T5; `Me`/auth APIs reused from AccountPanel; `KeyEntry` props `{lang,onChange?}`; `exportState`/`importState`/`resetAll` names verified.

**Security:** the only safe way to keep the disclosure verbatim is to embed `KeyEntry`; T5 + the T6 security gate enforce it.
