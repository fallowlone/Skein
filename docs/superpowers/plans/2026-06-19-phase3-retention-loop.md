# Phase 3 Retention Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire recall-testing into the knowledge model — persist RetrievalDrawer grades into SM-2 cards, fold review-card health into concept mastery, and drive the revisit banner from real due dates.

**Architecture:** Three independent seams over existing machinery. (A) RetrievalDrawer's reveal already seeds an SM-2 card; route its grade buttons to `recordReview`. (B) A new mid-tier `"review"` evidence source in `knowledge.ts`, fed by a new `path-io` derivation that aggregates per-unit card health — mirroring the existing `refreshStudyEvidence`/`refreshPracticeSignal` pattern. (C) `SpacedRevisitBanner` reads `dueBefore()` instead of a 7-day heuristic. Path re-entry for forgotten concepts is already free — the planner runs on `effectiveKnowledge()` (decayed).

**Tech Stack:** Astro 5 + Preact + `@preact/signals`; Vitest (`bun run test`); SM-2 scheduler (`progression/srs.ts`), concept graph (`path/`). No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-19-retention-loop-review-concept-graph-design.md`. Every task implicitly includes it.
- One branch `feat/phase3-retention-loop`; merge to **LOCAL main only, no auto-push** (user pushes manually).
- Runner is `bun run test` (Vitest) — **NOT** `bun test`. Run from `site/`.
- Full `bun run build` gate only at the end (it is ~65 min when shared `src/` changes). Per-task gate is the targeted Vitest run shown in each task.
- New `"review"` source ranks **between `activity` and `diagnostic`**: review lifts override `activity` but never `diagnostic`/`declared`; review sets ONLY a unit's taught concepts (no DAG up-propagation); review lapses erode `review`/`activity` confidence toward `decayFloor`, never `diagnostic`/`declared`.
- `REVIEW_EVIDENCE_WEIGHT = 0.7` (a fully-healthy unit → confidence 0.7, above the typical `masteryThreshold` 0.6 = "known"; a half-lapsed unit → 0.35, below it = re-enters path).
- Cross-store reads of `atlas.review.v1` from `path-io` must be SSR-safe and tolerant (no window → no-op; malformed JSON already returns `{}` inside `review-state.ts`). Review evidence is best-effort — its absence must never break path derivation.
- Co-Authored-By attribution disabled globally.

---

## Task 1: Persist RetrievalDrawer grade into the SM-2 card (Seam A)

**Files:**
- Modify: `site/src/components/pedagogy/RetrievalDrawer.tsx` (imports line 3-5; confidence state line 52; the 1–5 button block lines 116-134)
- Test: `site/src/components/pedagogy/RetrievalDrawer.test.tsx` (append; mirror the existing raw-`preact`-`render` harness already in this file)

**Interfaces:**
- Consumes: `recordReview(cardKey: string, grade: "again"|"hard"|"good"|"easy", now?: number): void` and `allCards(): Card[]` from `~/scripts/review-state`; the card key seeded by `cardsFromRetrieval` is `` `${slug}::retrieval::${index}` `` (positional `index`, see `review-harvest.ts:28`).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Append to `RetrievalDrawer.test.tsx`. The file already defines `host`, `flush`, `lis`, `revealBtn`. Add a grade-button selector and the test:

```tsx
import { allCards } from "~/scripts/review-state";

const gradeBtns = (li: HTMLElement) =>
  Array.from(
    li.querySelectorAll('button[aria-label^="grade"]'),
  ) as HTMLButtonElement[];

describe("grade persistence", () => {
  it("clicking a grade after reveal advances the seeded SM-2 card", async () => {
    render(
      <RetrievalDrawer
        id="networking/03-tcp-handshake"
        lang="en"
        questions={[{ q: "What is the handshake?", a: "SYN, SYN-ACK, ACK" }]}
      />,
      host,
    );
    await flush(); // lets the seed useEffect run (cardsFromRetrieval → addCard)

    const li = lis()[0];
    revealBtn(li)!.click();
    await flush();

    const good = gradeBtns(lis()[0]).find((b) => /good/i.test(b.getAttribute("aria-label") ?? ""))!;
    good.click();
    await flush();

    const card = allCards().find(
      (c) => c.cardKey === "networking/03-tcp-handshake::retrieval::0",
    );
    expect(card).toBeDefined();
    expect(card!.sched.reps).toBe(1); // a non-"again" grade advances reps 0 → 1
    expect(card!.lastReviewedAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- RetrievalDrawer`
Expected: FAIL — the grade buttons don't exist (`aria-label^="grade"` matches nothing), so `good` is `undefined` and `.click()` throws / card stays `reps: 0`.

- [ ] **Step 3: Add the `recordReview` import**

In `RetrievalDrawer.tsx`, extend the review-state import (line 5):

```tsx
import { addCard, recordReview } from "~/scripts/review-state";
import type { Grade } from "~/scripts/progression/srs";
```

- [ ] **Step 4: Change the confidence state to hold a grade**

Line 52 — change the state to store the chosen grade per question key:

```tsx
const [graded, setGraded] = useState<Record<string, Grade>>({});
```

Delete the old `const [confidence, setConfidence] = useState<Record<string, number>>({});`.

- [ ] **Step 5: Replace the 1–5 button block with 4 grade buttons**

Inside the `questions.map((q, i) => …)` body, first remove the `const conf = confidence[key] ?? 0;` line (currently line 82). Then replace the `<div class="flex items-center gap-1">{[1,2,3,4,5].map(...)}</div>` block (the `:` branch of `!isOpen ? … : …`, lines 116-134) with:

```tsx
<div class="flex items-center gap-1">
  {(["again", "hard", "good", "easy"] as const).map((grade) => {
    const active = graded[key] === grade;
    return (
      <button
        key={grade}
        type="button"
        onClick={() => {
          setGraded({ ...graded, [key]: grade });
          // Positional card key — matches cardsFromRetrieval's `${slug}::retrieval::${index}`.
          // Not q.id (the React key); a JSX-bodied question has no seeded card and
          // recordReview no-ops safely on the missing key.
          recordReview(`${slug}::retrieval::${i}`, grade);
        }}
        class={`px-2 h-6 font-mono text-[11px] border rounded-[1px] transition-colors ${active ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule-strong hover:border-ink"}`}
        aria-label={`grade ${grade}`}
        aria-pressed={active}
      >
        {grade}
      </button>
    );
  })}
</div>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd site && bun run test -- RetrievalDrawer`
Expected: PASS (both the existing contract tests and the new grade-persistence test).

- [ ] **Step 7: Typecheck the changed file**

Run: `cd site && bunx tsc --noEmit 2>&1 | grep -i retrievaldrawer || echo "clean"`
Expected: `clean` (no errors mentioning RetrievalDrawer).

- [ ] **Step 8: Commit**

```bash
git add site/src/components/pedagogy/RetrievalDrawer.tsx site/src/components/pedagogy/RetrievalDrawer.test.tsx
git commit -m "feat(retention): persist RetrievalDrawer grade into the SM-2 card (Seam A)"
```

---

## Task 2: Add the `review` evidence source + `applyReviewEvidence` (Seam B1)

**Files:**
- Modify: `site/src/scripts/path/types.ts:23` (the `Source` union)
- Modify: `site/src/scripts/path/knowledge.ts:13` (source guards) and add `applyReviewEvidence`
- Test: `site/src/scripts/path/knowledge.test.ts` (append)

**Interfaces:**
- Consumes: existing `clamp01`, `masteryOf`, `setMastery`, `STRONG`, `Source`, `KnowledgeState`, `ConceptMastery` in `knowledge.ts`.
- Produces: `applyReviewEvidence(state: KnowledgeState, taught: string[], healthFrac: number, weight: number, floor: number, now: number): KnowledgeState` — consumed by Task 3.

- [ ] **Step 1: Write the failing test**

Append to `knowledge.test.ts`. It already imports from `./knowledge` and has `g`, `NOW`. Add `applyReviewEvidence` to the import list at the top (`applyStudyEvidence` and `applyDiagnostic` are already imported), then:

```ts
describe("applyReviewEvidence", () => {
  it("lifts taught concepts toward healthFrac*weight with source 'review', only the taught set", () => {
    const s = applyReviewEvidence(emptyState(), ["indexing"], 1, 0.7, 0.3, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.7, 5);
    expect(s.get("indexing")!.source).toBe("review");
    // no DAG up-propagation: a prereq of "indexing" is untouched
    expect(masteryOf(s, "tcp-handshake")).toBe(0);
  });

  it("never overrides diagnostic or declared evidence", () => {
    let s = applyDiagnostic(emptyState(), g, "indexing", 0.9, NOW); // diagnostic, strong
    s = applyReviewEvidence(s, ["indexing"], 1, 0.7, 0.3, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.9, 5); // unchanged
    expect(s.get("indexing")!.source).toBe("diagnostic");
  });

  it("low healthFrac erodes activity-sourced confidence toward the floor", () => {
    let s = applyStudyEvidence(emptyState(), ["indexing"], 1, 1, 0.35, 0.4, NOW); // activity ~0.75
    s = applyReviewEvidence(s, ["indexing"], 0, 0.7, 0.3, NOW);                    // all cards lapsed
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.3, 5); // eroded to floor
    expect(s.get("indexing")!.source).toBe("review");
  });
});

describe("applyStudyEvidence review protection", () => {
  it("does not override a 'review'-sourced concept", () => {
    let s = applyReviewEvidence(emptyState(), ["indexing"], 1, 0.7, 0.3, NOW); // review 0.7
    s = applyStudyEvidence(s, ["indexing"], 1, 1, 0.35, 0.4, NOW);             // study would set 0.75
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.7, 5); // review wins
    expect(s.get("indexing")!.source).toBe("review");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- path/knowledge`
Expected: FAIL — `applyReviewEvidence` is not exported.

- [ ] **Step 3: Extend the `Source` union**

`site/src/scripts/path/types.ts:23`:

```ts
export type Source = "pretest" | "diagnostic" | "activity" | "declared" | "review";
```

- [ ] **Step 4: Add the study-protection set and `applyReviewEvidence`**

In `knowledge.ts`, just below the existing `const STRONG: Source[] = ["diagnostic", "declared"];` (line 13) add:

```ts
// Study-activity must not overwrite review evidence (review > activity). Kept separate from STRONG
// so applyDiagnostic's propagation and applyPracticeStruggle's erosion guard are unchanged.
const STUDY_PROTECTED: Source[] = ["diagnostic", "declared", "review"];
```

Change `applyStudyEvidence`'s guard (currently line 66) from `STRONG.includes(cur.source)` to `STUDY_PROTECTED.includes(cur.source)`:

```ts
    if (cur && STUDY_PROTECTED.includes(cur.source)) continue;     // never override stronger evidence
```

Then add the new function (place it after `applyPracticeStruggle`, before `applySelfDeclare`):

```ts
// Aggregate review-health evidence for a unit's taught concepts. `healthFrac` in [0,1] is the share
// of the unit's reviewed cards in good standing. Like applyStudyEvidence, lift toward
// healthFrac*weight with source "review" (mid-tier: overrides activity, never diagnostic/declared,
// no DAG propagation). Unlike study, a low healthFrac also ERODES review/activity confidence toward
// `floor` — event-driven forgetting evidence, distinct from decay()'s age-driven read-model.
export function applyReviewEvidence(
  state: KnowledgeState, taught: string[], healthFrac: number, weight: number, floor: number, now: number,
): KnowledgeState {
  let next = state;
  const target = clamp01(clamp01(healthFrac) * weight);
  for (const c of taught) {
    const cur = next.get(c);
    if (cur && STRONG.includes(cur.source)) continue;            // diagnostic/declared are immune
    const m = masteryOf(next, c);
    if (target > m) {
      next = setMastery(next, c, { confidence: target, source: "review", lastAt: now });
    } else if (cur && (cur.source === "review" || cur.source === "activity")) {
      const lowered = Math.max(floor, target);                   // forgetting: erode toward floor
      if (lowered < cur.confidence) {
        next = setMastery(next, c, { confidence: lowered, source: "review", lastAt: now });
      }
    }
  }
  return next;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd site && bun run test -- path/knowledge`
Expected: PASS (all new cases + the pre-existing knowledge tests).

- [ ] **Step 6: Commit**

```bash
git add site/src/scripts/path/types.ts site/src/scripts/path/knowledge.ts site/src/scripts/path/knowledge.test.ts
git commit -m "feat(retention): add 'review' evidence source + applyReviewEvidence (Seam B1)"
```

---

## Task 3: Derive review evidence from the card store + wire it (Seam B2)

**Files:**
- Modify: `site/src/scripts/path/path-io.ts` (imports line 16-18; add `unitReviewHealth` + `refreshReviewEvidence` + a module-load call after `refreshPracticeSignal`, near line 346)
- Test: `site/src/scripts/path/path-io.review-evidence.test.ts` (new — keeps the new pure logic isolated from the 17 KB `path-io.test.ts`)

**Interfaces:**
- Consumes: `allCards(): Card[]` and `type Card` from `~/scripts/review-state` (`Card` has `cardKey`, `lessonKey`, `sched: { interval; ease; reps; lapses }`, `dueAt`, `lastReviewedAt`); `applyReviewEvidence` from Task 2; existing module-scope `teachesByUnit`, `config`, `knowledge` in `path-io.ts`.
- Produces: `unitReviewHealth(cards: Card[], now: number): Map<string, number>` (unitId → healthFrac) and `refreshReviewEvidence(): void`.

- [ ] **Step 1: Write the failing test**

Create `site/src/scripts/path/path-io.review-evidence.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Card } from "~/scripts/review-state";
import { unitReviewHealth } from "./path-io";

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;

function card(lessonKey: string, over: Partial<Card["sched"]> & { dueAt?: number; lastReviewedAt?: number | null }): Card {
  const { dueAt, lastReviewedAt, ...sched } = over;
  return {
    cardKey: `${lessonKey}::retrieval::0`,
    lessonKey,
    source: "retrieval",
    index: 0,
    front: "f",
    back: "b",
    lang: "en",
    sched: { interval: 6, ease: 2.5, reps: 3, lapses: 0, ...sched },
    dueAt: dueAt ?? NOW + 6 * DAY,
    addedAt: NOW,
    lastReviewedAt: lastReviewedAt === undefined ? NOW : lastReviewedAt,
  };
}

describe("unitReviewHealth", () => {
  it("excludes never-reviewed cards and computes healthy/reviewed per unit", () => {
    const cards: Card[] = [
      card("networking/03-tcp/lesson-a", {}),                        // healthy
      card("networking/03-tcp/lesson-b", { dueAt: NOW - DAY }),      // overdue → lapsed
      card("databases/04-mvcc/lesson-c", { lastReviewedAt: null }), // never reviewed → excluded
    ];
    const h = unitReviewHealth(cards, NOW);
    expect(h.get("networking/03-tcp")).toBeCloseTo(0.5, 5); // 1 healthy of 2 reviewed
    expect(h.has("databases/04-mvcc")).toBe(false);          // no reviewed cards → omitted
  });

  it("a card with a lapse is not healthy", () => {
    const h = unitReviewHealth([card("x/y/z", { lapses: 1 })], NOW);
    expect(h.get("x/y")).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- review-evidence`
Expected: FAIL — `unitReviewHealth` is not exported from `path-io.ts`.

- [ ] **Step 3: Extend the review-state import**

`path-io.ts` line 18 — add `allCards` and the `Card` type:

```ts
import { dueBefore, recordReview, allCards, type Card } from "~/scripts/review-state";
```

And extend the knowledge import (line 16) to add `applyReviewEvidence`:

```ts
import { masteryOf, applyReviewEvidence } from "./knowledge";
```

- [ ] **Step 4: Add the constant, the pure aggregator, and the refresh**

In `path-io.ts`, near the other evidence weights (after `PRACTICE_STRUGGLE_WEIGHT`, ~line 235) add:

```ts
// Review-health weight: a fully-healthy unit → confidence 0.7 (above masteryThreshold ~0.6 = known);
// a half-lapsed unit → 0.35 (below it → the concept re-enters the path via effectiveKnowledge).
const REVIEW_EVIDENCE_WEIGHT = 0.7;
```

Then, after `refreshPracticeSignal` and its module-load call (~line 346), add:

```ts
// ── review evidence: SM-2 card health → concept confidence ─────────────────────
// Pure (exported for tests): per-unit review health from the card store. healthFrac is the share of
// a unit's REVIEWED cards (lastReviewedAt != null) currently in good standing. Unreviewed cards carry
// no signal and are excluded; a unit with no reviewed cards is omitted from the map.
export function unitReviewHealth(cards: Card[], now: number): Map<string, number> {
  const reviewed = new Map<string, number>();
  const healthy = new Map<string, number>();
  for (const c of cards) {
    if (c.lastReviewedAt == null) continue;
    const seg = c.lessonKey.split("/");
    if (seg.length < 2) continue;
    const unitId = `${seg[0]}/${seg[1]}`;
    reviewed.set(unitId, (reviewed.get(unitId) ?? 0) + 1);
    const isHealthy = c.sched.reps >= 2 && c.dueAt > now && c.sched.lapses === 0;
    if (isHealthy) healthy.set(unitId, (healthy.get(unitId) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [unitId, total] of reviewed) out.set(unitId, (healthy.get(unitId) ?? 0) / total);
  return out;
}

// Fold per-unit review health into concept confidence. Mirror of refreshStudyEvidence: keeps the
// knowledge reference when nothing changes (no persist churn on every load). SSR-safe.
export function refreshReviewEvidence(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const health = unitReviewHealth(allCards(), now);
  if (!health.size) return;
  const floor = config.value.weights.decayFloor;
  let next = knowledge.value;
  for (const [unitId, healthFrac] of health) {
    const taught = teachesByUnit.get(unitId);
    if (taught) next = applyReviewEvidence(next, taught, healthFrac, REVIEW_EVIDENCE_WEIGHT, floor, now);
  }
  knowledge.value = next;
}
if (typeof window !== "undefined") refreshReviewEvidence();
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd site && bun run test -- review-evidence`
Expected: PASS.

- [ ] **Step 6: Run the path suite to confirm no regression**

Run: `cd site && bun run test -- path/`
Expected: PASS (existing `path-io`, `knowledge`, `planner` suites unaffected).

- [ ] **Step 7: Commit**

```bash
git add site/src/scripts/path/path-io.ts site/src/scripts/path/path-io.review-evidence.test.ts
git commit -m "feat(retention): derive concept evidence from SM-2 card health (Seam B2)"
```

---

## Task 4: Drive SpacedRevisitBanner from real due dates (Seam C)

**Files:**
- Modify: `site/src/components/pedagogy/SpacedRevisitBanner.tsx` (imports + the `entries`/`due`/`slug`/`label` block above `return (`)
- Test: `site/src/components/pedagogy/SpacedRevisitBanner.test.tsx` (new — raw `preact` `render` harness, same shape as `RetrievalDrawer.test.tsx`)

**Interfaces:**
- Consumes: `dueBefore(now?: number): Card[]` (sorted by `dueAt` ascending) and `addCard(seed, now?)` from `~/scripts/review-state`; `userState`, `dismissRevisit` from `~/scripts/user-state`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `site/src/components/pedagogy/SpacedRevisitBanner.test.tsx`:

```tsx
import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SpacedRevisitBanner from "./SpacedRevisitBanner";
import { addCard } from "~/scripts/review-state";

let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  localStorage.clear();
});
afterEach(() => {
  render(null, host);
  host.remove();
  localStorage.clear();
});

const seed = (lessonKey: string) =>
  addCard({ cardKey: `${lessonKey}::retrieval::0`, lessonKey, source: "retrieval", index: 0, front: "f", back: "b", lang: "en" });

describe("SpacedRevisitBanner", () => {
  it("renders nothing when no card is due", () => {
    render(<SpacedRevisitBanner lang="en" />, host);
    expect(host.querySelector("a")).toBeNull();
  });

  it("surfaces the lesson of a due card", () => {
    seed("networking/03-tcp/handshake"); // fresh card: interval 0 → dueAt === now → due
    render(<SpacedRevisitBanner lang="en" />, host);
    const link = host.querySelector("a") as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toContain("revisit=networking/03-tcp/handshake");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- SpacedRevisitBanner`
Expected: FAIL — the banner still uses `userState.history`, so a seeded review card with empty history renders nothing (the "surfaces a due card" case fails).

- [ ] **Step 3: Rewrite the selection logic**

Replace the top of `SpacedRevisitBanner.tsx` — the imports, the `DAY` const, and the `entries`/`due`/`slug`/`label` block down to (but not including) the `return (` line — with:

```tsx
import { userState, dismissRevisit } from "~/scripts/user-state";
import { dueBefore } from "~/scripts/review-state";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };

const DAY = 86_400_000;

export default function SpacedRevisitBanner({ lang }: Props) {
  const s = userState.value;
  const now = Date.now();
  // Most-overdue due card whose lesson wasn't dismissed in the last day.
  const due = dueBefore(now).find((c) => now - (s.dismissedRevisit[c.lessonKey] ?? 0) >= DAY);
  if (!due) return null;
  const slug = due.lessonKey;
  const label = slug.split("/").pop()?.replace(/-/g, " ") ?? slug;

  return (
```

Leave the JSX body below `return (` unchanged — it already uses `slug`, `label`, `dismissRevisit(slug)`, and the `?revisit=${slug}#retrieval` link.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd site && bun run test -- SpacedRevisitBanner`
Expected: PASS (both cases).

- [ ] **Step 5: Typecheck the changed file**

Run: `cd site && bunx tsc --noEmit 2>&1 | grep -i spacedrevisit || echo "clean"`
Expected: `clean`.

- [ ] **Step 6: Commit**

```bash
git add site/src/components/pedagogy/SpacedRevisitBanner.tsx site/src/components/pedagogy/SpacedRevisitBanner.test.tsx
git commit -m "feat(retention): drive SpacedRevisitBanner from real due dates (Seam C)"
```

---

## Final gate (after all tasks)

- [ ] **Full test suite**

Run: `cd site && bun run test`
Expected: all green (the pre-task baseline was 1126 passing; +new cases).

- [ ] **Full build + linter**

Run: `cd site && bun run build`
Expected: build completes, `dist/lint-report.json` clean. (Slow — only run once, here.)

- [ ] **Finish the branch**

Use superpowers:finishing-a-development-branch → Option 1 (merge to local main). Do **not** push.

---

## Notes for the implementer

- `Sched` fields live on `card.sched` (`reps`, `lapses`, `interval`, `ease`) — not on the card root. `dueAt` and `lastReviewedAt` are card-root fields.
- A freshly `addCard`-ed card has `interval: 0`, so `dueAt === now` and `dueBefore(now)` includes it immediately (that's why Task 4's "due card" test needs no time travel).
- Re-entry of forgotten concepts into the path needs **no** code: `path-io.ts` already calls `buildPath({ state: effectiveKnowledge() })`, and a `review`-eroded concept below `masteryThreshold` is picked up by `missingConcepts`. Do not add planner logic.
- Do not touch `english/scheduler/fsrs.ts` — that FSRS is English-layer only and out of scope.
```
