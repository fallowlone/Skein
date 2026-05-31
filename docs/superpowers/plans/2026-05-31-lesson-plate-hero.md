# Lesson Plate Hero (A2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a designed, on-brand "title-plate" header at the top of every lesson by upgrading the shared lesson layout — covering all 1279 lessons with zero MDX edits.

**Architecture:** A pure helper (`track-meta.ts`) maps track → 3-letter code + domain hue and formats the coordinate. A self-contained Astro component (`LessonPlate.astro`) renders the plate with its own scoped styles (contour + rings + node + coordinate + Fraunces title + crux + chips). `Lesson.astro` swaps its plain `<header class="lesson-head">` for the plate, resolving the unit order build-time; the `[lesson].astro` route passes the lesson `order` through.

**Tech Stack:** Astro 5, TypeScript, vitest, existing design tokens in `src/styles/global.css`.

**Spec:** `docs/superpowers/specs/2026-05-31-lesson-plate-hero-design.md`

**Conventions:**
- Tests beside source as `*.test.ts`; run `bun run test <path>` from `site/`.
- Import alias `~/` → `site/src/`.
- `bun run build` (from `site/`) takes ~4-5 min (3976 pages); run it FOREGROUND and WAIT (Bash timeout 360000). Build must stay 0 errors, lint clean.
- Commit after each task; end messages with the Co-Authored-By trailer.
- Colors via tokens only — never raw ByteByteGo palette (`bg-white`/`bg-gray-*`/`bbg-*`/`rounded-2xl`).

---

## File Structure

**Create:**
- `src/scripts/track-meta.ts` — `TRACK_ABBR`, `DOMAIN_HUE`, `coord()`.
- `src/scripts/track-meta.test.ts` — unit tests.
- `src/components/lesson/LessonPlate.astro` — the plate (self-contained scoped styles).

**Modify:**
- `src/layouts/Lesson.astro` — import plate + helper, resolve `unitOrder`, accept `order` prop, replace the `lesson-head` header block with `<LessonPlate/>` (keep `<AltitudeGauge/>` after it).
- `src/pages/[lang]/learn/[track]/[unit]/[lesson].astro` — pass `order={entry.data.order}`.

---

## Task 1: Track metadata helper

**Files:**
- Create: `src/scripts/track-meta.ts`
- Test: `src/scripts/track-meta.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/scripts/track-meta.test.ts
import { describe, it, expect } from "vitest";
import { TRACK_ABBR, DOMAIN_HUE, coord } from "./track-meta";
import { TRACKS } from "~/types";

describe("TRACK_ABBR", () => {
  it("has a short non-empty code for every track", () => {
    expect(Object.keys(TRACK_ABBR).length).toBe(TRACKS.length);
    for (const t of TRACKS) {
      expect(TRACK_ABBR[t]).toBeTruthy();
      expect(TRACK_ABBR[t].length).toBeLessThanOrEqual(5);
    }
  });
});

describe("DOMAIN_HUE", () => {
  it("maps every track color to a --d hue var", () => {
    for (const c of ["lilac", "mint", "peach", "sky", "rose"] as const) {
      expect(DOMAIN_HUE[c]).toMatch(/^var\(--d-/);
    }
  });
});

describe("coord", () => {
  it("formats abbr · unit · lesson, zero-padded to 2", () => {
    expect(coord("NET", 3, 2)).toBe("NET · 03 · 02");
    expect(coord("DB", 12, 7)).toBe("DB · 12 · 07");
  });
  it("falls back to abbr · lesson when unitOrder is missing", () => {
    expect(coord("ALG", undefined, 5)).toBe("ALG · 05");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/scripts/track-meta.test.ts`
Expected: FAIL — "Cannot find module './track-meta'".

- [ ] **Step 3: Write the implementation**

```ts
// src/scripts/track-meta.ts
import type { Track } from "~/types";

/** 3-letter coordinate code per track. */
export const TRACK_ABBR: Record<Track, string> = {
  "math": "MTH", "base-cs": "CS", "algorithms": "ALG",
  "networking": "NET", "browser": "WEB", "frontend": "FE", "backend": "BE",
  "apis": "API", "databases": "DB", "caching": "CACHE", "queues": "QUE",
  "distributed": "DIST", "security": "SEC", "observability": "OBS",
  "deployment": "DEP", "performance": "PERF", "data-engineering": "DATA",
  "ai-llm": "AI", "engineering-practice": "ENG",
};

export type TrackColor = "lilac" | "mint" | "peach" | "sky" | "rose";

/** Track palette color → extensible domain hue var (matches home/learn cards). */
export const DOMAIN_HUE: Record<TrackColor, string> = {
  lilac: "var(--d-network)", mint: "var(--d-data)", peach: "var(--d-frontend)",
  sky: "var(--d-backend)", rose: "var(--d-ai)",
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "NET · 03 · 02". Falls back to "ABBR · NN" when unitOrder is absent. */
export function coord(abbr: string, unitOrder: number | undefined, lessonOrder: number): string {
  if (unitOrder == null || Number.isNaN(unitOrder)) return `${abbr} · ${pad2(lessonOrder)}`;
  return `${abbr} · ${pad2(unitOrder)} · ${pad2(lessonOrder)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/scripts/track-meta.test.ts`
Expected: PASS (3 suites).

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/track-meta.ts site/src/scripts/track-meta.test.ts
git commit -m "feat(lessons): track-meta helper (abbr, domain hue, coordinate)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: LessonPlate component

**Files:**
- Create: `src/components/lesson/LessonPlate.astro`

> Astro component — verified by build + visual (Task 4), not unit-tested. Single implement + build + commit.

- [ ] **Step 1: Write the component (self-contained scoped styles)**

```astro
---
// src/components/lesson/LessonPlate.astro
import { t, type Locale } from "~/i18n";
import { coord } from "~/scripts/track-meta";

type Level = "zero" | "junior" | "middle" | "senior";
interface Props {
  title: string;
  summary: string;
  trackTitle: string;
  abbr: string;
  hue: string;          // e.g. "var(--d-network)"
  unitOrder?: number;
  order: number;
  level?: Level;
  estMin: number;
  lang: Locale;
}
const { title, summary, trackTitle, abbr, hue, unitOrder, order, level, estMin, lang } = Astro.props;
const coordStr = coord(abbr, unitOrder, order);
---

<article class="lesson-plate" style={`--d: ${hue};`}>
  <div class="lp-contour" aria-hidden="true"></div>
  <svg class="lp-rings" viewBox="0 0 300 300" aria-hidden="true">
    <circle cx="150" cy="150" r="40" /><circle cx="150" cy="150" r="62" />
    <circle cx="150" cy="150" r="86" /><circle cx="150" cy="150" r="112" />
    <circle cx="150" cy="150" r="140" /><circle cx="150" cy="150" r="170" />
  </svg>
  <span class="lp-node" aria-hidden="true"></span>
  <div class="lp-body">
    <div class="lp-top">
      <span class="lp-kicker">{trackTitle}</span>
      <span class="lp-coord">{coordStr}</span>
    </div>
    <h1 class="lesson-title">{title}</h1>
    <p class="lp-crux">{summary}</p>
    <div class="lp-meta">
      <span class="lp-tag"><span class="lp-sq"></span>{trackTitle}</span>
      {level && <span class="lp-chip">{t(`lesson.altitude.${level}`, lang)}</span>}
      <span class="lp-chip">◷ {estMin} min</span>
    </div>
  </div>
</article>

<style>
  .lesson-plate {
    position: relative; overflow: hidden;
    background: var(--card);
    border: 0.5px solid var(--hairline-2);
    border-left: 2.5px solid var(--d);
    border-radius: var(--r-md, 8px);
    padding: 26px 28px 22px;
    margin-bottom: 22px;
  }
  .lp-contour {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
    background-image:
      linear-gradient(var(--contour) 0.5px, transparent 0.5px),
      linear-gradient(90deg, var(--contour) 0.5px, transparent 0.5px);
    background-size: 34px 34px;
    -webkit-mask-image: radial-gradient(120% 120% at 92% -10%, #000 0%, transparent 55%);
            mask-image: radial-gradient(120% 120% at 92% -10%, #000 0%, transparent 55%);
  }
  .lp-rings {
    position: absolute; top: -64px; right: -44px; width: 300px; height: 300px;
    color: var(--d); opacity: 0.2; pointer-events: none;
  }
  .lp-rings circle { fill: none; stroke: currentColor; stroke-width: 0.8; }
  .lp-node {
    position: absolute; top: 22px; right: 24px; width: 9px; height: 9px;
    border-radius: 50%; background: var(--d);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--d) 22%, transparent);
  }
  .lp-body { position: relative; }
  .lp-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 14px; }
  .lp-kicker {
    font-family: var(--font-mono); font-size: 11px; font-weight: 500;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
  }
  .lp-coord {
    font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.06em;
    color: var(--faint); white-space: nowrap;
  }
  .lesson-title {
    font-family: var(--font-display); font-weight: 500;
    font-size: clamp(28px, 4.5vw, 40px); line-height: 1.12; letter-spacing: -0.02em;
    color: var(--ink); margin: 0 0 10px; max-width: 18ch;
  }
  .lp-crux {
    font-family: var(--font-display); font-weight: 400; font-size: 15.5px;
    line-height: 1.5; color: var(--muted); margin: 0 0 16px; max-width: 46ch;
  }
  .lp-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .lp-tag {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.04em;
    padding: 3px 9px 3px 7px; border-radius: var(--r-sm, 4px);
    color: var(--d); background: color-mix(in srgb, var(--d) 13%, var(--card));
    border: 0.5px solid color-mix(in srgb, var(--d) 38%, transparent);
  }
  .lp-sq { width: 8px; height: 8px; border-radius: 1px; background: var(--d); }
  .lp-chip {
    font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.05em;
    color: var(--muted); border: 0.5px solid var(--hairline-2);
    border-radius: var(--r-sm, 4px); padding: 3px 8px;
  }
  @media (max-width: 640px) {
    .lesson-plate { padding: 20px 18px 18px; }
    .lp-rings { display: none; }
  }
</style>
```

- [ ] **Step 2: Typecheck the component's TS island**

Run: `cd site && bunx astro check --minimumSeverity error 2>&1 | tail -20` (if `astro check` is slow/unavailable, skip — the full build in Task 3 will surface any error).
Expected: no error referencing `LessonPlate.astro`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/lesson/LessonPlate.astro
git commit -m "feat(lessons): LessonPlate designed title-plate component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire the plate into the lesson layout

**Files:**
- Modify: `src/layouts/Lesson.astro`
- Modify: `src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`

- [ ] **Step 1: Pass `order` from the route**

In `src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`, add `order={entry.data.order}` to the `<Lesson … >` props (place it next to `estMin`):

```astro
<Lesson
  title={entry.data.title}
  lang={lang}
  trackSlug={entry.data.track}
  unitSlug={entry.data.unit}
  slug={entry.data.slug}
  summary={entry.data.summary}
  estMin={entry.data.estMin}
  order={entry.data.order}
  sources={entry.data.sources}
  lessonType={entry.data.lessonType}
  level={entry.data.level}
  lessonKey={lessonKey}
  practice={practice}
>
  <Content />
</Lesson>
```

- [ ] **Step 2: Extend `Lesson.astro` Props + imports + resolve data**

In `src/layouts/Lesson.astro`:

Add imports near the other component imports:
```astro
import LessonPlate from "~/components/lesson/LessonPlate.astro";
import { TRACK_ABBR, DOMAIN_HUE, type TrackColor } from "~/scripts/track-meta";
import type { Track } from "~/types";
```

Add `order: number;` to the `Props` type (next to `estMin: number;`) and add `order` to the destructure from `Astro.props`.

After the existing `trackTitle` resolution, add the color + unit-order lookup:
```astro
const trackColor = (trackEntry?.data.color ?? "sky") as TrackColor;
const allUnits = await getCollection("units");
const unitOrder = allUnits.find(
  (u) => u.data.track === trackSlug && u.data.slug === unitSlug,
)?.data.order;
```

- [ ] **Step 3: Replace the header block with the plate**

In `src/layouts/Lesson.astro`, replace this block:
```astro
      <header class="lesson-head">
        <p class="lesson-kicker">{trackTitle}</p>
        <h1 class="lesson-title">{title}</h1>
        <div class="lesson-crux">
          <span class="crux-tag">{t("lesson.cruxTag", lang)}</span>
          {summary}
        </div>

        <AltitudeGauge lang={lang} level={level} />

        <div class="hdr-meta">
          <span class="hm">◷ {estMin} min</span>
        </div>
      </header>
```
with:
```astro
      <LessonPlate
        title={title}
        summary={summary}
        trackTitle={trackTitle}
        abbr={TRACK_ABBR[trackSlug as Track]}
        hue={DOMAIN_HUE[trackColor]}
        unitOrder={unitOrder}
        order={order}
        level={level}
        estMin={estMin}
        lang={lang}
      />
      <AltitudeGauge lang={lang} level={level} />
```

(Leave the now-unused `.lesson-head/.lesson-kicker/.lesson-title/.lesson-crux/.crux-tag/.hdr-meta` rules in Lesson.astro's `<style>` block as-is — removing them is optional dead-CSS cleanup, not required for this task.)

- [ ] **Step 4: Build (FOREGROUND, wait, timeout 360000)**

Run: `cd site && bun run build`
Expected: "3976 page(s) built", "Complete!", 0 errors in `dist/lint-report.json`. If the build fails, report the exact error (common causes: a missing prop, the `order` prop type, or an import path) and fix it.

- [ ] **Step 5: Commit**

```bash
git add site/src/layouts/Lesson.astro "site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro"
git commit -m "feat(lessons): render LessonPlate header in the lesson layout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Visual verification + gate

**Files:** none (verification only).

- [ ] **Step 1: Full unit suite**

Run: `cd site && bun run test`
Expected: all pass, including `track-meta.test.ts`.

- [ ] **Step 2: Serve the built site**

Run: `cd site && (cd dist && python3 -m http.server 8799 >/dev/null 2>&1 &) ; sleep 1.5 ; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8799/en/learn/networking/`
Expected: 200.

- [ ] **Step 3: Screenshot 4 lessons in light + dark + one mobile**

Create `site/_plate_shot.mjs`:
```js
import { chromium } from "@playwright/test";
const paths = [
  "learn/networking/12-putting-it-together/03-rendering-and-web-vitals",
  "learn/databases/03-execution-plans/06-plan-cache-and-tuning",
  "learn/algorithms/01-arrays-hashing/01-overview",       // adjust if this slug 404s — pick any real algorithms lesson
  "learn/engineering-practice/02-contract-testing/03-provider-verification-broker",
];
const b = await chromium.launch();
for (const theme of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
  if (theme === "dark") await ctx.addInitScript(() => localStorage.setItem("awesome.theme", "dark"));
  const p = await ctx.newPage();
  for (const path of paths) {
    const slug = path.replace(/[^a-z0-9]+/gi, "_");
    const res = await p.goto(`http://localhost:8799/en/${path}/`, { waitUntil: "networkidle" });
    if (!res || res.status() !== 200) { console.log("SKIP", path, res && res.status()); continue; }
    await p.screenshot({ path: `_shots/plate_${slug}__${theme}.png`, clip: { x: 0, y: 0, width: 1100, height: 560 } });
    console.log(theme, path, "ok");
  }
  await ctx.close();
}
// mobile
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
await m.goto(`http://localhost:8799/en/${paths[0]}/`, { waitUntil: "networkidle" });
await m.screenshot({ path: "_shots/plate_mobile.png", clip: { x: 0, y: 0, width: 390, height: 520 } });
console.log("mobile ok");
await b.close();
```
Run: `cd site && mkdir -p _shots && node _plate_shot.mjs`
Read the PNGs in `site/_shots/`. Verify for each: the plate renders with a domain-hue left border + coordinate + Fraunces title + crux + tag/chips + faint contour/rings; the `AltitudeGauge` still renders directly below; there is NO duplicate plain kicker/title; mobile has no horizontal overflow and the rings are hidden. Domain hue differs between networking and databases.

- [ ] **Step 4: Clean up scratch + stop server**

Run: `cd site && pkill -f "http.server 8799" ; rm -f _plate_shot.mjs ; rm -rf _shots`

- [ ] **Step 5: Commit (only if a fixup was needed in Steps 1-3)**

```bash
git add -A && git commit -m "fix(lessons): LessonPlate visual fixups

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review notes (addressed)

- **Spec coverage:** placement/data + replace lesson-head keep AltitudeGauge (Task 3); `track-meta` abbr/hue/coord (Task 1); `LessonPlate` component with contour/rings/node/coordinate/title/crux/chips, self-contained scoped styles, decorative SVG `aria-hidden`, single `h1` (Task 2); unit test for coord + abbr completeness + hue coverage (Task 1); build gate + light/dark/mobile visual incl. AltitudeGauge intact + no dup + hue varies (Task 4). Edge cases (missing level, missing unitOrder fallback, long title clamp, mobile rings hidden) are handled in the component + helper. Rollout = single PR (no content batches), per spec.
- **Type consistency:** `TRACK_ABBR`/`DOMAIN_HUE`/`coord` defined in Task 1 and consumed unchanged in Tasks 2-3. `coord(abbr, unitOrder, lessonOrder)` signature identical at definition and call site. `Props` of `LessonPlate` (Task 2) match the attributes passed from `Lesson.astro` (Task 3). `order` added to the route (Task 3 Step 1), the `Lesson.astro` Props (Step 2), and forwarded to the plate (Step 3).
- **Deviation from spec (intentional):** plate styles live in `LessonPlate.astro`'s scoped `<style>` (self-contained) rather than `lesson-kit.css`, because the lesson-head styles are currently inline in `Lesson.astro` and `lesson-kit.css`'s global import is not relied upon — scoped keeps the component focused. The plate also styles its own `.lp-tag` instead of reusing the global `.domain-tag` to avoid a cross-file CSS dependency.
- **Known verification points (not placeholders):** the algorithms lesson path in Task 4 Step 3 may 404 (the script logs SKIP and continues) — substitute any real algorithms lesson slug; `astro check` in Task 2 Step 2 may be skipped if unavailable (the Task 3 build is the real gate).
