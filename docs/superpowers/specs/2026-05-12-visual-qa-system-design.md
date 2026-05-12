# Visual QA System Design

**Status:** draft, awaiting user review.
**Date:** 2026-05-12.
**Owner:** Artem.
**Context repo:** `/Users/artemmac/dev/awesome-everything`.

## 1. Problem

Hand-written SVG for ByteByteGo-style infographics produces a steady stream of geometric bugs. Four representative cases from the `v1-bbg-flow` draft:

1. *Text overflow.* `Typical timings` card content (`240 px` wide) contained lines like `TLS 1.3 ...... 1 RTT (0-RTT resume)` that needed roughly `272 px` of monospace width. The text spilled past the card and crossed the panel's dashed border.
2. *Icon over arrow.* Key icons placed centered on TLS handshake arrows had no opaque background; the arrow stroke continued through the icon, looking like a line crossing the key.
3. *Connector starts inside a box.* The merge arrow into `Layout` was anchored at `x=1320` while the `CSSOM` box ended at `x=1366`. The dashed path appeared to strike through the word `CSSOM`.
4. *Cross-panel connector without anchor.* The mint to peach connector started at `(760, 940)` (inside the mint panel, the panel ends at `x=808`) and ended at `(850, 540)` in the peach panel with no element to anchor on. The curve crossed two dashed borders and landed in empty space.

Every bug shares a single root cause: SVG is being written with literal coordinates and no geometric validation. Style rules live in prose in `style-guide.md`. Nothing enforces them at build time.

The user's editorial constraint compounds this: infographics must explain at senior fullstack level using minimal prose. Walls of text are forbidden, but skimping on content is also forbidden. Density has to come from visuals carrying meaning, not from compressed paragraphs.

## 2. Goals

1. Make image-3 through image-6 class of bugs impossible by construction.
2. Keep editorial density: senior-level explanation, minimal prose, visual-first.
3. Cover all six composition patterns from `style-guide.md` in v1:
   `vertical-explainer`, `two-column`, `sequence`, `multi-panel-grid`,
   `system-diagram`, `before-after`.
4. Variable canvas per infographic (size and orientation set by content needs).
5. Be modifiable. Adding a new component type, new pattern, or new icon should be a localized change.

## 3. Non-goals

- Animation / video output. Static SVG / PNG only.
- Live editing UI. CLI only.
- Real-time preview server.
- Replacing `style-guide.md` or `curriculum.md`. Those stay as the editorial source of truth.
- Removing `/infographic` command tiers (piece / chapter / topic). Tier logic is unchanged.

## 4. Approach

### 4.1 High-level

A constraint-based code generator. Claude writes `layout.json` describing the infographic as a tree of typed nodes connected by anchors and edge-referenced connectors. A Bun TypeScript build script consumes `layout.json` and emits `infographic.svg`. The build fails loudly on any geometric or editorial violation.

Hybrid model: layout is JSON (catches the bug class), icons and custom illustrations stay as inline SVG assets in a library (preserves creative freedom for one-off visuals).

Pipeline:

```
layout.json
  -> Pass 1: Resolver  (anchors -> absolute coords + bbox + z-order + 8-pt snap)
  -> Pass 2: Validator (containment, text fit, text budgets, connector anchors,
                        depth coverage, density quota, grid alignment,
                        icon existence, sources cite)
  -> Pass 3: Emitter   (resolved tree -> SVG string)
infographic.svg
  -> scripts/svg-to-png.sh -> infographic.png
```

### 4.2 Why this approach

Considered alternatives:

- *Yoga / Flexbox auto-layout.* Solid for stacked panels and grids but cannot model sequence diagrams (absolute lifelines) or system diagrams (radial layouts). Adds a heavy WASM dep. Over-engineered for half the patterns.
- *Single-pass literal coordinates with post-hoc lint.* Claude still writes coordinates by hand, the linter catches errors after they exist. Same failure mode shifted later. Rejected.

The two-pass anchor model is chosen because:

- Connector endpoints become physically impossible to drift: the schema forces `from: "#node-id:edge"`. Literal coordinates have no place to go.
- The bbox computation is a function of the schema, not of Claude's attention.
- Failures point at a specific JSON node with a specific reason, so the fix is a small JSON edit, not a hunt across SVG path data.

## 5. Runtime and tooling

- **Runtime:** Bun. Already installed locally. Runs TypeScript directly with no build step. Includes `bun:test` for test running.
- **Deps inside `scripts/build/package.json`:**
  - `zod` for schema validation (single dependency, no transitive bloat).
  - Optional later: `sharp` for PNG export inside the same process (currently shell script suffices).
- **The repo root stays `package.json`-free.** The generator's `package.json` is scoped under `scripts/build/` so the repo-level `assets+Figma only` rule still holds for content; only the build tool has Node tooling.

## 6. Data model

### 6.1 Top-level

```ts
type Layout = {
  meta: {
    slug: string;
    title: string;                       // <= 60 chars
    tier: "piece" | "chapter-piece" | "topic-chapter-piece";
    pillars: Pillar[];                   // from curriculum.md
    depth: {                             // all four mandatory
      mechanism: NodeRef;                // must NOT be text-class
      tradeoff: NodeRef;
      failure_mode: NodeRef;             // must NOT be text-class
      numbers: NodeRef;
    };
    sources: string[];                   // URLs; brand icons require attribution here
  };
  canvas: {
    w: number;                           // >= 800, divisible by 8
    h: number;                           // >= 600, divisible by 8
    mode: "light-pastel" | "dark-poster";
    pattern: "vertical-explainer" | "two-column" | "sequence"
           | "multi-panel-grid" | "system-diagram" | "before-after";
    auto_grow?: boolean;                 // expand h if children overflow (with warning)
  };
  title_bar?: { headline: string; wordmark?: boolean };
  nodes: Node[];
};
```

`NodeRef` is `"#<id>"` for a whole node, or `"#<id>:<edge>"` for a connector endpoint. Valid edges: `top`, `right`, `bottom`, `left`, `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`.

### 6.2 Node types (discriminated union)

```ts
type Node =
  | Panel | Card | StepLabel | TextElement
  | Icon | Illustration | Connector
  | LifeLine | Message                   // sequence pattern
  | Matrix2x2 | TimelineBar              // tradeoff / latency budget
  | Misconception;                       // red callout
```

Selected schemas:

```ts
type Panel = {
  type: "panel"; id: string;
  theme: "lilac" | "mint" | "peach" | "sky" | "rose"
       | "forest" | "plum" | "navy" | "maroon" | "olive" | "sienna";
  title: string;                         // <= 24 chars, pill content
  anchor: Anchor;
  size?: [number, number] | "fill" | "auto";
};

type Card = {
  type: "card"; id: string;
  parent: NodeRef;                       // must be a panel
  variant?: "default" | "yellow-note" | "highlight";
  anchor: Anchor;
  size?: [number, number] | "auto";
  children?: NodeRef[];
};

type StepLabel = {
  type: "step"; id: string;
  n: number;
  label: string;                         // <= 32 chars
  anchor: Anchor;                        // typically above-left of a card
};

type TextElement = {
  type: "text"; id: string;
  parent: NodeRef;
  class: "headline" | "panel-title" | "sub-label"
       | "body" | "caption" | "annot" | "step-label";
  text: string;
  multiline?: string[];
  align?: "start" | "center" | "end";
};

type Icon = {
  type: "icon"; id: string;
  parent: NodeRef;
  name: string;                          // "generic:server", "brand:postgres", "custom:dom-tree"
  size: number | [number, number];
  anchor: Anchor;
  label?: string;                        // <= 24 chars, under icon
};

type Illustration = {
  type: "illustration"; id: string;
  parent: NodeRef;
  name: string;                          // custom:* namespace
  size: [number, number];
  anchor: Anchor;
};

type Connector = {
  type: "connector"; id: string;
  from: NodeRef;                         // must include edge, e.g. "#cssom:right"
  to: NodeRef;                           // must include edge
  style?: "dashed" | "solid";
  color?: "neutral" | "green" | "orange" | "red" | "blue";
  label?: string;                        // <= 40 chars, drawn on white chip
  label_pos?: "mid" | "start" | "end";
  route?: "straight" | "orthogonal" | "curve";
  via?: NodeRef[];                       // optional waypoints
  break_for?: NodeRef;                   // generator splits the path at the node's x range
};

type LifeLine = {
  type: "lifeline"; id: string;
  parent: NodeRef;                       // sequence-pattern panel
  header: { name: string; sub?: string; icon?: string };
  x?: number | { eq_spaced: true };      // when eq_spaced, generator distributes
};

type Message = {
  type: "message"; id: string;
  from: NodeRef;                         // lifeline id
  to: NodeRef;                           // lifeline id
  t: number;                             // 0..1 along sequence y axis
  label: string;                         // <= 60 chars
  time?: string;                         // <= 20 chars, monospace
  style?: "solid" | "dashed-async" | "dashed-response";
};

type Matrix2x2 = {
  type: "matrix2x2"; id: string;
  parent: NodeRef;
  anchor: Anchor;
  size?: [number, number] | "auto";
  axes: { x: [string, string]; y: [string, string] };   // labels per axis end
  cells: { tl: string; tr: string; bl: string; br: string };  // <= 32 chars each
};

type TimelineBar = {
  type: "timeline-bar"; id: string;
  parent: NodeRef;
  anchor: Anchor;
  axis_ms: { min: number; max: number; step: number };
  rows: Array<{
    label: string;                       // <= 40 chars
    segments: Array<{ color: "blue"|"orange"|"green"|"red"; ms: number; label?: string }>;
    markers?: Array<{ t_ms: number; label: string; color?: string }>;
  }>;
};

type Misconception = {
  type: "misconception"; id: string;
  parent: NodeRef;
  text: string;                          // <= 100 chars total, max 2 lines
};
```

### 6.3 Anchor language

No literal `x`/`y` for layout nodes. Only:

```ts
type Anchor =
  | { in: NodeRef; pad?: number; side?: "top-left" | "top-center" | "top-right"
                                       | "center" | "bottom-left" | "bottom-center" | "bottom-right" }
  | { after: NodeRef; gap?: number; axis?: "x" | "y" }
  | { below: NodeRef; gap?: number }
  | { right_of: NodeRef; gap?: number }
  | { between: [NodeRef, NodeRef]; t?: number }   // midline lerp
  | { grid: { cols: number; rows: number; cell: [r: number, c: number] } };
```

Connectors do not use `anchor`. They use `from` and `to` exclusively, each pointing to a node edge.

### 6.4 Text budgets

| Class | Max chars | Max lines |
|-------|-----------|-----------|
| `headline` | 60 | 1 |
| `panel-title` | 24 | 1 |
| `sub-label` | 24 | 1 |
| `step-label` | 32 | 1 |
| `body` | 80 per line | 3 |
| `caption` | 80 per line | 2 |
| `annot` (monospace) | 40 | 1 |
| `misconception` | 100 total | 2 |

Validator rejects overruns. The fix is either to refactor the content into a visual element or split the text into multiple sibling nodes.

### 6.5 Density rules

- *Visual density quota.* The validator computes non-text area (panels with their visual children, icons, illustrations, matrices, timelines, sequence/system geometry) as a fraction of canvas area. Below 40% triggers a warning recommending visual replacement of prose.
- *Numbers per panel.* Every panel must contain at least one numeric annotation (`annot` class). Warning if missing.
- *Depth checkpoints are visual.* `meta.depth.mechanism` and `meta.depth.failure_mode` must reference a non-text node (`sequence` group, `matrix2x2`, `timeline-bar`, `illustration`, `misconception`, or a `connector` group). Plain text cannot fulfill these checkpoints.

## 7. Pipeline details

### 7.1 Pass 1: Resolver

1. Parse JSON with zod schema. Schema errors are first-class build failures.
2. Topologically sort nodes by anchor dependency. Throw on cycles.
3. Walk in order, computing each node's bbox:
   - Bbox depends on anchor type and the resolved bbox of its referenced sibling / parent.
   - `size: "auto"` means the bbox wraps the node's resolved children plus padding.
   - `lifeline` with `eq_spaced: true` participates after siblings are known, x is distributed evenly across the parent panel inner width.
   - `message.t` lerps within the panel's vertical message band (panel inner top + header allowance to panel inner bottom).
4. Snap every coordinate to multiples of 8. Record snapped vs original for the grid-align rule.
5. Assign z-order: `panel = 0`, `card = 10`, `lifeline = 15`, `icon = 20`, `text = 30`, `message = 35`, `connector = 40`. Authors can override with an explicit `z` field on a node.
6. Compute connector endpoint coordinates from `from`/`to` node bboxes plus edge keyword.
7. For each connector with `break_for`, compute the gap span along the path (the x range of the break target) and store it for the emitter.

### 7.2 Pass 2: Validator

Each rule is a pure function `(tree: ResolvedTree) => Issue[]`. All rules run; errors abort the build, warnings do not.

| Rule | Severity | What it catches |
|------|----------|-----------------|
| `containment` | error | Child bbox exceeds parent bbox on any side. |
| `text-fit` | error | Estimated text width exceeds container inner width (font metrics from `fonts/metrics.ts`). |
| `text-budget` | error | Char count or line count exceeds class budget. |
| `connector-anchor` | error | `from` or `to` is a literal coord or missing an edge. |
| `depth-coverage` | error | One of the four `meta.depth` refs is missing or points at a text-class node when forbidden. |
| `numbers-per-panel` | warning | A panel contains zero `annot`-class children with numeric content. |
| `density-quota` | warning | Non-text fraction below 40%. |
| `grid-align` | warning | Any computed coord not divisible by 8. |
| `icon-exists` | error | Icon `name` not in registry / file missing. |
| `sources-cite` | warning | Brand icon used but its canonical attribution URL not present in `meta.sources`. |
| `no-cycle` | error | Anchor dependency cycle (raised during resolver but reported as a validator error for consistency). |

Error format aims for one-shot fixability:

```
[error] text-fit
  node: #text-tls13 (class=annot)
  text: "TLS 1.3 ...... 1 RTT (0-RTT resume)"
  est width: 272 px (34 chars * 8 px monospace)
  container: #card-timings, inner width 220 px (240 - 2*10 padding)
  fix:
    1. Shorten text to <=27 chars
    2. Resize container to >=290 px width
    3. Move text outside the card
```

### 7.3 Pass 3: Emitter

The emitter walks the resolved tree and produces SVG. One function per node type. Inline icons are read from `templates/icons/<namespace>/<name>.svg` and wrapped in a `<g transform="translate scale">`. Cached per file path.

Connectors with `break_for` are rendered as two `<path>` segments around the break span; the target node is drawn in the gap. Arrowhead is attached to whichever segment ends at `to`.

Output is a single SVG string written to `infographics/<slug>/infographic.svg`. The file is overwritten on every successful build.

## 8. Icon library

Three tiers, namespaced:

```
templates/icons/
  generic/        # custom drawings in ByteByteGo chunky style
  brand/          # sourced from Simple Icons or vendor press kits
  custom/         # one-off illustrations per topic
```

JSON references use `"<namespace>:<name>"`:

```json
{ "type": "icon",          "name": "generic:server",   "size": 80, ... }
{ "type": "icon",          "name": "brand:postgres",   "size": 48, ... }
{ "type": "illustration",  "name": "custom:dom-tree",  "size": [400, 200], ... }
```

A `registry.ts` enumerates each icon with metadata: `file`, `viewBox`, `license`, `source` (URL where the brand asset came from). Validator rule `icon-exists` checks against the registry.

Brand fetch script (`scripts/build/src/icons/fetch-brand.ts`) takes a list of slugs, downloads SVG from `https://cdn.simpleicons.org/<slug>`, writes to `templates/icons/brand/<slug>.svg`, and updates `registry.ts` with the source URL.

Legal note appended to `style-guide.md`: brand icons are used under nominative fair use for editorial reference. Each infographic's `meta.sources` includes the canonical URL for any brand icon used.

## 9. /infographic command refactor

The command keeps its tier system (piece / chapter / topic) but rewrites the per-piece pipeline:

```
For each piece:
  1. WebSearch research (3-5 queries).
  2. Write spec.md (depth checkpoints listed by future node id).
  3. Write data.json (facts, numbers, sources).
  4. Write layout.json. Resolve icon names; if a brand icon is missing,
     run `bun scripts/build/src/icons/fetch-brand.ts <slug>` first.
  5. Run `bun scripts/build/src/cli.ts <slug>/layout.json`.
     - On validator error: read the error, edit layout.json, retry. Max 5 cycles.
     - On 5th failure: record the blocking error in spec.md `Notes` and escalate.
  6. Run `bash scripts/svg-to-png.sh <slug>/infographic.svg`.
```

Critical rule, written into the command body: Claude must never edit `infographic.svg` directly. It is a build artifact derived from `layout.json`.

## 10. File structure (final)

```
.claude/commands/infographic.md           # refactored
scripts/
  build/
    package.json
    tsconfig.json
    src/
      cli.ts schema.ts
      resolver/{index.ts, anchors.ts, bbox.ts, grid.ts, zorder.ts}
      validator/{index.ts, rules/{containment.ts, text-fit.ts, text-budget.ts,
                                  connector-anchor.ts, depth-coverage.ts,
                                  numbers-per-panel.ts, density-quota.ts,
                                  grid-align.ts, icon-exists.ts, sources-cite.ts}}
      emitter/{index.ts, panel.ts, card.ts, step.ts, icon.ts, connector.ts,
               lifeline.ts, message.ts, matrix.ts, timeline.ts,
               misconception.ts, text.ts}
      icons/{registry.ts, fetch-brand.ts}
      fonts/metrics.ts
      test/*.test.ts
  svg-to-png.sh                            # unchanged
templates/
  icons/{generic/, brand/, custom/}
  layout.schema.json                       # generated from zod for editor IntelliSense
infographics/
  <slug>/{spec.md, data.json, layout.json, infographic.svg}
assets/exports/<slug>/infographic.png
style-guide.md                             # editorial reference, gains a brand-icon section
curriculum.md                              # unchanged
CLAUDE.md                                  # gains a layout.json section
docs/superpowers/specs/
  2026-05-12-visual-qa-system-design.md    # this document
drafts/google-com-query/                   # existing hand-written drafts, kept as visual reference
```

## 11. Testing

`bun test` inside `scripts/build/`.

1. *Schema tests.* zod parse on hand-crafted valid and invalid JSON snippets. One positive + one negative per rule.
2. *Resolver tests.* Minimal inputs (two panels with `after` anchor, etc), assert resolved bboxes.
3. *Validator tests.* Each rule has a test file. Build a resolved tree that violates the rule, assert the issue payload.
4. *Golden SVG tests.* Fixture directories under `test/fixtures/`. Each contains `layout.json` plus `golden.svg`. The test runs the full pipeline and compares strings. Coverage:
   - One per composition pattern (6 fixtures).
   - One per bug regression from `v1-bbg-flow` (4 fixtures, named `regression-image-3` etc).
   - One tall portrait canvas (`1200x1800`).
5. *CLI integration.* Run binary on each fixture, assert exit code 0 on valid, non-zero with structured stderr on invalid.

`bun test` is run manually before any change to `scripts/build/` lands. No automated git hook is configured in this iteration.

## 12. Migration

- All existing files under `drafts/google-com-query/` stay in place. They serve as visual reference and provide expected output for the rewrite step below.
- Once the generator is ready, rewrite `v1-bbg-flow` as `layout.json` and rebuild. Diff visually against the existing PNG to confirm parity.
- None of the hand-written SVGs are used as test fixtures, because they contain the bugs the generator must prevent. Test fixtures are authored from scratch as part of the test suite.

## 13. Failure modes the system guards against

| Bug from session | Why the schema kills it |
|------------------|--------------------------|
| Text overflow past panel | `text-budget` + `text-fit` validator rules |
| Icon visually broken by arrow underneath | `connector.break_for` plus emitter split-around-target |
| Connector starts inside source box | `connector-anchor` rule requires `#id:edge`, edge resolves to actual bbox edge |
| Cross-panel connector lands in empty space | same rule, plus optional `via` waypoints with bbox checks |
| Wall of text replacing a diagram | `density-quota` warning + `depth-coverage` blocks text-class checkpoints |
| Mismatched canvas size | `canvas.w/h` declared per layout, validator enforces divisibility and minimums |

## 14. Open questions

None remaining from the brainstorm. Listed for future enhancement only:

- Should `auto_grow: true` be the default? Currently opt-in.
- Should `infographic.svg` be gitignored (build artifact) or tracked (review-friendly)? Currently tracked.
- Should we eventually move `.json` schema generation into a pre-commit step so editors get inline IntelliSense?

## 15. Implementation plan

Out of scope for this document. Will be produced by the writing-plans skill in the next step.
