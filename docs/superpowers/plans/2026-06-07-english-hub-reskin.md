# English Hub Re-skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[lang]/english/` as a thin orchestrator landing matching the v2 mockup (8 sections: coverage meter, NEXT orchestrator, BYO-content pipe, owned/delegated/curated rows, honest strip), move the deep drills to sub-routes, and wire every region to real data — building four new regions (coverage, NEXT, curated listening, BYO pipe) for real.

**Architecture:** A single light `HubLanding` Preact island (`client:visible`) composes focused section components and subscribes to `englishState`/`register` once. Heavy drill modules (review, reading, grammar, writing) move to their own `.astro` sub-routes mounting the existing, unchanged islands. New pure logic (`coverage.ts`, `byo/*`, `register.ts`) is TDD'd; the mockup's HTML/CSS is the pixel source — `hub.css` is ported to `src/styles/english-hub.css` (all tokens already exist in `global.css`).

**Tech Stack:** Astro 5, Preact + `@preact/signals`, Tailwind + CSS-variable tokens, Vitest, `bun`. The English layer's existing state/SRS/BYOK modules are reused, not rewritten.

**Spec:** `docs/superpowers/specs/2026-06-07-english-hub-reskin-design.md`
**Design source (pixel truth):** `docs/redesign/v2/project/English Hub.html` + `docs/redesign/v2/project/hub.css`.

**Conventions / gotchas:**
- Branch `feat/english-hub-reskin` (already off `main`; v2 bundle + spec committed).
- `bun run check` has ~19 pre-existing errors in other files — NOT ours; full `astro build` doesn't fail on them.
- Full `astro build` ~600s — run once at the end (Task 13), in background. During tasks use `bunx vitest run src/english/`. **Don't switch branches mid-build.**
- Vitest scans `src/**/*.test.{ts,tsx}`. `~` alias → `src/`.
- English-layer i18n = inline `const L = lang === "en" ? {...} : {...}` per component (NOT ui.json, except the nav label `t("nav.english", lang)`).
- `@preact/signals`: read `signal.value` in render body to subscribe — no hooks.
- **Security:** the BYOK disclosure copy in `KeyEntry.tsx` (EN line 24 / RU line 30) is carried verbatim wherever KeyEntry renders; never edit it.
- Recurring: authoring subagents sometimes truncate before their commit step — after each, the controller verifies `git status`/`git log` and finishes the commit.

---

## Exact existing APIs (use these — verified)

**`src/english/state.ts`** (signal `englishState`, key `"awesome.english.v2"`):
- `isKnown(id: string): boolean` — placement-seeded OR card matured (`scheduled_days >= 21`).
- `dueWordIds(ids: string[], now: number): string[]`, `knownCount(ids: string[]): number`.
- `getPlacement(): { estimatedKnown: number; band: Band; takenAt: number } | undefined`.
- `gradeWord(id, grade, now): void` — creates a card on first grade. `bumpSeen(id, now): void`.
- `getNewWordsPerDay()`, `getGradingModel(): "claude-haiku-4-5" | "claude-sonnet-4-6"`, `englishKnownTotal()`.
- `Band = "A2" | "B1" | "B2"` (`src/english/types.ts`).

**`src/english/stats.ts`:** `knownByBand(): Record<Band, number>`, `knownTotal()`, `englishSummary(now)`.

**Vocab:** `VocabEntry` (`src/english/types.ts`): `{ id, lemma, rank, band, pos, ru, gloss, ipa?, examples, collocations?, domain?: "general"|"engineering" }`. Arrays: `vocabA2` (`data/vocab-a2.ts`), `vocabB1` (`data/vocab-b1.ts`), `vocabB2` (`data/vocab-b2.ts`). NAWL entries: `id.startsWith("nawl:")`, always `band:"B2"`, `domain:"engineering"`.

**`src/english/byok/index.ts`:** `hasKey(): Promise<boolean>`, `withKey<T>(fn:(key:string)=>Promise<T>): Promise<T>`. `anthropic.ts`: `gradeWithClient(task, text, deps:{fetch,withKey,model,now})` is the injectable pattern to mirror for BYO exercise generation.

**Streak/XP:** `userState.value.progression.streak` = `{ lastActiveDay, count, best }` (`src/scripts/user-state.ts`). `currentXp()` (`src/scripts/progression/current.ts`).

**Existing component props (all `{ lang: Locale }` unless noted):** `ReviewSession {lang, ids: string[]}`, `VocabModule {lang}`, `ReadingFeed {lang}`, `GrammarModule {lang}`, `OutputModule {lang}`, `KeyEntry {lang, onChange?}`, `SpeakingModule {lang}`. `Locale = "en"|"ru"`.

**Layout:** `Topic.astro` props `{ title, lang, cspExtra? }`. Island mount: `<X client:visible lang={lang} />`. `getStaticPaths` returns `[{params:{lang:"en"}},{params:{lang:"ru"}}]`.

---

## File structure

| File | Responsibility | Task |
|------|----------------|------|
| `src/styles/english-hub.css` | ported hub.css + mode tokens | 1 |
| `src/english/register.ts` | `register` signal (engineering/everyday) | 2 |
| `src/english/coverage.ts` (+test) | pure coverage % over vocab bank | 3 |
| `src/english/byo/tokenize.ts` (+test) | text → normalized lemma tokens | 4 |
| `src/english/byo/classify.ts` (+test) | lemmas → known/new/technical | 5 |
| `src/english/byo/cards.ts` (+test) | create SRS cards for new lemmas | 6 |
| `src/english/byo/exercises.ts` (+test) | AI-generate exercises (BYOK) | 7 |
| `src/english/data/listening.ts` | curated listening content | 8 |
| `src/pages/[lang]/english/{review,reading,grammar,writing}.astro` | sub-routes | 9 |
| `src/components/english/hub/{HubBar,CoverageMeter}.tsx` | hub-bar + coverage section | 10 |
| `src/components/english/hub/{NextPath,OwnedModules,Launchpads,CuratedLibrary,HonestStrip}.tsx` | orchestrator + rows | 11 |
| `src/components/english/hub/ByoPipe.tsx` | BYO pipe section | 12 |
| `src/components/english/hub/HubLanding.tsx` + `src/pages/[lang]/english/index.astro` | island + landing rewrite | 13 |

---

## Task 1: Port the hub stylesheet

**Files:**
- Create: `site/src/styles/english-hub.css`

- [ ] **Step 1: Copy the mockup CSS**

Copy the full contents of `docs/redesign/v2/project/hub.css` into `site/src/styles/english-hub.css` **verbatim**. It already references only tokens that exist in `src/styles/global.css` (`--accent`, `--d-ai`, `--muted`, `--card`, `--card-2`, `--paper`, `--hairline`, `--hairline-2`, `--hairline-strong`, `--ink`, `--ink-2`, `--faint`, `--ok`, `--warn`, `--s-*`, `--r-*`, `--fs-*`, `--font-*`, `--contour-opacity`, `--shadow-*`, `--dur-*`, `--ease`). The mode anchors block at the top (`--own/--delegate/--curate`) is included in hub.css already — keep it.

- [ ] **Step 2: Confirm no missing tokens**

Run: `cd site && grep -oE 'var\(--[a-z0-9-]+' src/styles/english-hub.css | sort -u > /tmp/used.txt && grep -oE '\--[a-z0-9-]+:' src/styles/global.css src/styles/atlas-kit.css | grep -oE '\--[a-z0-9-]+' | sort -u > /tmp/have.txt && comm -23 <(sed 's/var(//' /tmp/used.txt | sort -u) /tmp/have.txt`
Expected: empty output (every referenced token is defined). If a token is missing, STOP and report it (do not invent tokens).

- [ ] **Step 3: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/styles/english-hub.css
git commit -m "feat(english-hub): port hub.css design-language stylesheet

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `register` signal

**Files:**
- Create: `site/src/english/register.ts`

- [ ] **Step 1: Implement**

Create `site/src/english/register.ts`:

```ts
// Active learning register for the English hub. "engineering" weights the technical/NAWL corpus
// subset; "everyday" the general NGSL subset. Persisted so it survives reloads. A plain signal —
// components read `register.value` in render to subscribe.
import { signal, effect } from "@preact/signals";

export type Register = "engineering" | "everyday";

const KEY = "awesome.english.register.v1";

function load(): Register {
  if (typeof localStorage === "undefined") return "engineering";
  return localStorage.getItem(KEY) === "everyday" ? "everyday" : "engineering";
}

export const register = signal<Register>(load());

if (typeof window !== "undefined") {
  effect(() => {
    try { localStorage.setItem(KEY, register.value); } catch { /* ignore quota/denied */ }
  });
}

export function setRegister(r: Register): void { register.value = r; }
```

- [ ] **Step 2: Type-check our file**

Run: `cd site && bun run check 2>&1 | grep -E "english/register\.ts" || echo "no register.ts errors"`
Expected: `no register.ts errors`.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/register.ts
git commit -m "feat(english-hub): register signal (engineering/everyday)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Coverage logic (pure)

**Files:**
- Create: `site/src/english/coverage.ts`
- Test: `site/src/english/coverage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/english/coverage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeCoverage, type CoverageEntry } from "./coverage";

const ENTRIES: CoverageEntry[] = [
  { id: "ngsl:1", band: "A2", domain: "general" },
  { id: "ngsl:2", band: "A2", domain: "general" },
  { id: "ngsl:3", band: "B1", domain: "general" },
  { id: "ngsl:4", band: "B2", domain: "general" },
  { id: "nawl:1", band: "B2", domain: "engineering" },
  { id: "nawl:2", band: "B2", domain: "engineering" },
];

describe("computeCoverage", () => {
  it("computes per-band and overall percent over the full bank", () => {
    const known = new Set(["ngsl:1", "ngsl:3", "nawl:1"]);
    const r = computeCoverage(ENTRIES, (id) => known.has(id), "everyday");
    // everyday = general subset (4 entries): known ngsl:1,ngsl:3 → 50%
    expect(r.overallPct).toBe(50);
    const a2 = r.bands.find((b) => b.band === "A2")!;
    expect(a2).toMatchObject({ known: 1, total: 2, pct: 50 });
    expect(r.corpusTotal).toBe(4);
  });

  it("engineering register includes the technical (nawl/engineering) entries", () => {
    const known = new Set(["nawl:1"]);
    const r = computeCoverage(ENTRIES, (id) => known.has(id), "engineering");
    // engineering = general + engineering (all 6): known nawl:1 → 1/6 ≈ 17%
    expect(r.corpusTotal).toBe(6);
    expect(r.overallPct).toBe(17);
  });

  it("handles zero-known and all-known cleanly", () => {
    expect(computeCoverage(ENTRIES, () => false, "everyday").overallPct).toBe(0);
    expect(computeCoverage(ENTRIES, () => true, "everyday").overallPct).toBe(100);
  });

  it("a band with no entries reports 0% not NaN", () => {
    const only = ENTRIES.filter((e) => e.band === "A2");
    const r = computeCoverage(only, () => false, "everyday");
    const b2 = r.bands.find((b) => b.band === "B2")!;
    expect(b2).toMatchObject({ known: 0, total: 0, pct: 0 });
  });
});
```

- [ ] **Step 2: Run it — fails (no module)**

Run: `cd site && bunx vitest run src/english/coverage.test.ts`
Expected: FAIL — cannot resolve `./coverage`.

- [ ] **Step 3: Implement**

Create `site/src/english/coverage.ts`:

```ts
// Frequency-coverage of the shipped vocab bank, after Nation. Pure core takes a minimal entry
// shape + a known-predicate so it's trivially testable; a thin live wrapper feeds it the real
// vocab arrays and `isKnown`. "engineering" register = general + engineering(NAWL) subset;
// "everyday" = general only.
import type { Band } from "./types";
import type { Register } from "./register";
import { vocabA2 } from "./data/vocab-a2";
import { vocabB1 } from "./data/vocab-b1";
import { vocabB2 } from "./data/vocab-b2";
import { isKnown } from "./state";

export type CoverageEntry = { id: string; band: Band; domain?: "general" | "engineering" };
export type BandCoverage = { band: Band; known: number; total: number; pct: number };
export type Coverage = { bands: BandCoverage[]; overallPct: number; corpusTotal: number };

const BANDS: Band[] = ["A2", "B1", "B2"];
const pct = (k: number, t: number) => (t === 0 ? 0 : Math.round((k / t) * 100));

// engineering register keeps every entry; everyday drops the engineering/NAWL technical subset.
const inRegister = (e: CoverageEntry, r: Register) =>
  r === "engineering" ? true : e.domain !== "engineering" && !e.id.startsWith("nawl:");

export function computeCoverage(
  entries: CoverageEntry[],
  known: (id: string) => boolean,
  register: Register,
): Coverage {
  const corpus = entries.filter((e) => inRegister(e, register));
  const bands: BandCoverage[] = BANDS.map((band) => {
    const inBand = corpus.filter((e) => e.band === band);
    const k = inBand.filter((e) => known(e.id)).length;
    return { band, known: k, total: inBand.length, pct: pct(k, inBand.length) };
  });
  const totalKnown = bands.reduce((n, b) => n + b.known, 0);
  const corpusTotal = corpus.length;
  return { bands, overallPct: pct(totalKnown, corpusTotal), corpusTotal };
}

// Live wrapper used by the island.
export function liveCoverage(register: Register): Coverage {
  const entries: CoverageEntry[] = [...vocabA2, ...vocabB1, ...vocabB2].map((e) => ({
    id: e.id, band: e.band, domain: e.domain,
  }));
  return computeCoverage(entries, isKnown, register);
}
```

- [ ] **Step 4: Run it — passes**

Run: `cd site && bunx vitest run src/english/coverage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/coverage.ts site/src/english/coverage.test.ts
git commit -m "feat(english-hub): pure coverage computation over vocab bank

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: BYO tokenizer (pure)

**Files:**
- Create: `site/src/english/byo/tokenize.ts`
- Test: `site/src/english/byo/tokenize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/english/byo/tokenize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { tokenizeToLemmas } from "./tokenize";

describe("tokenizeToLemmas", () => {
  it("lowercases, strips punctuation, dedupes, and returns counts", () => {
    const r = tokenizeToLemmas("The server, the SERVER! A server's load.");
    const server = r.find((t) => t.lemma === "server")!;
    expect(server.count).toBe(3); // server, SERVER, server's → server
    expect(r.find((t) => t.lemma === "the")!.count).toBe(2);
  });

  it("folds common suffixes to a base lemma", () => {
    expect(tokenizeToLemmas("running runs ran").map((t) => t.lemma)).toContain("run");
    expect(tokenizeToLemmas("queues queued").map((t) => t.lemma)).toContain("queue");
  });

  it("drops numbers, urls, and 1-char tokens", () => {
    const r = tokenizeToLemmas("see https://x.io 42 a I");
    const lemmas = r.map((t) => t.lemma);
    expect(lemmas).toContain("see");
    expect(lemmas).not.toContain("https");
    expect(lemmas).not.toContain("42");
  });

  it("empty / whitespace input → empty array", () => {
    expect(tokenizeToLemmas("")).toEqual([]);
    expect(tokenizeToLemmas("   \n  ")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — fails**

Run: `cd site && bunx vitest run src/english/byo/tokenize.test.ts`
Expected: FAIL — cannot resolve `./tokenize`.

- [ ] **Step 3: Implement**

Create `site/src/english/byo/tokenize.ts`:

```ts
// Split pasted English text into normalized lemma tokens with frequency counts. Deliberately
// lightweight (no NLP dependency): lowercase, strip punctuation, drop numbers/urls/1-char tokens,
// and fold a few common inflections so tokens hit the vocab bank's base lemmas.
export type Lemma = { lemma: string; count: number };

// crude but predictable suffix folding; order matters (longest first).
function fold(w: string): string {
  if (w.length <= 3) return w;
  for (const [suf, repl, min] of [
    ["ies", "y", 4], ["sses", "ss", 5], ["ing", "", 5], ["ied", "y", 4],
    ["ed", "", 4], ["es", "", 4], ["s", "", 4],
  ] as [string, string, number][]) {
    if (w.length >= min && w.endsWith(suf)) return w.slice(0, w.length - suf.length) + repl;
  }
  return w;
}

export function tokenizeToLemmas(text: string): Lemma[] {
  const counts = new Map<string, number>();
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue;
    if (/^https?:\/\//i.test(raw) || /\d/.test(raw)) continue; // urls, anything with a digit
    const w = raw.toLowerCase().replace(/[^a-z']/g, "").replace(/^'+|'+$/g, "").replace(/'s$/, "");
    if (w.length < 2) continue;
    const lemma = fold(w);
    if (lemma.length < 2) continue;
    counts.set(lemma, (counts.get(lemma) ?? 0) + 1);
  }
  return [...counts.entries()].map(([lemma, count]) => ({ lemma, count })).sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 4: Run it — passes**

Run: `cd site && bunx vitest run src/english/byo/tokenize.test.ts`
Expected: PASS (4 tests). If a suffix-fold assertion is off, adjust the fold table to satisfy the documented cases (do not loosen the test intent).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/byo/tokenize.ts site/src/english/byo/tokenize.test.ts
git commit -m "feat(english-hub): BYO text tokenizer → lemmas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: BYO classifier (pure)

**Files:**
- Create: `site/src/english/byo/classify.ts`
- Test: `site/src/english/byo/classify.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/english/byo/classify.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyLemmas, type BankIndexEntry } from "./classify";

const BANK: BankIndexEntry[] = [
  { id: "ngsl:1", lemma: "server" },
  { id: "ngsl:2", lemma: "queue" },
  { id: "nawl:1", lemma: "idempotent" },
];

describe("classifyLemmas", () => {
  it("splits known / new / technical against the bank + known set", () => {
    const known = new Set(["ngsl:1"]); // server known
    const r = classifyLemmas(
      [{ lemma: "server", count: 2 }, { lemma: "queue", count: 1 }, { lemma: "backpressure", count: 3 }],
      BANK, (id) => known.has(id),
    );
    expect(r.known.map((x) => x.lemma)).toEqual(["server"]);
    expect(r.newWords.map((x) => x.id)).toEqual(["ngsl:2"]);      // queue: in bank, not known
    expect(r.technical.map((x) => x.lemma)).toEqual(["backpressure"]); // not in bank
    expect(r.counts).toEqual({ known: 1, new: 1, technical: 1 });
  });

  it("a bank word that is unknown but NAWL-technical counts as new (it has a card path)", () => {
    const r = classifyLemmas([{ lemma: "idempotent", count: 1 }], BANK, () => false);
    expect(r.newWords.map((x) => x.id)).toEqual(["nawl:1"]);
    expect(r.technical).toEqual([]);
  });

  it("empty input → empty buckets, zero counts", () => {
    const r = classifyLemmas([], BANK, () => false);
    expect(r).toMatchObject({ known: [], newWords: [], technical: [], counts: { known: 0, new: 0, technical: 0 } });
  });
});
```

- [ ] **Step 2: Run it — fails**

Run: `cd site && bunx vitest run src/english/byo/classify.test.ts`
Expected: FAIL — cannot resolve `./classify`.

- [ ] **Step 3: Implement**

Create `site/src/english/byo/classify.ts`:

```ts
// Bucket tokenized lemmas against the vocab bank + the user's known set:
//   known     — lemma maps to a bank entry the user already knows
//   newWords   — lemma maps to a bank entry not yet known (has a real card path: id, gloss, ru)
//   technical  — lemma not in the bank at all (surfaced, but not auto-carded in v1)
import type { Lemma } from "./tokenize";

export type BankIndexEntry = { id: string; lemma: string };
export type ClassifiedWord = { lemma: string; count: number; id?: string };
export type Classification = {
  known: ClassifiedWord[];
  newWords: ClassifiedWord[];
  technical: ClassifiedWord[];
  counts: { known: number; new: number; technical: number };
};

export function classifyLemmas(
  lemmas: Lemma[],
  bank: BankIndexEntry[],
  known: (id: string) => boolean,
): Classification {
  const byLemma = new Map(bank.map((e) => [e.lemma, e.id]));
  const out: Classification = { known: [], newWords: [], technical: [], counts: { known: 0, new: 0, technical: 0 } };
  for (const { lemma, count } of lemmas) {
    const id = byLemma.get(lemma);
    if (id && known(id)) out.known.push({ lemma, count, id });
    else if (id) out.newWords.push({ lemma, count, id });
    else out.technical.push({ lemma, count });
  }
  out.counts = { known: out.known.length, new: out.newWords.length, technical: out.technical.length };
  return out;
}

// Live bank index built from the vocab arrays (used by the island).
export function bankIndex(entries: { id: string; lemma: string }[]): BankIndexEntry[] {
  return entries.map((e) => ({ id: e.id, lemma: e.lemma.toLowerCase() }));
}
```

- [ ] **Step 4: Run it — passes**

Run: `cd site && bunx vitest run src/english/byo/classify.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/byo/classify.ts site/src/english/byo/classify.test.ts
git commit -m "feat(english-hub): BYO lemma classifier (known/new/technical)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: BYO card creation

**Files:**
- Create: `site/src/english/byo/cards.ts`
- Test: `site/src/english/byo/cards.test.ts`

- [ ] **Step 1: Find the "Again" grade value**

The card-create path is `gradeWord(id, grade, now)`. Read the grade literal the existing "Again" review button passes so a fresh BYO card schedules for near-term review:

Run: `cd site && grep -nE "gradeWord\(|grade.*=.*['\"]|Grade" src/components/english/ReviewSession.tsx src/english/types.ts | head -30`

Note the `Grade` type (in `src/english/types.ts`) and the value used for "Again" (the failed/hard recall). Use that literal as `AGAIN` below.

- [ ] **Step 2: Write the failing test**

Create `site/src/english/byo/cards.test.ts` (uses a fake grader so it stays pure — no real signal needed):

```ts
import { describe, it, expect } from "vitest";
import { addByoCards } from "./cards";

describe("addByoCards", () => {
  it("grades each new-word id once to create a card", () => {
    const calls: string[] = [];
    const created = addByoCards(["ngsl:2", "nawl:1"], 1000, (id) => calls.push(id));
    expect(calls).toEqual(["ngsl:2", "nawl:1"]);
    expect(created).toBe(2);
  });

  it("dedupes ids and skips empties", () => {
    const calls: string[] = [];
    const created = addByoCards(["ngsl:2", "ngsl:2", ""], 1000, (id) => calls.push(id));
    expect(calls).toEqual(["ngsl:2"]);
    expect(created).toBe(1);
  });
});
```

- [ ] **Step 3: Run it — fails**

Run: `cd site && bunx vitest run src/english/byo/cards.test.ts`
Expected: FAIL — cannot resolve `./cards`.

- [ ] **Step 4: Implement**

Create `site/src/english/byo/cards.ts` (substitute `AGAIN` with the literal found in Step 1):

```ts
// Create SRS cards for the in-bank "new" lemmas a BYO source surfaced. Each id is graded once
// (the "Again" grade) so it enters the deck scheduled for near-term review. Pure w.r.t. an injected
// grader for testability; the live wrapper binds the real `gradeWord`.
import { gradeWord } from "../state";

const AGAIN = "again"; // ← replace with the exact Grade literal ReviewSession's "Again" button passes

export function addByoCards(ids: string[], now: number, grade: (id: string) => void): number {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    grade(id);
  }
  return seen.size;
}

// Live wrapper.
export function commitByoCards(ids: string[], now: number): number {
  return addByoCards(ids, now, (id) => gradeWord(id, AGAIN as never, now));
}
```

(If the `Grade` type is a string union, drop the `as never` and type `AGAIN` as that union.)

- [ ] **Step 5: Run it — passes**

Run: `cd site && bunx vitest run src/english/byo/cards.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Type-check + commit**

```bash
cd /Users/artemmac/dev/awesome-everything
cd site && bun run check 2>&1 | grep -E "byo/cards\.ts" || echo "no cards.ts errors"
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/byo/cards.ts site/src/english/byo/cards.test.ts
git commit -m "feat(english-hub): BYO SRS card creation for new lemmas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: BYO exercise generation (BYOK)

**Files:**
- Create: `site/src/english/byo/exercises.ts`
- Test: `site/src/english/byo/exercises.test.ts`

Mirror the injectable-deps pattern of `src/english/byok/anthropic.ts` (`gradeWithClient(..., deps)`) so the core is testable with a fake fetch and never touches a real key.

- [ ] **Step 1: Write the failing test**

Create `site/src/english/byo/exercises.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateExercisesWith, type ExerciseDeps } from "./exercises";

const fakeResponse = {
  cloze: [{ sentence: "The ___ absorbs load.", answer: "queue" }],
  comprehension: [{ q: "What absorbs load?", a: "the queue" }],
  retell: "Explain backpressure in two sentences.",
};

function depsReturning(json: unknown): ExerciseDeps {
  return {
    withKey: async (fn) => fn("sk-test"),
    fetch: (async () => ({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: JSON.stringify(json) }] }),
    })) as unknown as typeof fetch,
    model: "claude-haiku-4-5",
  };
}

describe("generateExercisesWith", () => {
  it("parses the model's JSON into cloze/comprehension/retell", async () => {
    const r = await generateExercisesWith("Backpressure bounds a queue.", depsReturning(fakeResponse), depsReturning(fakeResponse));
    expect(r.cloze[0].answer).toBe("queue");
    expect(r.comprehension[0].q).toMatch(/load/i);
    expect(r.retell).toMatch(/backpressure/i);
  });

  it("throws a typed error on a non-ok response (caller shows a retry state)", async () => {
    const bad: ExerciseDeps = { ...depsReturning({}), fetch: (async () => ({ ok: false, status: 500 })) as unknown as typeof fetch };
    await expect(generateExercisesWith("x", bad, bad)).rejects.toThrow();
  });
});
```

(The duplicated arg is intentional in the test only to keep the call simple — the real signature takes deps once; adjust the test to your final signature in Step 3 if you prefer a single deps arg.)

- [ ] **Step 2: Run it — fails**

Run: `cd site && bunx vitest run src/english/byo/exercises.test.ts`
Expected: FAIL — cannot resolve `./exercises`.

- [ ] **Step 3: Implement**

Create `site/src/english/byo/exercises.ts`:

```ts
// Generate practice exercises from a BYO source via the learner's own Anthropic key (BYOK).
// Mirrors byok/anthropic.ts: an injectable core (deps) + a thin live wrapper. NEVER stores the key;
// reuses the audited withKey() so egress + CSP are unchanged. Without a key the caller skips this
// entirely (cards are still created in Task 6) and shows an "add key" affordance.
import { withKey as liveWithKey } from "../byok";
import { getGradingModel } from "../state";

export type GenExercises = {
  cloze: { sentence: string; answer: string }[];
  comprehension: { q: string; a: string }[];
  retell: string;
};
export type ExerciseDeps = {
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  fetch: typeof fetch;
  model: string;
};

const PROMPT = (text: string) =>
  `From the English passage below, produce STRICT JSON {cloze:[{sentence,answer}],comprehension:[{q,a}],retell} ` +
  `with 6 cloze gaps on useful words, 4 comprehension questions, and one one-sentence retell task. ` +
  `No prose outside the JSON.\n\nPASSAGE:\n${text.slice(0, 6000)}`;

export async function generateExercisesWith(text: string, deps: ExerciseDeps): Promise<GenExercises> {
  return deps.withKey(async (key) => {
    const res = await deps.fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: deps.model, max_tokens: 1500,
        messages: [{ role: "user", content: PROMPT(text) }],
      }),
    });
    if (!res.ok) throw new Error(`exercise generation failed: ${res.status}`);
    const data = await res.json();
    const raw = data?.content?.[0]?.text ?? "{}";
    const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    return {
      cloze: Array.isArray(json.cloze) ? json.cloze : [],
      comprehension: Array.isArray(json.comprehension) ? json.comprehension : [],
      retell: typeof json.retell === "string" ? json.retell : "",
    };
  });
}

export function generateExercises(text: string): Promise<GenExercises> {
  return generateExercisesWith(text, { withKey: liveWithKey, fetch: fetch.bind(globalThis), model: getGradingModel() });
}
```

Update the test's call to the single-deps signature: `generateExercisesWith("...", depsReturning(fakeResponse))` (remove the duplicated second arg).

- [ ] **Step 4: Run it — passes**

Run: `cd site && bunx vitest run src/english/byo/exercises.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/byo/exercises.ts site/src/english/byo/exercises.test.ts
git commit -m "feat(english-hub): BYO AI exercise generation (BYOK, injectable)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Curated listening content

**Files:**
- Create: `site/src/english/data/listening.ts`

- [ ] **Step 1: Implement the typed curated set**

Create `site/src/english/data/listening.ts`:

```ts
// Curated external listening/immersion library (the engine we deliberately don't build). Small,
// vetted, dated set — easy to refresh. Bilingual "how to use" lives in the component; this is data.
import type { Band } from "../types";

export type ListenItem = {
  title: string;
  url: string;
  kind: "video" | "audio";
  minutes: number;
  band: Exclude<Band, "A2"> | "A2";
  how: { en: string; ru: string }; // intensive/extensive guidance, one line
};

export const listening: ListenItem[] = [
  { title: "Database indexing, visually — ByteByteGo", url: "https://www.youtube.com/@ByteByteGo", kind: "video", minutes: 12, band: "B2",
    how: { en: "intensive: rewatch with captions", ru: "интенсивно: пересмотри с субтитрами" } },
  { title: "How TLS actually works — Computerphile", url: "https://www.youtube.com/@Computerphile", kind: "video", minutes: 18, band: "B1",
    how: { en: "intensive: shadow the narrator", ru: "интенсивно: повторяй за диктором" } },
  { title: "Distributed systems, the hard parts — podcast", url: "https://www.se-radio.net/", kind: "audio", minutes: 41, band: "B2",
    how: { en: "extensive: listen once for gist", ru: "экстенсивно: слушай раз для общего смысла" } },
  { title: "The Changelog — engineering interviews", url: "https://changelog.com/podcast", kind: "audio", minutes: 60, band: "B2",
    how: { en: "extensive: background listening for volume", ru: "экстенсивно: фоновое слушание для объёма" } },
  { title: "Hussein Nasser — backend deep dives", url: "https://www.youtube.com/@hnasr", kind: "video", minutes: 20, band: "B1",
    how: { en: "intensive: pause and mine 5 new terms", ru: "интенсивно: ставь на паузу, выпиши 5 новых слов" } },
  { title: "Krazam — tech satire (light immersion)", url: "https://www.youtube.com/@Krazam", kind: "video", minutes: 5, band: "B1",
    how: { en: "extensive: fun input, no pausing", ru: "экстенсивно: лёгкий ввод, без пауз" } },
];
```

(These are stable channel/show landing pages, not deep-links that rot fast. The owner may swap specific links on review.)

- [ ] **Step 2: Type-check + commit**

```bash
cd /Users/artemmac/dev/awesome-everything
cd site && bun run check 2>&1 | grep -E "data/listening\.ts" || echo "no listening.ts errors"
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/data/listening.ts
git commit -m "content(english-hub): curated listening library starter set

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Deep-module sub-routes

**Files:**
- Create: `site/src/pages/[lang]/english/review.astro`
- Create: `site/src/pages/[lang]/english/reading.astro`
- Create: `site/src/pages/[lang]/english/grammar.astro`
- Create: `site/src/pages/[lang]/english/writing.astro`

Each is a thin page reusing the existing island. `review.astro` needs the due ids; compute them from the full vocab bank like `Today.tsx` does — read `Today.tsx` first for the exact `ids`/`now` it passes to `ReviewSession`, and mirror it.

- [ ] **Step 1: Read how Today feeds ReviewSession**

Run: `cd site && grep -nE "ReviewSession|VocabModule|dueWordIds|allVocabIds|now" src/components/english/Today.tsx | head -20`
Use the same id-source + `now` expression for `review.astro`.

- [ ] **Step 2: Create the four sub-routes**

`site/src/pages/[lang]/english/reading.astro`:

```astro
---
import Topic from "../../../layouts/Topic.astro";
import ReadingFeed from "../../../components/english/ReadingFeed.tsx";
import { type Locale, isLocale, t } from "../../../i18n";
export function getStaticPaths() { return [{ params: { lang: "en" } }, { params: { lang: "ru" } }]; }
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
const back = lang === "ru" ? "← Хаб" : "← Hub";
---
<Topic title={t("nav.english", lang)} lang={lang}>
  <div class="max-w-[760px] mx-auto">
    <a class="meta" href={`/${lang}/english/`}>{back}</a>
    <ReadingFeed client:visible lang={lang} />
  </div>
</Topic>
```

`grammar.astro` and `writing.astro` are identical with `GrammarModule` / `OutputModule` swapped in (import + tag). For `writing.astro`, also confirm `OutputModule` renders `KeyEntry` internally (it does) so the security disclosure ships there — do NOT add or alter that copy.

`review.astro` (fill `<ids-expr>` / `<now-expr>` from Step 1):

```astro
---
import Topic from "../../../layouts/Topic.astro";
import ReviewSession from "../../../components/english/ReviewSession.tsx";
import VocabModule from "../../../components/english/VocabModule.tsx";
import { type Locale, isLocale, t } from "../../../i18n";
export function getStaticPaths() { return [{ params: { lang: "en" } }, { params: { lang: "ru" } }]; }
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
const back = lang === "ru" ? "← Хаб" : "← Hub";
---
<Topic title={t("nav.english", lang)} lang={lang}>
  <div class="max-w-[760px] mx-auto">
    <a class="meta" href={`/${lang}/english/`}>{back}</a>
    <VocabModule client:visible lang={lang} />
    <ReviewSession client:visible lang={lang} ids={[]} />
  </div>
</Topic>
```

NOTE on `ReviewSession ids`: it takes `{ lang, ids: string[] }`. `ids={[]}` is a placeholder — replace with the real due-id expression from Step 1 (the same one `Today.tsx` computes). If `Today.tsx` computes ids inside the island rather than passing them in, instead lift that computation into a tiny island wrapper or pass the full candidate vocab id list; match whatever contract `ReviewSession` actually expects (verify by reading `ReviewSession.tsx:17` and its usage).

- [ ] **Step 3: Verify build picks up the routes**

Run: `cd site && bunx astro build --silent 2>&1 | grep -E "english/(review|reading|grammar|writing)" | head` *(or defer to the Task 13 full build)*. Quick parse check instead: `cd site && bunx astro check 2>&1 | grep -E "english/(review|reading|grammar|writing)\.astro" || echo "sub-routes parse clean"`.
Expected: no errors specific to the four new files.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/pages/[lang]/english/review.astro site/src/pages/[lang]/english/reading.astro site/src/pages/[lang]/english/grammar.astro site/src/pages/[lang]/english/writing.astro
git commit -m "feat(english-hub): deep-module sub-routes (review/reading/grammar/writing)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Hub-bar + Coverage section components

**Files:**
- Create: `site/src/components/english/hub/HubBar.tsx`
- Create: `site/src/components/english/hub/CoverageMeter.tsx`

These are plain Preact components (rendered inside `HubLanding` in Task 13 — NOT islands themselves). Markup matches `docs/redesign/v2/project/English Hub.html` (HubBar = the `.hub-bar` section lines 58–84; CoverageMeter = the `.coverage` card lines 94–142) using the classes now in `english-hub.css`.

- [ ] **Step 1: HubBar**

Create `HubBar.tsx`. Props `{ lang: Locale }`. Renders the `.hub-bar` markup: kicker, `<h1>English Hub</h1>`, sub-lead, the register `.seg` (bound to `register.value` / `setRegister` from `~/english/register`), the `.cefr` chip (band from `getPlacement()?.band ?? "A2"`, progress bar width = a simple within-band heuristic), and the `.streak-chip` (count from `userState.value.progression.streak.count`). Bilingual `L` object for all strings. Read `register.value`, `englishState.value`, `userState.value` in the body to subscribe.

- [ ] **Step 2: CoverageMeter**

Create `CoverageMeter.tsx`. Props `{ lang: Locale }`. Compute `const cov = liveCoverage(register.value)` (from `~/english/coverage`) — read `register.value` to subscribe to register changes, and `englishState.value` to recompute when known-set changes.

- Gauge: the SVG track/value arc is the semicircle `d="M30 160 A130 130 0 0 1 290 160"` (radius 130). Arc length `LEN = Math.PI * 130 ≈ 408.4`. Set the value arc `stroke-dasharray={LEN}` and `stroke-dashoffset={LEN * (1 - cov.overallPct/100)}`. Readout number = `cov.overallPct`. Threshold ticks at 75/90 are static (copy from the mockup). The pointer circle is optional — place it at the arc angle for `overallPct` (`angle = Math.PI * (1 - pct/100)`, `cx = 160 + 130*Math.cos(angle)`, `cy = 160 - 130*Math.sin(angle)`), or omit it (the mockup tolerates a static pointer).
- Bands: render one `.band-row` per `cov.bands` entry. Fill = an **in-flow block `<div>` with inline `width: pct%`** inside `.band-track` (NOT a `<span>`/inline element — see spec §3.5; the mockup hit a real parser bug). Color the fill by tier: `pct >= 90` → `color-mix(in srgb, var(--ok) 80%, var(--ink))`; `pct >= 75` → `var(--accent)`; else `color-mix(in srgb, var(--warn) 80%, var(--ink))`. Add the two dashed `.band-grid i` gridlines at `left:75%` and `left:90%`.
- Corpus header: name + word-family count reflect `register.value` (engineering → "Backend Engineering" / `cov.corpusTotal` families; everyday → "General English"). The `.cite` and `.fig-caption` copy come from the mockup (bilingual).
- Respect `prefers-reduced-motion` (the CSS already does via the global rule; no JS animation needed — set dashoffset directly).

- [ ] **Step 3: Type-check**

Run: `cd site && bun run check 2>&1 | grep -E "hub/(HubBar|CoverageMeter)\.tsx" || echo "no errors in HubBar/CoverageMeter"`
Expected: `no errors in HubBar/CoverageMeter`.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/components/english/hub/HubBar.tsx site/src/components/english/hub/CoverageMeter.tsx
git commit -m "feat(english-hub): HubBar + CoverageMeter section components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Orchestrator + module-row components

**Files:**
- Create: `site/src/components/english/hub/NextPath.tsx`
- Create: `site/src/components/english/hub/OwnedModules.tsx`
- Create: `site/src/components/english/hub/Launchpads.tsx`
- Create: `site/src/components/english/hub/CuratedLibrary.tsx`
- Create: `site/src/components/english/hub/HonestStrip.tsx`

All plain Preact, props `{ lang: Locale }`, bilingual `L`, classes from `english-hub.css`, markup per the matching mockup sections.

- [ ] **Step 1: NextPath** (mockup `.path-list` lines 158–214)

Assemble an ordered `actions` array from real signals (spec §3.6), each `{ mode: "own"|"delegate"|"curate", title, reason, minutes, route, cite, cta }`:
- Own — due cards: `const due = dueWordIds(ALL_IDS, Date.now())` where `ALL_IDS = [...vocabA2,...vocabB1,...vocabB2].map(e=>e.id)`. If `due.length` → action → `/${lang}/english/review`, cite "Roediger & Karpicke".
- Own — reading: pick a recommended unit (first not-read unit at the user's band); route `/${lang}/english/reading`, cite "Krashen".
- Delegate — speaking: a fixed structured speaking task → `/${lang}/english/speaking`, cite "Swain".
- Curate — listening: `listening[0]` (or first matching the band) → external `url`.
Render the `.mode-legend` + `.path-list` with `.action.is-{mode}` rows (solid/dashed/dotted left border come from CSS). CTA buttons: Own/`btn-primary`, Delegate/`btn-launch`, Curate/`btn-ext`. Drop actions whose signal is empty; cap at 5.

- [ ] **Step 2: OwnedModules** (mockup `.row-2` → `.module` lines 310–355)

Two `.module` cards:
- Vocabulary: `due = dueWordIds(ALL_IDS, Date.now()).length` → `.due-num`; the 7-day `.sched` sparkline can use a simple projection (bucket due cards by interval) or fixed bars if projection is out of scope — keep it honest (label "scheduled"); `Review now` → `/review`. Retention/`612 words tracked` line uses `knownCount`/tracked counts you can read from state (no invented numbers — derive or omit the stat).
- Reading: known-% ring for the recommended unit (reuse the coverage idea per-unit, or show overall reading coverage); `Open reader` → `/reading`.

- [ ] **Step 3: Launchpads** (mockup `.row-2` → `.launchpad` lines 366–412)

Two `.launchpad` cards (Speaking, Writing). Persona + structured-task + rubric copy verbatim from the mockup (bilingual where the mockup is EN-only → author RU). BYOK status chip: `const [keyOn, setKeyOn] = useState(false); useEffect(() => { hasKey().then(setKeyOn); }, [])` → show "key connected" (`.byok .key` green) vs "add your key". CTAs → `/${lang}/english/speaking` and `/${lang}/english/writing`.

- [ ] **Step 4: CuratedLibrary** (mockup `.library` lines 423–453)

Render `listening` (from `~/english/data/listening`) as `.lib-item` rows (kind icon, title link `target="_blank" rel="noopener"`, meta = `kind · {minutes} min` + band + `how[lang]`). Then the `.how-to` intensive/extensive block (bilingual copy from the mockup). The kicker line is bilingual.

- [ ] **Step 5: HonestStrip** (mockup `.honest` lines 457–476)

Static three-item grid; copy verbatim from the mockup (bilingual). No data.

- [ ] **Step 6: Type-check + commit**

```bash
cd /Users/artemmac/dev/awesome-everything
cd site && bun run check 2>&1 | grep -E "hub/(NextPath|OwnedModules|Launchpads|CuratedLibrary|HonestStrip)\.tsx" || echo "no errors in row components"
cd /Users/artemmac/dev/awesome-everything
git add site/src/components/english/hub/NextPath.tsx site/src/components/english/hub/OwnedModules.tsx site/src/components/english/hub/Launchpads.tsx site/src/components/english/hub/CuratedLibrary.tsx site/src/components/english/hub/HonestStrip.tsx
git commit -m "feat(english-hub): NextPath orchestrator + owned/delegated/curated/honest components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: BYO-content pipe component

**Files:**
- Create: `site/src/components/english/hub/ByoPipe.tsx`

Markup per the mockup `.byo` card (lines 225–300): input field + Text/URL `.src-seg` + example chips, then the three `.pipe-stage`s (Extract / Build / Reuse) with connectors.

- [ ] **Step 1: Implement**

Props `{ lang: Locale }`. Local state via `useState`: `text`, `srcType: "text"|"url"`, `result: Classification | null`, `building: boolean`, `exercises: GenExercises | null`, `keyOn: boolean`, `error: string | null`.

Behaviour:
- Build the live bank index once: `const BANK = bankIndex([...vocabA2,...vocabB1,...vocabB2])` (from `~/english/byo/classify`).
- `srcType === "url"` → the input is a hint only; show inline note "paste the text for now" (v1 — no fetch). Example chips prefill `text`.
- "Make lesson" → `const lemmas = tokenizeToLemmas(text); const r = classifyLemmas(lemmas, BANK, isKnown); setResult(r)`.
- Extract stage: render `.extract-bar` with the three `.eb known/new/tech` widths from `r.counts` proportions, and `.extract-key` counts.
- Build stage: on a "Build deck" action → `commitByoCards(r.newWords.map(w=>w.id!).filter(Boolean), Date.now())` (from `~/english/byo/cards`) to create cards; then if `keyOn` → `setBuilding(true); generateExercises(text).then(setExercises).catch(e=>setError(String(e))).finally(()=>setBuilding(false))` (from `~/english/byo/exercises`). If `!keyOn` → show an "add your AI key" affordance linking to `/${lang}/english/writing` (where KeyEntry lives); cards are still created. Use `hasKey().then(setKeyOn)` in a `useEffect`.
- Reuse stage: the five `.reuse-card`s (Comprehension/Vocab = Own; Dictation/Retell/Imitation = Delegate) per the mockup.
- Bilingual `L`; `.fig-caption` from the mockup.

- [ ] **Step 2: Type-check**

Run: `cd site && bun run check 2>&1 | grep -E "hub/ByoPipe\.tsx" || echo "no ByoPipe errors"`
Expected: `no ByoPipe errors`.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/components/english/hub/ByoPipe.tsx
git commit -m "feat(english-hub): BYO-content pipe component (paste → extract → build → reuse)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 13: HubLanding island + landing rewrite (integration)

**Files:**
- Create: `site/src/components/english/hub/HubLanding.tsx`
- Modify: `site/src/pages/[lang]/english/index.astro` (full rewrite)

- [ ] **Step 1: HubLanding island**

Create `HubLanding.tsx`. Props `{ lang: Locale }`. Imports `english-hub.css` is done at the page level (Step 2), not here. Compose the sections in mockup order inside a `<div class="wrap hub">`:

```tsx
import type { Locale } from "~/i18n";
import HubBar from "./HubBar";
import CoverageMeter from "./CoverageMeter";
import NextPath from "./NextPath";
import ByoPipe from "./ByoPipe";
import OwnedModules from "./OwnedModules";
import Launchpads from "./Launchpads";
import CuratedLibrary from "./CuratedLibrary";
import HonestStrip from "./HonestStrip";

export default function HubLanding({ lang }: { lang: Locale }) {
  return (
    <div class="wrap hub">
      <HubBar lang={lang} />
      <CoverageMeter lang={lang} />
      <NextPath lang={lang} />
      <ByoPipe lang={lang} />
      <OwnedModules lang={lang} />
      <Launchpads lang={lang} />
      <CuratedLibrary lang={lang} />
      <HonestStrip lang={lang} />
    </div>
  );
}
```

Wrap each section in its `<section class="hub-section">` + `.sec-head` (index/title/note) — either here or inside each component; keep it consistent (recommend the `.sec-head` lives inside each section component so they're self-contained, matching the mockup where each `<section>` owns its head).

- [ ] **Step 2: Rewrite the landing page**

Replace `site/src/pages/[lang]/english/index.astro` with:

```astro
---
import Topic from "../../../layouts/Topic.astro";
import HubLanding from "../../../components/english/hub/HubLanding.tsx";
import { type Locale, isLocale, t } from "../../../i18n";
import "../../../styles/english-hub.css";
export function getStaticPaths() { return [{ params: { lang: "en" } }, { params: { lang: "ru" } }]; }
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
---
<Topic title={t("nav.english", lang)} lang={lang}>
  <HubLanding client:visible lang={lang} />
</Topic>
```

(If Astro requires the CSS import in the island instead, import `~/styles/english-hub.css` at the top of `HubLanding.tsx` — verify the build picks it up.)

- [ ] **Step 3: Retire superseded inline modules**

The old landing mounted `EnglishDashboard` + `Today` + `ReadingFeed` + `GrammarModule` + `OutputModule` inline. Those are now reached via the hub sections + sub-routes. `ReadingFeed`/`GrammarModule`/`OutputModule` remain used by the sub-routes. `EnglishDashboard` and `Today` are no longer mounted anywhere — verify, then leave the component files in place (no longer imported) OR delete if unused. Confirm nothing else imports them:

Run: `cd site && grep -rnE "EnglishDashboard|components/english/Today" src/pages src/components | grep -v "english/Today.tsx\b"`
Expected: no remaining import sites (besides Today.tsx's own file). If `Today`'s due-id logic was the only place computing the review id-set, ensure Task 9's `review.astro` reproduced it before deleting Today.

- [ ] **Step 4: Full build + lint gate (background)**

Run (background): `cd site && bun run build`
Expected: build succeeds; `dist/lint-report.json` 0 errors / 0 warnings; page count = previous + 8 (four sub-routes × 2 langs). The hub landing mounts a single island.

- [ ] **Step 5: Visual verification**

Open `/en/english` and `/ru/english` in light + dark:
- 8 sections render in order; gauge shows the real coverage %, bands colored by tier; NEXT lists real due-count + actions; BYO paste produces an extract split and creates cards; owned/delegated/curated/honest render; Russian reflows without clipping; mobile (≤760) collapses per `hub.css`.
- Each CTA navigates to its sub-route; `/english/writing` shows the BYOK disclosure **byte-identical** to before (diff `KeyEntry.tsx` against `main` to confirm unchanged).

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/components/english/hub/HubLanding.tsx site/src/pages/[lang]/english/index.astro
# include EnglishDashboard/Today deletions if removed
git commit -m "feat(english-hub): HubLanding island + orchestrator landing rewrite

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 14: Final review gate

- [ ] **Step 1: Full test suite**

Run: `cd site && bunx vitest run src/english/`
Expected: all pass (coverage, tokenize, classify, cards, exercises + existing english tests).

- [ ] **Step 2: Opus review of the whole diff**

Per the project workflow, run a final opus review over `git diff main...HEAD`. Focus: real-data wiring (no placeholder numbers shipped — every stat derives from state or is honestly labeled), the single-island hydration boundary, sub-route correctness (`ReviewSession` gets real due ids), BYO pipe (cards actually created; graceful no-key path; never logs the key), the security disclosure unchanged, EN/RU + light/dark, mobile reflow. Address findings; re-run Steps 1 + the build if code changed.

- [ ] **Step 3: Stop — await owner**

Do NOT FF-merge or push. Report: branch ready, build/lint/test evidence, the new routes, and any deferred items (BYO URL fetch). Merge happens on the owner's explicit command.

---

## Self-review notes

- **Spec coverage:** §3.1 IA → Tasks 9 (sub-routes) + 13 (landing). §3.2 styling → Task 1. §3.3 files → Tasks 10–13. §3.4 sections → Tasks 10/11/12 (each mockup section has a component). §3.5 coverage → Task 3 + CoverageMeter (Task 10). §3.6 NextPath → Task 11. §3.7 BYO → Tasks 4/5/6/7 (logic) + 12 (UI). §3.8 i18n/themes/a11y/security → carried in every UI task + the build/visual gate (Task 13) + the disclosure-unchanged check.
- **Real-data, not placeholders:** coverage from `liveCoverage`; due from `dueWordIds`; band from `getPlacement`; streak from `userState`; BYOK status from `hasKey`; BYO cards via `commitByoCards`; exercises via `generateExercises`. Where the mockup showed a number we can't derive (e.g. "89% retained over 30 days"), the plan says derive-or-omit, never hardcode.
- **Type/name consistency:** `computeCoverage`/`liveCoverage`, `tokenizeToLemmas`→`Lemma`, `classifyLemmas`→`Classification`/`ClassifiedWord`/`BankIndexEntry`, `addByoCards`/`commitByoCards`, `generateExercisesWith`/`generateExercises`→`GenExercises`/`ExerciseDeps`, `register`/`setRegister`/`Register`, `listening`/`ListenItem` — used identically across producing + consuming tasks.
- **Known unknowns the implementer must resolve from the codebase (with exact read steps provided, not guesses):** the `Grade` "Again" literal (Task 6 Step 1); how `Today.tsx` feeds `ReviewSession` ids (Task 9 Step 1); whether CSS import belongs in the page or island (Task 13 Step 2). Each has a concrete discovery step.
- **UI markup fidelity:** the plan references the mockup file + exact line ranges per section rather than transcribing ~490 lines of HTML; `english-hub.css` (Task 1) provides every class. This is the authoritative pixel source the whole sub-project is implementing.
- **Sequencing:** logic (1–8) before UI (10–12) before integration (13); BYO is isolated (4–7 + 12) so it can slip without blocking the orchestrator landing.
