# Phase 3b — Retrieval-Grade → Concept-Mastery Join Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make retrieval-drawer grades reach concept mastery by giving every `<RetrievalDrawer>` a canonical `<track>/<unit>/<slug>` lessonKey, injected at MDX build time from frontmatter.

**Architecture:** A build-time remark plugin reads each lesson's frontmatter and injects a `lessonKey` attribute into `<RetrievalDrawer>` JSX nodes. `cardsFromRetrieval` is split so the SM-2 `cardKey` stays the bare author id (progress preserved) while the seeded `lessonKey` becomes the canonical join key. `addCard` refreshes the join key on re-seed so pre-existing cards self-heal. No content edits, no `cardKey` change.

**Tech Stack:** Astro 5 + `@astrojs/mdx`, remark (`unist-util-visit`, already in `node_modules`), Preact islands, Vitest, localStorage SM-2 store.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-19-phase3b-retrieval-join-design.md`.
- Canonical join key shape: `` `${track}/${unit}/${slug}` `` (≥2 segments; `unitReviewHealth` buckets on `seg[0]/seg[1]`).
- `cardKey` format MUST NOT change — stays `` `${cardSlug}::retrieval::${index}` `` with `cardSlug` = bare author id. Preserves existing SM-2 schedules.
- Test runner: `bun run test` (vitest, NOT `bun test`). Lint: `bun run lint:src`. Build: `bun run build`. All run from `site/`.
- No `console.log` in production code.
- All paths below are relative to `site/` unless prefixed with `docs/`.

---

### Task 1: Split `cardsFromRetrieval` — bare cardKey, canonical lessonKey

**Files:**
- Modify: `src/scripts/review-harvest.ts:22-39`
- Test: `src/scripts/review-harvest.test.ts` (update existing 3-arg calls + add a new assertion)

**Interfaces:**
- Produces: `cardsFromRetrieval(cardSlug: string, lessonKey: string, lang: Lang, questions: RetrievalQ[]): CardSeed[]` — `cardKey = \`${cardSlug}::retrieval::${index}\``, `lessonKey = lessonKey`.
- Consumes: nothing new. `CardSeed`, `RetrievalQ`, `trunc`, `HARVEST_MAX` already in the file.

- [ ] **Step 1: Update the existing tests to the new 4-arg signature and add a split assertion**

In `src/scripts/review-harvest.test.ts`, change the two `cardsFromRetrieval` calls in the first test and the fallback test to pass an explicit `lessonKey` as the 2nd arg, and assert the split:

```ts
it("cardsFromRetrieval keeps cardKey bare but seeds the canonical lessonKey for the unit join", () => {
  const qs = [
    { q: "Why does a stale estimate cascade?", a: "Nodes above re-plan on a wrong size." },
    { q: "What is a hash join's build side?", a: "The smaller input, hashed in memory." },
  ];
  const a = cardsFromRetrieval("07-stability-retrieval", "databases/03-execution-plans/07-plan-stability", "en", qs);
  const b = cardsFromRetrieval("07-stability-retrieval", "databases/03-execution-plans/07-plan-stability", "en", qs);
  expect(a).toHaveLength(2);
  expect(a[0].source).toBe("retrieval");
  // cardKey stays the bare author id → existing SM-2 schedules are preserved
  expect(a[0].cardKey).toBe("07-stability-retrieval::retrieval::0");
  // lessonKey is the canonical 3-segment join key → unitReviewHealth can bucket it
  expect(a[0].lessonKey).toBe("databases/03-execution-plans/07-plan-stability");
  expect(a[0].front).toBe("Why does a stale estimate cascade?");
  expect(a[0].back).toBe("Nodes above re-plan on a wrong size.");
  expect(b[0].cardKey).toBe(a[0].cardKey);
});

it("cardsFromRetrieval falls back to `answer` when `a` is absent (MDX/type prop drift)", () => {
  const qs = [{ q: "front", answer: "back-from-answer" }];
  expect(cardsFromRetrieval("x", "x", "en", qs)[0].back).toBe("back-from-answer");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/scripts/review-harvest.test.ts`
Expected: FAIL — old impl takes 3 args, `lessonKey` assertion mismatches (lessonKey is currently the 1st arg).

- [ ] **Step 3: Update the implementation**

Replace `src/scripts/review-harvest.ts:22-39` with:

```ts
export function cardsFromRetrieval(cardSlug: string, lessonKey: string, lang: Lang, questions: RetrievalQ[]): CardSeed[] {
  return questions
    .map((q, index): CardSeed | null => {
      const front = q.q;
      const back = q.a ?? q.answer;
      if (typeof front !== "string" || typeof back !== "string") return null;
      return {
        cardKey: `${cardSlug}::retrieval::${index}`,
        lessonKey,
        source: "retrieval" as const,
        index,
        front: trunc(front),
        back: trunc(back),
        lang,
      };
    })
    .filter((c): c is CardSeed => c !== null);
}
```

Also update the doc comment above (lines 15-21) to note: `cardSlug` → cardKey (stable id), `lessonKey` → canonical join key.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test src/scripts/review-harvest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/review-harvest.ts src/scripts/review-harvest.test.ts
git commit -m "refactor(retention): cardsFromRetrieval splits bare cardKey from canonical lessonKey"
```

---

### Task 2: `addCard` self-heals lessonKey on re-seed

**Files:**
- Modify: `src/scripts/review-state.ts:51-52`
- Test: `src/scripts/review-state.test.ts` (add one test; create the file only if it does not exist — check first)

**Interfaces:**
- Consumes: `addCard(seed: CardSeed, now?: number)`, `CardSeed` (has `cardKey`, `lessonKey`, `front`, `back`, `lang`), and whatever read accessor the existing tests use (e.g. `dueBefore`/`allCards`). Inspect the file's existing exports before writing the test and reuse them.
- Produces: nothing new; behavior change only.

- [ ] **Step 1: Write the failing test**

Add to `src/scripts/review-state.test.ts` (mirror the file's existing setup — it clears localStorage between tests; reuse its import list):

```ts
it("addCard refreshes a stale lessonKey on an existing card without resetting its schedule", () => {
  const base = { cardKey: "07-x::retrieval::0", source: "retrieval" as const, index: 0, front: "f", back: "b", lang: "en" as const };
  // Phase-3a-era seed: bare lessonKey
  addCard({ ...base, lessonKey: "07-x" });
  recordReview("07-x::retrieval::0", "good"); // advance the schedule
  const before = allCards().find((c) => c.cardKey === "07-x::retrieval::0")!;
  // Phase-3b re-seed: canonical lessonKey
  addCard({ ...base, lessonKey: "databases/03-execution-plans/07-x" });
  const after = allCards().find((c) => c.cardKey === "07-x::retrieval::0")!;
  expect(after.lessonKey).toBe("databases/03-execution-plans/07-x"); // join key healed
  expect(after.dueAt).toBe(before.dueAt);                            // schedule untouched
  expect(after.sched).toEqual(before.sched);
  expect(after.lastReviewedAt).toBe(before.lastReviewedAt);
});
```

> If `src/scripts/review-state.test.ts` does not exist, create it with the standard vitest header (`import { describe, it, expect, beforeEach } from "vitest";`), a `beforeEach(() => localStorage.clear())`, and the imports `addCard, recordReview, allCards` from `./review-state`. Confirm `allCards` is exported; if the read accessor has a different name, use that.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/scripts/review-state.test.ts`
Expected: FAIL — `after.lessonKey` is still `"07-x"` (existing-card branch does not copy `lessonKey`).

- [ ] **Step 3: Implement the one-field refresh**

In `src/scripts/review-state.ts`, the existing-card branch (line 52):

```ts
s[seed.cardKey] = { ...existing, front: seed.front, back: seed.back, lang: seed.lang, lessonKey: seed.lessonKey };
```

Update the comment on line 47 to: `/** Idempotent on cardKey: an existing card keeps its schedule; content fields and the derived lessonKey refresh. */`

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/scripts/review-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/review-state.ts src/scripts/review-state.test.ts
git commit -m "fix(retention): addCard refreshes derived lessonKey so 3a-era cards self-heal"
```

---

### Task 3: Regression guard — retrieval cards now join in `unitReviewHealth`

**Files:**
- Test: `src/scripts/path/path-io.test.ts` (add one test; reuse the file's existing `Card` construction helpers if present)

**Interfaces:**
- Consumes: `unitReviewHealth(cards: Card[], now: number): Map<string, number>` from `src/scripts/path/path-io.ts`; `cardsFromRetrieval` from Task 1. Inspect `path-io.test.ts` for how it already builds `Card` objects and reuse that shape.

This task has **no implementation change** — it proves Task 1's output now flows through the join that the bug used to drop. Pure regression guard.

- [ ] **Step 1: Write the test**

```ts
import { cardsFromRetrieval } from "../review-harvest";
// (add alongside existing path-io imports)

it("unitReviewHealth buckets retrieval cards seeded with a canonical lessonKey (Phase 3b join)", () => {
  const now = Date.now();
  const seeds = cardsFromRetrieval(
    "07-stability-retrieval",
    "databases/03-execution-plans/07-plan-stability",
    "en",
    [{ q: "front", a: "back" }],
  );
  // Promote the seed to a Card the same way the store does. If path-io.test.ts has a
  // helper (e.g. makeCard / asCard), use it; otherwise spread a minimal scheduled Card
  // — copy the exact Sched field names from review-state.ts before running:
  const cards = seeds.map((s) => ({
    ...s,
    sched: { reps: 1, ease: 2.5, intervalDays: 1 }, // MUST match the real Sched shape in review-state.ts
    dueAt: now - 1000,
    addedAt: now - 2000,
    lastReviewedAt: now - 1000,
  }));
  const health = unitReviewHealth(cards as any, now);
  expect(health.has("databases/03-execution-plans")).toBe(true);
});

it("unitReviewHealth still drops a bare-id lessonKey (pre-Phase-3b fallback is harmless)", () => {
  const now = Date.now();
  const cards = [{
    cardKey: "07-x::retrieval::0", lessonKey: "07-x", source: "retrieval", index: 0,
    front: "f", back: "b", lang: "en",
    sched: { reps: 1, ease: 2.5, intervalDays: 1 }, dueAt: now, addedAt: now, lastReviewedAt: now,
  }];
  expect(unitReviewHealth(cards as any, now).has("07-x")).toBe(false);
});
```

> Before running: open `src/scripts/review-state.ts` and copy the exact `Sched` field names and the `Card` type into the literals above — the placeholder `{ reps, ease, intervalDays }` must match the real shape or `unitReviewHealth` may read undefined. If `path-io.test.ts` already exports/uses a Card factory, prefer it over hand-built literals.

- [ ] **Step 2: Run the tests to verify they pass**

Run: `bun run test src/scripts/path/path-io.test.ts`
Expected: PASS (impl already buckets `seg.length >= 2`; this confirms the seed shape lands).

- [ ] **Step 3: Commit**

```bash
git add src/scripts/path/path-io.test.ts
git commit -m "test(retention): guard retrieval→unit join for canonical lessonKey"
```

---

### Task 4: Remark plugin injects the canonical lessonKey

**Files:**
- Create: `src/lib/remark-retrieval-lessonkey.mjs`
- Create: `src/lib/remark-retrieval-lessonkey.test.ts`
- Modify: `astro.config.mjs` (add import + `markdown.remarkPlugins`)

**Interfaces:**
- Produces: `export default function remarkRetrievalLessonKey(): (tree, file) => void` — a remark transformer that pushes `{ type: "mdxJsxAttribute", name: "lessonKey", value: "<track>/<unit>/<slug>" }` onto every `mdxJsxFlowElement` named `RetrievalDrawer`, reading `track`/`unit`/`slug` from `file.data.astro.frontmatter`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/remark-retrieval-lessonkey.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import remarkRetrievalLessonKey from "./remark-retrieval-lessonkey.mjs";

function run(node: any, frontmatter: any) {
  const tree = { type: "root", children: [node] };
  const file = { data: { astro: { frontmatter } } };
  remarkRetrievalLessonKey()(tree, file);
  return node;
}

const drawer = () => ({
  type: "mdxJsxFlowElement",
  name: "RetrievalDrawer",
  attributes: [{ type: "mdxJsxAttribute", name: "id", value: "07-stability-retrieval" }],
  children: [],
});

const fm = { track: "databases", unit: "03-execution-plans", slug: "07-plan-stability" };
const attr = (node: any, name: string) =>
  node.attributes.find((a: any) => a.type === "mdxJsxAttribute" && a.name === name);

describe("remark-retrieval-lessonkey", () => {
  it("injects lessonKey=<track>/<unit>/<slug> from frontmatter", () => {
    const node = run(drawer(), fm);
    expect(attr(node, "lessonKey")?.value).toBe("databases/03-execution-plans/07-plan-stability");
  });

  it("leaves the existing id attribute intact", () => {
    const node = run(drawer(), fm);
    expect(attr(node, "id")?.value).toBe("07-stability-retrieval");
  });

  it("skips when frontmatter is missing a segment", () => {
    const node = run(drawer(), { track: "databases", slug: "07-plan-stability" }); // no unit
    expect(attr(node, "lessonKey")).toBeUndefined();
  });

  it("is idempotent when lessonKey is already present", () => {
    const node = drawer();
    node.attributes.push({ type: "mdxJsxAttribute", name: "lessonKey", value: "preset/k/e" });
    run(node, fm);
    const all = node.attributes.filter((a: any) => a.name === "lessonKey");
    expect(all).toHaveLength(1);
    expect(all[0].value).toBe("preset/k/e");
  });

  it("ignores non-RetrievalDrawer JSX nodes", () => {
    const node = { type: "mdxJsxFlowElement", name: "FadedExample", attributes: [], children: [] };
    run(node, fm);
    expect(attr(node, "lessonKey")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/lib/remark-retrieval-lessonkey.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the plugin**

Create `src/lib/remark-retrieval-lessonkey.mjs`:

```js
// Build-time injection of the canonical SRS join key into RetrievalDrawer.
// Lesson MDX instantiates <RetrievalDrawer> via an explicit import, so Astro's
// <Content components> map cannot supply a per-instance prop and the island
// cannot read page context at runtime. This plugin reads the lesson frontmatter
// and stamps lessonKey="<track>/<unit>/<slug>" onto every drawer node, so
// cardsFromRetrieval seeds a key that unitReviewHealth can bucket. See
// docs/superpowers/specs/2026-06-19-phase3b-retrieval-join-design.md.
import { visit } from "unist-util-visit";

export default function remarkRetrievalLessonKey() {
  return (tree, file) => {
    const fm = file?.data?.astro?.frontmatter;
    if (!fm) return;
    const { track, unit, slug } = fm;
    if (!track || !unit || !slug) return; // non-lesson / incomplete → bare-id fallback
    const lessonKey = `${track}/${unit}/${slug}`;
    visit(tree, "mdxJsxFlowElement", (node) => {
      if (node.name !== "RetrievalDrawer") return;
      node.attributes ??= [];
      const present = node.attributes.some(
        (a) => a && a.type === "mdxJsxAttribute" && a.name === "lessonKey",
      );
      if (present) return;
      node.attributes.push({ type: "mdxJsxAttribute", name: "lessonKey", value: lessonKey });
    });
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/lib/remark-retrieval-lessonkey.test.ts`
Expected: PASS (all 5).

- [ ] **Step 5: Register the plugin in astro.config.mjs**

Add the import near the top of `astro.config.mjs` (after the existing integration imports):

```js
import remarkRetrievalLessonKey from "./src/lib/remark-retrieval-lessonkey.mjs";
```

Add a `remarkPlugins` entry to the existing `markdown` block (keep `shikiConfig`):

```js
  markdown: {
    remarkPlugins: [remarkRetrievalLessonKey],
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
      defaultColor: false,
    },
  },
```

> `@astrojs/mdx` inherits `markdown.remarkPlugins` by default (`extendMarkdownConfig: true`), so the plugin runs for `.mdx` lessons without configuring the integration separately.

- [ ] **Step 6: Commit**

```bash
git add src/lib/remark-retrieval-lessonkey.mjs src/lib/remark-retrieval-lessonkey.test.ts astro.config.mjs
git commit -m "feat(retention): remark plugin injects canonical lessonKey into RetrievalDrawer"
```

---

### Task 5: RetrievalDrawer consumes the injected lessonKey

**Files:**
- Modify: `src/components/pedagogy/RetrievalDrawer.tsx:22-27` (Props), `:50` (destructure), `:58-61` (seed effect)
- Test: `src/components/pedagogy/RetrievalDrawer.test.tsx` (add a seed-key assertion)

**Interfaces:**
- Consumes: `cardsFromRetrieval(cardSlug, lessonKey, lang, questions)` from Task 1.
- Produces: `<RetrievalDrawer lessonKey?={string} …>` — when `lessonKey` is present, seeded cards carry it as the join key; when absent, falls back to `slug` (today's behavior).

- [ ] **Step 1: Write the failing test**

Inspect `RetrievalDrawer.test.tsx` for how it already renders the island and reads seeded cards (it likely renders with `@testing-library/preact` and asserts via `allCards()` or a localStorage read). Add, mirroring that setup:

```tsx
it("seeds cards with the injected canonical lessonKey, keeping the bare id as cardKey", () => {
  render(
    <RetrievalDrawer
      id="07-stability-retrieval"
      lessonKey="databases/03-execution-plans/07-plan-stability"
      lang="en"
      questions={[{ q: "front", a: "back" }]}
    />,
  );
  const card = allCards().find((c) => c.cardKey === "07-stability-retrieval::retrieval::0");
  expect(card).toBeDefined();
  expect(card!.lessonKey).toBe("databases/03-execution-plans/07-plan-stability");
});
```

> Use the same `allCards`/store accessor and `render` import the existing tests in this file use. If the file reads localStorage directly, match that.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/components/pedagogy/RetrievalDrawer.test.tsx`
Expected: FAIL — `lessonKey` prop is unknown; card seeded with `lessonKey === "07-stability-retrieval"` (bare slug), not the canonical key.

- [ ] **Step 3: Implement the prop wiring**

In `src/components/pedagogy/RetrievalDrawer.tsx`:

Add to the `Props` type (after `id?: string;`):

```ts
  lessonKey?: string;
```

Update the destructure (line 50):

```ts
export default function RetrievalDrawer({ pieceSlug, id, lessonKey, lang, questions }: Props) {
```

Update the seed effect (line 60):

```ts
    cardsFromRetrieval(slug, lessonKey ?? slug, lang, questions).forEach(addCard);
```

Leave `slug = pieceSlug ?? id ?? ""` and everything else (cardKey, display key, `recordReview`) unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/components/pedagogy/RetrievalDrawer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pedagogy/RetrievalDrawer.tsx src/components/pedagogy/RetrievalDrawer.test.tsx
git commit -m "feat(retention): RetrievalDrawer seeds canonical lessonKey when injected"
```

---

### Task 6: Full verification — build, lint, suite, rendered-prop spot check

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `bun run test`
Expected: PASS — prior count (1135) + the new tests, zero failures.

- [ ] **Step 2: Run the source lint**

Run: `bun run lint:src`
Expected: clean (exit 0).

- [ ] **Step 3: Build the site**

Run: `bun run build`
Expected: build completes, expected page count, lint-dist clean.

- [ ] **Step 4: Spot-check the injected prop in built HTML**

Pick one lesson known to use RetrievalDrawer and confirm the canonical key reached the rendered island props. First locate the built file, then grep:

Run: `find dist -path '*07-plan-stability*' -name index.html | head -1`
Then: `grep -o 'databases/03-execution-plans/07-plan-stability' <that-file> | head -1`
Expected: prints the canonical key (the island's serialized `lessonKey` prop).

> The island serializes props as JSON inside an `astro-island` element. If the first grep is empty, try `grep -o 'lessonKey[^,}]*07-plan-stability' <file>`. Persistent absence means the plugin did not run on `.mdx` — re-check Task 4 Step 5 (`extendMarkdownConfig`).

- [ ] **Step 5: Final commit (only if Step 4 required a config tweak; otherwise skip)**

```bash
git add -A && git commit -m "chore(retention): verify Phase 3b retrieval-join build"
```

---

## Self-Review

**Spec coverage:**
- Remark plugin (spec §Components 1) → Task 4. ✓
- `cardsFromRetrieval` signature (spec §Components 2) → Task 1. ✓
- RetrievalDrawer prop (spec §Components 3) → Task 5. ✓
- `addCard` self-heal (spec §Components 4) → Task 2. ✓
- Data flow / join works end-to-end (spec §Data flow) → Task 3 (regression guard) + Task 6 Step 4 (built-HTML proof). ✓
- Testing (spec §Testing): plugin → Task 4; cardsFromRetrieval → Task 1; addCard → Task 2; unitReviewHealth → Task 3. ✓
- Verification (spec §Verification) → Task 6. ✓
- Scope boundaries (no cardKey change, no codemod, no template change) → respected; cardKey stays bare in Task 1, no MDX edits anywhere. ✓

**Placeholder scan:** No TBD/TODO. Tasks 2, 3, 5 instruct the implementer to mirror the existing test file's accessor/Card-shape names rather than hard-coding them — deliberate (exact `Card`/`Sched` field names and store read accessor must come from the real source, not be guessed). Plugin, harvest, RetrievalDrawer, and astro.config code shown in full.

**Type consistency:** `cardsFromRetrieval(cardSlug, lessonKey, lang, questions)` used identically in Tasks 1, 3, 5. `lessonKey` attribute name matches across plugin (Task 4), prop (Task 5), and join (Task 3). cardKey format `${cardSlug}::retrieval::${index}` consistent Task 1 ↔ Task 5 ↔ Task 3.
