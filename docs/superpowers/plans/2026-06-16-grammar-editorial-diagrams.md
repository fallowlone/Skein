# Grammar Editorial Diagrams (SVG) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Lottie grammar diagrams with editorial-paper SVG diagrams (reference image #8) across all 9 archetypes, fed entirely by existing `GrammarTopic` data.

**Architecture:** A pure scene model (`Scene` = discriminated-union primitives in a 800×450 viewBox) is produced per archetype by pure builder functions from a normalized `DiagramInput` adapted from a `GrammarTopic`. A single Preact island `GrammarDiagram` renders any `Scene` to SVG with CSS draw-on animation honoring reduced-motion. The Lottie pipeline (`builder.ts`, `lottie-types.ts`, `GrammarAnimation`) is retired. See `docs/superpowers/specs/2026-06-16-grammar-editorial-diagrams-design.md`.

**Tech Stack:** Astro 5, Preact, TypeScript, Vitest, CSS modules. No animation library.

**Conventions:** components PascalCase `.tsx`; pure logic `.ts`; tests mirror source as `.test.ts(x)`; import alias `~` → `site/src/`. Palette = Atlas paper/ink tokens. viewBox 800×450 (matches current `COMP`).

---

### Task 1: Verify lottie-web blast radius + scene data model

**Files:**
- Create: `site/src/english/animations/editorial/scene-types.ts`
- Create: `site/src/english/animations/editorial/scene-types.test.ts`

- [ ] **Step 1: Confirm grammar is the only lottie-web consumer**

Run: `grep -rn "lottie-web\|GrammarAnimation\|from \"~/english/animations/builder\"\|animations/builder" site/src | grep -v "\.test\."`
Record every consumer. Expected: only `GrammarAnimation.tsx`, `builder.ts`, `archetype-map.ts`, `GrammarTopic.tsx`, and the `.tmp-*` preview dirs. If any OTHER component imports `lottie-web` or `GrammarAnimation`, note it — the dep stays and only the grammar usage is swapped (Task 8 adjusts accordingly).

- [ ] **Step 2: Write the scene model**

Define a viewBox-coordinate scene as a discriminated union. Exact content:

```ts
// site/src/english/animations/editorial/scene-types.ts
export const VIEW = { W: 800, H: 450 } as const;

export type Pt = { x: number; y: number };

export type Prim =
  | { k: "genre"; text: string; x: number; y: number }                 // mono caps top-left label
  | { k: "formula"; text: string; x: number; y: number }               // mono formula strip
  | { k: "axis"; x0: number; x1: number; y: number; arrow: boolean }   // horizontal line, optional arrowhead at x1
  | { k: "arc"; from: Pt; to: Pt; lift: number }                       // dashed quadratic arc, control lifted by `lift`
  | { k: "node"; x: number; y: number; fill: "hollow" | "solid"; d?: number }
  | { k: "dropLine"; x: number; y0: number; y1: number }               // vertical tick from node to axis
  | { k: "tick"; x: number; y: number; label?: string }                // axis tick + optional caption under it
  | { k: "label"; text: string; x: number; y: number; weight?: "mono" | "ink" }
  | { k: "hero"; text: string; x: number; y: number }                  // serif emphasis word
  | { k: "caption"; text: string; x: number; y: number }               // small italic note
  | { k: "chip"; text: string; x: number; y: number; w?: number; tone?: "ink" | "accent" | "warn" }
  | { k: "arrow"; from: Pt; to: Pt }                                    // connector with arrowhead
  | { k: "divider"; x: number; y0: number; y1: number }
  | { k: "pulse"; x: number; y: number; w: number };                   // underline that pulses

// `order` drives the CSS draw/reveal stagger (0-based step index).
export type Scene = { prims: Array<Prim & { order?: number }> };
```

- [ ] **Step 3: Write the test**

```ts
// site/src/english/animations/editorial/scene-types.test.ts
import { describe, it, expect } from "vitest";
import { VIEW } from "./scene-types";
import type { Scene } from "./scene-types";

describe("scene model", () => {
  it("viewBox is 800x450", () => {
    expect([VIEW.W, VIEW.H]).toEqual([800, 450]);
  });
  it("Scene accepts a primitive list", () => {
    const s: Scene = { prims: [{ k: "genre", text: "PRESENT PERFECT", x: 40, y: 40 }] };
    expect(s.prims).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Run + commit**

Run: `cd site && bun run test -- scene-types`  → PASS.
```bash
git add site/src/english/animations/editorial/scene-types.ts site/src/english/animations/editorial/scene-types.test.ts
git commit -m "feat(grammar): editorial scene data model"
```

---

### Task 2: DiagramInput adapter from GrammarTopic

**Files:**
- Create: `site/src/english/animations/editorial/diagram-input.ts`
- Create: `site/src/english/animations/editorial/diagram-input.test.ts`
- Reference (read first): `site/src/english/grammar-types.ts` (the `GrammarTopic` / `GrammarLesson` shape), `site/src/english/data/grammar/present-perfect-simple.ts` (a real topic).

- [ ] **Step 1: Write the adapter**

```ts
// site/src/english/animations/editorial/diagram-input.ts
import type { GrammarTopic, GrammarFamily } from "~/english/grammar-types";
import type { Lang } from "~/english/types"; // confirm the locale type name when implementing

export type DiagramInput = {
  archetype: string;
  family: GrammarFamily;
  genre: string;            // title — UPPERCASED by the renderer
  formula?: string;         // lessons[entry].structure
  hero?: string;            // first content token of examples[0]
  caption?: string;         // examples[0].note OR a short gloss
  labels: string[];         // archetypeParams.labels (fallback ["past","now","future"] for timeline)
  items: string[];          // archetypeParams.items
};

const STOP = new Set(["the","a","an","i","you","we","they","he","she","it","have","has","to","is"]);
function heroWord(sentence: string): string | undefined {
  const w = sentence.replace(/[^\p{L}\s'-]/gu, "").split(/\s+/).filter(Boolean);
  return w.find((t) => !STOP.has(t.toLowerCase())) ?? w[0];
}

export function toDiagramInput(topic: GrammarTopic, lang: Lang): DiagramInput {
  const entry = topic.levels?.[0] ?? topic.cefr;
  const lesson = entry ? topic.lessons?.[entry] : undefined;
  const ex0 = lesson?.examples?.[0];
  const params = topic.archetypeParams ?? {};
  const asArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : []);
  return {
    archetype: topic.archetype,
    family: topic.family,
    genre: topic.title?.[lang] ?? topic.title?.en ?? topic.id,
    formula: lesson?.structure?.[lang]?.trim() || undefined,
    hero: ex0 ? heroWord(ex0[lang] ?? ex0.en ?? "") : undefined,
    caption: ex0?.note?.[lang] ?? ex0?.note?.en ?? undefined,
    labels: asArr(params.labels),
    items: asArr(params.items),
  };
}
```

(When implementing: open `~/english/types` to confirm the exact locale type — likely `Lang = "en" | "ru"` — and `Bi` indexing. Adjust the import/signature to match; do not invent a name.)

- [ ] **Step 2: Write the test**

```ts
// site/src/english/animations/editorial/diagram-input.test.ts
import { describe, it, expect } from "vitest";
import { toDiagramInput } from "./diagram-input";
import type { GrammarTopic } from "~/english/grammar-types";

const base = {
  id: "present-perfect-simple", title: { en: "Present Perfect Simple", ru: "Present Perfect Simple" },
  cefr: "A2", levels: ["A2"], family: "tenses", egp: [], archetype: "timeline",
  archetypeParams: { labels: ["past", "now", "future"] },
  lessons: { A2: { cefr: "A2", explain: { en: "x", ru: "x" }, structure: { en: "subject + have/has + past participle", ru: "..." },
    examples: [{ en: "I have visited Paris twice.", ru: "Я был в Париже.", note: { en: "experience", ru: "опыт" } }], tip: { en: "t", ru: "t" } } },
  related: [], crossTopic: [],
} as unknown as GrammarTopic;

describe("toDiagramInput", () => {
  it("pulls genre, formula, caption, labels", () => {
    const d = toDiagramInput(base, "en");
    expect(d.genre).toBe("Present Perfect Simple");
    expect(d.formula).toBe("subject + have/has + past participle");
    expect(d.caption).toBe("experience");
    expect(d.labels).toEqual(["past", "now", "future"]);
  });
  it("hero skips stopwords", () => {
    expect(toDiagramInput(base, "en").hero?.toLowerCase()).toBe("visited");
  });
  it("never throws on an empty topic", () => {
    const empty = { id: "x", title: { en: "X" }, cefr: "A1", levels: [], family: "unclassified", archetype: "timeline", lessons: {}, related: [], crossTopic: [], egp: [] } as unknown as GrammarTopic;
    expect(() => toDiagramInput(empty, "en")).not.toThrow();
  });
});
```

- [ ] **Step 3: Run + commit**

Run: `cd site && bun run test -- diagram-input` → PASS.
```bash
git add site/src/english/animations/editorial/diagram-input.ts site/src/english/animations/editorial/diagram-input.test.ts
git commit -m "feat(grammar): GrammarTopic → DiagramInput adapter"
```

---

### Task 3: GrammarDiagram island + editorial CSS (Scene → SVG renderer)

**Files:**
- Create: `site/src/components/english/GrammarDiagram.tsx`
- Create: `site/src/components/english/grammar-diagram.css`
- Reference: `site/src/components/english/GrammarAnimation.tsx` (props/reduced-motion pattern to mirror), `site/src/styles/atlas-kit.css` (paper/ink token names to reuse).

- [ ] **Step 1: Write the renderer**

A pure presentational component: `type Props = { scene: Scene; reducedMotion?: boolean; lang: "en" | "ru" }`. Render one `<svg viewBox="0 0 800 450">` with a `<defs>` arrowhead marker and a faint grid `<pattern>`. Map each `Prim` to SVG by `k`:
- `genre` → `<text>` mono caps, letter-spaced, muted.
- `formula` → `<text>` mono, accent-muted.
- `axis` → `<line>` with `marker-end` when `arrow`.
- `arc` → `<path d="M…Q…">` quadratic (control = midpoint lifted by `lift`), `stroke-dasharray` dashed accent.
- `node` → `<circle>` `fill:none;stroke:accent` (hollow) or `fill:accent` (solid).
- `dropLine`/`divider` → `<line>`.
- `tick` → short `<line>` + optional `<text>` caption below.
- `label` → `<text>` (mono or ink).
- `hero` → `<text>` serif, large.
- `caption` → `<text>` small italic.
- `chip` → `<rect rx>` + centered `<text>`, tone class.
- `arrow` → `<line>` with `marker-end`.
- `pulse` → `<rect>` underline with the pulse animation class.

Animation: add a CSS class keyed off `order` (e.g. `style="--o:{order}"`) that delays a draw/reveal keyframe. When `reducedMotion`, add a `reduced` class on the root that disables all keyframes (final frame shown). Use `stroke-dasharray/stroke-dashoffset` for `axis`/`arc` draw-in.

- [ ] **Step 2: Write editorial CSS**

`grammar-diagram.css` scoped under a root class (e.g. `.gdiagram`): paper background + grid pattern color, ink/accent/muted/warn stroke+fill vars (reuse Atlas values: ink `#1a1916`, paper `#f3eee2`, accent blue, line muted), mono font for genre/labels/formula/footer, serif for `hero`. Keyframes: `gd-draw` (dashoffset→0), `gd-reveal` (opacity 0→1 + slight translate/scale), `gd-pulse` (scaleX). Stagger via `animation-delay: calc(var(--o,0) * 90ms)`. `.gdiagram.reduced *` → `animation: none; stroke-dashoffset: 0; opacity: 1`.

- [ ] **Step 3: Smoke-render test (optional, render to string)**

If a Preact render-to-string test util already exists in the repo (check `site/src` test setup), add a test that renders a minimal `Scene` and asserts the `<svg>` + an expected `<text>` appears. If no SSR test util is wired, skip and rely on the Task 4 visual check (note the skip in the commit).

- [ ] **Step 4: Commit**

```bash
git add site/src/components/english/GrammarDiagram.tsx site/src/components/english/grammar-diagram.css
git commit -m "feat(grammar): GrammarDiagram SVG renderer + editorial CSS"
```

---

### Task 4: PILOT — timeline builder + wire end-to-end + visual verify

**Files:**
- Create: `site/src/english/animations/editorial/build-scene.ts` (start with `buildTimelineScene` only)
- Create: `site/src/english/animations/editorial/build-scene.test.ts`
- Modify: `site/src/english/animations/archetype-map.ts` (dispatch to editorial builders, return a `Scene` factory)
- Modify: `site/src/components/english/grammar/GrammarTopic.tsx` (render `GrammarDiagram` instead of `GrammarAnimation`)

- [ ] **Step 1: Write `buildTimelineScene` with the arc-vs-flat decision**

```ts
// site/src/english/animations/editorial/build-scene.ts
import type { Scene, Prim } from "./scene-types";
import { VIEW } from "./scene-types";
import type { DiagramInput } from "./diagram-input";

const PERFECT = new Set(["aspect"]); // families that get the retrospective arc; tenses decided by label set below
const isRetrospective = (d: DiagramInput): boolean => {
  const ls = d.labels.map((s) => s.toLowerCase());
  const hasNow = ls.includes("now"), hasPast = ls.includes("past");
  return PERFECT.has(d.family) || (d.family === "tenses" && hasNow && hasPast && d.labels.length <= 3);
};

function header(d: DiagramInput): Prim[] {
  const p: Prim[] = [{ k: "genre", text: d.genre.toUpperCase(), x: 56, y: 70, order: 0 }];
  if (d.formula) p.push({ k: "formula", text: d.formula, x: 400, y: 150, order: 1 });
  return p;
}

export function buildTimelineScene(d: DiagramInput): Scene {
  const Y = 280, X0 = 90, X1 = 710;
  const prims: Prim[] = [...header(d), { k: "axis", x0: X0, x1: X1, y: Y, arrow: true, order: 2 }];
  if (isRetrospective(d)) {
    const past = { x: 230, y: Y }, now = { x: 560, y: Y };
    prims.push(
      { k: "arc", from: past, to: now, lift: 120, order: 3 },
      { k: "node", x: past.x, y: Y, fill: "hollow", order: 4 },
      { k: "node", x: now.x, y: Y, fill: "solid", order: 5 },
      { k: "dropLine", x: now.x, y0: Y - 70, y1: Y, order: 5 },
      { k: "tick", x: past.x, y: Y, label: (d.labels[0] ?? "past").toUpperCase(), order: 4 },
      { k: "tick", x: now.x, y: Y, label: (d.labels[1] ?? "now").toUpperCase(), order: 5 },
      { k: "tick", x: 700, y: Y, label: (d.labels[2] ?? "future").toUpperCase(), order: 6 },
    );
    if (d.hero) prims.push({ k: "hero", text: d.hero, x: past.x - 30, y: Y - 90, order: 4 });
    if (d.caption) prims.push({ k: "caption", text: d.caption, x: now.x, y: Y + 90, order: 6 });
  } else {
    const labels = d.labels.length ? d.labels : ["—"];
    const xs = labels.map((_, i) => (labels.length === 1 ? (X0 + X1) / 2 : X0 + (i * (X1 - X0)) / (labels.length - 1)));
    labels.forEach((t, i) => {
      prims.push({ k: "node", x: xs[i], y: Y, fill: i === 0 ? "solid" : "hollow", order: 3 + i });
      prims.push({ k: "tick", x: xs[i], y: Y, label: t.toUpperCase(), order: 3 + i });
    });
    if (d.caption) prims.push({ k: "caption", text: d.caption, x: 400, y: Y + 90, order: 3 + labels.length });
  }
  return { prims };
}
```

- [ ] **Step 2: Tests for the pilot**

```ts
// site/src/english/animations/editorial/build-scene.test.ts
import { describe, it, expect } from "vitest";
import { buildTimelineScene } from "./build-scene";
import { VIEW } from "./scene-types";
import type { DiagramInput } from "./diagram-input";

const inp = (o: Partial<DiagramInput>): DiagramInput => ({ archetype: "timeline", family: "tenses", genre: "X", labels: [], items: [], ...o });

describe("buildTimelineScene", () => {
  it("present-perfect-like → arc + hollow past + solid now", () => {
    const s = buildTimelineScene(inp({ family: "tenses", labels: ["past", "now", "future"], formula: "have + V3" }));
    expect(s.prims.some((p) => p.k === "arc")).toBe(true);
    expect(s.prims.some((p) => p.k === "node" && p.fill === "hollow")).toBe(true);
    expect(s.prims.some((p) => p.k === "node" && p.fill === "solid")).toBe(true);
  });
  it("sequence labels → flat axis, no arc", () => {
    const s = buildTimelineScene(inp({ family: "conjunctions", labels: ["before", "when", "while", "after", "until"] }));
    expect(s.prims.some((p) => p.k === "arc")).toBe(false);
    expect(s.prims.filter((p) => p.k === "tick")).toHaveLength(5);
  });
  it("all coords inside viewBox", () => {
    const s = buildTimelineScene(inp({ labels: ["past", "now", "future"] }));
    for (const p of s.prims) {
      if ("x" in p) { expect((p as { x: number }).x).toBeGreaterThanOrEqual(0); expect((p as { x: number }).x).toBeLessThanOrEqual(VIEW.W); }
    }
  });
});
```

- [ ] **Step 3: Wire archetype-map → editorial, return Scene factory**

Read the current `archetype-map.ts`. Change `ARCHETYPE_BUILDERS` to map archetype keys to the editorial `build*Scene` functions, and `resolveAnimation(topic)` to return `{ scene: () => buildScene(toDiagramInput(topic, lang)) }` (thread `lang`). For Task 4 only `timeline` is real; the other 8 keys may temporarily fall back to `buildTimelineScene` so the build stays green — mark these `TODO(task5-6)`.

- [ ] **Step 4: Swap the island in GrammarTopic.tsx**

Replace the `GrammarAnimation` import/usage (lines ~134-147, inside `<figure class="plate">`) with `GrammarDiagram`, passing `scene`, `reducedMotion={reduced}`, `lang`. Keep the `<figcaption class="plate-caption">` footer. Keep the `reduced` `rm-note`. Remove the now-unused `doc`/`resolveAnimation().doc()` memo; build the scene via the new `resolveAnimation(topic, lang).scene()`.

- [ ] **Step 5: Build + visual verify (PILOT GATE)**

Run: `cd site && bun run test -- build-scene && bun run build` → tests PASS, build green, lint 0/0.
Then serve and visually verify EN + RU:
- `/en/english/grammar/present-perfect-simple` → editorial arc (matches #8: grid, genre caps, formula, dashed arc, hollow past / solid now, drop-line, ticks, caption).
- a sequence-timeline topic → flat editorial axis (no arc).
Confirm reduced-motion renders the final frame.

- [ ] **Step 6: Commit**

```bash
git add site/src/english/animations/editorial/build-scene.ts site/src/english/animations/editorial/build-scene.test.ts site/src/english/animations/archetype-map.ts site/src/components/english/grammar/GrammarTopic.tsx
git commit -m "feat(grammar): editorial timeline diagram (pilot) wired end-to-end"
```

---

### Task 5: Remaining archetype builders — batch A (contrast-pair, transformation, map, branch)

**Files:**
- Modify: `site/src/english/animations/editorial/build-scene.ts` (add 4 builders)
- Modify: `site/src/english/animations/editorial/build-scene.test.ts` (add cases)
- Modify: `site/src/english/animations/archetype-map.ts` (point the 4 keys at their real builders)

Each builder takes `DiagramInput`, returns `Scene`, shares `header(d)` (genre + formula). Geometry per archetype (viewBox 800×450, center 400/225):

- [ ] **Step 1: `buildContrastScene`** — two `chip`s framed left (`tone:"accent"`, x≈230) and right (`tone:"warn"`, x≈570) at y≈250, a center `divider` (x=400, y0≈170, y1≈330). Left/right text = `d.labels[0]`/`d.labels[1]` (fallback `d.items`). Header on top.
- [ ] **Step 2: `buildTransformScene`** — `chip` source (x≈190), `arrow` from (≈300,225) to (≈500,225), `chip` result (x≈610, `tone:"accent"`). Texts = `d.labels[0]`→`d.labels[1]`.
- [ ] **Step 3: `buildMapScene`** — N rows from `d.items` parsed as `"a→b"`/pairs (fallback `d.labels` zipped). Per row: left `chip` (x≈230), right `chip` (x≈570, accent), thin `arrow` between, y spread 140..330. Cap at 4 rows (note dropped overflow in a `caption`).
- [ ] **Step 4: `buildBranchScene`** — root `chip` left (x≈190, y=225, accent); branches from `d.labels` (or `items`) as `chip`s right (x≈580) spread y 130..330; one `arrow` from root to each.
- [ ] **Step 5: Tests** — for each: asserts the signature primitive exists (e.g. contrast has a `divider` + 2 chips; transform has an `arrow` between two chips; map row count; branch arrow count = branch count) and all `x`/`y` within viewBox. Empty-input → no throw, ≥ the header.
- [ ] **Step 6: archetype-map** — point `contrast-pair`, `transformation`, `map`, `branch` (and their aliases `comparison`/`cycle`/`tree` per the existing `ALIASES`) at the real builders.
- [ ] **Step 7: Build + commit**

Run: `cd site && bun run test -- build-scene && bun run build` → green.
```bash
git add site/src/english/animations/editorial/build-scene.ts site/src/english/animations/editorial/build-scene.test.ts site/src/english/animations/archetype-map.ts
git commit -m "feat(grammar): editorial diagrams batch A (contrast/transform/map/branch)"
```

---

### Task 6: Remaining archetype builders — batch B (scale, swap, highlight, slot-fill)

**Files:** same three files as Task 5.

- [ ] **Step 1: `buildScaleScene`** — `d.labels` as stacked framed `chip`s growing upward (widening or rising), y spread 330(base)→120(top); base solid-toned, top accent.
- [ ] **Step 2: `buildSwapScene`** — two `chip`s at xL≈250 / xR≈550, y=225; emit them with `order` so CSS slides them past each other (the renderer's reveal handles motion; reduced-motion = final order). Texts = `d.labels[0]`/`[1]`.
- [ ] **Step 3: `buildHighlightScene`** — `d.labels` (or tokens from `items`) as a `label` row x spread 170..630 at y=225; one focus token (index from `archetypeParams` `focus`/`items[0]` if numeric, else middle) gets a `pulse` underline beneath it.
- [ ] **Step 4: `buildSlotFillScene`** — `d.labels` as slot `chip`s in a row; render the focus slot as a hollow `node`/empty `chip` (the "to fill") with the others solid. Header on top.
- [ ] **Step 5: Tests** — per builder: signature primitive (scale ≥2 stacked chips ordered by y; swap 2 chips with distinct `order`; highlight exactly one `pulse`; slot-fill ≥1 hollow). viewBox bounds + empty-safe.
- [ ] **Step 6: archetype-map** — point `scale`, `swap`, `highlight`, `slot-fill` (alias `fill-gap`) at real builders. Remove any remaining `buildTimelineScene` fallbacks; every archetype now has its own builder.
- [ ] **Step 7: Build + commit**

Run: `cd site && bun run test -- build-scene && bun run build` → green.
```bash
git add site/src/english/animations/editorial/build-scene.ts site/src/english/animations/editorial/build-scene.test.ts site/src/english/animations/archetype-map.ts
git commit -m "feat(grammar): editorial diagrams batch B (scale/swap/highlight/slot-fill)"
```

---

### Task 7: Visual sweep across archetypes (EN + RU)

**Files:** none (verification); fix any builder/CSS issues found, committing fixes against the relevant Task 5/6 file.

- [ ] **Step 1: Pick one live topic per archetype**

For each of the 9 archetypes, find a topic that uses it: `grep -l '"archetype": "<key>"' site/src/english/data/grammar/*.ts | head -1`. List the 9 slugs.

- [ ] **Step 2: Verify EN + RU**

Serve and open each of the 9 topics in EN and RU. Confirm: editorial paper look matches #8 language, genre label = title, formula strip present when the topic has `structure`, geometry legible (no overflow/overlap), reduced-motion holds the final frame. Note and fix any clipping (adjust coords) or empty-data oddities.

- [ ] **Step 3: Commit any fixes** with `fix(grammar): editorial diagram visual polish`.

---

### Task 8: Retire the Lottie pipeline

**Files:**
- Delete: `site/src/components/english/GrammarAnimation.tsx`, `site/src/english/animations/builder.ts`, `site/src/english/animations/lottie-types.ts`, `site/src/english/animations/tokens.ts` (only if nothing else imports it — verify), and any `builder.test.ts`.
- Modify: `site/package.json` (drop `lottie-web`) — ONLY if Task 1 Step 1 found no other consumer.
- Note: `.tmp-anim-preview/`, `.tmp-lottie-bakeoff/` are untracked scratch dirs; leave or delete locally, do not commit.

- [ ] **Step 1: Delete dead Lottie modules**

Remove `GrammarAnimation.tsx`, `builder.ts`, `lottie-types.ts`, and any test for them. Re-check imports: `grep -rn "GrammarAnimation\|animations/builder\|lottie-types\|animations/tokens" site/src | grep -v "\.test\."` → expect zero (the editorial path replaced them). Keep `tokens.ts` only if a non-Lottie module still imports it.

- [ ] **Step 2: Drop the dependency (conditional)**

If Task 1 Step 1 confirmed grammar was the sole consumer: `grep -rn "lottie-web" site/src` → zero, then remove `lottie-web` from `site/package.json` and run `cd site && bun install`. If another consumer exists, skip this step and note it.

- [ ] **Step 3: Build + commit**

Run: `cd site && bun run test && bun run build` → all tests green, build green, lint 0/0.
```bash
git add -A site/src site/package.json site/bun.lock
git commit -m "refactor(grammar): retire Lottie pipeline, editorial SVG is sole renderer"
```

---

### Task 9: Final review + branch finish

- [ ] **Step 1: Dispatch a final code-quality review** of the whole diff (scene model, adapter, renderer, 9 builders, wiring, deletions). Address CRITICAL/HIGH.
- [ ] **Step 2: Confirm lottie-web absent from the grammar route's client JS** (build output / treemap) — the Performance-pass contribution.
- [ ] **Step 3:** Use superpowers:finishing-a-development-branch.

---

## Notes for the implementer

- All builders are PURE (`DiagramInput → Scene`), no DOM/Preact — that is what makes them unit-testable without `astro:content`.
- viewBox is fixed 800×450; keep every coordinate inside it (a test enforces this). Center is (400, 225).
- Confirm the locale type name (`Lang`) and `Bi` indexing in `~/english/types` before writing the adapter — do not invent names.
- One CSS module owns the palette + keyframes; restyle the entire diagram set in one place.
- Reduced-motion must render the final composed frame (no keyframes) — thread the existing `reduced` flag from `GrammarTopic.tsx`.
- The 9 archetypes share `header(d)`; only the body geometry differs. Don't duplicate the header logic per builder.
