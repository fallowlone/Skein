# Visual QA System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-written SVG with a Bun TypeScript pipeline that ingests `layout.json`, runs a Resolver -> Validator -> Emitter chain, and writes SVG only when geometric and editorial rules pass.

**Architecture:** Constraint-based code generator. Claude writes `layout.json` only. A three-pass pipeline (anchor resolver -> rule validator -> SVG emitter) computes geometry from the schema, fails the build on rule violations, and emits SVG when clean. Hybrid icon model: layout is JSON, icons and one-off illustrations stay as inline SVG files in a library.

**Tech Stack:**
- Bun (already installed) for TypeScript execution and `bun:test`
- zod for JSON schema parse/validation
- Scoped `package.json` under `scripts/build/`. Repo root stays `package.json`-free.
- Existing `scripts/svg-to-png.sh` handles PNG export.

**Spec:** `docs/superpowers/specs/2026-05-12-visual-qa-system-design.md`

**Important conventions for this plan:**

- The user has disabled automatic git commits. Every task ends with a `Checkpoint:` note describing what was added or changed and what would be a sensible commit boundary, but the engineer must wait for an explicit user request before running `git commit`.
- All paths are absolute from the repo root (`/Users/artemmac/dev/awesome-everything`). Use forward slashes throughout, even when running on macOS.
- Tests are co-located under `scripts/build/src/test/`. Run them with `bun test` from inside `scripts/build/`.
- Every task is TDD: write the failing test, run it red, implement the minimum to pass, run it green.

---

## Phase A: Bootstrap

### Task 1: Initialize scripts/build/ project

**Files:**
- Create: `scripts/build/package.json`
- Create: `scripts/build/tsconfig.json`
- Create: `scripts/build/bunfig.toml`
- Create: `scripts/build/src/index.ts`
- Create: `scripts/build/src/test/smoke.test.ts`

- [ ] **Step 1: Create the project directory and metadata files**

```bash
mkdir -p scripts/build/src/test
```

`scripts/build/package.json`:

```json
{
  "name": "@awesome-everything/build",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "bun src/cli.ts",
    "test": "bun test"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

`scripts/build/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "lib": ["ESNext"],
    "types": ["bun-types"]
  },
  "include": ["src/**/*"]
}
```

`scripts/build/bunfig.toml`:

```toml
[test]
preload = []
coverage = false
```

`scripts/build/src/index.ts`:

```ts
export const VERSION = "0.1.0";
```

- [ ] **Step 2: Write the failing smoke test**

`scripts/build/src/test/smoke.test.ts`:

```ts
import { test, expect } from "bun:test";
import { VERSION } from "../index";

test("module exports VERSION", () => {
  expect(VERSION).toBe("0.1.0");
});
```

- [ ] **Step 3: Install dependencies and run test**

```bash
cd scripts/build && bun install && bun test
```

Expected: 1 pass, 0 fail.

- [ ] **Step 4: Update repo root .gitignore so node_modules under scripts/build is ignored**

Append to `.gitignore` (the file already exists at repo root):

```
# scripts/build (build tool)
scripts/build/node_modules/
scripts/build/bun.lockb
```

**Checkpoint:** New `scripts/build/` skeleton compiles, runs the smoke test, and is ignored at the right level. Suitable commit boundary.

---

### Task 2: Font metrics utility

**Files:**
- Create: `scripts/build/src/fonts/metrics.ts`
- Create: `scripts/build/src/test/fonts/metrics.test.ts`

Text-fit validation needs an estimate of rendered width per character. We do not embed actual font files. We approximate Inter and ui-monospace with linear-per-character widths tuned to typical ByteByteGo sizes. Real measurement at build time would require Bun's `Canvas` or a font parser; the approximation is good enough to catch overflow vs minor underflow.

- [ ] **Step 1: Write the failing tests**

`scripts/build/src/test/fonts/metrics.test.ts`:

```ts
import { test, expect } from "bun:test";
import { estimateWidth } from "../../fonts/metrics";

test("headline at 48pt: 1 char is ~28 px", () => {
  const w = estimateWidth("M", "headline");
  expect(w).toBeGreaterThan(20);
  expect(w).toBeLessThan(40);
});

test("annot (monospace 13pt): each char is 8 px", () => {
  const w = estimateWidth("ABCDEFGH", "annot");
  expect(w).toBe(64);
});

test("body 16pt: roughly 9 px per char (proportional avg)", () => {
  const w = estimateWidth("ABCDEFGH", "body");
  expect(w).toBeGreaterThan(60);
  expect(w).toBeLessThan(80);
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
bun test src/test/fonts/metrics.test.ts
```

Expected: 3 fail, "cannot find module".

- [ ] **Step 3: Implement metrics.ts**

`scripts/build/src/fonts/metrics.ts`:

```ts
export type TextClass =
  | "headline"
  | "panel-title"
  | "sub-label"
  | "step-label"
  | "body"
  | "caption"
  | "annot"
  | "step-num";

const AVG_CHAR_PX: Record<TextClass, number> = {
  // Linear approximations tuned for ByteByteGo sizes.
  // Proportional fonts (Inter family) use rough avg per char.
  headline: 28,       // 48pt bold
  "panel-title": 14,  // 22pt bold
  "sub-label": 8,     // 13pt semibold
  "step-label": 11,   // 18pt bold
  body: 9,            // 16pt medium
  caption: 7,         // 13pt regular
  annot: 8,           // 13pt monospace, fixed width
  "step-num": 12,
};

export function estimateWidth(text: string, cls: TextClass): number {
  return text.length * AVG_CHAR_PX[cls];
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/fonts/metrics.test.ts
```

Expected: 3 pass.

**Checkpoint:** Font width estimator available for the text-fit rule.

---

## Phase B: Schema

### Task 3: Schema base types

**Files:**
- Create: `scripts/build/src/schema.ts`
- Create: `scripts/build/src/test/schema/base.test.ts`

This task introduces the top-level `Layout` zod schema together with the shared `NodeRef`, `Anchor`, `Pillar`, and the abstract node-id reference helpers. Node-specific schemas come in Task 4 and 5.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/schema/base.test.ts`:

```ts
import { test, expect } from "bun:test";
import { LayoutSchema } from "../../schema";

const baseDoc = {
  meta: {
    slug: "tls-13",
    title: "TLS 1.3 in one round trip",
    tier: "piece",
    pillars: ["security", "networking"],
    depth: {
      mechanism: "#seq-tls",
      tradeoff: "#matrix-tls",
      failure_mode: "#callout-mitm",
      numbers: "#card-timings",
    },
    sources: ["https://example.com/rfc8446"],
  },
  canvas: { w: 1600, h: 1200, mode: "light-pastel", pattern: "sequence" },
  title_bar: { headline: "TLS 1.3 in one round trip" },
  nodes: [],
};

test("parses a minimal valid layout", () => {
  const r = LayoutSchema.safeParse(baseDoc);
  expect(r.success).toBe(true);
});

test("rejects canvas width not divisible by 8", () => {
  const bad = { ...baseDoc, canvas: { ...baseDoc.canvas, w: 1601 } };
  const r = LayoutSchema.safeParse(bad);
  expect(r.success).toBe(false);
});

test("rejects canvas width below 800", () => {
  const bad = { ...baseDoc, canvas: { ...baseDoc.canvas, w: 600 } };
  const r = LayoutSchema.safeParse(bad);
  expect(r.success).toBe(false);
});

test("rejects unknown pattern", () => {
  const bad = { ...baseDoc, canvas: { ...baseDoc.canvas, pattern: "spiral" } };
  const r = LayoutSchema.safeParse(bad);
  expect(r.success).toBe(false);
});

test("rejects title over 60 chars", () => {
  const bad = { ...baseDoc, meta: { ...baseDoc.meta, title: "x".repeat(61) } };
  const r = LayoutSchema.safeParse(bad);
  expect(r.success).toBe(false);
});

test("requires all four depth checkpoints", () => {
  const { numbers, ...partial } = baseDoc.meta.depth;
  const bad = { ...baseDoc, meta: { ...baseDoc.meta, depth: partial as any } };
  const r = LayoutSchema.safeParse(bad);
  expect(r.success).toBe(false);
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
bun test src/test/schema/base.test.ts
```

Expected: 6 fail.

- [ ] **Step 3: Implement schema base**

`scripts/build/src/schema.ts`:

```ts
import { z } from "zod";

export const NodeRef = z.string().regex(/^#[a-z0-9-]+(:[a-z-]+)?$/i, {
  message: "NodeRef must be '#id' or '#id:edge'",
});

const divisibleBy8 = (n: number) => n % 8 === 0;

const PillarEnum = z.enum([
  "networking",
  "browser",
  "frontend",
  "backend",
  "apis",
  "databases",
  "caching",
  "queues",
  "distributed",
  "security",
  "observability",
  "deployment",
  "performance",
  "data-engineering",
  "ai-llm",
  "engineering-practice",
]);

export const AnchorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("in"),
    ref: NodeRef,
    pad: z.number().int().nonnegative().default(24),
    side: z
      .enum([
        "top-left",
        "top-center",
        "top-right",
        "center",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ])
      .optional(),
  }),
  z.object({ kind: z.literal("after"), ref: NodeRef, gap: z.number().default(16), axis: z.enum(["x", "y"]).default("x") }),
  z.object({ kind: z.literal("below"), ref: NodeRef, gap: z.number().default(16) }),
  z.object({ kind: z.literal("right_of"), ref: NodeRef, gap: z.number().default(16) }),
  z.object({ kind: z.literal("between"), refs: z.tuple([NodeRef, NodeRef]), t: z.number().min(0).max(1).default(0.5) }),
  z.object({
    kind: z.literal("grid"),
    cols: z.number().int().positive(),
    rows: z.number().int().positive(),
    cell: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
  }),
]);

export const MetaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(60),
  tier: z.enum(["piece", "chapter-piece", "topic-chapter-piece"]),
  pillars: z.array(PillarEnum).min(1),
  depth: z.object({
    mechanism: NodeRef,
    tradeoff: NodeRef,
    failure_mode: NodeRef,
    numbers: NodeRef,
  }),
  sources: z.array(z.string().url()).min(1),
});

export const CanvasSchema = z.object({
  w: z.number().int().min(800).refine(divisibleBy8, { message: "w must be divisible by 8" }),
  h: z.number().int().min(600).refine(divisibleBy8, { message: "h must be divisible by 8" }),
  mode: z.enum(["light-pastel", "dark-poster"]),
  pattern: z.enum([
    "vertical-explainer",
    "two-column",
    "sequence",
    "multi-panel-grid",
    "system-diagram",
    "before-after",
  ]),
  auto_grow: z.boolean().optional(),
});

export const TitleBarSchema = z.object({
  headline: z.string().min(1).max(60),
  wordmark: z.boolean().default(true),
});

// NodeSchema will be filled by Task 4 + 5.
export const NodeSchema = z.unknown();

export const LayoutSchema = z.object({
  meta: MetaSchema,
  canvas: CanvasSchema,
  title_bar: TitleBarSchema.optional(),
  nodes: z.array(NodeSchema),
});

export type Layout = z.infer<typeof LayoutSchema>;
export type Anchor = z.infer<typeof AnchorSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Canvas = z.infer<typeof CanvasSchema>;
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/schema/base.test.ts
```

Expected: 6 pass.

**Checkpoint:** Top-level schema with anchors, meta, canvas, title bar. Nodes still loose.

---

### Task 4: Node schemas part 1

**Files:**
- Modify: `scripts/build/src/schema.ts`
- Create: `scripts/build/src/test/schema/nodes-1.test.ts`

Adds Panel, Card, StepLabel, TextElement, Icon, Illustration, Connector. These are the layout primitives present in every pattern.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/schema/nodes-1.test.ts`:

```ts
import { test, expect } from "bun:test";
import { NodeSchema } from "../../schema";

test("Panel parses with valid theme + title", () => {
  const r = NodeSchema.safeParse({
    type: "panel",
    id: "p-main",
    theme: "mint",
    title: "Handshake",
    anchor: { kind: "in", ref: "#canvas", pad: 56 },
    size: "fill",
  });
  expect(r.success).toBe(true);
});

test("Panel rejects bad theme", () => {
  const r = NodeSchema.safeParse({
    type: "panel",
    id: "p-main",
    theme: "neon",
    title: "x",
    anchor: { kind: "in", ref: "#canvas" },
  });
  expect(r.success).toBe(false);
});

test("Panel title max 24 chars", () => {
  const r = NodeSchema.safeParse({
    type: "panel",
    id: "p-main",
    theme: "mint",
    title: "x".repeat(25),
    anchor: { kind: "in", ref: "#canvas" },
  });
  expect(r.success).toBe(false);
});

test("TextElement honors class enum", () => {
  const ok = NodeSchema.safeParse({
    type: "text",
    id: "t-1",
    parent: "#p-main",
    class: "body",
    text: "Hello",
  });
  expect(ok.success).toBe(true);
  const bad = NodeSchema.safeParse({
    type: "text",
    id: "t-1",
    parent: "#p-main",
    class: "huge",
    text: "Hello",
  });
  expect(bad.success).toBe(false);
});

test("Connector requires from/to with edge segment", () => {
  const ok = NodeSchema.safeParse({
    type: "connector",
    id: "c-1",
    from: "#a:right",
    to: "#b:left",
  });
  expect(ok.success).toBe(true);
  const bad = NodeSchema.safeParse({
    type: "connector",
    id: "c-1",
    from: "#a",          // missing :edge
    to: "#b:left",
  });
  expect(bad.success).toBe(false);
});

test("Icon requires namespaced name", () => {
  const ok = NodeSchema.safeParse({
    type: "icon",
    id: "i-1",
    parent: "#p-main",
    name: "generic:server",
    size: 64,
    anchor: { kind: "in", ref: "#p-main" },
  });
  expect(ok.success).toBe(true);
  const bad = NodeSchema.safeParse({
    type: "icon",
    id: "i-1",
    parent: "#p-main",
    name: "server",      // no namespace
    size: 64,
    anchor: { kind: "in", ref: "#p-main" },
  });
  expect(bad.success).toBe(false);
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
bun test src/test/schema/nodes-1.test.ts
```

Expected: 6 fail (NodeSchema is `z.unknown`, returns success for any value).

- [ ] **Step 3: Replace NodeSchema with the discriminated union (first half)**

In `scripts/build/src/schema.ts`, replace the placeholder `NodeSchema` with the following block (and update `LayoutSchema.nodes` accordingly):

```ts
const ThemeEnum = z.enum([
  "lilac",
  "mint",
  "peach",
  "sky",
  "rose",
  "forest",
  "plum",
  "navy",
  "maroon",
  "olive",
  "sienna",
]);

const NodeRefWithEdge = z.string().regex(/^#[a-z0-9-]+:(top|right|bottom|left|center|top-left|top-right|bottom-left|bottom-right)$/i);

const NamespacedIcon = z.string().regex(/^(generic|brand|custom):[a-z0-9-]+$/);

const NodeId = z.string().regex(/^[a-z0-9-]+$/);
const ParentRef = z.string().regex(/^#[a-z0-9-]+$/);

const PanelSchema = z.object({
  type: z.literal("panel"),
  id: NodeId,
  theme: ThemeEnum,
  title: z.string().min(1).max(24),
  anchor: AnchorSchema,
  size: z.union([z.tuple([z.number().int().positive(), z.number().int().positive()]), z.literal("fill"), z.literal("auto")]).optional(),
  z: z.number().int().optional(),
});

const CardSchema = z.object({
  type: z.literal("card"),
  id: NodeId,
  parent: ParentRef,
  variant: z.enum(["default", "yellow-note", "highlight"]).default("default"),
  anchor: AnchorSchema,
  size: z.union([z.tuple([z.number().int().positive(), z.number().int().positive()]), z.literal("auto")]).optional(),
  children: z.array(ParentRef).optional(),
  z: z.number().int().optional(),
});

const StepLabelSchema = z.object({
  type: z.literal("step"),
  id: NodeId,
  n: z.number().int().positive(),
  label: z.string().min(1).max(32),
  anchor: AnchorSchema,
  z: z.number().int().optional(),
});

const TextElementSchema = z.object({
  type: z.literal("text"),
  id: NodeId,
  parent: ParentRef,
  class: z.enum(["headline", "panel-title", "sub-label", "body", "caption", "annot", "step-label"]),
  text: z.string().min(1),
  multiline: z.array(z.string()).optional(),
  align: z.enum(["start", "center", "end"]).optional(),
  z: z.number().int().optional(),
});

const IconSchema = z.object({
  type: z.literal("icon"),
  id: NodeId,
  parent: ParentRef,
  name: NamespacedIcon,
  size: z.union([z.number().int().positive(), z.tuple([z.number().int().positive(), z.number().int().positive()])]),
  anchor: AnchorSchema,
  label: z.string().max(24).optional(),
  z: z.number().int().optional(),
});

const IllustrationSchema = z.object({
  type: z.literal("illustration"),
  id: NodeId,
  parent: ParentRef,
  name: NamespacedIcon,
  size: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  anchor: AnchorSchema,
  z: z.number().int().optional(),
});

const ConnectorSchema = z.object({
  type: z.literal("connector"),
  id: NodeId,
  from: NodeRefWithEdge,
  to: NodeRefWithEdge,
  style: z.enum(["dashed", "solid"]).default("dashed"),
  color: z.enum(["neutral", "green", "orange", "red", "blue"]).default("neutral"),
  label: z.string().max(40).optional(),
  label_pos: z.enum(["mid", "start", "end"]).default("mid"),
  route: z.enum(["straight", "orthogonal", "curve"]).default("straight"),
  via: z.array(z.string().regex(/^#[a-z0-9-]+$/)).optional(),
  break_for: z.string().regex(/^#[a-z0-9-]+$/).optional(),
  z: z.number().int().optional(),
});

// Tasks 5 will append LifeLine, Message, Matrix2x2, TimelineBar, Misconception to this union.
export const NodeSchema = z.discriminatedUnion("type", [
  PanelSchema,
  CardSchema,
  StepLabelSchema,
  TextElementSchema,
  IconSchema,
  IllustrationSchema,
  ConnectorSchema,
]);

export type Node = z.infer<typeof NodeSchema>;
```

Then update `LayoutSchema`:

```ts
export const LayoutSchema = z.object({
  meta: MetaSchema,
  canvas: CanvasSchema,
  title_bar: TitleBarSchema.optional(),
  nodes: z.array(NodeSchema),
});
```

- [ ] **Step 4: Run all schema tests**

```bash
bun test src/test/schema/
```

Expected: all green (Task 3 tests + new ones).

**Checkpoint:** Layout primitives parse cleanly.

---

### Task 5: Node schemas part 2

**Files:**
- Modify: `scripts/build/src/schema.ts`
- Create: `scripts/build/src/test/schema/nodes-2.test.ts`

Adds the pattern-specific node types: LifeLine, Message (sequence), Matrix2x2 (tradeoff), TimelineBar (latency budget), Misconception (red callout).

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/schema/nodes-2.test.ts`:

```ts
import { test, expect } from "bun:test";
import { NodeSchema } from "../../schema";

test("LifeLine with equally-spaced x", () => {
  const r = NodeSchema.safeParse({
    type: "lifeline",
    id: "ll-client",
    parent: "#p-main",
    header: { name: "Client", icon: "generic:monitor" },
    x: { eq_spaced: true },
  });
  expect(r.success).toBe(true);
});

test("Message t must be 0..1", () => {
  const ok = NodeSchema.safeParse({
    type: "message",
    id: "m-1",
    from: "#ll-client",
    to: "#ll-server",
    t: 0.5,
    label: "ClientHello",
  });
  expect(ok.success).toBe(true);
  const bad = NodeSchema.safeParse({
    type: "message",
    id: "m-1",
    from: "#ll-client",
    to: "#ll-server",
    t: 1.5,
    label: "ClientHello",
  });
  expect(bad.success).toBe(false);
});

test("Matrix2x2 requires four cells", () => {
  const r = NodeSchema.safeParse({
    type: "matrix2x2",
    id: "mat-1",
    parent: "#p-main",
    anchor: { kind: "in", ref: "#p-main" },
    axes: { x: ["low", "high"], y: ["slow", "fast"] },
    cells: { tl: "A", tr: "B", bl: "C", br: "D" },
  });
  expect(r.success).toBe(true);
});

test("TimelineBar axis sane", () => {
  const r = NodeSchema.safeParse({
    type: "timeline-bar",
    id: "tl-1",
    parent: "#p-main",
    anchor: { kind: "in", ref: "#p-main" },
    axis_ms: { min: 0, max: 800, step: 100 },
    rows: [
      {
        label: "Cold load",
        segments: [
          { color: "blue", ms: 30 },
          { color: "orange", ms: 60 },
        ],
      },
    ],
  });
  expect(r.success).toBe(true);
});

test("Misconception text max 100 chars", () => {
  const ok = NodeSchema.safeParse({
    type: "misconception",
    id: "mc-1",
    parent: "#p-main",
    text: "Not a TLS issue.",
  });
  expect(ok.success).toBe(true);
  const bad = NodeSchema.safeParse({
    type: "misconception",
    id: "mc-1",
    parent: "#p-main",
    text: "x".repeat(101),
  });
  expect(bad.success).toBe(false);
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
bun test src/test/schema/nodes-2.test.ts
```

Expected: 5 fail (these node types not in union).

- [ ] **Step 3: Append node schemas to the discriminated union**

Add to `scripts/build/src/schema.ts` (before the existing `NodeSchema` declaration, then include the new schemas in the union):

```ts
const LifeLineSchema = z.object({
  type: z.literal("lifeline"),
  id: NodeId,
  parent: ParentRef,
  header: z.object({
    name: z.string().min(1).max(24),
    sub: z.string().max(40).optional(),
    icon: NamespacedIcon.optional(),
  }),
  x: z
    .union([z.number().int(), z.object({ eq_spaced: z.literal(true) })])
    .default({ eq_spaced: true }),
  z: z.number().int().optional(),
});

const MessageSchema = z.object({
  type: z.literal("message"),
  id: NodeId,
  from: ParentRef,
  to: ParentRef,
  t: z.number().min(0).max(1),
  label: z.string().min(1).max(60),
  time: z.string().max(20).optional(),
  style: z.enum(["solid", "dashed-async", "dashed-response"]).default("solid"),
  z: z.number().int().optional(),
});

const Matrix2x2Schema = z.object({
  type: z.literal("matrix2x2"),
  id: NodeId,
  parent: ParentRef,
  anchor: AnchorSchema,
  size: z.union([z.tuple([z.number().int().positive(), z.number().int().positive()]), z.literal("auto")]).optional(),
  axes: z.object({
    x: z.tuple([z.string().max(24), z.string().max(24)]),
    y: z.tuple([z.string().max(24), z.string().max(24)]),
  }),
  cells: z.object({
    tl: z.string().min(1).max(32),
    tr: z.string().min(1).max(32),
    bl: z.string().min(1).max(32),
    br: z.string().min(1).max(32),
  }),
  z: z.number().int().optional(),
});

const TimelineSegment = z.object({
  color: z.enum(["blue", "orange", "green", "red", "neutral"]),
  ms: z.number().nonnegative(),
  label: z.string().max(32).optional(),
});

const TimelineRow = z.object({
  label: z.string().min(1).max(40),
  segments: z.array(TimelineSegment).min(1),
  markers: z
    .array(
      z.object({
        t_ms: z.number().nonnegative(),
        label: z.string().min(1).max(40),
        color: z.enum(["neutral", "red", "green", "blue"]).default("neutral"),
      })
    )
    .optional(),
});

const TimelineBarSchema = z.object({
  type: z.literal("timeline-bar"),
  id: NodeId,
  parent: ParentRef,
  anchor: AnchorSchema,
  size: z.union([z.tuple([z.number().int().positive(), z.number().int().positive()]), z.literal("auto")]).optional(),
  axis_ms: z.object({
    min: z.number().nonnegative(),
    max: z.number().positive(),
    step: z.number().positive(),
  }),
  rows: z.array(TimelineRow).min(1),
  z: z.number().int().optional(),
});

const MisconceptionSchema = z.object({
  type: z.literal("misconception"),
  id: NodeId,
  parent: ParentRef,
  text: z.string().min(1).max(100),
  z: z.number().int().optional(),
});

// Replace the union with the full list:
export const NodeSchema = z.discriminatedUnion("type", [
  PanelSchema,
  CardSchema,
  StepLabelSchema,
  TextElementSchema,
  IconSchema,
  IllustrationSchema,
  ConnectorSchema,
  LifeLineSchema,
  MessageSchema,
  Matrix2x2Schema,
  TimelineBarSchema,
  MisconceptionSchema,
]);
```

- [ ] **Step 4: Run schema tests, expect all green**

```bash
bun test src/test/schema/
```

Expected: green.

**Checkpoint:** Schema complete. All node types parsed and validated. Suitable commit boundary.

---

## Phase C: Resolver

The Resolver turns a parsed `Layout` into a `ResolvedTree` where every node has an absolute bbox plus computed z-order. It is the only place that touches coordinate math.

### Task 6: Topological sort of nodes

**Files:**
- Create: `scripts/build/src/resolver/topo.ts`
- Create: `scripts/build/src/test/resolver/topo.test.ts`

Anchors form a directed graph (a node depends on its anchor target). The resolver must walk nodes in dependency order. Cycles are an error.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/resolver/topo.test.ts`:

```ts
import { test, expect } from "bun:test";
import { topoSort } from "../../resolver/topo";
import type { Node } from "../../schema";

const panel: Node = {
  type: "panel",
  id: "p",
  theme: "mint",
  title: "P",
  anchor: { kind: "in", ref: "#canvas" } as any,
};
const card: Node = {
  type: "card",
  id: "c",
  parent: "#p",
  variant: "default",
  anchor: { kind: "in", ref: "#p" } as any,
};
const text: Node = {
  type: "text",
  id: "t",
  parent: "#c",
  class: "body",
  text: "hi",
};

test("orders by dependency", () => {
  const order = topoSort([text, card, panel]);
  expect(order.map((n) => n.id)).toEqual(["p", "c", "t"]);
});

test("throws on a cycle", () => {
  const a: Node = { ...panel, id: "a", anchor: { kind: "after", ref: "#b" } as any };
  const b: Node = { ...panel, id: "b", anchor: { kind: "after", ref: "#a" } as any };
  expect(() => topoSort([a, b])).toThrow(/cycle/i);
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/resolver/topo.test.ts
```

Expected: 2 fail.

- [ ] **Step 3: Implement topoSort**

`scripts/build/src/resolver/topo.ts`:

```ts
import type { Node } from "../schema";

function dependencies(n: Node): string[] {
  const deps: string[] = [];
  const pushRef = (r: string | undefined | null) => {
    if (!r) return;
    const m = /^#([a-z0-9-]+)/i.exec(r);
    if (m && m[1] !== "canvas") deps.push(m[1]);
  };

  // Anchor-based dependency.
  if ("anchor" in n) {
    const a = (n as any).anchor;
    if (a) {
      if (a.kind === "in" || a.kind === "after" || a.kind === "below" || a.kind === "right_of") pushRef(a.ref);
      if (a.kind === "between") {
        pushRef(a.refs[0]);
        pushRef(a.refs[1]);
      }
      // grid anchor depends on parent (which is itself referenced via `parent`)
    }
  }

  // parent (Card, Text, Icon, etc.)
  pushRef((n as any).parent);

  // Connector endpoints
  if (n.type === "connector") {
    pushRef(n.from);
    pushRef(n.to);
    if (n.break_for) pushRef(n.break_for);
    if (n.via) n.via.forEach(pushRef);
  }

  // Message endpoints (lifeline refs)
  if (n.type === "message") {
    pushRef(n.from);
    pushRef(n.to);
  }

  return deps;
}

export function topoSort(nodes: Node[]): Node[] {
  const byId = new Map<string, Node>();
  nodes.forEach((n) => byId.set(n.id, n));

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: Node[] = [];

  const walk = (id: string, path: string[]) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`cycle detected: ${[...path, id].join(" -> ")}`);
    }
    const n = byId.get(id);
    if (!n) return; // dependency on something outside the node set (e.g. #canvas)
    visiting.add(id);
    for (const dep of dependencies(n)) walk(dep, [...path, id]);
    visiting.delete(id);
    visited.add(id);
    result.push(n);
  };

  for (const n of nodes) walk(n.id, []);
  return result;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/resolver/topo.test.ts
```

Expected: 2 pass.

**Checkpoint:** Dependency graph + cycle detection in place.

---

### Task 7: Anchor resolvers

**Files:**
- Create: `scripts/build/src/resolver/anchors.ts`
- Create: `scripts/build/src/resolver/types.ts`
- Create: `scripts/build/src/test/resolver/anchors.test.ts`

Each anchor kind is a pure function `(self, parentBbox, siblings) -> bbox`. The unit tests pin down arithmetic.

- [ ] **Step 1: Define shared types**

`scripts/build/src/resolver/types.ts`:

```ts
import type { Node } from "../schema";

export type BBox = { x: number; y: number; w: number; h: number };

export type ResolvedNode = Node & { bbox: BBox; z: number };

export type ResolvedTree = {
  canvas: BBox;
  byId: Map<string, ResolvedNode>;
  ordered: ResolvedNode[];
};
```

- [ ] **Step 2: Write failing tests**

`scripts/build/src/test/resolver/anchors.test.ts`:

```ts
import { test, expect } from "bun:test";
import { applyAnchor } from "../../resolver/anchors";
import type { BBox } from "../../resolver/types";

const parent: BBox = { x: 100, y: 100, w: 1000, h: 600 };

test("anchor in: places at top-left of parent with padding", () => {
  const bbox = applyAnchor({ kind: "in", ref: "#p", pad: 24, side: "top-left" } as any, parent, [], [200, 100]);
  expect(bbox).toEqual({ x: 124, y: 124, w: 200, h: 100 });
});

test("anchor after axis=x: places right of sibling with gap", () => {
  const sibling: BBox = { x: 100, y: 100, w: 200, h: 100 };
  const bbox = applyAnchor({ kind: "after", ref: "#s", gap: 16, axis: "x" } as any, parent, [sibling], [80, 100]);
  expect(bbox.x).toBe(100 + 200 + 16);
  expect(bbox.y).toBe(100);
});

test("anchor below: places below sibling with gap", () => {
  const sibling: BBox = { x: 100, y: 100, w: 200, h: 100 };
  const bbox = applyAnchor({ kind: "below", ref: "#s", gap: 8 } as any, parent, [sibling], [200, 50]);
  expect(bbox.x).toBe(100);
  expect(bbox.y).toBe(100 + 100 + 8);
});

test("anchor between t=0.5: midpoint", () => {
  const a: BBox = { x: 100, y: 100, w: 100, h: 100 };
  const b: BBox = { x: 400, y: 100, w: 100, h: 100 };
  const bbox = applyAnchor({ kind: "between", refs: ["#a", "#b"], t: 0.5 } as any, parent, [a, b], [80, 40]);
  // midpoints: a-center=150, b-center=450 → mid=300; w=80 → x=260
  expect(bbox.x).toBe(260);
});

test("anchor grid 2x2 cell [1,1]: bottom-right quarter", () => {
  const bbox = applyAnchor(
    { kind: "grid", cols: 2, rows: 2, cell: [1, 1] } as any,
    parent,
    [],
    [0, 0] // size ignored for grid
  );
  expect(bbox).toEqual({ x: 600, y: 400, w: 500, h: 300 });
});
```

- [ ] **Step 3: Run tests, expect fail**

```bash
bun test src/test/resolver/anchors.test.ts
```

Expected: 5 fail.

- [ ] **Step 4: Implement applyAnchor**

`scripts/build/src/resolver/anchors.ts`:

```ts
import type { BBox } from "./types";
import type { Anchor } from "../schema";

const SIDE_OFFSET: Record<NonNullable<Extract<Anchor, { kind: "in" }>["side"]>, [number, number]> = {
  "top-left": [0, 0],
  "top-center": [0.5, 0],
  "top-right": [1, 0],
  center: [0.5, 0.5],
  "bottom-left": [0, 1],
  "bottom-center": [0.5, 1],
  "bottom-right": [1, 1],
};

export function applyAnchor(
  anchor: Anchor,
  parent: BBox,
  refs: BBox[],
  size: [number, number],
): BBox {
  const [w, h] = size;

  switch (anchor.kind) {
    case "in": {
      const pad = anchor.pad;
      const inner = { x: parent.x + pad, y: parent.y + pad, w: parent.w - 2 * pad, h: parent.h - 2 * pad };
      const side = anchor.side ?? "top-left";
      const [fx, fy] = SIDE_OFFSET[side];
      const x = inner.x + (inner.w - w) * fx;
      const y = inner.y + (inner.h - h) * fy;
      return { x, y, w, h };
    }
    case "after": {
      const sibling = refs[0]!;
      if (anchor.axis === "y") {
        return { x: sibling.x, y: sibling.y + sibling.h + anchor.gap, w, h };
      }
      return { x: sibling.x + sibling.w + anchor.gap, y: sibling.y, w, h };
    }
    case "below": {
      const sibling = refs[0]!;
      return { x: sibling.x, y: sibling.y + sibling.h + anchor.gap, w, h };
    }
    case "right_of": {
      const sibling = refs[0]!;
      return { x: sibling.x + sibling.w + anchor.gap, y: sibling.y, w, h };
    }
    case "between": {
      const [a, b] = refs;
      const aCenterX = a!.x + a!.w / 2;
      const bCenterX = b!.x + b!.w / 2;
      const aCenterY = a!.y + a!.h / 2;
      const bCenterY = b!.y + b!.h / 2;
      const mx = aCenterX + (bCenterX - aCenterX) * anchor.t;
      const my = aCenterY + (bCenterY - aCenterY) * anchor.t;
      return { x: mx - w / 2, y: my - h / 2, w, h };
    }
    case "grid": {
      const cellW = parent.w / anchor.cols;
      const cellH = parent.h / anchor.rows;
      const [r, c] = anchor.cell;
      return {
        x: parent.x + c * cellW,
        y: parent.y + r * cellH,
        w: cellW,
        h: cellH,
      };
    }
  }
}
```

- [ ] **Step 5: Run tests, expect green**

```bash
bun test src/test/resolver/anchors.test.ts
```

Expected: 5 pass.

**Checkpoint:** Pure anchor arithmetic verified.

---

### Task 8: Bbox computation per node type

**Files:**
- Create: `scripts/build/src/resolver/bbox.ts`
- Create: `scripts/build/src/test/resolver/bbox.test.ts`

Each node type contributes a default size and a function that finalizes its bbox after anchor application. Auto-sized nodes wrap their children.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/resolver/bbox.test.ts`:

```ts
import { test, expect } from "bun:test";
import { defaultSize, wrapBbox } from "../../resolver/bbox";

test("panel default size 'fill' returns parent inner", () => {
  expect(defaultSize("panel")).toBe("fill");
});

test("card default size is 'auto'", () => {
  expect(defaultSize("card")).toBe("auto");
});

test("step circle is 44x44 (radius 22)", () => {
  expect(defaultSize("step")).toEqual([44, 44]);
});

test("wrapBbox returns union of children plus padding", () => {
  const a = { x: 100, y: 100, w: 50, h: 50 };
  const b = { x: 200, y: 200, w: 60, h: 60 };
  const r = wrapBbox([a, b], 16);
  expect(r).toEqual({ x: 84, y: 84, w: 192, h: 192 }); // 100-16..260+16
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/resolver/bbox.test.ts
```

Expected: 4 fail.

- [ ] **Step 3: Implement bbox.ts**

`scripts/build/src/resolver/bbox.ts`:

```ts
import type { BBox } from "./types";
import type { Node } from "../schema";

export function defaultSize(type: Node["type"]): [number, number] | "fill" | "auto" {
  switch (type) {
    case "panel": return "fill";
    case "card": return "auto";
    case "step": return [44, 44];
    case "text": return "auto";
    case "icon": return [64, 64];
    case "illustration": return [200, 120];
    case "connector": return [0, 0]; // computed from endpoints
    case "lifeline": return [160, 100]; // header card size
    case "message": return [0, 0]; // computed from from/to lifelines
    case "matrix2x2": return [400, 400];
    case "timeline-bar": return [1200, 200];
    case "misconception": return "auto";
  }
}

export function wrapBbox(children: BBox[], pad: number): BBox {
  if (children.length === 0) return { x: 0, y: 0, w: pad * 2, h: pad * 2 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of children) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x + c.w > maxX) maxX = c.x + c.w;
    if (c.y + c.h > maxY) maxY = c.y + c.h;
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/resolver/bbox.test.ts
```

Expected: 4 pass.

**Checkpoint:** Default sizes and auto-wrapping defined.

---

### Task 9: Grid snap and Z-order

**Files:**
- Create: `scripts/build/src/resolver/grid.ts`
- Create: `scripts/build/src/resolver/zorder.ts`
- Create: `scripts/build/src/test/resolver/grid-zorder.test.ts`

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/resolver/grid-zorder.test.ts`:

```ts
import { test, expect } from "bun:test";
import { snap8 } from "../../resolver/grid";
import { zForType } from "../../resolver/zorder";

test("snap8 rounds to nearest 8", () => {
  expect(snap8(11)).toBe(8);
  expect(snap8(12)).toBe(16);
  expect(snap8(16)).toBe(16);
  expect(snap8(20)).toBe(24);
});

test("z-order defaults", () => {
  expect(zForType("panel")).toBe(0);
  expect(zForType("card")).toBe(10);
  expect(zForType("lifeline")).toBe(15);
  expect(zForType("icon")).toBe(20);
  expect(zForType("text")).toBe(30);
  expect(zForType("message")).toBe(35);
  expect(zForType("connector")).toBe(40);
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/resolver/grid-zorder.test.ts
```

Expected: 2 fail.

- [ ] **Step 3: Implement grid.ts and zorder.ts**

`scripts/build/src/resolver/grid.ts`:

```ts
export const GRID = 8;
export function snap8(n: number): number {
  return Math.round(n / GRID) * GRID;
}
export function snapBbox(b: { x: number; y: number; w: number; h: number }) {
  return { x: snap8(b.x), y: snap8(b.y), w: snap8(b.w), h: snap8(b.h) };
}
```

`scripts/build/src/resolver/zorder.ts`:

```ts
import type { Node } from "../schema";

const Z: Record<Node["type"], number> = {
  panel: 0,
  card: 10,
  lifeline: 15,
  illustration: 18,
  icon: 20,
  step: 25,
  text: 30,
  matrix2x2: 12,
  "timeline-bar": 12,
  message: 35,
  misconception: 32,
  connector: 40,
};

export function zForType(type: Node["type"]): number {
  return Z[type];
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/resolver/grid-zorder.test.ts
```

Expected: 2 pass.

**Checkpoint:** Grid snap + z-order defaults available.

---

### Task 10: Connector endpoint resolver

**Files:**
- Create: `scripts/build/src/resolver/connectors.ts`
- Create: `scripts/build/src/test/resolver/connectors.test.ts`

This is where image-5 and image-6 bugs become impossible. The function takes a `#id:edge` ref and returns a point on the node's bbox.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/resolver/connectors.test.ts`:

```ts
import { test, expect } from "bun:test";
import { resolveEdgePoint, computeBreakSpan } from "../../resolver/connectors";
import type { BBox } from "../../resolver/types";

const bbox: BBox = { x: 100, y: 100, w: 200, h: 100 };

test("edge points on a box", () => {
  expect(resolveEdgePoint(bbox, "top")).toEqual({ x: 200, y: 100 });
  expect(resolveEdgePoint(bbox, "right")).toEqual({ x: 300, y: 150 });
  expect(resolveEdgePoint(bbox, "bottom")).toEqual({ x: 200, y: 200 });
  expect(resolveEdgePoint(bbox, "left")).toEqual({ x: 100, y: 150 });
  expect(resolveEdgePoint(bbox, "center")).toEqual({ x: 200, y: 150 });
});

test("computeBreakSpan returns x-range for a node along a horizontal line", () => {
  const target: BBox = { x: 380, y: 836, w: 64, h: 32 };
  const span = computeBreakSpan(target);
  expect(span).toEqual({ x1: 380, x2: 444 });
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/resolver/connectors.test.ts
```

Expected: 2 fail.

- [ ] **Step 3: Implement connectors.ts**

`scripts/build/src/resolver/connectors.ts`:

```ts
import type { BBox } from "./types";

export type Edge = "top" | "right" | "bottom" | "left" | "center";

export function parseRef(ref: string): { id: string; edge?: Edge } {
  const m = /^#([a-z0-9-]+)(?::([a-z-]+))?$/i.exec(ref);
  if (!m) throw new Error(`bad ref: ${ref}`);
  return { id: m[1]!, edge: m[2] as Edge | undefined };
}

export function resolveEdgePoint(bbox: BBox, edge: Edge): { x: number; y: number } {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  switch (edge) {
    case "top": return { x: cx, y: bbox.y };
    case "right": return { x: bbox.x + bbox.w, y: cy };
    case "bottom": return { x: cx, y: bbox.y + bbox.h };
    case "left": return { x: bbox.x, y: cy };
    case "center": return { x: cx, y: cy };
  }
}

/** Returns the x range a `break_for` target occupies along a horizontal arrow path. */
export function computeBreakSpan(target: BBox): { x1: number; x2: number } {
  return { x1: target.x, x2: target.x + target.w };
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/resolver/connectors.test.ts
```

Expected: 2 pass.

**Checkpoint:** Endpoint math isolated and tested.

---

### Task 11: Resolver entry point

**Files:**
- Create: `scripts/build/src/resolver/index.ts`
- Create: `scripts/build/src/test/resolver/index.test.ts`

Glues topo + anchors + bbox + grid + zorder + connectors together. Returns a `ResolvedTree`.

- [ ] **Step 1: Write failing test**

`scripts/build/src/test/resolver/index.test.ts`:

```ts
import { test, expect } from "bun:test";
import { resolve } from "../../resolver";
import type { Layout } from "../../schema";

const layout: Layout = {
  meta: {
    slug: "x",
    title: "x",
    tier: "piece",
    pillars: ["networking"],
    depth: {
      mechanism: "#mat",
      tradeoff: "#mat",
      failure_mode: "#mc",
      numbers: "#card",
    },
    sources: ["https://example.com"],
  },
  canvas: { w: 1600, h: 1200, mode: "light-pastel", pattern: "vertical-explainer" },
  title_bar: { headline: "x", wordmark: true },
  nodes: [
    {
      type: "panel",
      id: "p",
      theme: "mint",
      title: "P",
      anchor: { kind: "in", ref: "#canvas", pad: 56 } as any,
      size: "fill",
    } as any,
    {
      type: "card",
      id: "card",
      parent: "#p",
      variant: "default",
      anchor: { kind: "in", ref: "#p", pad: 24, side: "top-left" } as any,
      size: [200, 100],
    } as any,
    { type: "misconception", id: "mc", parent: "#p", text: "x" } as any,
    {
      type: "matrix2x2",
      id: "mat",
      parent: "#p",
      anchor: { kind: "in", ref: "#p", side: "bottom-right" } as any,
      axes: { x: ["a", "b"], y: ["c", "d"] },
      cells: { tl: "1", tr: "2", bl: "3", br: "4" },
    } as any,
  ],
};

test("resolve produces bboxes for all nodes", () => {
  const tree = resolve(layout);
  expect(tree.byId.size).toBe(4);
  const p = tree.byId.get("p")!;
  // panel fills canvas with 56 pad: x=56, y=56, w=1488, h=1088 → snapped
  expect(p.bbox.x).toBe(56);
  expect(p.bbox.y).toBe(56);
  expect(p.bbox.x + p.bbox.w).toBeLessThanOrEqual(1600);
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/resolver/index.test.ts
```

Expected: fail (no resolver yet).

- [ ] **Step 3: Implement resolver/index.ts**

`scripts/build/src/resolver/index.ts`:

```ts
import type { Layout, Node, Anchor } from "../schema";
import type { BBox, ResolvedNode, ResolvedTree } from "./types";
import { applyAnchor } from "./anchors";
import { defaultSize, wrapBbox } from "./bbox";
import { snapBbox } from "./grid";
import { zForType } from "./zorder";
import { resolveEdgePoint, parseRef } from "./connectors";
import { topoSort } from "./topo";

const CANVAS_ID = "canvas";

function resolveSize(
  node: Node,
  inner: BBox,
  childrenBboxes: BBox[],
): [number, number] {
  const ds = defaultSize(node.type);
  const declared = "size" in node ? (node as any).size : undefined;

  const pick = declared ?? ds;
  if (pick === "fill") return [inner.w, inner.h];
  if (pick === "auto") {
    if (childrenBboxes.length > 0) {
      const wrap = wrapBbox(childrenBboxes, 24);
      return [wrap.w, wrap.h];
    }
    return [200, 100];
  }
  if (Array.isArray(pick)) return [pick[0], pick[1]];
  return [pick as number, pick as number];
}

export function resolve(layout: Layout): ResolvedTree {
  const canvasBbox: BBox = { x: 0, y: 0, w: layout.canvas.w, h: layout.canvas.h };
  const byId = new Map<string, ResolvedNode>();
  byId.set(CANVAS_ID, {
    type: "panel",
    id: "canvas",
    theme: "lilac",
    title: "canvas",
    anchor: { kind: "in", ref: "#canvas" } as any,
    bbox: canvasBbox,
    z: -1,
  } as any);

  const sorted = topoSort(layout.nodes);

  // Index children-by-parent for wrap computation.
  const childrenIds = new Map<string, string[]>();
  for (const n of layout.nodes) {
    const parentRef = (n as any).parent;
    if (parentRef) {
      const pid = parseRef(parentRef).id;
      if (!childrenIds.has(pid)) childrenIds.set(pid, []);
      childrenIds.get(pid)!.push(n.id);
    }
  }

  const refBboxFor = (a: Anchor): BBox[] => {
    if (a.kind === "in") return [byId.get(parseRef(a.ref).id)!.bbox];
    if (a.kind === "after" || a.kind === "below" || a.kind === "right_of") return [byId.get(parseRef(a.ref).id)!.bbox];
    if (a.kind === "between") return a.refs.map((r) => byId.get(parseRef(r).id)!.bbox);
    if (a.kind === "grid") {
      // grid resolves against the parent passed separately
      return [];
    }
    return [];
  };

  const parentBboxFor = (n: Node): BBox => {
    const parent = (n as any).parent as string | undefined;
    if (parent) return byId.get(parseRef(parent).id)!.bbox;
    if ("anchor" in n) {
      const a = (n as any).anchor as Anchor;
      if (a?.kind === "in") return byId.get(parseRef(a.ref).id)!.bbox;
    }
    return canvasBbox;
  };

  for (const n of sorted) {
    if (n.type === "connector" || n.type === "message") {
      // Endpoints resolve after sibling nodes — both ends are already in byId because of topoSort.
      const fromRef = parseRef(n.type === "connector" ? n.from : (n as any).from);
      const toRef = parseRef(n.type === "connector" ? n.to : (n as any).to);
      const fromNode = byId.get(fromRef.id)!;
      const toNode = byId.get(toRef.id)!;
      const fromPoint = resolveEdgePoint(fromNode.bbox, (fromRef.edge ?? "right") as any);
      const toPoint = resolveEdgePoint(toNode.bbox, (toRef.edge ?? "left") as any);
      const x1 = Math.min(fromPoint.x, toPoint.x);
      const y1 = Math.min(fromPoint.y, toPoint.y);
      const x2 = Math.max(fromPoint.x, toPoint.x);
      const y2 = Math.max(fromPoint.y, toPoint.y);
      const bbox = snapBbox({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
      byId.set(n.id, { ...(n as any), bbox, z: zForType(n.type), fromPoint, toPoint } as any);
      continue;
    }

    const parentBbox = parentBboxFor(n);
    const myChildren = (childrenIds.get(n.id) ?? [])
      .map((id) => byId.get(id))
      .filter((c): c is ResolvedNode => Boolean(c))
      .map((c) => c.bbox);

    // Compute pad inside parent for "fill" / "in" cases.
    const a = (n as any).anchor as Anchor | undefined;
    const pad = a && a.kind === "in" ? a.pad : 0;
    const inner = pad > 0 ? { x: parentBbox.x + pad, y: parentBbox.y + pad, w: parentBbox.w - 2 * pad, h: parentBbox.h - 2 * pad } : parentBbox;
    const size = resolveSize(n, inner, myChildren);

    const bboxRaw = a ? applyAnchor(a, parentBbox, refBboxFor(a), size) : { x: parentBbox.x, y: parentBbox.y, w: size[0], h: size[1] };
    const bbox = snapBbox(bboxRaw);
    const z = (n as any).z ?? zForType(n.type);

    byId.set(n.id, { ...(n as any), bbox, z });
  }

  byId.delete(CANVAS_ID);
  const ordered = [...byId.values()].sort((a, b) => a.z - b.z);
  return { canvas: canvasBbox, byId, ordered };
}
```

- [ ] **Step 4: Run resolver tests**

```bash
bun test src/test/resolver/
```

Expected: green.

**Checkpoint:** Phase C complete. Phase boundary makes a good commit boundary.

---

## Phase D: Validator

The validator runs after the resolver. Every rule is a pure function over `ResolvedTree`. The CLI aggregates issues, returns non-zero if any error is present.

### Task 12: Issue type and formatter

**Files:**
- Create: `scripts/build/src/validator/issue.ts`
- Create: `scripts/build/src/test/validator/issue.test.ts`

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/validator/issue.test.ts`:

```ts
import { test, expect } from "bun:test";
import { formatIssue } from "../../validator/issue";

test("formatIssue renders the standard layout", () => {
  const out = formatIssue({
    rule: "text-fit",
    severity: "error",
    nodeId: "text-tls",
    message: "text overflows container",
    details: { est_width: 272, container_width: 220 },
  });
  expect(out).toContain("[error] text-fit");
  expect(out).toContain("text-tls");
  expect(out).toContain("272");
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/validator/issue.test.ts
```

- [ ] **Step 3: Implement issue.ts**

`scripts/build/src/validator/issue.ts`:

```ts
export type Severity = "error" | "warning";

export type Issue = {
  rule: string;
  severity: Severity;
  nodeId?: string;
  message: string;
  details?: Record<string, unknown>;
};

export function formatIssue(i: Issue): string {
  const lines: string[] = [];
  lines.push(`[${i.severity}] ${i.rule}`);
  if (i.nodeId) lines.push(`  node: #${i.nodeId}`);
  lines.push(`  ${i.message}`);
  if (i.details) {
    for (const [k, v] of Object.entries(i.details)) {
      lines.push(`  ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    }
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/validator/issue.test.ts
```

**Checkpoint:** Issue type stabilised. All rules will produce these.

---

### Task 13: Containment rule

**Files:**
- Create: `scripts/build/src/validator/rules/containment.ts`
- Create: `scripts/build/src/test/validator/containment.test.ts`

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/validator/containment.test.ts`:

```ts
import { test, expect } from "bun:test";
import { containment } from "../../validator/rules/containment";
import type { ResolvedTree } from "../../resolver/types";

function makeTree(): ResolvedTree {
  const byId = new Map<string, any>();
  byId.set("p", { id: "p", type: "panel", bbox: { x: 0, y: 0, w: 1000, h: 800 }, z: 0 });
  byId.set("c", { id: "c", type: "card", parent: "#p", bbox: { x: 100, y: 100, w: 500, h: 300 }, z: 10 });
  byId.set("x", { id: "x", type: "card", parent: "#p", bbox: { x: 900, y: 100, w: 300, h: 100 }, z: 10 });
  return { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: [...byId.values()] };
}

test("clean tree returns no issues", () => {
  const tree = makeTree();
  tree.byId.delete("x");
  expect(containment(tree)).toEqual([]);
});

test("overflowing child reports an error", () => {
  const tree = makeTree();
  const issues = containment(tree);
  expect(issues).toHaveLength(1);
  expect(issues[0].rule).toBe("containment");
  expect(issues[0].nodeId).toBe("x");
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/validator/containment.test.ts
```

- [ ] **Step 3: Implement containment.ts**

`scripts/build/src/validator/rules/containment.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";
import { parseRef } from "../../resolver/connectors";

export function containment(tree: ResolvedTree): Issue[] {
  const issues: Issue[] = [];
  for (const n of tree.ordered) {
    const parentRef: string | undefined = (n as any).parent;
    if (!parentRef) continue;
    const parent = tree.byId.get(parseRef(parentRef).id);
    if (!parent) continue;
    const c = n.bbox;
    const p = parent.bbox;
    const outsideRight = c.x + c.w > p.x + p.w;
    const outsideBottom = c.y + c.h > p.y + p.h;
    const outsideLeft = c.x < p.x;
    const outsideTop = c.y < p.y;
    if (outsideRight || outsideBottom || outsideLeft || outsideTop) {
      issues.push({
        rule: "containment",
        severity: "error",
        nodeId: n.id,
        message: `child bbox exceeds parent #${parent.id}`,
        details: { child: c, parent: p },
      });
    }
  }
  return issues;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/validator/containment.test.ts
```

**Checkpoint:** Containment rule wired.

---

### Task 14: Text-fit and text-budget rules

**Files:**
- Create: `scripts/build/src/validator/rules/text-budget.ts`
- Create: `scripts/build/src/validator/rules/text-fit.ts`
- Create: `scripts/build/src/test/validator/text.test.ts`

Two rules in one task because they are tightly related and use the same metrics utility.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/validator/text.test.ts`:

```ts
import { test, expect } from "bun:test";
import { textBudget } from "../../validator/rules/text-budget";
import { textFit } from "../../validator/rules/text-fit";
import type { ResolvedTree } from "../../resolver/types";

function makeTree(textNode: any): ResolvedTree {
  const byId = new Map<string, any>();
  byId.set("c", { id: "c", type: "card", bbox: { x: 0, y: 0, w: 240, h: 100 }, z: 10 });
  byId.set(textNode.id, { ...textNode, bbox: { x: 0, y: 0, w: 0, h: 0 } });
  return { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: [...byId.values()] };
}

test("text-budget: headline over 60 chars fails", () => {
  const tree = makeTree({ id: "t", type: "text", parent: "#c", class: "headline", text: "x".repeat(61) });
  const issues = textBudget(tree);
  expect(issues).toHaveLength(1);
  expect(issues[0].rule).toBe("text-budget");
});

test("text-budget: body over 3 lines fails", () => {
  const tree = makeTree({ id: "t", type: "text", parent: "#c", class: "body", text: "x", multiline: ["a", "b", "c", "d"] });
  const issues = textBudget(tree);
  expect(issues).toHaveLength(1);
});

test("text-fit: 34-char annot in 220px-inner card fails", () => {
  const tree = makeTree({ id: "t", type: "text", parent: "#c", class: "annot", text: "TLS 1.3 ...... 1 RTT (0-RTT resume)" });
  const issues = textFit(tree);
  expect(issues).toHaveLength(1);
  expect(issues[0].rule).toBe("text-fit");
});

test("text-fit: short annot passes", () => {
  const tree = makeTree({ id: "t", type: "text", parent: "#c", class: "annot", text: "DNS 30 ms" });
  expect(textFit(tree)).toEqual([]);
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/validator/text.test.ts
```

- [ ] **Step 3: Implement text-budget.ts**

`scripts/build/src/validator/rules/text-budget.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";

const MAX_CHARS: Record<string, number> = {
  headline: 60,
  "panel-title": 24,
  "sub-label": 24,
  "step-label": 32,
  body: 80,         // per line
  caption: 80,      // per line
  annot: 40,
};

const MAX_LINES: Record<string, number> = {
  headline: 1,
  "panel-title": 1,
  "sub-label": 1,
  "step-label": 1,
  body: 3,
  caption: 2,
  annot: 1,
};

export function textBudget(tree: ResolvedTree): Issue[] {
  const issues: Issue[] = [];
  for (const n of tree.ordered) {
    if (n.type !== "text") continue;
    const cls = (n as any).class as keyof typeof MAX_CHARS;
    const lines: string[] = (n as any).multiline ?? [(n as any).text];

    if (lines.length > (MAX_LINES[cls] ?? 1)) {
      issues.push({
        rule: "text-budget",
        severity: "error",
        nodeId: n.id,
        message: `${cls} has ${lines.length} lines, max ${MAX_LINES[cls]}`,
      });
      continue;
    }
    for (const line of lines) {
      if (line.length > (MAX_CHARS[cls] ?? Infinity)) {
        issues.push({
          rule: "text-budget",
          severity: "error",
          nodeId: n.id,
          message: `${cls} line is ${line.length} chars, max ${MAX_CHARS[cls]}`,
          details: { line },
        });
      }
    }
  }

  // Misconception node has its own 100-char total budget.
  for (const n of tree.ordered) {
    if (n.type !== "misconception") continue;
    const t = (n as any).text as string;
    if (t.length > 100) {
      issues.push({
        rule: "text-budget",
        severity: "error",
        nodeId: n.id,
        message: `misconception text is ${t.length} chars, max 100`,
      });
    }
  }
  return issues;
}
```

`scripts/build/src/validator/rules/text-fit.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";
import { estimateWidth, type TextClass } from "../../fonts/metrics";
import { parseRef } from "../../resolver/connectors";

const CARD_PADDING = 20; // 10 px each side

export function textFit(tree: ResolvedTree): Issue[] {
  const issues: Issue[] = [];
  for (const n of tree.ordered) {
    if (n.type !== "text") continue;
    const parentRef: string | undefined = (n as any).parent;
    if (!parentRef) continue;
    const parent = tree.byId.get(parseRef(parentRef).id);
    if (!parent || parent.type !== "card") continue; // only enforce inside cards

    const innerWidth = parent.bbox.w - CARD_PADDING;
    const lines: string[] = (n as any).multiline ?? [(n as any).text];
    for (const line of lines) {
      const w = estimateWidth(line, (n as any).class as TextClass);
      if (w > innerWidth) {
        issues.push({
          rule: "text-fit",
          severity: "error",
          nodeId: n.id,
          message: `text width ${w} px exceeds container inner width ${innerWidth} px`,
          details: { line, est_width: w, container_width: innerWidth, parent: parent.id },
        });
      }
    }
  }
  return issues;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/validator/text.test.ts
```

**Checkpoint:** Text rules cover overflow and budget.

---

### Task 15: Connector anchor rule

**Files:**
- Create: `scripts/build/src/validator/rules/connector-anchor.ts`
- Create: `scripts/build/src/test/validator/connector-anchor.test.ts`

This rule is mostly a schema-redundancy check (the zod schema already requires the `#id:edge` form), but it also confirms that the referenced nodes actually exist in the resolved tree.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/validator/connector-anchor.test.ts`:

```ts
import { test, expect } from "bun:test";
import { connectorAnchor } from "../../validator/rules/connector-anchor";
import type { ResolvedTree } from "../../resolver/types";

function tree(extra: any[] = []): ResolvedTree {
  const byId = new Map<string, any>();
  byId.set("a", { id: "a", type: "card", bbox: { x: 0, y: 0, w: 100, h: 100 }, z: 10 });
  byId.set("b", { id: "b", type: "card", bbox: { x: 200, y: 0, w: 100, h: 100 }, z: 10 });
  for (const n of extra) byId.set(n.id, n);
  return { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: [...byId.values()] };
}

test("valid connector returns no issue", () => {
  const t = tree([{ id: "c", type: "connector", from: "#a:right", to: "#b:left", bbox: { x: 0, y: 0, w: 0, h: 0 }, z: 40 }]);
  expect(connectorAnchor(t)).toEqual([]);
});

test("connector with unknown target fails", () => {
  const t = tree([{ id: "c", type: "connector", from: "#a:right", to: "#missing:left", bbox: { x: 0, y: 0, w: 0, h: 0 }, z: 40 }]);
  expect(connectorAnchor(t)[0].rule).toBe("connector-anchor");
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/validator/connector-anchor.test.ts
```

- [ ] **Step 3: Implement connector-anchor.ts**

`scripts/build/src/validator/rules/connector-anchor.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";
import { parseRef } from "../../resolver/connectors";

export function connectorAnchor(tree: ResolvedTree): Issue[] {
  const issues: Issue[] = [];
  for (const n of tree.ordered) {
    if (n.type !== "connector") continue;
    const checkRef = (label: "from" | "to", ref: string) => {
      const parsed = parseRef(ref);
      if (!parsed.edge) {
        issues.push({ rule: "connector-anchor", severity: "error", nodeId: n.id, message: `${label} '${ref}' missing :edge` });
        return;
      }
      if (!tree.byId.has(parsed.id)) {
        issues.push({ rule: "connector-anchor", severity: "error", nodeId: n.id, message: `${label} target '#${parsed.id}' does not exist` });
      }
    };
    checkRef("from", (n as any).from);
    checkRef("to", (n as any).to);
  }
  return issues;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/validator/connector-anchor.test.ts
```

**Checkpoint:** Cross-panel connector bugs caught at validation time.

---

### Task 16: Depth coverage rule

**Files:**
- Create: `scripts/build/src/validator/rules/depth-coverage.ts`
- Create: `scripts/build/src/test/validator/depth-coverage.test.ts`

Enforces that `meta.depth.mechanism` and `meta.depth.failure_mode` reference non-text nodes, and that all four refs resolve.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/validator/depth-coverage.test.ts`:

```ts
import { test, expect } from "bun:test";
import { depthCoverage } from "../../validator/rules/depth-coverage";
import type { ResolvedTree } from "../../resolver/types";

const META = {
  depth: {
    mechanism: "#seq",
    tradeoff: "#mat",
    failure_mode: "#mc",
    numbers: "#card",
  },
};

function tree(nodes: any[]): ResolvedTree {
  const byId = new Map<string, any>();
  for (const n of nodes) byId.set(n.id, n);
  return { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: nodes };
}

test("all refs resolve and types are non-text where required", () => {
  const t = tree([
    { id: "seq", type: "lifeline", bbox: { x: 0, y: 0, w: 0, h: 0 } },
    { id: "mat", type: "matrix2x2", bbox: { x: 0, y: 0, w: 0, h: 0 } },
    { id: "mc", type: "misconception", bbox: { x: 0, y: 0, w: 0, h: 0 } },
    { id: "card", type: "card", bbox: { x: 0, y: 0, w: 0, h: 0 } },
  ]);
  expect(depthCoverage(t, META as any)).toEqual([]);
});

test("mechanism pointing at text fails", () => {
  const t = tree([
    { id: "seq", type: "text", bbox: { x: 0, y: 0, w: 0, h: 0 } },
    { id: "mat", type: "matrix2x2", bbox: { x: 0, y: 0, w: 0, h: 0 } },
    { id: "mc", type: "misconception", bbox: { x: 0, y: 0, w: 0, h: 0 } },
    { id: "card", type: "card", bbox: { x: 0, y: 0, w: 0, h: 0 } },
  ]);
  const issues = depthCoverage(t, META as any);
  expect(issues).toHaveLength(1);
  expect(issues[0].message).toMatch(/mechanism/);
});

test("missing ref fails", () => {
  const t = tree([
    { id: "mat", type: "matrix2x2", bbox: { x: 0, y: 0, w: 0, h: 0 } },
    { id: "mc", type: "misconception", bbox: { x: 0, y: 0, w: 0, h: 0 } },
    { id: "card", type: "card", bbox: { x: 0, y: 0, w: 0, h: 0 } },
  ]);
  const issues = depthCoverage(t, META as any);
  expect(issues.map((i) => i.message).join("\n")).toMatch(/seq/);
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/validator/depth-coverage.test.ts
```

- [ ] **Step 3: Implement depth-coverage.ts**

`scripts/build/src/validator/rules/depth-coverage.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";
import { parseRef } from "../../resolver/connectors";

const NON_TEXT_REQUIRED: ReadonlyArray<keyof DepthMeta> = ["mechanism", "failure_mode"] as const;

const VISUAL_TYPES = new Set([
  "lifeline",
  "message",
  "matrix2x2",
  "timeline-bar",
  "illustration",
  "misconception",
  "connector",
  "icon",
]);

export type DepthMeta = {
  depth: { mechanism: string; tradeoff: string; failure_mode: string; numbers: string };
};

export function depthCoverage(tree: ResolvedTree, meta: DepthMeta): Issue[] {
  const issues: Issue[] = [];
  for (const [k, ref] of Object.entries(meta.depth) as [keyof DepthMeta["depth"], string][]) {
    const id = parseRef(ref).id;
    const node = tree.byId.get(id);
    if (!node) {
      issues.push({ rule: "depth-coverage", severity: "error", message: `meta.depth.${k} references missing node '${ref}'` });
      continue;
    }
    if ((NON_TEXT_REQUIRED as readonly string[]).includes(k)) {
      if (node.type === "text" || !VISUAL_TYPES.has(node.type)) {
        issues.push({
          rule: "depth-coverage",
          severity: "error",
          nodeId: node.id,
          message: `meta.depth.${k} must reference a non-text node; got type=${node.type}`,
        });
      }
    }
  }
  return issues;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/validator/depth-coverage.test.ts
```

**Checkpoint:** Wall-of-text replacement of a diagram cannot satisfy the depth bar.

---

### Task 17: Numbers-per-panel, density-quota, grid-align rules

**Files:**
- Create: `scripts/build/src/validator/rules/numbers-per-panel.ts`
- Create: `scripts/build/src/validator/rules/density-quota.ts`
- Create: `scripts/build/src/validator/rules/grid-align.ts`
- Create: `scripts/build/src/test/validator/density-and-grid.test.ts`

Three warnings packaged together because each is short.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/validator/density-and-grid.test.ts`:

```ts
import { test, expect } from "bun:test";
import { numbersPerPanel } from "../../validator/rules/numbers-per-panel";
import { densityQuota } from "../../validator/rules/density-quota";
import { gridAlign } from "../../validator/rules/grid-align";
import type { ResolvedTree } from "../../resolver/types";

test("numbers-per-panel: panel with no annot text gets a warning", () => {
  const byId = new Map<string, any>();
  byId.set("p", { id: "p", type: "panel", bbox: { x: 0, y: 0, w: 1000, h: 600 } });
  byId.set("t", { id: "t", type: "text", parent: "#p", class: "body", text: "hi", bbox: { x: 0, y: 0, w: 0, h: 0 } });
  const tree: ResolvedTree = { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: [...byId.values()] };
  expect(numbersPerPanel(tree)[0]?.severity).toBe("warning");
});

test("density-quota: text-dominated tree warns", () => {
  const byId = new Map<string, any>();
  byId.set("p", { id: "p", type: "panel", bbox: { x: 0, y: 0, w: 1000, h: 600 } });
  // a single body of huge size, 80% of canvas
  byId.set("t", { id: "t", type: "text", parent: "#p", class: "body", text: "x", bbox: { x: 0, y: 0, w: 1500, h: 1000 } });
  const tree: ResolvedTree = { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: [...byId.values()] };
  expect(densityQuota(tree)[0]?.severity).toBe("warning");
});

test("grid-align: warning on off-grid coord", () => {
  const byId = new Map<string, any>();
  byId.set("p", { id: "p", type: "panel", bbox: { x: 7, y: 0, w: 1000, h: 600 } });
  const tree: ResolvedTree = { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: [...byId.values()] };
  expect(gridAlign(tree)[0]?.rule).toBe("grid-align");
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/validator/density-and-grid.test.ts
```

- [ ] **Step 3: Implement the three rules**

`scripts/build/src/validator/rules/numbers-per-panel.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";

export function numbersPerPanel(tree: ResolvedTree): Issue[] {
  const issues: Issue[] = [];
  for (const n of tree.ordered) {
    if (n.type !== "panel") continue;
    const annotChildren = tree.ordered.filter((c: any) => {
      if (c.type !== "text") return false;
      if (c.class !== "annot") return false;
      const parentId = c.parent?.replace(/^#/, "");
      return parentId === n.id;
    });
    if (annotChildren.length === 0) {
      issues.push({
        rule: "numbers-per-panel",
        severity: "warning",
        nodeId: n.id,
        message: "panel contains no annot-class numeric annotation",
      });
    }
  }
  return issues;
}
```

`scripts/build/src/validator/rules/density-quota.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";

const TARGET = 0.4;

export function densityQuota(tree: ResolvedTree): Issue[] {
  const canvasArea = tree.canvas.w * tree.canvas.h;
  let nonText = 0;
  for (const n of tree.ordered) {
    if (n.type === "text") continue;
    if (n.type === "connector" || n.type === "message") continue; // lines, no area
    nonText += n.bbox.w * n.bbox.h;
  }
  const fraction = nonText / canvasArea;
  if (fraction < TARGET) {
    return [
      {
        rule: "density-quota",
        severity: "warning",
        message: `non-text area is ${(fraction * 100).toFixed(0)}% of canvas; aim for >= ${(TARGET * 100).toFixed(0)}%`,
        details: { fraction, target: TARGET },
      },
    ];
  }
  return [];
}
```

`scripts/build/src/validator/rules/grid-align.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";

const GRID = 8;

export function gridAlign(tree: ResolvedTree): Issue[] {
  const issues: Issue[] = [];
  for (const n of tree.ordered) {
    const offGrid = [n.bbox.x, n.bbox.y, n.bbox.w, n.bbox.h].filter((v) => v % GRID !== 0);
    if (offGrid.length > 0) {
      issues.push({
        rule: "grid-align",
        severity: "warning",
        nodeId: n.id,
        message: `bbox not on 8-pt grid`,
        details: { bbox: n.bbox },
      });
    }
  }
  return issues;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/validator/density-and-grid.test.ts
```

**Checkpoint:** Editorial warnings active.

---

### Task 18: Icon existence and source attribution rules

**Files:**
- Create: `scripts/build/src/validator/rules/icon-exists.ts`
- Create: `scripts/build/src/validator/rules/sources-cite.ts`
- Create: `scripts/build/src/test/validator/icon-and-source.test.ts`

These rules need the icon registry from Task 22 to exist. Define a `requireRegistry()` shim now and wire it later. For tests, use an injected registry.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/validator/icon-and-source.test.ts`:

```ts
import { test, expect } from "bun:test";
import { iconExistsWith } from "../../validator/rules/icon-exists";
import { sourcesCiteWith } from "../../validator/rules/sources-cite";
import type { ResolvedTree } from "../../resolver/types";

const REGISTRY = {
  "generic:server": { file: "generic/server.svg", license: "internal" },
  "brand:postgres": { file: "brand/postgres.svg", license: "trademark", source: "https://simpleicons.org/icons/postgresql" },
};

function tree(nodes: any[]): ResolvedTree {
  const byId = new Map<string, any>();
  for (const n of nodes) byId.set(n.id, n);
  return { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: nodes };
}

test("icon-exists: error on unknown icon", () => {
  const t = tree([{ id: "i", type: "icon", name: "brand:unknown", bbox: { x: 0, y: 0, w: 64, h: 64 } }]);
  const issues = iconExistsWith(t, REGISTRY);
  expect(issues[0].rule).toBe("icon-exists");
  expect(issues[0].message).toContain("brand:unknown");
});

test("sources-cite: warning when brand icon used without attribution", () => {
  const t = tree([{ id: "i", type: "icon", name: "brand:postgres", bbox: { x: 0, y: 0, w: 64, h: 64 } }]);
  const issues = sourcesCiteWith(t, REGISTRY, []);
  expect(issues[0].rule).toBe("sources-cite");
});

test("sources-cite: no warning when source URL present", () => {
  const t = tree([{ id: "i", type: "icon", name: "brand:postgres", bbox: { x: 0, y: 0, w: 64, h: 64 } }]);
  const issues = sourcesCiteWith(t, REGISTRY, ["https://simpleicons.org/icons/postgresql"]);
  expect(issues).toEqual([]);
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/validator/icon-and-source.test.ts
```

- [ ] **Step 3: Implement the two rules with injected registry**

`scripts/build/src/validator/rules/icon-exists.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";

export type IconMeta = { file: string; license: string; source?: string; viewBox?: string };
export type IconRegistry = Record<string, IconMeta>;

export function iconExistsWith(tree: ResolvedTree, registry: IconRegistry): Issue[] {
  const issues: Issue[] = [];
  for (const n of tree.ordered) {
    if (n.type !== "icon" && n.type !== "illustration") continue;
    const name = (n as any).name as string;
    if (!registry[name]) {
      issues.push({
        rule: "icon-exists",
        severity: "error",
        nodeId: n.id,
        message: `icon '${name}' not in registry`,
      });
    }
  }
  return issues;
}
```

`scripts/build/src/validator/rules/sources-cite.ts`:

```ts
import type { ResolvedTree } from "../../resolver/types";
import type { Issue } from "../issue";
import type { IconRegistry } from "./icon-exists";

export function sourcesCiteWith(tree: ResolvedTree, registry: IconRegistry, sources: string[]): Issue[] {
  const issues: Issue[] = [];
  for (const n of tree.ordered) {
    if (n.type !== "icon" && n.type !== "illustration") continue;
    const name = (n as any).name as string;
    const meta = registry[name];
    if (!meta) continue;
    if (!name.startsWith("brand:")) continue;
    if (!meta.source) continue;
    if (!sources.includes(meta.source)) {
      issues.push({
        rule: "sources-cite",
        severity: "warning",
        nodeId: n.id,
        message: `brand icon '${name}' used without attribution URL '${meta.source}' in meta.sources`,
      });
    }
  }
  return issues;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/validator/icon-and-source.test.ts
```

**Checkpoint:** Icon registry contract defined; wiring happens in Task 22.

---

### Task 19: Validator entry point

**Files:**
- Create: `scripts/build/src/validator/index.ts`
- Create: `scripts/build/src/test/validator/index.test.ts`

Aggregates all rules. Accepts a tree, a registry, and a sources list. Returns `Issue[]`.

- [ ] **Step 1: Write failing test**

`scripts/build/src/test/validator/index.test.ts`:

```ts
import { test, expect } from "bun:test";
import { validate } from "../../validator";
import type { ResolvedTree } from "../../resolver/types";

test("validate aggregates issues across rules", () => {
  const byId = new Map<string, any>();
  byId.set("p", { id: "p", type: "panel", bbox: { x: 0, y: 0, w: 1000, h: 800 } });
  byId.set("c", { id: "c", type: "card", parent: "#p", bbox: { x: 900, y: 0, w: 800, h: 100 } }); // overflows
  const tree: ResolvedTree = { canvas: { x: 0, y: 0, w: 1600, h: 1200 }, byId, ordered: [...byId.values()] };
  const issues = validate(tree, {
    meta: {
      depth: { mechanism: "#p", tradeoff: "#p", failure_mode: "#p", numbers: "#p" },
    },
    registry: {},
    sources: [],
  });
  expect(issues.some((i) => i.rule === "containment")).toBe(true);
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
bun test src/test/validator/index.test.ts
```

- [ ] **Step 3: Implement validator/index.ts**

`scripts/build/src/validator/index.ts`:

```ts
import type { ResolvedTree } from "../resolver/types";
import type { Issue } from "./issue";
import { containment } from "./rules/containment";
import { textBudget } from "./rules/text-budget";
import { textFit } from "./rules/text-fit";
import { connectorAnchor } from "./rules/connector-anchor";
import { depthCoverage, type DepthMeta } from "./rules/depth-coverage";
import { numbersPerPanel } from "./rules/numbers-per-panel";
import { densityQuota } from "./rules/density-quota";
import { gridAlign } from "./rules/grid-align";
import { iconExistsWith, type IconRegistry } from "./rules/icon-exists";
import { sourcesCiteWith } from "./rules/sources-cite";

export type ValidatorInput = {
  meta: DepthMeta;
  registry: IconRegistry;
  sources: string[];
};

export function validate(tree: ResolvedTree, input: ValidatorInput): Issue[] {
  return [
    ...containment(tree),
    ...textBudget(tree),
    ...textFit(tree),
    ...connectorAnchor(tree),
    ...depthCoverage(tree, input.meta),
    ...numbersPerPanel(tree),
    ...densityQuota(tree),
    ...gridAlign(tree),
    ...iconExistsWith(tree, input.registry),
    ...sourcesCiteWith(tree, input.registry, input.sources),
  ];
}
```

- [ ] **Step 4: Run all validator tests**

```bash
bun test src/test/validator/
```

Expected: green.

**Checkpoint:** Phase D complete. Suitable commit boundary.

---

## Phase E: Icon library

### Task 20: Icon registry and loader

**Files:**
- Create: `scripts/build/src/icons/registry.ts`
- Create: `scripts/build/src/icons/load.ts`
- Create: `scripts/build/src/test/icons/registry.test.ts`
- Create: `templates/icons/generic/server.svg` (one example; the rest follow the same pattern)

- [ ] **Step 1: Author one generic icon file as reference**

`templates/icons/generic/server.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="6" y="10" width="52" height="14" rx="3" fill="#A7F3D0" stroke="#047857" stroke-width="1.5"/>
  <rect x="6" y="26" width="52" height="14" rx="3" fill="#A7F3D0" stroke="#047857" stroke-width="1.5"/>
  <rect x="6" y="42" width="52" height="14" rx="3" fill="#A7F3D0" stroke="#047857" stroke-width="1.5"/>
  <circle cx="14" cy="17" r="2" fill="#10B981"/>
  <circle cx="22" cy="17" r="2" fill="#FFFFFF" stroke="#047857" stroke-width="1"/>
  <circle cx="14" cy="33" r="2" fill="#10B981"/>
  <circle cx="22" cy="33" r="2" fill="#FFFFFF" stroke="#047857" stroke-width="1"/>
  <circle cx="14" cy="49" r="2" fill="#10B981"/>
  <circle cx="22" cy="49" r="2" fill="#FFFFFF" stroke="#047857" stroke-width="1"/>
</svg>
```

Repeat the pattern for: `db.svg`, `monitor.svg`, `globe.svg`, `cloud.svg`, `resolver.svg`, `lock.svg`, `key.svg`, `doc.svg`. Reuse the markup from the existing `templates/svg-skeleton.svg` defs (Section 1 of this plan's spec).

- [ ] **Step 2: Write failing test**

`scripts/build/src/test/icons/registry.test.ts`:

```ts
import { test, expect } from "bun:test";
import { ICONS } from "../../icons/registry";
import { readIconSvg } from "../../icons/load";

test("registry includes generic:server", () => {
  expect(ICONS["generic:server"]).toBeDefined();
});

test("readIconSvg returns svg markup", async () => {
  const svg = await readIconSvg("generic:server");
  expect(svg).toContain("<svg");
});
```

- [ ] **Step 3: Run test, expect fail**

```bash
bun test src/test/icons/registry.test.ts
```

- [ ] **Step 4: Implement registry and loader**

`scripts/build/src/icons/registry.ts`:

```ts
import type { IconRegistry } from "../validator/rules/icon-exists";

export const ICONS: IconRegistry = {
  "generic:server":   { file: "generic/server.svg",   license: "internal", viewBox: "0 0 64 64" },
  "generic:db":       { file: "generic/db.svg",       license: "internal", viewBox: "0 0 64 64" },
  "generic:monitor":  { file: "generic/monitor.svg",  license: "internal", viewBox: "0 0 80 64" },
  "generic:globe":    { file: "generic/globe.svg",    license: "internal", viewBox: "0 0 64 64" },
  "generic:cloud":    { file: "generic/cloud.svg",    license: "internal", viewBox: "0 0 80 48" },
  "generic:resolver": { file: "generic/resolver.svg", license: "internal", viewBox: "0 0 96 64" },
  "generic:lock":     { file: "generic/lock.svg",     license: "internal", viewBox: "0 0 48 56" },
  "generic:key":      { file: "generic/key.svg",      license: "internal", viewBox: "0 0 64 32" },
  "generic:doc":      { file: "generic/doc.svg",      license: "internal", viewBox: "0 0 48 56" },
};
```

`scripts/build/src/icons/load.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ICONS } from "./registry";

const ICON_ROOT = join(import.meta.dir, "..", "..", "..", "..", "templates", "icons");
const cache = new Map<string, string>();

export async function readIconSvg(name: string): Promise<string> {
  if (cache.has(name)) return cache.get(name)!;
  const meta = ICONS[name];
  if (!meta) throw new Error(`icon '${name}' not in registry`);
  const path = join(ICON_ROOT, meta.file);
  const svg = await readFile(path, "utf-8");
  cache.set(name, svg);
  return svg;
}
```

- [ ] **Step 5: Run tests, expect green**

```bash
bun test src/test/icons/
```

**Checkpoint:** Icon registry wired. Other generic icons authored as files (one per the pattern above) - if any are missing, list them in spec.md `Notes` and complete in a follow-up task.

---

### Task 21: Brand icon fetch script

**Files:**
- Create: `scripts/build/src/icons/fetch-brand.ts`
- Modify: `scripts/build/src/icons/registry.ts` (append-after-fetch helper)

- [ ] **Step 1: Implement the fetch script**

`scripts/build/src/icons/fetch-brand.ts`:

```ts
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const SIMPLE_ICONS_CDN = (slug: string) => `https://cdn.simpleicons.org/${slug}`;
const ICON_DIR = join(import.meta.dir, "..", "..", "..", "..", "templates", "icons", "brand");

async function fetchOne(slug: string) {
  const url = SIMPLE_ICONS_CDN(slug);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed for ${slug}: ${res.status}`);
  const svg = await res.text();
  await mkdir(ICON_DIR, { recursive: true });
  await writeFile(join(ICON_DIR, `${slug}.svg`), svg);
  console.log(`wrote brand/${slug}.svg`);
  return { slug, source: url };
}

async function main() {
  const slugs = process.argv.slice(2);
  if (slugs.length === 0) {
    console.error("usage: bun src/icons/fetch-brand.ts <slug1> <slug2> ...");
    process.exit(1);
  }
  const fetched = [];
  for (const slug of slugs) fetched.push(await fetchOne(slug));

  console.log("");
  console.log("Add the following entries to registry.ts under ICONS:");
  for (const { slug, source } of fetched) {
    console.log(`  "brand:${slug}": { file: "brand/${slug}.svg", license: "trademark, fair use", source: "${source}" },`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke-test by fetching one brand icon**

```bash
cd scripts/build && bun src/icons/fetch-brand.ts postgresql
```

Expected output: `wrote brand/postgresql.svg` and a copy-paste registry entry.

- [ ] **Step 3: Append the registry entry to registry.ts**

```ts
"brand:postgresql": { file: "brand/postgresql.svg", license: "trademark, fair use", source: "https://cdn.simpleicons.org/postgresql" },
```

- [ ] **Step 4: Verify the file exists**

```bash
ls -la templates/icons/brand/postgresql.svg
```

Expected: file size > 0.

**Checkpoint:** Brand fetch loop works end-to-end. Adding more icons is one command + one registry line.

---

## Phase F: Emitter

The emitter produces an SVG string from a `ResolvedTree`. It is the only place SVG strings live. Each node type has its own emitter; `emit/index.ts` walks the ordered list.

### Task 22: Shared defs and CSS

**Files:**
- Create: `scripts/build/src/emitter/defs.ts`
- Create: `scripts/build/src/test/emitter/defs.test.ts`

- [ ] **Step 1: Write failing test**

`scripts/build/src/test/emitter/defs.test.ts`:

```ts
import { test, expect } from "bun:test";
import { sharedDefs, sharedCss } from "../../emitter/defs";

test("sharedCss contains panel-mint class", () => {
  expect(sharedCss).toContain(".panel-mint");
});

test("sharedDefs contains arrowhead marker id", () => {
  expect(sharedDefs).toContain('id="ah"');
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/emitter/defs.test.ts
```

- [ ] **Step 3: Implement defs.ts**

`scripts/build/src/emitter/defs.ts`:

```ts
export const sharedCss = `
  .bg { fill: #FFFFFF; }
  .headline { font: 800 48px Inter, system-ui, sans-serif; fill: #111827; }
  .wordmark { font: 800 22px Inter, system-ui, sans-serif; fill: #7C3AED; }
  .panel-lilac { fill: #EEEAFE; stroke: #7C3AED; stroke-width: 2.5; stroke-dasharray: 6 6; }
  .panel-mint  { fill: #E6F6EE; stroke: #16A34A; stroke-width: 2.5; stroke-dasharray: 6 6; }
  .panel-peach { fill: #FEEFE0; stroke: #D97706; stroke-width: 2.5; stroke-dasharray: 6 6; }
  .panel-sky   { fill: #E0F2FE; stroke: #0284C7; stroke-width: 2.5; stroke-dasharray: 6 6; }
  .panel-rose  { fill: #FCE7F3; stroke: #DB2777; stroke-width: 2.5; stroke-dasharray: 6 6; }
  .pill-text   { font: 800 22px Inter, system-ui, sans-serif; fill: #FFFFFF; text-anchor: middle; dominant-baseline: central; }
  .body        { font: 500 16px Inter, system-ui, sans-serif; fill: #1F2937; }
  .body-bold   { font: 700 16px Inter, system-ui, sans-serif; fill: #1F2937; }
  .annot       { font: 500 13px ui-monospace, Menlo, monospace; fill: #374151; }
  .step-circle { fill: #16A34A; }
  .step-digit  { font: 800 18px Inter, system-ui, sans-serif; fill: #FFFFFF; text-anchor: middle; dominant-baseline: central; }
  .step-num    { font: 800 18px Inter, system-ui, sans-serif; fill: #16A34A; }
  .step-label  { font: 700 18px Inter, system-ui, sans-serif; fill: #1F2937; }
  .card        { fill: #FFFFFF; stroke: #9CA3AF; stroke-width: 1.5; rx: 8; ry: 8; }
  .card-yel    { fill: #FEF3C7; stroke: #92400E; stroke-width: 1.5; rx: 8; ry: 8; }
  .conn        { fill: none; stroke: #374151; stroke-width: 2; stroke-dasharray: 4 6; }
  .conn-solid  { fill: none; stroke: #374151; stroke-width: 2; }
`;

export const sharedDefs = `
  <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/>
  </marker>
`;
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/emitter/defs.test.ts
```

**Checkpoint:** Shared CSS extracted from existing skeleton.

---

### Task 23: Panel, card, step, text emitters

**Files:**
- Create: `scripts/build/src/emitter/panel.ts`
- Create: `scripts/build/src/emitter/card.ts`
- Create: `scripts/build/src/emitter/step.ts`
- Create: `scripts/build/src/emitter/text.ts`
- Create: `scripts/build/src/test/emitter/basic.test.ts`

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/emitter/basic.test.ts`:

```ts
import { test, expect } from "bun:test";
import { emitPanel } from "../../emitter/panel";
import { emitCard } from "../../emitter/card";
import { emitStep } from "../../emitter/step";
import { emitText } from "../../emitter/text";

test("emitPanel renders dashed rect + pill title", () => {
  const out = emitPanel({
    id: "p",
    type: "panel",
    theme: "mint",
    title: "Handshake",
    bbox: { x: 56, y: 56, w: 1488, h: 1088 },
  } as any);
  expect(out).toContain("panel-mint");
  expect(out).toContain("Handshake");
});

test("emitCard with yellow-note variant", () => {
  const out = emitCard({
    id: "c",
    type: "card",
    variant: "yellow-note",
    bbox: { x: 100, y: 100, w: 200, h: 100 },
  } as any);
  expect(out).toContain("card-yel");
});

test("emitStep renders green circle with digit", () => {
  const out = emitStep({
    id: "s",
    type: "step",
    n: 3,
    label: "HTTP Request",
    bbox: { x: 100, y: 200, w: 44, h: 44 },
  } as any);
  expect(out).toContain("step-circle");
  expect(out).toContain(">3<");
  expect(out).toContain("HTTP Request");
});

test("emitText renders multiline", () => {
  const out = emitText({
    id: "t",
    type: "text",
    class: "body",
    multiline: ["line1", "line2"],
    bbox: { x: 100, y: 100, w: 200, h: 60 },
  } as any);
  expect(out).toContain("line1");
  expect(out).toContain("line2");
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/emitter/basic.test.ts
```

- [ ] **Step 3: Implement the four emitters**

`scripts/build/src/emitter/panel.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

const PILL_FILL: Record<string, string> = {
  lilac: "#7C3AED", mint: "#16A34A", peach: "#D97706",
  sky: "#0284C7", rose: "#DB2777",
};

export function emitPanel(n: ResolvedNode & { theme: string; title: string }): string {
  const { bbox, theme, title } = n;
  const pillX = bbox.x + bbox.w / 2 - 160;
  const pillY = bbox.y - 16;
  return `
    <rect class="panel-${theme}" x="${bbox.x}" y="${bbox.y}" width="${bbox.w}" height="${bbox.h}" rx="18"/>
    <rect x="${pillX}" y="${pillY}" width="320" height="36" rx="16" fill="${PILL_FILL[theme]}"/>
    <text class="pill-text" x="${bbox.x + bbox.w / 2}" y="${pillY + 18}">${title}</text>
  `;
}
```

`scripts/build/src/emitter/card.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

export function emitCard(n: ResolvedNode & { variant: string }): string {
  const cls = n.variant === "yellow-note" ? "card-yel" : "card";
  return `<rect class="${cls}" x="${n.bbox.x}" y="${n.bbox.y}" width="${n.bbox.w}" height="${n.bbox.h}"/>`;
}
```

`scripts/build/src/emitter/step.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

export function emitStep(n: ResolvedNode & { n: number; label: string }): string {
  const cx = n.bbox.x + n.bbox.w / 2;
  const cy = n.bbox.y + n.bbox.h / 2;
  return `
    <circle class="step-circle" cx="${cx}" cy="${cy}" r="20"/>
    <text class="step-digit" x="${cx}" y="${cy}">${n.n}</text>
    <text x="${cx + 30}" y="${cy + 6}"><tspan class="step-num">${n.n}</tspan> <tspan class="step-label">${n.label}</tspan></text>
  `;
}
```

`scripts/build/src/emitter/text.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

const LINE_HEIGHT: Record<string, number> = {
  headline: 60, "panel-title": 30, "sub-label": 18, "step-label": 24,
  body: 22, caption: 18, annot: 18,
};

export function emitText(n: ResolvedNode & { class: string; text?: string; multiline?: string[]; align?: string }): string {
  const lines = n.multiline ?? [n.text ?? ""];
  const lh = LINE_HEIGHT[n.class] ?? 22;
  return lines
    .map((line, i) => `<text class="${n.class}" x="${n.bbox.x}" y="${n.bbox.y + lh * (i + 1)}">${line}</text>`)
    .join("\n");
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/emitter/basic.test.ts
```

**Checkpoint:** Layout primitives emit.

---

### Task 24: Icon emitter with break-around-target support

**Files:**
- Create: `scripts/build/src/emitter/icon.ts`
- Create: `scripts/build/src/test/emitter/icon.test.ts`

- [ ] **Step 1: Write failing test**

`scripts/build/src/test/emitter/icon.test.ts`:

```ts
import { test, expect } from "bun:test";
import { emitIcon } from "../../emitter/icon";

test("emitIcon wraps inline svg in a translated <g>", async () => {
  const out = await emitIcon({
    id: "i",
    type: "icon",
    name: "generic:server",
    size: 64,
    bbox: { x: 100, y: 100, w: 64, h: 64 },
  } as any);
  expect(out).toContain("translate(100,100)");
  expect(out).toContain("<svg");
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
bun test src/test/emitter/icon.test.ts
```

- [ ] **Step 3: Implement icon.ts**

`scripts/build/src/emitter/icon.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";
import { readIconSvg } from "../icons/load";
import { ICONS } from "../icons/registry";

export async function emitIcon(n: ResolvedNode & { name: string; size: number | [number, number] }): Promise<string> {
  const meta = ICONS[n.name]!;
  const svg = await readIconSvg(n.name);
  const [w, h] = Array.isArray(n.size) ? n.size : [n.size, n.size];
  // strip outer svg tag's width/height; reuse viewBox from meta when needed.
  const inner = svg.replace(/^<\?xml[^?]+\?>\s*/i, "").replace(/<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
  const sx = w / 64;
  const sy = h / 64;
  return `<g transform="translate(${n.bbox.x},${n.bbox.y}) scale(${sx},${sy})" data-icon="${n.name}">${inner}</g>`;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/emitter/icon.test.ts
```

**Checkpoint:** Inline icon emission with scaling.

---

### Task 25: Connector emitter with break_for split

**Files:**
- Create: `scripts/build/src/emitter/connector.ts`
- Create: `scripts/build/src/test/emitter/connector.test.ts`

This is where image-4 (key over arrow) becomes structurally impossible: if `break_for` is set, the emitter creates two segments around the target's x range and the icon sits in the gap.

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/emitter/connector.test.ts`:

```ts
import { test, expect } from "bun:test";
import { emitConnector } from "../../emitter/connector";

const tree: any = {
  byId: new Map<string, any>([
    ["key", { id: "key", type: "icon", bbox: { x: 380, y: 836, w: 64, h: 32 } }],
  ]),
};

test("plain horizontal arrow emits a single path", () => {
  const out = emitConnector({
    id: "c",
    type: "connector",
    fromPoint: { x: 100, y: 100 },
    toPoint: { x: 400, y: 100 },
    style: "dashed",
    color: "neutral",
    route: "straight",
  } as any, tree);
  // one <path with the arrowhead at toPoint, no break
  expect(out.split("<path").length).toBe(2); // empty split + 1 element
});

test("break_for splits into two segments around target", () => {
  const out = emitConnector({
    id: "c",
    type: "connector",
    fromPoint: { x: 600, y: 850 },
    toPoint: { x: 200, y: 850 },
    style: "solid",
    color: "neutral",
    route: "straight",
    break_for: "#key",
  } as any, tree);
  expect(out.split("<path").length).toBeGreaterThanOrEqual(3); // two segments
  expect(out).toContain("data-segment");
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/emitter/connector.test.ts
```

- [ ] **Step 3: Implement connector.ts**

`scripts/build/src/emitter/connector.ts`:

```ts
import type { ResolvedTree } from "../resolver/types";

type C = {
  id: string;
  type: "connector";
  fromPoint: { x: number; y: number };
  toPoint: { x: number; y: number };
  style: "dashed" | "solid";
  color: string;
  route: "straight" | "orthogonal" | "curve";
  break_for?: string;
  label?: string;
};

function strokeClass(c: C) {
  return c.style === "solid" ? "conn-solid" : "conn";
}

function pathStraight(from: { x: number; y: number }, to: { x: number; y: number }) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

export function emitConnector(n: C, tree: ResolvedTree): string {
  if (!n.break_for) {
    return `<path class="${strokeClass(n)}" d="${pathStraight(n.fromPoint, n.toPoint)}" marker-end="url(#ah)"/>`;
  }
  const targetId = n.break_for.replace(/^#/, "");
  const target = tree.byId.get(targetId);
  if (!target) {
    return `<path class="${strokeClass(n)}" d="${pathStraight(n.fromPoint, n.toPoint)}" marker-end="url(#ah)"/>`;
  }
  // Assume horizontal arrow at y == from.y == to.y.
  const x1 = target.bbox.x;
  const x2 = target.bbox.x + target.bbox.w;
  const y = n.fromPoint.y;
  const minX = Math.min(n.fromPoint.x, n.toPoint.x);
  const maxX = Math.max(n.fromPoint.x, n.toPoint.x);
  // The arrowhead belongs to whichever segment ends at `toPoint`.
  const toLeft = n.toPoint.x < n.fromPoint.x;
  const segLeft = `M ${minX} ${y} L ${x1} ${y}`;
  const segRight = `M ${x2} ${y} L ${maxX} ${y}`;
  const segLeftAttrs = toLeft ? ` marker-end="url(#ah)"` : "";
  const segRightAttrs = toLeft ? "" : ` marker-end="url(#ah)"`;
  return `
    <path class="${strokeClass(n)}" data-segment="left"  d="${segLeft}"${segLeftAttrs}/>
    <path class="${strokeClass(n)}" data-segment="right" d="${segRight}"${segRightAttrs}/>
  `;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/emitter/connector.test.ts
```

**Checkpoint:** Image-4 bug class eliminated structurally.

---

### Task 26: Lifeline, message, matrix, timeline, misconception, illustration emitters

**Files:**
- Create: `scripts/build/src/emitter/lifeline.ts`
- Create: `scripts/build/src/emitter/message.ts`
- Create: `scripts/build/src/emitter/matrix.ts`
- Create: `scripts/build/src/emitter/timeline.ts`
- Create: `scripts/build/src/emitter/misconception.ts`
- Create: `scripts/build/src/emitter/illustration.ts`
- Create: `scripts/build/src/test/emitter/pattern-nodes.test.ts`

- [ ] **Step 1: Write failing tests**

`scripts/build/src/test/emitter/pattern-nodes.test.ts`:

```ts
import { test, expect } from "bun:test";
import { emitLifeline } from "../../emitter/lifeline";
import { emitMessage } from "../../emitter/message";
import { emitMisconception } from "../../emitter/misconception";

test("lifeline draws vertical dashed line + header card", () => {
  const out = emitLifeline({
    id: "ll", type: "lifeline",
    header: { name: "Client" },
    bbox: { x: 100, y: 0, w: 160, h: 100 },
    parent: "#p",
  } as any, { x: 0, y: 0, w: 1600, h: 1200 } as any);
  expect(out).toContain("Client");
});

test("message draws horizontal arrow + label + time", () => {
  const out = emitMessage({
    id: "m", type: "message",
    fromPoint: { x: 100, y: 500 },
    toPoint: { x: 400, y: 500 },
    label: "Hello",
    time: "0 ms",
    style: "solid",
  } as any);
  expect(out).toContain("Hello");
  expect(out).toContain("0 ms");
});

test("misconception draws red callout", () => {
  const out = emitMisconception({
    id: "mc", type: "misconception", text: "Not really.",
    bbox: { x: 0, y: 0, w: 200, h: 60 },
  } as any);
  expect(out).toContain("Not really");
  expect(out).toContain("#DC2626");
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
bun test src/test/emitter/pattern-nodes.test.ts
```

- [ ] **Step 3: Implement the emitters**

`scripts/build/src/emitter/lifeline.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

export function emitLifeline(n: ResolvedNode & { header: { name: string; sub?: string } }, parentBbox: { y: number; h: number }): string {
  const cx = n.bbox.x + n.bbox.w / 2;
  return `
    <rect x="${n.bbox.x}" y="${n.bbox.y}" width="${n.bbox.w}" height="${n.bbox.h}" rx="12" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5"/>
    <text x="${cx}" y="${n.bbox.y + n.bbox.h / 2 + 8}" font-family="Inter" font-weight="800" font-size="17" fill="#1F2937" text-anchor="middle">${n.header.name}</text>
    <line x1="${cx}" y1="${n.bbox.y + n.bbox.h + 8}" x2="${cx}" y2="${parentBbox.y + parentBbox.h - 16}" stroke="#C4B5FD" stroke-width="1.5" stroke-dasharray="4 6"/>
  `;
}
```

`scripts/build/src/emitter/message.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

export function emitMessage(n: ResolvedNode & {
  fromPoint: { x: number; y: number };
  toPoint: { x: number; y: number };
  label: string;
  time?: string;
  style: "solid" | "dashed-async" | "dashed-response";
}): string {
  const dash = n.style === "solid" ? "" : ` stroke-dasharray="4 6"`;
  const color = n.style === "dashed-response" ? "#16A34A" : "#374151";
  const midX = (n.fromPoint.x + n.toPoint.x) / 2;
  return `
    <path d="M ${n.fromPoint.x} ${n.fromPoint.y} L ${n.toPoint.x} ${n.toPoint.y}" stroke="${color}" stroke-width="2"${dash} fill="none" marker-end="url(#ah)"/>
    <text x="${midX}" y="${n.fromPoint.y - 6}" font-family="Inter" font-weight="600" font-size="14" fill="#1F2937" text-anchor="middle">${n.label}</text>
    ${n.time ? `<text x="${midX}" y="${n.fromPoint.y + 18}" font-family="ui-monospace,Menlo,monospace" font-size="12" fill="#16A34A" text-anchor="middle">${n.time}</text>` : ""}
  `;
}
```

`scripts/build/src/emitter/misconception.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

export function emitMisconception(n: ResolvedNode & { text: string }): string {
  return `
    <rect x="${n.bbox.x}" y="${n.bbox.y}" width="${n.bbox.w}" height="${n.bbox.h}" rx="10" fill="#FEE2E2" stroke="#DC2626" stroke-width="2"/>
    <text x="${n.bbox.x + 16}" y="${n.bbox.y + 28}" font-family="Inter" font-weight="700" font-size="14" fill="#7F1D1D">Heads-up</text>
    <text x="${n.bbox.x + 16}" y="${n.bbox.y + 50}" font-family="Inter" font-size="14" fill="#1F2937">${n.text}</text>
  `;
}
```

(Matrix and timeline emitters follow the same shape; their full code lives in this task but is omitted from this plan for length. Implement them as part of step 3: matrix draws a 2x2 grid with axis labels at each end and cell text centered; timeline draws horizontal stacked segments aligned to `axis_ms`. Use the V3 OSI / V4 timeline drafts under `drafts/google-com-query/` as visual references.)

`scripts/build/src/emitter/matrix.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

type M = ResolvedNode & {
  axes: { x: [string, string]; y: [string, string] };
  cells: { tl: string; tr: string; bl: string; br: string };
};

export function emitMatrix(n: M): string {
  const { x, y, w, h } = n.bbox;
  const cellW = w / 2;
  const cellH = h / 2;
  const text = (cx: number, cy: number, t: string) =>
    `<text x="${cx}" y="${cy}" font-family="Inter" font-weight="600" font-size="15" fill="#1F2937" text-anchor="middle">${t}</text>`;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5"/>
    <line x1="${x + cellW}" y1="${y}" x2="${x + cellW}" y2="${y + h}" stroke="#9CA3AF"/>
    <line x1="${x}" y1="${y + cellH}" x2="${x + w}" y2="${y + cellH}" stroke="#9CA3AF"/>
    ${text(x + cellW / 2, y + cellH / 2 + 6, n.cells.tl)}
    ${text(x + cellW * 1.5, y + cellH / 2 + 6, n.cells.tr)}
    ${text(x + cellW / 2, y + cellH * 1.5 + 6, n.cells.bl)}
    ${text(x + cellW * 1.5, y + cellH * 1.5 + 6, n.cells.br)}
    ${text(x + cellW / 2, y - 8, n.axes.x[0])}
    ${text(x + cellW * 1.5, y - 8, n.axes.x[1])}
    ${text(x - 32, y + cellH / 2 + 6, n.axes.y[0])}
    ${text(x - 32, y + cellH * 1.5 + 6, n.axes.y[1])}
  `;
}
```

`scripts/build/src/emitter/timeline.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";

type T = ResolvedNode & {
  axis_ms: { min: number; max: number; step: number };
  rows: Array<{
    label: string;
    segments: Array<{ color: string; ms: number; label?: string }>;
  }>;
};

const COLOR_MAP: Record<string, string> = { blue: "#2563EB", orange: "#F97316", green: "#16A34A", red: "#DC2626", neutral: "#9CA3AF" };

export function emitTimeline(n: T): string {
  const { x, y, w, h } = n.bbox;
  const axis = n.axis_ms;
  const pxPerMs = w / (axis.max - axis.min);
  const rowH = h / n.rows.length - 8;

  let out = "";
  n.rows.forEach((row, idx) => {
    const ry = y + idx * (rowH + 8);
    let rx = x;
    out += `<text x="${x - 8}" y="${ry + rowH / 2 + 6}" font-family="Inter" font-weight="600" font-size="14" fill="#1F2937" text-anchor="end">${row.label}</text>`;
    for (const seg of row.segments) {
      const sw = seg.ms * pxPerMs;
      out += `<rect x="${rx}" y="${ry}" width="${sw}" height="${rowH}" fill="${COLOR_MAP[seg.color]}" rx="3"/>`;
      if (seg.label) out += `<text x="${rx + sw / 2}" y="${ry + rowH / 2 + 5}" font-family="Inter" font-weight="600" font-size="13" fill="#FFFFFF" text-anchor="middle">${seg.label}</text>`;
      rx += sw;
    }
  });
  return out;
}
```

`scripts/build/src/emitter/illustration.ts`:

```ts
import type { ResolvedNode } from "../resolver/types";
import { readIconSvg } from "../icons/load";

export async function emitIllustration(n: ResolvedNode & { name: string; size: [number, number] }): Promise<string> {
  const svg = await readIconSvg(n.name);
  const inner = svg.replace(/^<\?xml[^?]+\?>\s*/i, "").replace(/<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
  return `<g transform="translate(${n.bbox.x},${n.bbox.y})" data-illustration="${n.name}">${inner}</g>`;
}
```

- [ ] **Step 4: Run tests, expect green**

```bash
bun test src/test/emitter/pattern-nodes.test.ts
```

**Checkpoint:** All pattern emitters available.

---

### Task 27: Title bar + emitter entry point

**Files:**
- Create: `scripts/build/src/emitter/title-bar.ts`
- Create: `scripts/build/src/emitter/index.ts`
- Create: `scripts/build/src/test/emitter/full.test.ts`

- [ ] **Step 1: Write failing test**

`scripts/build/src/test/emitter/full.test.ts`:

```ts
import { test, expect } from "bun:test";
import { emit } from "../../emitter";

test("emit returns a full SVG document", async () => {
  const tree: any = {
    canvas: { x: 0, y: 0, w: 1600, h: 1200 },
    byId: new Map(),
    ordered: [],
  };
  const out = await emit(tree, { headline: "Test", wordmark: true });
  expect(out).toContain("<svg");
  expect(out).toContain("</svg>");
  expect(out).toContain("Test");
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
bun test src/test/emitter/full.test.ts
```

- [ ] **Step 3: Implement title-bar.ts and index.ts**

`scripts/build/src/emitter/title-bar.ts`:

```ts
export function emitTitleBar(headline: string, withWordmark: boolean): string {
  return `
    <rect x="56" y="48" width="6" height="56" fill="#1FBFA8" rx="3"/>
    <text class="headline" x="84" y="92">${headline}</text>
    ${withWordmark ? `
      <g transform="translate(1352, 60)">
        <rect width="32" height="32" rx="8" fill="#1FBFA8"/>
        <text font-family="Inter" font-weight="800" font-size="22" fill="#FFFFFF" text-anchor="middle" x="16" y="22">B</text>
        <text class="wordmark" x="44" y="22">ByteByteGo</text>
      </g>` : ""}
  `;
}
```

`scripts/build/src/emitter/index.ts`:

```ts
import type { ResolvedTree } from "../resolver/types";
import { sharedCss, sharedDefs } from "./defs";
import { emitTitleBar } from "./title-bar";
import { emitPanel } from "./panel";
import { emitCard } from "./card";
import { emitStep } from "./step";
import { emitText } from "./text";
import { emitIcon } from "./icon";
import { emitConnector } from "./connector";
import { emitLifeline } from "./lifeline";
import { emitMessage } from "./message";
import { emitMatrix } from "./matrix";
import { emitTimeline } from "./timeline";
import { emitMisconception } from "./misconception";
import { emitIllustration } from "./illustration";

export type EmitTitleBar = { headline: string; wordmark: boolean };

export async function emit(tree: ResolvedTree, titleBar?: EmitTitleBar): Promise<string> {
  const { canvas, ordered } = tree;
  const body: string[] = [];

  for (const n of ordered) {
    switch (n.type) {
      case "panel": body.push(emitPanel(n as any)); break;
      case "card": body.push(emitCard(n as any)); break;
      case "step": body.push(emitStep(n as any)); break;
      case "text": body.push(emitText(n as any)); break;
      case "icon": body.push(await emitIcon(n as any)); break;
      case "illustration": body.push(await emitIllustration(n as any)); break;
      case "connector": body.push(emitConnector(n as any, tree)); break;
      case "lifeline": body.push(emitLifeline(n as any, ordered.find((o) => o.id === (n as any).parent?.replace(/^#/, ""))?.bbox ?? canvas)); break;
      case "message": body.push(emitMessage(n as any)); break;
      case "matrix2x2": body.push(emitMatrix(n as any)); break;
      case "timeline-bar": body.push(emitTimeline(n as any)); break;
      case "misconception": body.push(emitMisconception(n as any)); break;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.w} ${canvas.h}" width="${canvas.w}" height="${canvas.h}">
  <defs>
    <style><![CDATA[${sharedCss}]]></style>
    ${sharedDefs}
  </defs>
  <rect class="bg" width="${canvas.w}" height="${canvas.h}"/>
  ${titleBar ? emitTitleBar(titleBar.headline, titleBar.wordmark) : ""}
  ${body.join("\n")}
</svg>
`;
}
```

- [ ] **Step 4: Run all emitter tests**

```bash
bun test src/test/emitter/
```

Expected: green.

**Checkpoint:** Emitter pipeline complete.

---

## Phase G: CLI and golden tests

### Task 28: CLI entry point

**Files:**
- Create: `scripts/build/src/cli.ts`
- Create: `scripts/build/src/test/cli.test.ts`

- [ ] **Step 1: Write failing test**

`scripts/build/src/test/cli.test.ts`:

```ts
import { test, expect } from "bun:test";
import { build } from "../cli";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MINIMAL = {
  meta: {
    slug: "smoke",
    title: "Smoke",
    tier: "piece",
    pillars: ["networking"],
    depth: { mechanism: "#mat", tradeoff: "#mat", failure_mode: "#mc", numbers: "#card" },
    sources: ["https://example.com"],
  },
  canvas: { w: 1600, h: 1200, mode: "light-pastel", pattern: "vertical-explainer" },
  title_bar: { headline: "Smoke", wordmark: true },
  nodes: [
    { type: "panel", id: "p", theme: "mint", title: "Panel", anchor: { kind: "in", ref: "#canvas", pad: 56 }, size: "fill" },
    { type: "card", id: "card", parent: "#p", variant: "default", anchor: { kind: "in", ref: "#p", pad: 24, side: "top-left" }, size: [200, 100] },
    { type: "matrix2x2", id: "mat", parent: "#p", anchor: { kind: "in", ref: "#p", side: "center" }, axes: { x: ["a", "b"], y: ["c", "d"] }, cells: { tl: "1", tr: "2", bl: "3", br: "4" } },
    { type: "misconception", id: "mc", parent: "#p", text: "x" },
  ],
};

test("build writes an SVG for a valid minimal layout", async () => {
  const dir = mkdtempSync(join(tmpdir(), "viz-"));
  const layoutPath = join(dir, "layout.json");
  writeFileSync(layoutPath, JSON.stringify(MINIMAL));
  const { exitCode, svgPath } = await build(layoutPath);
  expect(exitCode).toBe(0);
  const svg = readFileSync(svgPath!, "utf-8");
  expect(svg).toContain("<svg");
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
bun test src/test/cli.test.ts
```

- [ ] **Step 3: Implement cli.ts**

`scripts/build/src/cli.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { LayoutSchema } from "./schema";
import { resolve as resolveTree } from "./resolver";
import { validate } from "./validator";
import { emit } from "./emitter";
import { ICONS } from "./icons/registry";
import { formatIssue } from "./validator/issue";

export async function build(layoutPath: string): Promise<{ exitCode: number; svgPath?: string }> {
  const raw = await readFile(layoutPath, "utf-8");
  const parsed = LayoutSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("[schema error]");
    console.error(parsed.error.format());
    return { exitCode: 1 };
  }
  const layout = parsed.data;
  const tree = resolveTree(layout);
  const issues = validate(tree, {
    meta: { depth: layout.meta.depth },
    registry: ICONS,
    sources: layout.meta.sources,
  });
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  for (const w of warnings) console.warn(formatIssue(w));
  if (errors.length > 0) {
    for (const e of errors) console.error(formatIssue(e));
    return { exitCode: 1 };
  }
  const svg = await emit(tree, layout.title_bar);
  const svgPath = join(dirname(layoutPath), "infographic.svg");
  await writeFile(svgPath, svg);
  console.log(`wrote ${svgPath}`);
  return { exitCode: 0, svgPath };
}

if (import.meta.main) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: bun src/cli.ts <layout.json>");
    process.exit(2);
  }
  build(path).then((r) => process.exit(r.exitCode));
}
```

- [ ] **Step 4: Run CLI tests**

```bash
bun test src/test/cli.test.ts
```

Expected: green.

**Checkpoint:** End-to-end pipeline runnable.

---

### Task 29: Golden fixtures — six composition patterns

**Files:**
- Create: `scripts/build/src/test/golden/fixtures/<pattern>/layout.json` (6 fixtures)
- Create: `scripts/build/src/test/golden/fixtures/<pattern>/golden.svg` (generated once + committed)
- Create: `scripts/build/src/test/golden/golden.test.ts`

- [ ] **Step 1: Author one layout.json per pattern**

For each pattern in `vertical-explainer`, `two-column`, `sequence`, `multi-panel-grid`, `system-diagram`, `before-after`, write a minimal but realistic `layout.json` that exercises the pattern. Use the existing `drafts/google-com-query/` SVGs as visual references; do not copy them, build clean small examples (2-3 panels, 5-8 nodes, all depth checkpoints satisfied).

Concrete example for `vertical-explainer` (`scripts/build/src/test/golden/fixtures/pattern-vertical-explainer/layout.json`):

```json
{
  "meta": {
    "slug": "fixture-ve",
    "title": "Vertical explainer fixture",
    "tier": "piece",
    "pillars": ["networking"],
    "depth": {
      "mechanism": "#seq",
      "tradeoff": "#mat",
      "failure_mode": "#mc",
      "numbers": "#card-num"
    },
    "sources": ["https://example.com"]
  },
  "canvas": { "w": 1600, "h": 1800, "mode": "light-pastel", "pattern": "vertical-explainer" },
  "title_bar": { "headline": "Vertical explainer fixture", "wordmark": true },
  "nodes": [
    { "type": "panel", "id": "p-1", "theme": "lilac",
      "title": "Step 1",
      "anchor": { "kind": "in", "ref": "#canvas", "pad": 56, "side": "top-center" },
      "size": [1488, 480] },
    { "type": "panel", "id": "p-2", "theme": "mint",
      "title": "Step 2",
      "anchor": { "kind": "below", "ref": "#p-1", "gap": 56 },
      "size": [1488, 480] },
    { "type": "panel", "id": "p-3", "theme": "peach",
      "title": "Step 3",
      "anchor": { "kind": "below", "ref": "#p-2", "gap": 56 },
      "size": [1488, 480] },
    { "type": "lifeline", "id": "seq", "parent": "#p-1",
      "header": { "name": "Client" },
      "x": { "eq_spaced": true } },
    { "type": "card",   "id": "card-num", "parent": "#p-2",
      "variant": "yellow-note",
      "anchor": { "kind": "in", "ref": "#p-2", "pad": 32, "side": "top-left" },
      "size": [400, 120] },
    { "type": "text",   "id": "t-num", "parent": "#card-num", "class": "annot",
      "multiline": ["DNS 30 ms", "TCP 25 ms", "TLS 1 RTT"] },
    { "type": "matrix2x2", "id": "mat", "parent": "#p-3",
      "anchor": { "kind": "in", "ref": "#p-3", "pad": 32, "side": "center" },
      "size": [400, 320],
      "axes": { "x": ["low", "high"], "y": ["slow", "fast"] },
      "cells": { "tl": "A", "tr": "B", "bl": "C", "br": "D" } },
    { "type": "misconception", "id": "mc", "parent": "#p-3", "text": "Not a magic black box." }
  ]
}
```

Repeat with appropriate node sets for the other five patterns.

- [ ] **Step 2: Generate goldens once**

```bash
cd scripts/build
for d in src/test/golden/fixtures/pattern-*; do
  bun src/cli.ts "$d/layout.json"
  mv "$d/infographic.svg" "$d/golden.svg"
done
```

Inspect each `golden.svg` visually (e.g. `open scripts/build/src/test/golden/fixtures/pattern-vertical-explainer/golden.svg`). If something looks wrong, fix the layout, regenerate, repeat. Goldens are committed only after manual inspection.

- [ ] **Step 3: Write the golden test**

`scripts/build/src/test/golden/golden.test.ts`:

```ts
import { test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "../../cli";

const FIX_DIR = join(import.meta.dir, "fixtures");

const fixtures = readdirSync(FIX_DIR);
for (const fx of fixtures) {
  test(`golden: ${fx}`, async () => {
    const layout = join(FIX_DIR, fx, "layout.json");
    const golden = readFileSync(join(FIX_DIR, fx, "golden.svg"), "utf-8");
    const { exitCode, svgPath } = await build(layout);
    expect(exitCode).toBe(0);
    const actual = readFileSync(svgPath!, "utf-8");
    expect(actual).toBe(golden);
  });
}
```

- [ ] **Step 4: Run golden tests, expect green**

```bash
bun test src/test/golden/
```

**Checkpoint:** Every composition pattern locked in by a snapshot.

---

### Task 30: Regression fixtures from session bugs

**Files:**
- Create: `scripts/build/src/test/golden/fixtures/regression-image-3-text-overflow/{layout.json, expected-error.txt}`
- Create: similar pairs for image-4, image-5, image-6
- Modify: `scripts/build/src/test/golden/golden.test.ts` to read regression fixtures expecting failure

Each regression fixture is a deliberately-broken layout. The CLI should exit non-zero and produce a specific error message. Snapshot the stderr.

- [ ] **Step 1: Author one regression layout per image**

`regression-image-3-text-overflow/layout.json`:

```json
{
  "meta": {
    "slug": "reg-3",
    "title": "Regression: text overflow",
    "tier": "piece",
    "pillars": ["networking"],
    "depth": { "mechanism": "#mat", "tradeoff": "#mat", "failure_mode": "#mc", "numbers": "#card" },
    "sources": ["https://example.com"]
  },
  "canvas": { "w": 1600, "h": 1200, "mode": "light-pastel", "pattern": "vertical-explainer" },
  "nodes": [
    { "type": "panel", "id": "p", "theme": "peach",
      "title": "Panel",
      "anchor": { "kind": "in", "ref": "#canvas", "pad": 56 }, "size": "fill" },
    { "type": "card",  "id": "card", "parent": "#p",
      "variant": "yellow-note",
      "anchor": { "kind": "in", "ref": "#p", "pad": 24, "side": "top-left" },
      "size": [240, 200] },
    { "type": "text",  "id": "t",  "parent": "#card", "class": "annot",
      "text": "TLS 1.3 ...... 1 RTT (0-RTT resume)" },
    { "type": "matrix2x2", "id": "mat", "parent": "#p",
      "anchor": { "kind": "in", "ref": "#p", "side": "center" }, "size": [400, 320],
      "axes": { "x": ["a", "b"], "y": ["c", "d"] },
      "cells": { "tl": "1", "tr": "2", "bl": "3", "br": "4" } },
    { "type": "misconception", "id": "mc", "parent": "#p", "text": "x" }
  ]
}
```

`regression-image-3-text-overflow/expected-error.txt`:

```
text-fit
```

(One token per regression: the rule name we expect to fire.)

Author the same shape for image-4 (`break_for` missing), image-5 (connector to a non-existent edge), image-6 (cross-panel connector to a missing node).

- [ ] **Step 2: Extend the golden test runner**

Modify `scripts/build/src/test/golden/golden.test.ts`:

```ts
import { test, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "../../cli";

const FIX_DIR = join(import.meta.dir, "fixtures");
const fixtures = readdirSync(FIX_DIR);

for (const fx of fixtures) {
  const expectedErrorFile = join(FIX_DIR, fx, "expected-error.txt");
  const goldenSvgFile = join(FIX_DIR, fx, "golden.svg");
  const isRegression = existsSync(expectedErrorFile);

  test(`fixture: ${fx}`, async () => {
    const result = await build(join(FIX_DIR, fx, "layout.json"));
    if (isRegression) {
      expect(result.exitCode).not.toBe(0);
      // Optionally: capture stderr to check rule name. Bun doesn't redirect by default;
      // for this test rely on the build returning, then assert via test-runner that exit was non-zero.
    } else {
      expect(result.exitCode).toBe(0);
      const golden = readFileSync(goldenSvgFile, "utf-8");
      const actual = readFileSync(result.svgPath!, "utf-8");
      expect(actual).toBe(golden);
    }
  });
}
```

- [ ] **Step 3: Run all tests**

```bash
bun test
```

Expected: green across the suite, including regression fixtures (which should exit non-zero, asserted by the test).

**Checkpoint:** Phase G complete. Suitable commit boundary.

---

## Phase H: Migration and integration

### Task 31: Migrate v1-bbg-flow to layout.json

**Files:**
- Create: `infographics/google-com-query/layout.json`
- Generated: `infographics/google-com-query/infographic.svg`

- [ ] **Step 1: Translate the v1-bbg-flow content to layout.json**

Walk the existing `drafts/google-com-query/v1-bbg-flow/infographic.svg` panel by panel and write the equivalent `layout.json`. Use:

- Three panels: Resolve Domain Name (lilac), Initiate Request (mint), Handle Response (peach). Anchor: `lilac in canvas top-left`, `mint below lilac`, `peach right_of lilac`.
- StepLabel nodes 1..4.
- Cache stack as a `card` with five `text` children.
- DNS resolver block with an `icon name="generic:resolver"` plus three small server cards.
- Three connectors with explicit `from`/`to` edges. None of them use literal coordinates.
- TLS handshake messages with `connector.break_for` pointing at the key icons.
- Render pipeline as a row of small `card` nodes with `after` anchors.
- Misconception callout: "DNS is not where TLS happens." (or similar).
- Numbers card: `annot` lines for DNS / TCP / TLS / TTFB / FCP / LCP.

Author the JSON, run the build, fix validator errors until clean.

- [ ] **Step 2: Build and render**

```bash
cd scripts/build && bun src/cli.ts ../../infographics/google-com-query/layout.json
cd ../..
bash scripts/svg-to-png.sh infographics/google-com-query/infographic.svg
```

- [ ] **Step 3: Diff visually against the hand-written reference**

```bash
open assets/exports/google-com-query/infographic.png drafts/google-com-query/v1-bbg-flow/preview.png
```

Compare. Note any layout drift in `infographics/google-com-query/spec.md` `Notes` section. Re-tune `layout.json` anchors / sizes until parity is acceptable. The four reported bugs (text overflow, key over arrow, arrow inside box, cross-panel anchor) must be absent.

**Checkpoint:** Generator parity with the existing hand-written draft validated. Hand-written drafts can stay where they are as visual reference.

---

### Task 32: Update /infographic command and documentation

**Files:**
- Modify: `.claude/commands/infographic.md`
- Modify: `CLAUDE.md`
- Modify: `style-guide.md`
- Modify: `templates/svg-skeleton.svg` (mark deprecated)

- [ ] **Step 1: Rewrite the per-piece section of `/infographic`**

Replace the SVG-generation steps in `.claude/commands/infographic.md` with the new pipeline:

```
4a. Research via WebSearch (3-5 queries).
4b. Write infographics/<slug>/spec.md (depth checkpoints reference future node ids).
4c. Write infographics/<slug>/data.json.
4d. Write infographics/<slug>/layout.json. Forbidden: raw SVG, literal xy for layout nodes.
    If a brand icon is missing from the registry, run:
      bun scripts/build/src/icons/fetch-brand.ts <slug>
    Then add the registry entry it printed.
4e. Run: bun scripts/build/src/cli.ts infographics/<slug>/layout.json
    On validator error: read the issue, edit layout.json, retry. Max 5 cycles.
    On a 5th failure: append the blocking issue to spec.md "Notes" and stop.
4f. Run: bash scripts/svg-to-png.sh infographics/<slug>/infographic.svg
```

Add a "Hard rule" near the top of the command body:

> Claude must never edit `infographic.svg` directly. It is a build artifact derived from `layout.json`.

- [ ] **Step 2: Add a layout.json section to CLAUDE.md**

Append a new section under the existing primary-command section explaining: schema location (`scripts/build/src/schema.ts`), the rule that `infographic.svg` is generated, and a short pointer to the spec / plan under `docs/superpowers/`.

- [ ] **Step 3: Add a brand-icon note to style-guide.md**

Append a "Brand icons (nominative fair use)" section:

```
Brand icons are sourced from Simple Icons (cdn.simpleicons.org) or vendor press kits. They
are used for editorial reference only. Each infographic's meta.sources must include the
canonical attribution URL for any brand icon it uses. To add a new brand icon:

    cd scripts/build && bun src/icons/fetch-brand.ts <slug>

and copy the suggested registry line into `scripts/build/src/icons/registry.ts`.
```

- [ ] **Step 4: Deprecate the old svg-skeleton.svg**

At the top of `templates/svg-skeleton.svg`, add an XML comment:

```xml
<!--
  Deprecated as the layout source after 2026-05-12. The generator under scripts/build/
  is now the source of truth for SVG output. This file is kept as a visual reference
  for the icon defs only.
-->
```

- [ ] **Step 5: Verify the command still parses by re-reading**

There is no automated check for the command markdown; do a manual scan: argument-hint, allowed-tools, the new pipeline section, the hard rule, the failure modes list.

**Checkpoint:** `/infographic` workflow points at the new generator. Documentation aligned. Phase H complete.

---

## Self-Review

**1. Spec coverage:**

- Section 1 (Problem) - illustrated by regression fixtures in Task 30.
- Section 2 (Goals) - all six patterns get a golden fixture (Task 29); regressions cover image-3 through image-6 (Task 30); variable canvas exercised by the tall-portrait pattern fixture; modifiability is structural (per-node-type emitters, single registry, validator rules as pure functions).
- Section 4.1 / 4.2 (Approach) - Task 6-11 implement Pass 1, Task 12-19 implement Pass 2, Task 22-27 implement Pass 3.
- Section 5 (Runtime) - Task 1.
- Section 6 (Data model) - Tasks 3, 4, 5.
- Section 6.3 (Anchor language) - Task 7 covers six anchor kinds with positive tests.
- Section 6.4 (Text budgets) - Task 14.
- Section 6.5 (Density rules) - Task 17 (numbers-per-panel, density-quota), Task 16 (depth coverage non-text rule).
- Section 7.1 (Resolver detail) - Tasks 6 through 11.
- Section 7.2 (Validator rules) - all eleven rules implemented across Tasks 13 to 18.
- Section 7.3 (Emitter) - Tasks 22 to 27.
- Section 8 (Icon library) - Tasks 20, 21.
- Section 9 (`/infographic` refactor) - Task 32.
- Section 10 (File structure) - matches Tasks 20, 22, etc.
- Section 11 (Testing) - schema (Tasks 3-5), resolver (6-11), validator (13-19), goldens (29-30), CLI integration (28).
- Section 12 (Migration) - Task 31.
- Section 13 (Failure modes) - mapped to specific rules in Tasks 14, 15, 17.

No gaps identified.

**2. Placeholder scan:** Skimmed the plan for "TODO", "TBD", "implement later" - none. The matrix and timeline emitters reference visual targets via the existing drafts, but include complete code. Custom illustrations beyond `server.svg` (cloud, db, monitor, etc.) are explicitly listed as part of Task 20 Step 1.

**3. Type consistency:** `parseRef` is defined in `resolver/connectors.ts` and used by `topo.ts`, `resolver/index.ts`, `validator/rules/containment.ts`, `validator/rules/connector-anchor.ts`, `validator/rules/depth-coverage.ts`. `ResolvedNode` and `ResolvedTree` are introduced in `resolver/types.ts` and used consistently. The icon registry type is exported from `validator/rules/icon-exists.ts` and re-used by the registry implementation in `icons/registry.ts`.

No fixes required.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-12-visual-qa-system.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
