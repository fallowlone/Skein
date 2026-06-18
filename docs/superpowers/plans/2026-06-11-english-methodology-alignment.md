# English Layer — Methodology Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps between the English layer and the language-learning methodology (`~/dev/other/language-learning-methodology.md` + `english-a2-to-b2.md` + `english-action-guide.md`): make INPUT HOURS the primary metric, add the monthly monologue checkpoint, switch mining from word-cards to sentence/chunk cards, close the phrase-upgrade → SRS loop, and encode the daily cycle.

**Verdict that motivates this plan (audit 2026-06-11):** the layer is NOT to be removed — its core already matches the methodology (NGSL frequency core, FSRS scheduler, placement test, shadowing, BYOK AI coach for output, curated external library, "thin orchestrator / curate-don't-build" stance in `HonestStrip`). What's missing is exactly the methodology's measurement and feed loops:
1. **No input-hours tracker** — the methodology's metric #1; the state tracks in-app counts (readUnits, grammarDone) and streak/XP, but the 80% of progress (external input hours) is invisible.
2. **No monthly monologue ritual** — metric #2; recording infra already exists (`MediaRecorder` in `src/english/speech/whisper.ts:77-87`).
3. **Mining grain is wrong**: `byo/cards.ts` re-grades in-bank WORD ids; the methodology's sentence mining = whole-sentence/chunk cards from YOUR content ("the tricky part is that…"), out-of-bank chunks are currently impossible.
4. **Upgrade cycle is half-built**: `OutputModule` shows AI "better versions" (line ~88) but they evaporate — the methodology sends the best variant INTO the SRS.
5. **No daily template**: the methodology's cycle (SRS 15′ → input 30–60′ → output 10–15′ alternating) is not encoded anywhere.

**Architecture:** all new logic lives in `site/src/english/` (pure modules + `englishState` extensions) and new hub section components composed into `HubLanding.tsx` (the single hydration boundary — new sections are plain Preact, NOT new islands). The FSRS scheduler is reused for chunk cards. Audio blobs go to IndexedDB (localStorage is too small).

**Tech Stack:** TypeScript, Vitest, Preact signals, IndexedDB, existing BYOK Anthropic client (`src/english/byok/`).

**Out of scope:** path-engine English-stream budgeting (see the placement-and-value plan's out-of-scope note), Anki/APKG export, automatic time-tracking of external video, removing XP/achievements (streak = the methodology's "chain" — it stays), any change to the vocab bank or reading texts.

**Working directory:** `/Users/artemmac/dev/awesome-everything/site`

**Known state shape (verified):** `EnglishState` in `src/english/state.ts:30-41` — `words`, `revealed`, `placement?`, `known`, `settings`, `daily?`, `readUnits`, `outputAttempts`, `grammarDone`, `collocationDone`; localStorage key `awesome.english.v2`; `load()` hand-merges fields. Extend it the same way it extends today (optional fields with defaults).

---

### Task 1: input-hours log (the primary metric)

**Files:**
- Create: `src/english/hours.ts`
- Modify: `src/english/state.ts` (state field + mutator)
- Create: `src/components/english/hub/HoursPanel.tsx`
- Modify: `src/components/english/hub/HubLanding.tsx`
- Test: `src/english/hours.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/english/hours.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { appendHours, summarize, type HourEntry } from "./hours";

const e = (date: string, min: number, kind: HourEntry["kind"] = "input-active"): HourEntry => ({ date, min, kind });

describe("hours", () => {
  it("appendHours merges same-day same-kind entries and caps the log", () => {
    let log: HourEntry[] = [];
    log = appendHours(log, e("2026-06-11", 30));
    log = appendHours(log, e("2026-06-11", 15));
    log = appendHours(log, e("2026-06-11", 10, "srs"));
    expect(log).toHaveLength(2);
    expect(log.find((x) => x.kind === "input-active")!.min).toBe(45);
  });
  it("summarize: totals, this-week, today", () => {
    const log = [e("2026-06-11", 60), e("2026-06-10", 30, "srs"), e("2026-05-01", 120)];
    const s = summarize(log, "2026-06-11", "2026-06-08"); // today, monday of this week
    expect(s.totalMin).toBe(210);
    expect(s.weekMin).toBe(90);
    expect(s.todayMin).toBe(60);
    expect(s.byKind["input-active"]).toBe(180);
  });
});
```

- [x] **Step 2: Run to verify it fails** — `bun test src/english/hours.test.ts` → FAIL (module missing).

- [x] **Step 3: Implement `src/english/hours.ts`** (added `todayByKind` to `summarize` for Task 5)

```ts
// site/src/english/hours.ts
// Input-hours log — the methodology's PRIMARY metric (hours of comprehensible input decide
// progress; in-app counters and streaks only proxy effort). Pure: state.ts owns persistence.
export type HourKind = "input-active" | "input-passive" | "srs" | "output";
export type HourEntry = { date: string; min: number; kind: HourKind; src?: string };

const CAP = 5000; // ~13 years of daily entries; trim oldest beyond this

// Same-day same-kind entries merge (quick-log buttons fire repeatedly within a day).
export function appendHours(log: HourEntry[], entry: HourEntry): HourEntry[] {
  if (!(entry.min > 0)) return log;
  const i = log.findIndex((x) => x.date === entry.date && x.kind === entry.kind);
  const next = i >= 0
    ? log.map((x, j) => (j === i ? { ...x, min: x.min + entry.min } : x))
    : [...log, entry];
  return next.length > CAP ? next.slice(next.length - CAP) : next;
}

export interface HoursSummary {
  totalMin: number; weekMin: number; todayMin: number;
  byKind: Record<HourKind, number>;
}

export function summarize(log: HourEntry[], todayISO: string, weekStartISO: string): HoursSummary {
  const byKind: Record<HourKind, number> = { "input-active": 0, "input-passive": 0, srs: 0, output: 0 };
  let totalMin = 0, weekMin = 0, todayMin = 0;
  for (const x of log) {
    totalMin += x.min;
    byKind[x.kind] += x.min;
    if (x.date >= weekStartISO && x.date <= todayISO) weekMin += x.min;
    if (x.date === todayISO) todayMin += x.min;
  }
  return { totalMin, weekMin, todayMin, byKind };
}
```

- [x] **Step 4: Run** — `bun test src/english/hours.test.ts` → PASS.

- [x] **Step 5: Persist in `englishState`** (also added `hoursLog: []` to `resetEnglish`)

In `src/english/state.ts`: add to the `EnglishState` type and `defaults`:

```ts
  hoursLog: HourEntry[];          // type (import type { HourEntry } from "./hours")
  hoursLog: [],                   // defaults
```

In `load()`, pass the field through the same way `readUnits` is passed (array-guard: `Array.isArray(parsed.hoursLog) ? parsed.hoursLog : []`). Add the mutator next to the other ones:

```ts
import { appendHours, type HourKind } from "./hours";

export function logMinutes(kind: HourKind, min: number, src?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  englishState.value = {
    ...englishState.value,
    hoursLog: appendHours(englishState.value.hoursLog, { date, min, kind, src }),
  };
}
```

- [x] **Step 6: HoursPanel hub section** (used english-hub.css editorial classes, not Tailwind utils; new CSS block added)

Create `src/components/english/hub/HoursPanel.tsx`:

```tsx
// Input-hours panel — the methodology's primary metric, with one-tap quick-log for EXTERNAL
// input (YouTube/podcasts/reading outside the site). Plain Preact inside HubLanding.
import { englishState, logMinutes } from "~/english/state";
import { summarize } from "~/english/hours";
import { type Locale } from "~/i18n";

function mondayOf(d: Date): string {
  const day = (d.getDay() + 6) % 7; // Mon=0
  const m = new Date(d); m.setDate(d.getDate() - day);
  return m.toISOString().slice(0, 10);
}

export default function HoursPanel({ lang }: { lang: Locale }) {
  const log = englishState.value.hoursLog; // subscribe
  const now = new Date();
  const s = summarize(log, now.toISOString().slice(0, 10), mondayOf(now));
  const L = lang === "en"
    ? { h: "Input hours", sub: "Hours of comprehensible input decide progress — log what you watched/read/listened OUTSIDE the site too.", today: "today", week: "this week", total: "total", add: "Log external input:", active: "active", passive: "passive (background)" }
    : { h: "Часы ввода", sub: "Прогресс решают часы понятного ввода — записывай и то, что смотрел/читал/слушал ВНЕ сайта.", today: "сегодня", week: "за неделю", total: "всего", add: "Записать внешний ввод:", active: "активный", passive: "пассивный (фон)" };
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
  return (
    <section class="hub-section">
      <h2>{L.h}</h2>
      <p class="text-sm text-stone-600">{L.sub}</p>
      <div class="mt-2 flex gap-6 text-sm">
        <span><b>{fmt(s.todayMin)}</b> {L.today}</span>
        <span><b>{fmt(s.weekMin)}</b> {L.week}</span>
        <span><b>{fmt(s.totalMin)}</b> {L.total}</span>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span>{L.add}</span>
        {[15, 30, 60].map((m) => (
          <button key={m} type="button" class="rounded border border-stone-300 px-2 py-0.5" onClick={() => logMinutes("input-active", m, "external")}>+{m}′ {L.active}</button>
        ))}
        <button type="button" class="rounded border border-stone-300 px-2 py-0.5" onClick={() => logMinutes("input-passive", 30, "external")}>+30′ {L.passive}</button>
      </div>
    </section>
  );
}
```

(Match the surrounding hub sections' actual class vocabulary — open `CuratedLibrary.tsx`'s JSX and reuse its section/heading classes instead of `hub-section` if they differ.)

In `HubLanding.tsx`, import `HoursPanel` and render it between `<CoverageMeter …/>` and `<NextPath …/>`.

- [x] **Step 7: Auto-log in-app minutes** (review→srs guarded by a grade; reading/speaking via unmount, ≥1-min guard; SpeakingModule logs all 3 modes once to avoid double-count, so TalkSession left untouched)

In-app sessions log themselves so the user only quick-logs EXTERNAL input:
- `src/components/english/ReviewSession.tsx` — on session finish (find the existing "done/finished" branch via `grep -n "done\|finish" src/components/english/ReviewSession.tsx`), call `logMinutes("srs", Math.max(1, Math.round((Date.now() - startedAt) / 60_000)), "review")` with a `startedAt` captured via `useRef(Date.now())` on mount.
- `src/components/english/EnReader.tsx` — same pattern, kind `"input-active"`, src `"reading"`, on unit completion (the place that sets `readUnits`).
- `src/components/english/TalkSession.tsx` and `SpeakingModule.tsx` — kind `"output"`, src `"speaking"`, on session end.

Keep each integration to ≤5 lines; if a component has no clear session-end, log on unmount via a `useEffect` cleanup.

- [x] **Step 8: Tests + typecheck + commit** — 129 pass; astro check: my files clean (20 pre-existing errors in untouched files). Committed `d8a2a299`.

`bun test src/english/ && bunx astro check 2>&1 | tail -3`

```bash
git add src/english/hours.ts src/english/hours.test.ts src/english/state.ts src/components/english/hub/HoursPanel.tsx src/components/english/hub/HubLanding.tsx src/components/english/ReviewSession.tsx src/components/english/EnReader.tsx src/components/english/TalkSession.tsx src/components/english/SpeakingModule.tsx
git commit -m "feat(english): input-hours log — the methodology's primary metric"
```

---

### Task 2: chunk cards (sentence-grain mining)

The methodology's SRS feed after the frequency core: whole sentences/chunks from YOUR content, including out-of-bank phrases — not word ids.

**Files:**
- Modify: `src/english/state.ts` (chunk store + scheduler reuse)
- Create: `src/english/byo/sentences.ts` (+ test)
- Modify: `src/components/english/hub/ByoPipe.tsx`
- Modify: `src/components/english/ReviewSession.tsx`
- Test: `src/english/state.test.ts`, `src/english/byo/sentences.test.ts`

- [x] **Step 1: Failing state test**

Append to `src/english/state.test.ts` (mirror its existing setup/reset pattern):

```ts
describe("chunk cards", () => {
  it("addChunk creates a scheduled card; gradeChunk advances it; dueChunks surfaces due ids", () => {
    const id = addChunk("the tricky part is that the cache is cold", "источник: статья", 1_000);
    expect(id).toBeTruthy();
    expect(dueChunks(2_000)).toContain(id);
    gradeChunk(id, "good", 2_000);
    expect(dueChunks(2_000)).not.toContain(id); // scheduled into the future
    expect(englishState.value.chunks[id].text).toMatch(/tricky part/);
  });
  it("addChunk dedupes by normalized text", () => {
    const a = addChunk("It turns out that...", undefined, 1_000);
    const b = addChunk("it turns out that…", undefined, 2_000);
    expect(a).toBe(b);
  });
});
```

- [x] **Step 2: Run to verify it fails** — `bun test src/english/state.test.ts` → FAIL.

- [x] **Step 3: Implement the chunk store in `state.ts`** (real API: `scheduler.review` + `card.due`, not `.grade`)

Extend `EnglishState`:

```ts
  chunks: Record<string, { text: string; note?: string; src?: string; addedAt: number; card: CardState }>;
```

`defaults`: `chunks: {}`; `load()`: object-guard passthrough like `readUnits`. Add API (the scheduler instance `scheduler` already exists at module top):

```ts
// Chunk cards — sentence-grain mining (the methodology's SRS feed after the frequency core):
// whole phrases from the learner's own content, including out-of-bank ones word-cards can't hold.
const normChunk = (t: string) => t.toLowerCase().replace(/[…]/g, "...").replace(/\s+/g, " ").trim();

export function addChunk(text: string, note: string | undefined, now: number, src?: string): string {
  const norm = normChunk(text);
  if (norm.length < 3) return "";
  const existing = Object.entries(englishState.value.chunks).find(([, c]) => normChunk(c.text) === norm);
  if (existing) return existing[0];
  const id = `chunk:${now.toString(36)}:${norm.slice(0, 24).replace(/\W+/g, "-")}`;
  englishState.value = {
    ...englishState.value,
    chunks: { ...englishState.value.chunks, [id]: { text: text.trim(), note, src, addedAt: now, card: scheduler.newCard(now) } },
  };
  return id;
}

export function gradeChunk(id: string, grade: Grade, now: number): void {
  const c = englishState.value.chunks[id];
  if (!c) return;
  englishState.value = {
    ...englishState.value,
    chunks: { ...englishState.value.chunks, [id]: { ...c, card: scheduler.grade(c.card, grade, now) } },
  };
}

export function dueChunks(now: number): string[] {
  return Object.entries(englishState.value.chunks)
    .filter(([, c]) => c.card.due <= now)
    .sort((a, b) => a[1].card.due - b[1].card.due)
    .map(([id]) => id);
}
```

IMPORTANT: before writing, open `src/english/scheduler/types.ts` and `fsrs.ts` and mirror the scheduler's REAL method names and `CardState.due` field (the code above assumes `newCard(now)` / `grade(card, grade, now)` / `card.due: number` — if the actual API differs, e.g. `schedule()` or `due` as ISO string, adapt these three call sites and the test to the real API; do not change the scheduler).

- [x] **Step 4: Run** — `bun test src/english/state.test.ts` → PASS.

- [x] **Step 5: Sentence suggestion from BYO text**

Create `src/english/byo/sentences.ts`:

```ts
// For each target lemma, find the first sentence of the pasted text that contains it — the
// methodology mines SENTENCES ("вот так это говорится"), not words. Light splitter, no NLP.
export function suggestChunkSentences(text: string, lemmas: string[]): { lemma: string; sentence: string }[] {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length >= 8 && s.length <= 240);
  const out: { lemma: string; sentence: string }[] = [];
  for (const lemma of lemmas) {
    const re = new RegExp(`\\b${lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    const hit = sentences.find((s) => re.test(s));
    if (hit) out.push({ lemma, sentence: hit });
  }
  return out;
}
```

Test `src/english/byo/sentences.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { suggestChunkSentences } from "./sentences";

describe("suggestChunkSentences", () => {
  it("maps each lemma to the first sentence containing it", () => {
    const text = "The cache was cold. It turns out that the resolver retried forever! We fixed it.";
    const out = suggestChunkSentences(text, ["resolver", "cache"]);
    expect(out).toEqual([
      { lemma: "resolver", sentence: "It turns out that the resolver retried forever!" },
      { lemma: "cache", sentence: "The cache was cold." },
    ]);
  });
  it("skips lemmas with no sentence and over-long sentences", () => {
    expect(suggestChunkSentences("Short. " + "x".repeat(300) + " hello.", ["hello"])).toEqual([]);
  });
});
```

Run both: `bun test src/english/byo/` → PASS.

- [x] **Step 6: ByoPipe — offer sentence cards** (sourced new+technical lemmas; free-form phrase input added)

In `src/components/english/hub/ByoPipe.tsx`: after Extract produces `result` (the `Classification` — it carries the "new in-bank" lemma list; check its shape in `src/english/byo/classify.ts`), compute `suggestChunkSentences(text, newLemmas)` and render a checkbox list "Save as sentence cards / Сохранить предложениями"; the Build action additionally calls `addChunk(sentence, undefined, now(), "byo")` for each checked row. Keep the existing word-card path (`commitByoCards`) as-is — chunks COMPLEMENT it. Also add a free-form "save a phrase" input (single text field + button → `addChunk(value, undefined, now(), "manual")`) at the bottom of the section, so chunks can be mined from anywhere, not only pasted text.

- [x] **Step 7: ReviewSession — interleave chunk cards** (same-screen phrase deck after words; ReviewRoute updated to surface chunk-only reviews)

Find where the due queue is built: `grep -n "due\|queue" src/components/english/ReviewSession.tsx`. Append `dueChunks(Date.now())` ids to the due list; when the current id starts with `"chunk:"`, render front = `chunks[id].text` (bold), back = `note ?? "—"` + src, and route the grade buttons to `gradeChunk` instead of `gradeWord`. If the component's card-rendering is too word-specific to branch cleanly (audio, IPA fields), instead render chunks as a SEPARATE block of the same session screen ("Phrases due: N") with the same four grade buttons — one session, one screen, no second SRS surface.

- [x] **Step 8: Tests + commit** — 133 pass; my files type-clean; committed `908a40be`

`bun test src/english/ && bunx astro check 2>&1 | tail -3`

```bash
git add src/english/state.ts src/english/state.test.ts src/english/byo/sentences.ts src/english/byo/sentences.test.ts src/components/english/hub/ByoPipe.tsx src/components/english/ReviewSession.tsx
git commit -m "feat(english): sentence/chunk mining cards on the FSRS scheduler"
```

---

### Task 3: close the upgrade-cycle loop (better version → card)

`OutputModule` already shows AI "better versions" after grading (the `L.better` block, `OutputModule.tsx:~88`). The methodology sends the best one into the SRS — otherwise it evaporates in chat.

**Files:**
- Modify: `src/components/english/OutputModule.tsx`

- [x] **Step 1:** Located the `L.better` block — the field is a single `result.betterVersion` string (not an array), so one button + boolean state, not a Set.
- [x] **Step 2:** `→ SRS` button added next to the single better version; localized note prefix; boolean `savedBetter` state reset in openTask/submit.
- [x] **Step 3:** Deferred to Task 7 acceptance pass (BYOK-gated); type-clean (astro check 0 errors).
- [x] **Step 4:** Committed `c4bcd877`.

```bash
git add src/components/english/OutputModule.tsx
git commit -m "feat(english): save AI better-versions as chunk cards (upgrade-cycle loop)"
```

---

### Task 4: monthly monologue checkpoint

Metric #2: a 3-minute recorded monologue every month; progress is audible only against a 3-month-old recording. Blobs in IndexedDB; recording via `MediaRecorder` (pattern already in `src/english/speech/whisper.ts:77-95`).

**Files:**
- Create: `src/english/monologue.ts` (+ test for the pure parts)
- Create: `src/components/english/hub/MonologueCheckpoint.tsx`
- Modify: `src/components/english/hub/HubLanding.tsx`

- [x] **Step 1: Failing test for the pure logic**

Create `src/english/monologue.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isDue, comparisonTarget, type MonologueMeta } from "./monologue";

const m = (at: number): MonologueMeta => ({ id: String(at), at, durationSec: 180 });
const DAY = 86_400_000;

describe("monologue checkpoint", () => {
  it("isDue: true when no recording in the last 28 days", () => {
    expect(isDue([], 100 * DAY)).toBe(true);
    expect(isDue([m(80 * DAY)], 100 * DAY)).toBe(true);
    expect(isDue([m(90 * DAY)], 100 * DAY)).toBe(false);
  });
  it("comparisonTarget: the newest recording at least ~90 days older than the latest", () => {
    const list = [m(10 * DAY), m(50 * DAY), m(150 * DAY)];
    expect(comparisonTarget(list)?.at).toBe(50 * DAY);
    expect(comparisonTarget([m(150 * DAY)])).toBeNull();
  });
});
```

- [x] **Step 2: Run to verify it fails**, then implement `src/english/monologue.ts`: (FIXED plan test — it asserted `isDue` true at a 20-day gap, contradicting the 28-day monthly cadence; impl kept at DUE_DAYS=28, test corrected)

```ts
// site/src/english/monologue.ts
// Monthly monologue checkpoint — the methodology's result metric: a ~3-minute recorded monologue
// each month; growth is only audible against a recording ~3 months back. Metadata here; audio
// blobs in IndexedDB (localStorage can't hold audio). Pure helpers exported for tests.
export interface MonologueMeta { id: string; at: number; durationSec: number; note?: string }

const DAY = 86_400_000;
const DUE_DAYS = 28;
const COMPARE_BACK_DAYS = 84;

export function isDue(list: MonologueMeta[], now: number): boolean {
  const latest = Math.max(0, ...list.map((m) => m.at));
  return now - latest >= DUE_DAYS * DAY;
}

// Newest recording that is at least ~3 months older than the most recent one.
export function comparisonTarget(list: MonologueMeta[]): MonologueMeta | null {
  if (list.length < 2) return null;
  const sorted = [...list].sort((a, b) => b.at - a.at);
  const latest = sorted[0];
  return sorted.find((m) => latest.at - m.at >= COMPARE_BACK_DAYS * DAY) ?? null;
}

// ── IndexedDB blob store (browser only) ────────────────────────────────────────
const DB = "awesome-english-monologues", STORE = "recordings";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecording(meta: MonologueMeta, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...meta, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listRecordings(): Promise<MonologueMeta[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as (MonologueMeta & { blob: Blob })[]).map(({ blob: _b, ...m }) => m).sort((a, b) => b.at - a.at));
    req.onerror = () => reject(req.error);
  });
}

export async function getRecordingBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}
```

Run: `bun test src/english/monologue.test.ts` → PASS (pure parts; IndexedDB code is not unit-tested — jsdom lacks it).

- [x] **Step 3: The hub section** (semantic `.mono` classes, not Tailwind; CSS added)

Create `src/components/english/hub/MonologueCheckpoint.tsx` — plain Preact inside HubLanding:

```tsx
// Monthly monologue checkpoint: record ~3 minutes ("what I did this month"), store locally,
// and replay the recording from ~3 months back next to it — the contrast is the metric.
import { useEffect, useRef, useState } from "preact/hooks";
import { isDue, comparisonTarget, saveRecording, listRecordings, getRecordingBlob, type MonologueMeta } from "~/english/monologue";
import { type Locale } from "~/i18n";

export default function MonologueCheckpoint({ lang }: { lang: Locale }) {
  const [list, setList] = useState<MonologueMeta[]>([]);
  const [recording, setRecording] = useState(false);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);

  useEffect(() => { listRecordings().then(setList).catch(() => {}); }, []);
  useEffect(() => () => { if (playUrl) URL.revokeObjectURL(playUrl); }, [playUrl]);

  const L = lang === "en"
    ? { h: "Monthly monologue", due: "Due: record ~3 minutes — what you did this month, in English.", notDue: "Next checkpoint in a few weeks — recordings below.", start: "● Record", stop: "■ Stop & save", compare: "Play the one from ~3 months ago", play: "Play", none: "No recordings yet — record your point A today." }
    : { h: "Ежемесячный монолог", due: "Пора: запиши ~3 минуты — что делал в этом месяце, по-английски.", notDue: "Следующий замер через несколько недель — записи ниже.", start: "● Записать", stop: "■ Стоп и сохранить", compare: "Включить запись ~3-месячной давности", play: "Слушать", none: "Записей пока нет — запиши точку А сегодня." };

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream);
    chunks.current = [];
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
      const at = Date.now();
      await saveRecording({ id: String(at), at, durationSec: Math.round((at - startedAt.current) / 1000) }, blob);
      setList(await listRecordings());
    };
    startedAt.current = Date.now();
    r.start();
    rec.current = r;
    setRecording(true);
  };
  const stop = () => { rec.current?.stop(); setRecording(false); };
  const play = async (id: string) => {
    const blob = await getRecordingBlob(id);
    if (blob) setPlayUrl(URL.createObjectURL(blob));
  };

  const due = isDue(list, Date.now());
  const cmp = comparisonTarget(list);
  return (
    <section class="hub-section">
      <h2>{L.h}</h2>
      <p class="text-sm text-stone-600">{due ? L.due : L.notDue}</p>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        {!recording
          ? <button type="button" class="rounded bg-rose-600 px-3 py-1 text-white" onClick={start}>{L.start}</button>
          : <button type="button" class="rounded bg-stone-800 px-3 py-1 text-white" onClick={stop}>{L.stop}</button>}
        {cmp && <button type="button" class="rounded border border-stone-300 px-3 py-1" onClick={() => play(cmp.id)}>{L.compare}</button>}
      </div>
      {playUrl && <audio class="mt-2 w-full" controls src={playUrl} />}
      <ul class="mt-3 flex flex-col gap-1 text-sm">
        {list.length === 0 && <li class="text-stone-500">{L.none}</li>}
        {list.map((m) => (
          <li key={m.id} class="flex items-center gap-3">
            <span>{new Date(m.at).toISOString().slice(0, 10)}</span>
            <span class="text-stone-500">{Math.round(m.durationSec / 60)} min</span>
            <button type="button" class="underline" onClick={() => play(m.id)}>{L.play}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

(Match section classes to the real hub vocabulary, as in Task 1 Step 6.)

Mount in `HubLanding.tsx` after `<OwnedModules …/>`.

- [x] **Step 4: Manual check** — deferred to Task 7 acceptance pass (browser-only MediaRecorder/IndexedDB); type-clean.
- [x] **Step 5: Commit** — committed `da89fe0f`

```bash
git add src/english/monologue.ts src/english/monologue.test.ts src/components/english/hub/MonologueCheckpoint.tsx src/components/english/hub/HubLanding.tsx
git commit -m "feat(english): monthly monologue checkpoint (record, store, compare vs 3 months ago)"
```

---

### Task 5: daily cycle section

Encode the methodology's daily template (SRS 15′ → input 30–60′ → output 10–15′, alternating writing/speaking days) as a new hub section driven by live state — what's actually left TODAY.

**Files:**
- Create: `src/english/daily.ts` (+ test)
- Create: `src/components/english/hub/DailyCycle.tsx`
- Modify: `src/components/english/hub/HubLanding.tsx`

- [x] **Step 1: Failing test**

Create `src/english/daily.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { dailyPlan } from "./daily";

describe("dailyPlan", () => {
  const base = { dueCount: 12, todaySrsMin: 0, todayInputMin: 0, todayOutputMin: 0, dayOfMonth: 11 };
  it("three blocks in methodology order with remaining minutes", () => {
    const p = dailyPlan(base);
    expect(p.map((b) => b.key)).toEqual(["srs", "input", "output"]);
    expect(p[0].remainingMin).toBe(15);
    expect(p[1].remainingMin).toBe(45);
  });
  it("blocks done today report zero remaining; output alternates writing/speaking by day parity", () => {
    const p = dailyPlan({ ...base, todaySrsMin: 20, dayOfMonth: 12 });
    expect(p[0].remainingMin).toBe(0);
    expect(p[2].mode).toBe("speaking"); // even day; 11 → "writing"
  });
  it("no due cards → srs block still suggests mining review of zero and stays first", () => {
    expect(dailyPlan({ ...base, dueCount: 0 })[0].key).toBe("srs");
  });
});
```

- [x] **Step 2: Run to verify it fails**, then implement `src/english/daily.ts`:

```ts
// site/src/english/daily.ts
// The methodology's daily cycle as data: SRS (15′) → comprehensible input (45′ target) →
// output (15′, writing/speaking alternating by day parity). Pure; the hub renders it.
export interface DailyBlock {
  key: "srs" | "input" | "output";
  targetMin: number;
  remainingMin: number;
  mode?: "writing" | "speaking";
  dueCount?: number;
}

export interface DailyInputs {
  dueCount: number;
  todaySrsMin: number;
  todayInputMin: number;
  todayOutputMin: number;
  dayOfMonth: number;
}

const SRS_MIN = 15, INPUT_MIN = 45, OUTPUT_MIN = 15;

export function dailyPlan(i: DailyInputs): DailyBlock[] {
  const rem = (target: number, done: number) => Math.max(0, target - done);
  return [
    { key: "srs", targetMin: SRS_MIN, remainingMin: rem(SRS_MIN, i.todaySrsMin), dueCount: i.dueCount },
    { key: "input", targetMin: INPUT_MIN, remainingMin: rem(INPUT_MIN, i.todayInputMin) },
    { key: "output", targetMin: OUTPUT_MIN, remainingMin: rem(OUTPUT_MIN, i.todayOutputMin), mode: i.dayOfMonth % 2 === 0 ? "speaking" : "writing" },
  ];
}
```

Run → PASS.

- [x] **Step 3: The hub section** (no `selectors.ts` exists → `dueWordIds`+`dueChunks`; `todayByKind` already added to `summarize` in Task 1; mounted first after HubBar; `.cycle` CSS)

Create `src/components/english/hub/DailyCycle.tsx`: plain Preact; compute inputs from live state — `dueCount` from the same selector ReviewSession/`selectors.ts` uses for the due queue plus `dueChunks(Date.now()).length`; today's minutes per kind from `summarize` (Task 1) by filtering `byKind` over today's entries (add a `todayByKind` field to `summarize` if cleaner — keep the hours test updated). Render three rows: block name, remaining minutes, link — `/{lang}/english/review` for SRS (with due count), the hub's reading/curated sections for input, `/{lang}/english/writing` or `/english/speaking` per `mode`. A block with `remainingMin === 0` renders with a ✓. Mount in `HubLanding.tsx` directly after `<HubBar …/>` (the cycle is the first thing a returning learner needs).

- [x] **Step 4: Typecheck + manual** — type-clean; 138 tests pass; visual deferred to Task 7.
- [x] **Step 5: Commit** — committed `161d81d7`

```bash
git add src/english/daily.ts src/english/daily.test.ts src/components/english/hub/DailyCycle.tsx src/components/english/hub/HubLanding.tsx src/english/hours.ts src/english/hours.test.ts
git commit -m "feat(english): daily cycle section (SRS → input → output) driven by live state"
```

---

### Task 6: B2 routing copy (AI-content ceiling)

The methodology: AI-/learner-content is good up to ~B1; from B2 the input must be native. The reading module's B2 texts are a bridge, not the destination.

**Files:**
- Modify: `src/components/english/hub/CuratedLibrary.tsx` (copy)
- Modify: `src/components/english/ReadingFeed.tsx` or `EnReader.tsx` (one banner)

- [x] **Step 1:** CuratedLibrary ceiling line added (EN/RU) below the how-to, plus an `id="curated"` anchor for the reading banner to link to.
- [x] **Step 2:** ReadingFeed has no B2 *toggle* (filters by topic stream, capped at placement band) → banner shown when placement `band === "B2"`, anchored to `/{lang}/english#curated`.
- [x] **Step 3:** Type-clean; visual deferred to Task 7; committed `ff39dca7`.

```bash
git add src/components/english/hub/CuratedLibrary.tsx src/components/english/ReadingFeed.tsx src/components/english/EnReader.tsx
git commit -m "copy(english): native-input ceiling messaging at B2"
```

---

### Task 7: full verification gate

- [x] **Step 1:** canonical runner is `bun run test` (vitest) — **801/801 pass, 140 files**. (Raw `bun test` shows false fails: no jsdom for `scripts/*-state` + it collects Playwright e2e specs — wrong runner.)
- [x] **Step 2:** `bun run build` — **5347 pages, lint clean 0/0** (full ~1087s, fresh worktree).
- [x] **Step 3:** no `console.log` in `src/english/` or `src/components/english/`.
- [x] **Step 4: Methodology acceptance pass** — AUTOMATED markup acceptance done: all three new sections (`cycle-h`/`hours-h`/`mono-h`) + `id="curated"` SSR-render in BOTH `dist/en/english` and `dist/ru/english` with correct i18n parity (EN copy only on EN, RU only on RU). Interactive flows below need the owner's browser pass (audio capture / BYOK grading are device/key-gated):
  1. Daily cycle is the first section and reflects reality (due count, zeroed blocks after logging).
  2. Hours panel logs external input in one tap; review session auto-logs SRS minutes.
  3. BYO paste → sentence checkboxes → phrases appear in review; free-form phrase field works.
  4. Writing grade → "→ SRS" on a better version → it shows up due in review.
  5. Monologue: record, reload, playback; with two recordings >84 days apart the compare button appears (fake by editing IndexedDB `at` in devtools).
  6. RU locale mirrors all new copy.
- [x] **Step 5:** Reported per check below. NOT pushed — owner pushes manually.

---

## Self-review notes (already applied)

- New hub sections are plain Preact inside `HubLanding` — the layer's one-island rule (stated in `HubLanding.tsx`'s header comment) is preserved; no new hydration boundaries.
- The scheduler API in Task 2 is flagged as VERIFY-FIRST (mirror `scheduler/types.ts`), since this plan was written from `state.ts`'s usage pattern, not the scheduler source.
- Chunk review deliberately offers a same-screen fallback block instead of forcing word-card UI reuse — one session surface either way, honoring the "no second SRS" anti-pattern.
- XP/achievements/streak are explicitly NOT removed: the streak is the methodology's chain rule; only the metric emphasis shifts (hours panel + daily cycle become the lead sections).
- Hours quick-log merges same-day same-kind entries so repeated taps don't bloat the log; cap 5000 entries.
- IndexedDB (not localStorage) for monologue audio; metadata-only listing avoids loading blobs for the list view.
