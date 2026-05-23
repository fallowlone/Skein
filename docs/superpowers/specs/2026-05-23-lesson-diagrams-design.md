# Lesson Diagrams — design

**Date:** 2026-05-23
**Area:** `site/` (Astro 6 + Preact). A new `figures/` component family (7 reusable, theme-aware, static-SVG / div diagram primitives), a shared color contract (`palette.ts`), pure layout helpers, a build-time path-bug fix that re-activates the lesson visual contract, a `/diagram` authoring command, and 4 reference lessons.
**Status:** approved design, ready for plan

## Goal

Lessons need real visual support so information is easier to absorb. Today only the foundations `algo/` track has true figure components (`StructureFigure`, `MachineFigure`, `ComplexityChart`, `AlgoTrace`); the 16 pillar lessons have no general diagram vocabulary and fake the `data-lesson-visual` requirement with `NumbersCard`. The `diagram/` component vocab (`Connector`, `Node`, `Pulse`) is runtime-JS and used only by fullstack pieces, not lessons. Build a small set of reusable, on-brand, zero-hydration diagram primitives usable across every lesson and piece, theme-correct (light + dark) by construction.

## Scope

In scope:
- New component family `site/src/components/figures/` — 7 archetype components.
- Shared `palette.ts` color contract (`FigColor` → CSS-var resolver) and `figures.css` (opt-in CSS motion keyframes, zero JS).
- Pure layout helpers (`flow-layout.ts`, `sequence-layout.ts`, `tree-layout.ts`) — unit-tested.
- Fix the latent `lessonInfoFromPath` path bug in `site/src/lint/rules/lessons.ts` (currently dead on unit-scoped routes) so the existing `data-lesson-visual` contract actually enforces. Add a regression test.
- New `/diagram <target> <archetype>` authoring command (sibling of `/infographic` and `/teach`).
- 4 reference lessons retrofitted with real figures (one per render strategy), both languages.

Out of scope:
- Mass retrofit of the 599 lessons (later, incremental, like practice-layer P6 — done via `/diagram`, not this deliverable).
- Mermaid (or any text-to-SVG) escape hatch — deferred. Adds a build dependency (network via Kroki or a local binary) and theming work that fights the deterministic-build guardrail. Hand-rolled components extend for free; revisit only if a real non-archetype need appears.
- Any JS islands in figures. Lesson hydration budget (cap 5) stays untouched.
- New runtime deps.
- State-machine archetype (dropped during brainstorming — circular states + curved labeled transitions overlap with topology + sequence; low marginal value).

## Current state (anchors)

- Components today:
  - `site/src/components/algo/` — `StructureFigure.astro` (div-based indexed cells, legacy tokens `bg-panel-sky border-bbg-purple text-bbg-ink`), `MachineFigure.astro` (has `lang` prop for built-in stage names), `ComplexityChart.astro` (gold pattern: pure data → static SVG, `role="img"` + `aria-label`, zero JS, but hardcoded hex `#94a3b8` etc.), `AlgoTrace`.
  - `site/src/components/diagram/` — `Connector.astro` (runtime `setupGsap`, DOM-anchored via `data-from`/`data-to`, hardcoded hex, absolute overlay). NOT the model — too heavy. Leave alone.
- Theme tokens (live, both themes): `site/src/styles/global.css` — `:root` (light) and `:root[data-theme='dark']` (dark), with `color-scheme` declared. Managed by `ThemeToggle.astro`, `ThemeBoot.astro`, `SettingsDrawer.tsx`. Palette: pillar strokes `--p-lilac --p-mint --p-peach --p-sky --p-rose` (oklch) + matching translucent fills `--p-{name}-bg` (0.16 light / 0.18 dark); status `--ok --warn --danger --accent` (no `-bg` variant); text `--ink --ink-2 --muted --muted-2`; rules `--rule --rule-strong --hairline`; surfaces `--card --card-2 --paper --paper-2`.
- Lesson route: `site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro` → built `dist/<lang>/learn/<track>/<unit>/<lesson>/index.html` (7 path segments).
- Lesson layout: `site/src/layouts/Lesson.astro` — body slot `<div class="lesson-content"><slot /></div>`.
- Lesson content: `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx` — **separate file per language** (unlike the practice layer's one-file-both-languages). Figure components therefore take plain `string` labels; language is decided by which MDX file imports them. No `BiText` needed.
- Lint: `site/src/lint/rules/lessons.ts` — `data-lesson-visual` contract (`commonLessonRules` errors if a lesson has no visual), `data-lesson-section` ordering (`visualIdx` must follow `step`, precede `worked-example`). `lessonInfoFromPath` (lines 27–33) gates which built HTML files the lesson rules run on.
- Test pattern: Vitest + jsdom, `~` → `./src`, `setupFiles ./src/test-setup.ts`, include `src/**/*.test.ts(x)`. Tests cover **pure exported logic** (e.g. `sandboxes/DBLeverSandbox.test.ts` imports `rankLevers`, asserts return) and lint rules (`lessons.test.ts`). No `.astro` render tests; no Container API.
- Build gate: `bun run build` → read `site/dist/lint-report.json` (`{"errors":[],"warnings":[]}`). Never trust stdout.

### The path bug (precise)

`site/src/lint/rules/lessons.ts:27-33`:

```ts
function lessonInfoFromPath(file: string): { slug: string; track: string } | null {
  const seg = file.split(/[\\/]/).filter(Boolean);
  if (seg.length === 6 && seg[0] === "dist" && seg[2] === "learn" && seg[5].startsWith("index.")) {
    return { track: seg[3], slug: seg[4] };
  }
  return null;
}
```

It assumes `dist/<lang>/learn/<track>/<lesson>/index.html` (6 segments). The real route is unit-scoped: `dist/<lang>/learn/<track>/<unit>/<lesson>/index.html` (7 segments). So the guard never matches → `lessonInfoFromPath` always returns `null` for real lessons → the visual + ordering rules are effectively dead. The `data-lesson-visual` requirement does not currently fire. This feature relies on it, so the fix is part of this work (decided in brainstorming).

## Locked decisions (from brainstorming)

1. **7 archetypes** (state machine dropped): sequence, annotated cells, layered stack, flow, tree, architecture/topology, before/after compare.
2. **Rendering:** static SVG + opt-in CSS motion, **zero JS islands**.
3. **Authoring model:** hand-rolled brand components only (theme-aware via existing CSS vars). No Mermaid.
4. **Scope:** components + palette + layout helpers + path-bug fix + `/diagram` command + 4 reference lessons. Mass retrofit out of scope.
5. **Path bug:** fixed in this work, with a regression test.
6. **Deliverable = spec + plan.** Code is a later step.

## Design

### A. File structure

```
site/src/components/figures/
  FlowDiagram.astro          + flow-layout.ts        SVG: nodes left→right (or top→bottom) + arrows
  SequenceDiagram.astro      + sequence-layout.ts    SVG: actor lanes + ordered messages
  TreeDiagram.astro          + tree-layout.ts        SVG: recursive tree
  TopologyDiagram.astro                              SVG: grid-placed nodes + edges (no layout engine)
  LayerStack.astro                                   div + Tailwind: stacked bands
  ComparePanels.astro                                div + Tailwind: before/after
  DataCells.astro                                    div + Tailwind: marked indexed cells
  palette.ts                                         FigColor → CSS-var resolver (shared)
  figures.css                                        shared @keyframes, opt-in motion (zero JS)
```

Invariants for all 7:
- Root element is `<figure data-lesson-visual role="img" aria-label={title}>` → satisfies the existing lesson visual contract; accessible.
- Color **only** via `FigColor` props resolved through `palette.ts` to CSS vars. No hex anywhere in components. Light + dark correct by construction; colorblind retheme = edit CSS vars only.
- Zero JS islands. Motion (if any) is opt-in CSS from `figures.css`, gated by `prefers-reduced-motion`.
- Layout math lives in pure `.ts` helpers (testable); `.astro` files are thin wrappers that map props → helper output → SVG/markup.
- Text comes from author string props (lessons are per-language files).

### B. `palette.ts` — color contract

```ts
export type FigColor =
  | "lilac" | "mint" | "peach" | "sky" | "rose"   // pillar palette
  | "neutral"                                       // structural
  | "ok" | "warn" | "danger";                       // status

export interface FigPaint { stroke: string; fill: string; }

export function resolve(color: FigColor): FigPaint {
  switch (color) {
    case "neutral": return { stroke: "var(--rule-strong)", fill: "var(--card-2)" };
    case "ok":      return { stroke: "var(--ok)",     fill: "color-mix(in oklch, var(--ok) 16%, transparent)" };
    case "warn":    return { stroke: "var(--warn)",   fill: "color-mix(in oklch, var(--warn) 16%, transparent)" };
    case "danger":  return { stroke: "var(--danger)", fill: "color-mix(in oklch, var(--danger) 16%, transparent)" };
    default:        return { stroke: `var(--p-${color})`, fill: `var(--p-${color}-bg)` };
  }
}
```

Pillar colors map to `var(--p-X)` stroke + `var(--p-X-bg)` fill (both defined in light + dark). `neutral` uses structural tokens. `ok/warn/danger` have no `-bg` token, so fills use `color-mix`. Edge/arrow strokes and labels use `var(--ink)` / `var(--muted)`. One resolver, used by every component; retheme touches CSS vars only.

### C. Component APIs

All `title: string` (required, becomes `aria-label`). `color`/`mark`/`tone` props are `FigColor`.

**1 · FlowDiagram** — SVG + `flow-layout.ts`. Nodes auto-spaced; `edges[i]` connects `nodes[i] → nodes[i+1]`.
```ts
interface FlowDiagramProps {
  title: string;
  direction?: "row" | "col";          // default "row"
  nodes: { label: string; color?: FigColor; sub?: string }[];
  edges?: { label?: string; dashed?: boolean }[];   // length nodes.length-1
}
```

**2 · SequenceDiagram** — SVG + `sequence-layout.ts`. Lanes from actors; steps drop top→bottom in order.
```ts
interface SequenceDiagramProps {
  title: string;
  actors: { id: string; label: string; color?: FigColor }[];
  steps: { from: string; to: string; label: string; dashed?: boolean; return?: boolean }[];
}
```
`return: true` styles the arrow as a response (dashed + actor color); `from`/`to` reference actor `id`s.

**3 · TreeDiagram** — SVG + `tree-layout.ts`. Recursive; x by leaf order, y by depth.
```ts
interface TreeNode { label: string; color?: FigColor; children?: TreeNode[]; }
interface TreeDiagramProps { title: string; root: TreeNode; }
```

**4 · TopologyDiagram** — SVG, manual grid placement (no layout engine). Author places nodes on a `(row, col)` grid; edges link by id.
```ts
interface TopologyDiagramProps {
  title: string;
  nodes: { id: string; label: string; color?: FigColor; row: number; col: number }[];
  edges: { from: string; to: string; label?: string; dashed?: boolean; dir?: boolean }[];
}
```
`dir: true` draws an arrowhead; otherwise a plain line. Grid → pixel mapping is deterministic from max row/col (handled inline in the component; no separate layout engine — YAGNI for service-map / client-server cases).

**5 · LayerStack** — div + Tailwind. Top layer printed first; `numbered` counts up from the bottom.
```ts
interface LayerStackProps {
  title: string;
  numbered?: boolean;
  layers: { label: string; sub?: string; color?: FigColor }[];
}
```

**6 · ComparePanels** — div + Tailwind. Two side-by-side panels.
```ts
interface PanelSide { title: string; items?: string[]; body?: string; }
interface ComparePanelsProps {
  title: string;
  left: PanelSide; right: PanelSide;
  leftTone?: FigColor;   // default "danger"
  rightTone?: FigColor;  // default "ok"
}
```

**7 · DataCells** — div + Tailwind. Generalizes `algo/StructureFigure` to theme tokens.
```ts
type Cell = string | { value: string; mark?: FigColor; addr?: string };
interface DataCellsProps {
  title: string;
  cells: Cell[];
  indices?: boolean;     // render 0..n-1 index row
  caption?: string;
}
```

### D. Lint

- **No new required rules.** The 7 components carry `data-lesson-visual` → satisfy `commonLessonRules` as drop-ins.
- **Color contract guarded by TypeScript, not lint.** Props are typed `FigColor`; a hex string is a compile error. The lint surface (MDX content + i18n + sources) gains nothing here.
- **Path-bug fix** (`site/src/lint/rules/lessons.ts:27-33`): handle the 7-segment unit-scoped path.
  ```ts
  function lessonInfoFromPath(file: string): { slug: string; track: string } | null {
    const seg = file.split(/[\\/]/).filter(Boolean);
    if (seg.length === 7 && seg[0] === "dist" && seg[2] === "learn" && seg[6].startsWith("index.")) {
      return { track: seg[3], slug: seg[5] };
    }
    return null;
  }
  ```
  This re-activates the visual + ordering rules on real lessons. Expect previously-hidden violations to surface on build; resolving those is **out of scope** for this deliverable except where they touch the 4 reference lessons (the broader retrofit is P6 via `/diagram`). The plan must verify the build still reports `errors:[]` after the fix — if the reactivated rules error on unrelated existing lessons, the plan downgrades those specific findings or scopes the fix carefully, but does not silently re-disable the rule.

### E. `/diagram` command

Sibling of `/infographic` and `/teach`. Inserts a figure into an existing lesson (or piece) with bilingual parity.

Input form:
```
/diagram lessons/algorithms/03-sorting/02-binary-search   sequence
/diagram book/networking/01-networking/03-tcp-handshake   sequence
```

Pipeline:
1. Resolve target — lesson (`content/lessons/{en,ru}/…`, both files) or piece (`content/book/{en,ru}/…`).
2. Choose archetype — from the argument, or propose from the 7.
3. Build props from lesson content (nodes / steps / cells / layers).
4. Insert `<Component …/>` into both language versions; import via `~/` alias (no `..`).
5. `bun run build` → read `dist/lint-report.json` (`errors:[]`).
6. Visual check both languages in a browser.
7. Stop. Commit only on explicit user request.

Refuses: off-domain target, missing target, target that already has the requested figure. Figures cost 0 islands → never breach the hydration cap.

### F. Reference lessons

Dogfood — retrofit one lesson per render strategy as a canonical example and an API smoke test on real content:

| Lesson (`<track>/<unit>/<lesson>`) | Archetype | Render |
|--------|-----------|--------|
| `networking/03-tcp-handshake/01-the-three-way-handshake` | SequenceDiagram | SVG |
| `algorithms/07-trees/05-binary-search-trees` | TreeDiagram | SVG |
| `networking/12-putting-it-together/01-the-twelve-layers` | LayerStack | div |
| `algorithms/03-sorting-search/05-binary-search` | DataCells | div |

4 lessons × 2 languages, all verified present in `site/src/content/lessons/{en,ru}/`. FlowDiagram, TopologyDiagram, ComparePanels are exercised by the gallery + unit tests; the plan may add a 5th–7th reference if a natural target exists, but these 4 are the floor.

## Testing

Mirror the repo pattern: Vitest, pure logic, no `.astro` render.

| File | Asserts |
|------|---------|
| `flow-layout.test.ts` | N nodes → N rects, even x-steps, N−1 arrows; `direction:"col"` swaps axis |
| `sequence-layout.test.ts` | M steps → M message lines, y increases in order, `return` inverts direction |
| `tree-layout.test.ts` | x by leaf index, y by depth; node count = tree traversal |
| `palette.test.ts` | `resolve("mint") → { stroke:"var(--p-mint)", fill:"var(--p-mint-bg)" }`; `resolve("ok") →` stroke `var(--ok)` + `color-mix` fill; `resolve("neutral") →` structural tokens |
| `lessons.test.ts` (extend) | 7-segment unit-scoped path → `lessonInfoFromPath` returns correct `{track,slug}`; 6-segment path → `null` (regression for the C/D fix) |

**Not unit-tested:** `.astro` render (no Container API in this repo). Components are thin wrappers over tested pure helpers; visual correctness is verified in the browser (gallery + reference lessons). Limitation stated explicitly.

**Build gate:** `bun run build` → `dist/lint-report.json` `errors:[]`.

## Risks / open items

- **Reactivated lint may error on existing lessons.** The path-bug fix turns on rules that have been silently off. The plan must run a full build immediately after the fix, catalog any newly-surfaced errors, and decide per case (fix if trivial / in a reference lesson; otherwise scope as P6 follow-up) — without re-disabling the rule. This is the one place the deliverable could balloon; the plan caps it.
- **Per-language string props** mean a figure authored in EN and RU is two near-duplicate blocks. Acceptable (matches the lessons file model); `/diagram` writes both.
- **SVG text overflow** for long labels. Layout helpers size lanes/nodes from label length with a min/max clamp; verified visually in reference lessons.

## Deliverable

This spec + the implementation plan that follows. No code yet.
