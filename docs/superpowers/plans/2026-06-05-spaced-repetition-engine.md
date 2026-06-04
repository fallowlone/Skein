# Spaced-Repetition Engine (P2 — Retention)

**Goal.** Turn ~1500 deep, read-once lessons into a *durable* skill by adding a spaced-repetition system: RetrievalDrawer Q/A and practice items become review **cards** with per-card scheduling state (interval + ease), a localStorage-backed **due-queue**, a **"due today"** review surface at `/[lang]/review`, and a due-count widget on `/profile`. The learner is pulled back to exactly what they are about to forget, on a schedule, instead of re-reading.

**Architecture.** Pure scheduling logic (SM-2) lives in `site/src/scripts/progression/srs.ts` — deterministic, no I/O, fully unit-tested. A thin store `site/src/scripts/review-state.ts` owns persistence (its own localStorage key, mirroring the `practice-state.ts` / `user-state.ts` pattern) and exposes `addCard`, `recordReview`, `dueBefore(now)`. Card *identity* is `lessonKey + source + index` so the same Q reseeds idempotently. Cards are seeded **lazily on first lesson visit** (no build-time index) by a small harvest call wired into the existing RetrievalDrawer and PracticeSection islands. The review UI is a new Preact island that reads the store, walks the due queue, grades each card via the `again|hard|good|easy` buttons, and writes the next interval back. `/[lang]/review` hosts it; `/profile` shows the due count.

**Tech Stack.** Astro 5, Preact, `@preact/signals`, Vitest, Bun.

**Spec.** `docs/superpowers/specs/2026-06-05-senior-readiness-gaps-register.md` (P2).

**Conventions.** Repo-root-relative paths; all app code under `site/`. No git commit unless the operator asks — batch a commit per phase when asked. Steps are bite-sized (2–5 min). Tests run with `bun run test` (vitest) from `site/`. The `~` alias maps to `site/src`.

**REQUIRED SUB-SKILL:** `superpowers:test-driven-development` — Phases 1 and 2 are deterministic logic and MUST be built test-first (write a failing Vitest test with real assertions, run it red, then write the minimal implementation, then run it green). Do not write implementation before its test exists and fails.

---

## Verified anchors (confirmed against the repo on 2026-06-05)

- **Persistence patterns to mirror:**
  - `site/src/scripts/user-state.ts` — `signal<UserState>` backed by one localStorage key (`awesome.user-state.v1`), `load()`/`save()` with SSR `typeof window === "undefined"` guards, `effect(() => save(...))`. Re-use the *shape* of this, not the same key.
  - `site/src/scripts/practice-state.ts` — minimal per-lesson localStorage store keyed `atlas.practice.${lessonKey}`, try/catch around every storage call. This is the closest analogue for the new card store.
  - `site/src/scripts/progression/streak.ts` — pure deterministic function (`updateStreak`, `todayISO`, `daysBetween`) + `streak.test.ts` — the exemplar for SM-2 pure-function TDD.
- **Test infra:** `site/vitest.config.ts` (jsdom env, `~` alias, `include: src/**/*.test.ts(x)`), `site/src/test-setup.ts` (in-memory `localStorage` polyfill — already global, so the store is testable). `bun run test` = `vitest run`.
- **Card sources:**
  - `site/src/components/pedagogy/RetrievalDrawer.tsx` — props are `{ pieceSlug, lang, questions }`. NOTE the prop drift to handle in Phase 4: the **component** type is `questions: { id, q, answer }[]` but **lesson MDX** passes `id="…"` and `questions={[{ q, a }]}` (e.g. `site/src/content/lessons/en/databases/03-execution-plans/07-plan-stability/index.mdx`, lines 205–213). Harvest must read `q` and (`a` || `answer`), and derive a stable per-question index when no `id` is present.
  - Practice items: collection `practice` in `site/src/content.config.ts:132` (`glob` over `src/content/practice/**/*.json`); each file has `lessonKey`, `track`, `tasks[]` with `id`, `type`, `title{en,ru}`, `prompt{en,ru}` (901 files today). These give card front (`prompt`) / back (`title` or model answer) per task.
- **Routing/UI:** pages live under `site/src/pages/[lang]/` (`account.astro`, `profile.astro`, `learn/…`); `learn/[track]/` already shows the `getStaticPaths` + island + `Topic` layout pattern. `site/src/pages/[lang]/profile.astro` mounts `ProfilePanel` via `client:only="preact"`. Existing static banner to retire/keep: `site/src/components/pedagogy/SpacedRevisitBanner.tsx`.

---

## Phase 0 — Design decisions (no code; write these into this plan, then proceed)

- [ ] **Algorithm: SM-2 (recommended) over Leitner.** Justification: Leitner's fixed box intervals are coarse and ignore *how hard* each recall was; SM-2 carries a per-card `ease` factor that adapts interval growth to the learner's actual difficulty with *that* card, which matters across 1500 heterogeneous senior-depth cards (a TCP-handshake Q and a Postgres-MVCC Q should not share a fixed ladder). SM-2 is also tiny and pure (no external deps), fits the `streak.ts` pure-function shape, and is trivially deterministic to test. We use a 4-grade input (`again|hard|good|easy`) mapped onto SM-2's 0–5 quality scale, which the review UI exposes as four buttons.
- [ ] **Card identity / key scheme.** `cardKey = \`${lessonKey}::${source}::${index}\`` where `source ∈ {"retrieval","practice"}` and `index` is the question's MDX order (0-based) for retrieval, or the task `id` for practice. Stable across reseeds → harvesting is idempotent (re-harvest never duplicates, never resets schedule). `lessonKey` is the same slug practice JSON already uses (e.g. `databases/03-execution-plans/03-join-algorithms`).
- [ ] **Seeding strategy: lazy on first lesson visit (recommended) over a build-time index.** Justification: a build-time card index would bloat every page and force a card schema into the content pipeline + linter; lazy seeding means a card only exists once the learner has actually seen the lesson (which is exactly when review should start). The RetrievalDrawer / PracticeSection islands already mount on the lesson page, so harvesting is a one-line `seedCards(...)` call at mount. New cards enter the queue with `interval: 0, ease: 2.5, due: now` (due immediately on next review session, not mid-lesson).
- [ ] **Card payload stored.** Keep cards *content-light*: store only `{ cardKey, lessonKey, source, index, front, back, lang, sched }`. `front`/`back` are short strings harvested at seed time (RetrievalDrawer `q`/`a`; practice `prompt`/`title`). This caps localStorage growth and avoids re-reading MDX at review time. See Risks for the size budget.
- [ ] **Persistence key & isolation.** New key `atlas.review.v1`, owned solely by `review-state.ts`. It does NOT live inside `UserState` (keeps the big synced blob small and avoids coupling review churn to account-sync debounce). If cross-device sync is wanted later it can be added to `account-sync.ts` separately — out of scope here.

---

## Phase 1 — SM-2 scheduler (pure functions, TDD)

Deterministic core. Build test-first. New module `site/src/scripts/progression/srs.ts`, test `site/src/scripts/progression/srs.test.ts`.

- [ ] **Write the failing test first.** Create `site/src/scripts/progression/srs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { type Grade, type Sched, freshSched, schedule } from "./srs";

const fresh: Sched = freshSched();

describe("srs / SM-2 scheduler", () => {
  it("a fresh card starts at interval 0, ease 2.5, reps 0", () => {
    expect(fresh).toEqual({ interval: 0, ease: 2.5, reps: 0, lapses: 0 });
  });

  it("first 'good' sets interval to 1 day, second to 6 days", () => {
    const r1 = schedule(fresh, "good");
    expect(r1.interval).toBe(1);
    expect(r1.reps).toBe(1);
    const r2 = schedule(r1, "good");
    expect(r2.interval).toBe(6);
    expect(r2.reps).toBe(2);
  });

  it("subsequent 'good' multiplies interval by ease and rounds", () => {
    let s = schedule(schedule(fresh, "good"), "good"); // interval 6, ease 2.5
    const r3 = schedule(s, "good");
    expect(r3.interval).toBe(15); // round(6 * 2.5)
  });

  it("'again' resets interval to 0 and reps to 0 and counts a lapse, ease drops but floors at 1.3", () => {
    const mature = { interval: 30, ease: 2.5, reps: 5, lapses: 0 };
    const r = schedule(mature, "again");
    expect(r.interval).toBe(0);
    expect(r.reps).toBe(0);
    expect(r.lapses).toBe(1);
    expect(r.ease).toBeCloseTo(2.5 - 0.2); // SM-2 q=2 penalty
    const floored = schedule({ interval: 30, ease: 1.35, reps: 5, lapses: 0 }, "again");
    expect(floored.ease).toBe(1.3);
  });

  it("'hard' grows interval slowly and lowers ease; 'easy' grows faster and raises ease", () => {
    const s = schedule(schedule(fresh, "good"), "good"); // interval 6, ease 2.5, reps 2
    const hard = schedule(s, "hard");
    const easy = schedule(s, "easy");
    expect(hard.interval).toBeLessThan(easy.interval);
    expect(hard.ease).toBeLessThan(s.ease);
    expect(easy.ease).toBeGreaterThan(s.ease);
  });

  it("dueAt(now) = now + interval days", () => {
    const now = Date.parse("2026-06-05T00:00:00Z");
    const r = schedule(fresh, "good"); // interval 1
    expect(dueAtFrom(now, r)).toBe(now + 1 * 86_400_000);
  });
});

// local helper the impl will export
import { dueAtFrom } from "./srs";
```

- [ ] **Run it red.** `cd site && bun run test -- srs` — confirm it fails because `./srs` does not exist.
- [ ] **Write the minimal implementation.** Create `site/src/scripts/progression/srs.ts`:

```ts
export type Grade = "again" | "hard" | "good" | "easy";

export interface Sched {
  interval: number; // whole days until next review
  ease: number;     // SM-2 ease factor, floored at 1.3
  reps: number;     // consecutive non-lapse recalls
  lapses: number;   // total times graded "again"
}

const DAY = 86_400_000;
const MIN_EASE = 1.3;

// SM-2 quality scale (0..5) mapped from our 4-button grades.
const QUALITY: Record<Grade, number> = { again: 2, hard: 3, good: 4, easy: 5 };

export function freshSched(): Sched {
  return { interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

export function schedule(prev: Sched, grade: Grade): Sched {
  const q = QUALITY[grade];

  if (grade === "again") {
    // lapse: relearn from scratch, penalize ease, keep best floor
    const ease = Math.max(MIN_EASE, prev.ease - 0.2);
    return { interval: 0, ease, reps: 0, lapses: prev.lapses + 1 };
  }

  // SM-2 ease update for q in 3..5
  const ease = Math.max(MIN_EASE, prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const reps = prev.reps + 1;

  let interval: number;
  if (reps === 1) interval = grade === "hard" ? 1 : 1;
  else if (reps === 2) interval = grade === "hard" ? 4 : 6;
  else {
    const mult = grade === "hard" ? Math.max(1.2, ease - 0.5) : ease;
    interval = Math.round(prev.interval * mult);
  }
  if (grade === "easy") interval = Math.round(interval * 1.3);

  return { interval, ease, reps, lapses: prev.lapses };
}

export function dueAtFrom(now: number, s: Sched): number {
  return now + s.interval * DAY;
}
```

- [ ] **Run it green.** `cd site && bun run test -- srs`. Adjust constants only to satisfy the asserted behavior (do not loosen tests to fit a wrong impl). If `hard`/`easy` ordering or the `15` rounding needs a tweak, fix the impl, not the spec.

---

## Phase 2 — Card store over localStorage (TDD)

Owns persistence + the due query. Build test-first. New module `site/src/scripts/review-state.ts`, test `site/src/scripts/review-state.test.ts`. Mirrors `practice-state.ts` (its own key, try/catch I/O) and consumes `srs.ts`.

- [ ] **Write the failing test first.** Create `site/src/scripts/review-state.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  addCard, recordReview, dueBefore, allCards, dueCount, REVIEW_KEY,
} from "./review-state";

const DAY = 86_400_000;
const card = {
  cardKey: "databases/x::retrieval::0",
  lessonKey: "databases/x",
  source: "retrieval" as const,
  index: 0,
  front: "Why does a stale row estimate cascade?",
  back: "Because every node above re-plans on a wrong size.",
  lang: "en" as const,
};

describe("review-state store", () => {
  beforeEach(() => localStorage.removeItem(REVIEW_KEY));

  it("addCard is idempotent on cardKey (re-seed never duplicates or resets schedule)", () => {
    addCard(card);
    const after1 = allCards();
    recordReview(card.cardKey, "good", Date.parse("2026-06-05T00:00:00Z"));
    addCard(card); // re-harvest same card
    const after2 = allCards();
    expect(after1.length).toBe(1);
    expect(after2.length).toBe(1);
    expect(after2[0].sched.reps).toBe(1); // schedule preserved, not reset
  });

  it("a fresh card is due now (interval 0)", () => {
    addCard(card);
    const now = Date.parse("2026-06-05T00:00:00Z");
    expect(dueBefore(now + 1).map((c) => c.cardKey)).toContain(card.cardKey);
    expect(dueCount(now + 1)).toBe(1);
  });

  it("recordReview('good') pushes the card out of the due window by ~1 day", () => {
    addCard(card);
    const now = Date.parse("2026-06-05T00:00:00Z");
    recordReview(card.cardKey, "good", now);
    expect(dueBefore(now + 1).map((c) => c.cardKey)).not.toContain(card.cardKey);
    expect(dueBefore(now + DAY + 1).map((c) => c.cardKey)).toContain(card.cardKey);
  });

  it("dueBefore sorts soonest-due first", () => {
    addCard({ ...card, cardKey: "a", lessonKey: "a" });
    addCard({ ...card, cardKey: "b", lessonKey: "b" });
    const now = Date.parse("2026-06-05T00:00:00Z");
    recordReview("a", "easy", now); // a pushed far out
    const due = dueBefore(now + 999 * DAY);
    expect(due[0].cardKey).toBe("b"); // b still due now → first
  });

  it("survives a reload by re-reading localStorage (no in-memory cache leak)", () => {
    addCard(card);
    recordReview(card.cardKey, "good", Date.parse("2026-06-05T00:00:00Z"));
    // simulate reload: a fresh read must reflect persisted schedule
    expect(allCards()[0].sched.reps).toBe(1);
  });
});
```

- [ ] **Run it red.** `cd site && bun run test -- review-state` — fails because the module is absent.
- [ ] **Write the minimal implementation.** Create `site/src/scripts/review-state.ts`:

```ts
import { freshSched, schedule, dueAtFrom, type Grade, type Sched } from "./progression/srs";

export const REVIEW_KEY = "atlas.review.v1";

export type CardSource = "retrieval" | "practice";

export interface CardSeed {
  cardKey: string;
  lessonKey: string;
  source: CardSource;
  index: number;
  front: string;
  back: string;
  lang: "en" | "ru";
}

export interface Card extends CardSeed {
  sched: Sched;
  dueAt: number;       // epoch ms
  addedAt: number;
  lastReviewedAt: number | null;
}

type Store = Record<string, Card>;

function read(): Store {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}
function write(s: Store): void {
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota — non-fatal */
  }
}

/** Idempotent on cardKey: an existing card keeps its schedule; only content fields refresh. */
export function addCard(seed: CardSeed, now = Date.now()): void {
  const s = read();
  const existing = s[seed.cardKey];
  if (existing) {
    s[seed.cardKey] = { ...existing, front: seed.front, back: seed.back, lang: seed.lang };
  } else {
    const sched = freshSched();
    s[seed.cardKey] = {
      ...seed, sched, dueAt: dueAtFrom(now, sched), addedAt: now, lastReviewedAt: null,
    };
  }
  write(s);
}

export function recordReview(cardKey: string, grade: Grade, now = Date.now()): void {
  const s = read();
  const c = s[cardKey];
  if (!c) return;
  const sched = schedule(c.sched, grade);
  s[cardKey] = { ...c, sched, dueAt: dueAtFrom(now, sched), lastReviewedAt: now };
  write(s);
}

export function allCards(): Card[] {
  return Object.values(read());
}

export function dueBefore(now = Date.now()): Card[] {
  return allCards()
    .filter((c) => c.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

export function dueCount(now = Date.now()): number {
  return dueBefore(now).length;
}
```

- [ ] **Run it green.** `cd site && bun run test -- review-state`. All green.
- [ ] **Full suite sanity.** `cd site && bun run test` — confirm no existing test regressed (the new key is isolated, so `user-state`/`practice-state` tests must be untouched).

---

## Phase 3 — "Due today" review UI island

Non-TDD UI. A Preact island that walks the due queue and grades cards. New component `site/src/components/pedagogy/ReviewSession.tsx`.

- [ ] **Scaffold the island shell.** Create `site/src/components/pedagogy/ReviewSession.tsx`: a `useState`-driven component that on mount calls `dueBefore(Date.now())` into local state, shows a count header and an empty state (`t("review.empty", lang)` — "Nothing due. Come back tomorrow."). Use `import { dueBefore, recordReview, type Card } from "~/scripts/review-state"` and `import { t, type Locale } from "~/i18n"`. Match the markup vocabulary already in `RetrievalDrawer.tsx` (`oa-btn`, `meta`, `hr-top`, card classes) for visual consistency.
- [ ] **Render one card at a time.** Show `front`; a "Show answer" button reveals `back`; then the four grade buttons (`again|hard|good|easy`) styled like RetrievalDrawer's confidence row. On grade: call `recordReview(card.cardKey, grade)`, advance the index, and drop into the next card. Keep a small footer "card N of M".
- [ ] **Session-complete state.** When the index passes the harvested due list, show a done panel with how many reviewed and the next due time (min `dueAt` of `allCards()` that is in the future). Add a "review again later" note; do NOT re-query mid-session (cards graded this session must not pop back in immediately — snapshot the due list at mount).
- [ ] **Record an active day.** On first grade of a session, call `recordActiveDay()` from `~/scripts/user-state` so review feeds the existing streak (re-uses the streak machinery; no new streak logic). Import is safe — `recordActiveDay` is already exported.
- [ ] **i18n labels.** Add `review.*` keys (`title`, `empty`, `showAnswer`, `again`, `hard`, `good`, `easy`, `done`, `nextDue`, `cardOf`) to `site/src/i18n/ui.json` for both `en` and `ru` (the linter enforces i18n parity; add both or the build fails).

---

## Phase 4 — Card harvesting from lessons (wire-in)

Connect real lesson content to the store. Modify the two islands that already mount on lesson pages so a visit seeds cards. Keep harvest logic in one small pure helper for testability.

- [ ] **Harvest helper (small TDD).** Create `site/src/scripts/review-harvest.ts` with `cardsFromRetrieval(pieceSlug, lang, questions)` and `cardsFromPractice(lessonKey, lang, tasks)` returning `CardSeed[]`. Handle the prop drift: read each question's text from `q` and the answer from `a ?? answer`; derive `index` from array position when no `id`. Add `site/src/scripts/review-harvest.test.ts` asserting: stable `cardKey` for the same question across two calls, correct front/back extraction, and `source` tagging. Run red → implement → green.
- [ ] **Seed from RetrievalDrawer.** In `site/src/components/pedagogy/RetrievalDrawer.tsx`, add a mount `useEffect` (it currently has none) that calls `cardsFromRetrieval(pieceSlug, lang, questions).forEach(addCard)`. Guard with `typeof window !== "undefined"`. No visual change; this is the lazy-seed hook from Phase 0.
- [ ] **Seed from practice.** Locate the practice island (`PracticeSection`) that renders practice JSON on lesson pages and add the same mount-time `cardsFromPractice(lessonKey, lang, tasks).forEach(addCard)`. If `PracticeSection` does not already hold the raw `tasks` array, pass through the minimal `{ id, title, prompt }` needed — do not widen its public props beyond that.
- [ ] **Cap card size per lesson.** In the harvest helpers, truncate `front`/`back` to a sane length (e.g. 600 chars) so a single verbose RetrievalDrawer answer (the Postgres examples are ~1.5 KB each) doesn't bloat the store. Assert the truncation in `review-harvest.test.ts`.

---

## Phase 5 — Route + profile surface

Expose the queue. Non-TDD wiring, mirrors existing page patterns.

- [ ] **Add the `/[lang]/review` route.** Create `site/src/pages/[lang]/review.astro` modeled on `profile.astro`: same `getStaticPaths` returning `en`+`ru`, `isLocale` guard, `Topic` layout, an `<h1>` (`t("review.title", lang)`), and `<ReviewSession client:only="preact" lang={lang} />` (use `client:only` — the due queue is purely client-state, no SSR value).
- [ ] **Due-count widget on profile.** Create `site/src/components/progression/DueToday.tsx`: a tiny island that reads `dueCount()` on mount and renders a link to `/[lang]/review` with the count (e.g. "12 cards due → Review"); render nothing when 0. Mount it in `ProfilePanel.tsx` (the component already on `profile.astro`) or directly in `profile.astro` next to `ProfilePanel`.
- [ ] **Retire / repoint the static banner.** Update `site/src/components/pedagogy/SpacedRevisitBanner.tsx` so its CTA points to `/[lang]/review` (real due queue) instead of the `?revisit=` heuristic, OR gate it behind `dueCount() > 0` and have it deep-link to review. Keep the existing `dismissRevisit` behavior. Do not delete the component (it is imported elsewhere); just make it consult the real store. Decide which in Phase 0 review and note it here.
- [ ] **Add nav entry (optional, low-risk).** If there is a shared header/nav listing `profile`/`settings`/`projects`, add a `review` link with the due count. If no such shared nav exists, skip — the profile widget + banner are sufficient surfaces.

---

## Phase 6 — Verification & green build

- [ ] **Unit suite green.** `cd site && bun run test` — `srs.test.ts`, `review-state.test.ts`, `review-harvest.test.ts` pass; no prior test regressed.
- [ ] **Persistence across reload (manual).** `cd site && bun run dev`; open a lesson with a RetrievalDrawer → confirm cards seed (DevTools → Application → localStorage → `atlas.review.v1`). Visit `/en/review`, grade a few, **reload** `/en/review` → graded cards no longer due, ungraded still present. Confirms the queue persists.
- [ ] **Review surface shows due cards.** With seeded cards, `/en/review` lists the due count, walks cards, reveals answers, grades, and reaches the done state. `/ru/review` renders with RU labels.
- [ ] **Profile due count.** `/en/profile` shows the `DueToday` widget with the correct count and links to review; shows nothing at 0.
- [ ] **Full build green.** `cd site && bun run build` — Astro build + linter clean (i18n parity for the new `review.*` keys, hydration cap not exceeded on lesson pages by the new `useEffect` — note: adding an effect to an *existing* island adds **zero** new islands, so the per-page hydration cap is unaffected; the review route's single island is well under cap).
- [ ] **No console.log / type check.** Grep the new files for `console.log`; `cd site && bunx tsc --noEmit` (or the repo's type-check script) passes.
- [ ] **Commit (only if asked).** One commit for the phase batch: `feat(srs): spaced-repetition engine — SM-2 scheduler + card store + /review surface`.

---

## File structure (one responsibility each)

**Created**
- `site/src/scripts/progression/srs.ts` — pure SM-2 scheduler (`Grade`, `Sched`, `freshSched`, `schedule`, `dueAtFrom`). No I/O.
- `site/src/scripts/progression/srs.test.ts` — SM-2 unit tests (grade → interval/ease).
- `site/src/scripts/review-state.ts` — localStorage card store (`addCard`, `recordReview`, `dueBefore`, `dueCount`, `allCards`, `REVIEW_KEY`). Owns key `atlas.review.v1`.
- `site/src/scripts/review-state.test.ts` — store tests (idempotent add, due window, sort, reload).
- `site/src/scripts/review-harvest.ts` — pure `CardSeed[]` extraction from RetrievalDrawer Q/A and practice tasks (+ truncation, key derivation).
- `site/src/scripts/review-harvest.test.ts` — harvest tests (stable keys, front/back, truncation).
- `site/src/components/pedagogy/ReviewSession.tsx` — the "due today" island: walk queue, reveal, grade, done state.
- `site/src/components/progression/DueToday.tsx` — small profile widget showing due count → link.
- `site/src/pages/[lang]/review.astro` — `/[lang]/review` route hosting `ReviewSession`.

**Modified**
- `site/src/components/pedagogy/RetrievalDrawer.tsx` — add mount `useEffect` seeding cards (no visual change).
- `site/src/components/pedagogy/PracticeSection.*` — add mount-time practice-card seeding.
- `site/src/components/pedagogy/SpacedRevisitBanner.tsx` — repoint CTA to `/[lang]/review`, gate on real `dueCount()`.
- `site/src/pages/[lang]/profile.astro` (or `ProfilePanel.tsx`) — mount `DueToday`.
- `site/src/i18n/ui.json` — add `review.*` keys (EN + RU, parity-enforced).

---

## Success criteria

- `bun run test` passes including all three new test files; SM-2 and store logic are fully covered.
- A due-queue persists across page reloads (verified in `atlas.review.v1`; graded cards leave the due window, ungraded remain).
- `/[lang]/review` shows due cards, reveals answers, accepts `again|hard|good|easy`, and updates schedules; empty/done states render in both locales.
- `/[lang]/profile` shows an accurate due count linking to the review surface.
- Cards seed lazily on lesson visit from both RetrievalDrawer Q/A and practice items, idempotently.
- `bun run build` is green (lint clean, i18n parity, hydration cap respected).

---

## Effort, dependencies, risks

**Effort:** Medium.

**Dependencies:** None hard. Composes with **P4** (the roadmap/competency map is the natural home to surface "due today" alongside weak-domain signals — `DueToday` and `dueCount()` are reusable there). Independent of P3.

**Risks & mitigations**
- **Card-content harvesting from MDX.** RetrievalDrawer props drift (`{q,a}` in MDX vs `{id,q,answer}` in the type) — handled explicitly in the harvest helper (read `q`, `a ?? answer`, position-derived index) and asserted in tests. Practice JSON is well-structured (collection-validated), lower risk.
- **localStorage size.** 1500 lessons × a few cards × ~1 KB front/back could approach the ~5 MB localStorage ceiling. Mitigations: content-light cards, 600-char truncation on front/back (Phase 4), lazy seeding (only *visited* lessons ever seed), and isolation from the synced `UserState` blob. If pressure appears later, store only keys + `cardKey→content` lookup re-derived on demand — out of scope now.
- **Scope creep.** Tempting adjacencies to explicitly defer: cross-device sync of the queue (leave to `account-sync.ts` later), per-domain due breakdown (belongs to P4), build-time card index (rejected in Phase 0), audio/cloze card types. This plan ships SM-2 + store + one review surface + profile count + lazy harvest — nothing more.
