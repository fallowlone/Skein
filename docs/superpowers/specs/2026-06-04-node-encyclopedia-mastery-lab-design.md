# Node Encyclopedia + Mastery Lab — Design

**Date:** 2026-06-04
**Status:** approved (user approved 2026-06-04, skipping spec-review gate per user instruction "гони в writing-plans")

## Goal

Close the remaining theory gaps in the `node` track ("encyclopedia") with 5 new units
(~14 lessons EN+RU), and add a **Node Mastery Lab** — a curated, tiered, hands-on
practice hub at `/learn/node/lab` that gives the learner a clear "where to start →
build up → mastery" path. Net effect: ~220+ total exercises across the track, with the
Lab curating a 100+ understanding-focused progression.

## Context (verified)

- `node` track currently: units 00–09, 21 lessons, **103 per-lesson practice tasks**.
- Practice model: `practice` collection, glob `src/content/practice/**/*.json`, schema
  `{ lessonKey, track, tasks: PracticeTask[] (1..8) }`. `PracticeTask` = discriminated
  union on `type`: `diagnose | fix | sandbox | incident | design | predict` (see
  `site/src/content.config.ts:63-139`).
- `PracticeSection` component signature: `{ lang: Locale; lessonKey: string;
  tasks: PracticeTaskData[] }` (`site/src/components/pedagogy/PracticeSection.tsx:17`).
  Progress is keyed by `lessonKey` + `task.id` in localStorage via `practice-state.ts`.
  **It can be driven standalone** with a synthetic `lessonKey` — this is how the Lab
  reuses the full practice UX (ordering, "N of M done", tier legend, per-type hints).
- `drill` collection (`src/content.config.ts:167-176`) is the precedent for a separate
  practice-type collection with its own page + lint rule.
- Routes: `src/pages/[lang]/learn/[track]/index.astro`,
  `src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`.
- Lint rules live in `src/lint/rules/*.ts` (one per collection, e.g. `drill.ts`,
  `practice.ts`), run in the build pass.

## Component A — 5 new units (encyclopedia close)

All lessons: EN+RU, status `ready`, middle/senior depth, ≥1 structural diagram,
per-lesson practice JSON (~6 tasks each). Append to `units.json` as orders 10–14.

| Unit (order) | Lessons | Core theory |
|---|---|---|
| `10-networking-deep` (10) | `01-tcp-and-net` (middle), `02-udp-and-dgram` (middle), `03-sockets-in-production` (senior) | `net` module, TCP sockets, `Server`/`Socket`, half-open, Nagle/`setNoDelay`, keep-alive, timeouts, socket backpressure; `dgram`/UDP, datagrams vs streams, multicast, when UDP |
| `11-tls-and-http2` (11) | `01-tls-and-https` (middle), `02-http2-and-alpn` (senior), `03-http-client-deep` (middle) | `tls`/`https.createServer`, certs/SNI/ALPN, session resumption; HTTP/2 multiplexing, server push deprecation, `http2` core; client side — `undici`, keep-alive connection pools, agents |
| `12-native-and-ffi` (12) | `01-native-addons-napi` (senior), `02-build-and-wasm-alternatives` (senior) | N-API/node-addon-api, the ABI-stability promise, calling C/C++; node-gyp, prebuilds, when NOT to (WASM, child process, pure-JS), the maintenance cost |
| `13-modules-deep` (13) | `01-module-resolution-algorithm` (middle), `02-package-exports-and-conditions` (senior) | CJS vs ESM resolution algorithms, `node_modules` walk, `package.json` `main`/`type`; `exports`/`imports` maps, conditional exports, dual-package hazard, subpath patterns |
| `14-v8-and-crypto` (14) | `01-v8-optimization` (senior), `02-crypto-deep` (middle), `03-heap-snapshots-and-flamegraphs` (senior) | V8: hidden classes/shapes, inline caches, deopt triggers, GC generations (scavenge/mark-sweep), `--allow-natives-syntax` peek; `crypto` — hash/HMAC/sign-verify/KDF (scrypt/pbkdf2), `timingSafeEqual`, randomness; heap snapshots, retainers, flame graphs, `--prof`/`--cpu-prof` |

~14 lessons → ~85 new per-lesson practice tasks. Sources from nodejs.org + V8 blog +
relevant RFCs/tool docs. Lessons may declare `prereqs` into existing node units.

## Component B — Node Mastery Lab

### B.1 New `lab` content collection
- Files: `src/content/lab/node/<tier>.json`, one per tier.
- Tiers (ordered): `warmup`, `build`, `diagnose`, `capstone`.
- Schema (add to `content.config.ts`, register in `collections`):
  ```ts
  const LabTier = z.enum(["warmup", "build", "diagnose", "capstone"]);
  const lab = defineCollection({
    loader: glob({ pattern: "**/*.json", base: "./src/content/lab" }),
    schema: z.object({
      track: Track,
      tier: LabTier,
      order: z.number().int().nonnegative(),
      title: Bi,
      intro: Bi,
      challenges: z.array(PracticeTask).min(3).max(20),
    }),
  });
  ```
  Reuses `PracticeTask` (already exported as `PracticeTaskData`) so the Lab challenges
  render through the existing `PracticeSection` with zero new task-rendering code.
- ~35 challenges total across tiers, EN+RU, understanding-focused (mostly `design`,
  `incident`, `fix`, `predict`):
  - **warmup** (~8, `predict`/`fix`): reinforce runtime/async/streams reasoning.
  - **build** (~14, `design`): static-file server on raw `net`; UDP service-discovery;
    Transform stream honoring backpressure; dual-package ESM/CJS lib with `exports`
    map; N-API hello-world addon; HTTP/2 server with ALPN; timing-safe token compare.
  - **diagnose** (~9, `incident`/`fix`): find the leak via heap snapshot; fix a V8
    deopt found in `--prof`; trace event-loop lag to a sync call; debug a dual-package
    hazard; resolve a TLS handshake failure.
  - **capstone** (~4, `design`): a production service combining net/TLS/streams/
    observability/crypto; a CLI tool; a library published with correct exports.

### B.2 Page `src/pages/[lang]/learn/[track]/lab.astro`
- `getStaticPaths` emits `{ lang, track }` only for tracks that have ≥1 `lab` entry
  (→ currently `node` only; generalizable later).
- Renders: header (track title + "Mastery Lab" + overall "M of N done" progress +
  a "start here" path line `warmup → build → diagnose → capstone`), then one section
  per tier in order, each mounting `<PracticeSection client:visible lang lessonKey
  tasks={tier.challenges} />` with synthetic `lessonKey = "node-lab-<tier>"`.
- A "Foundations" block linking each node unit's lessons in recommended order (the
  per-lesson practice is the warmup layer). Uses existing track/unit/lesson data.
- Layout mirrors `Topic.astro`/existing `/learn` pages; hydration cap respected
  (≤5 islands — 4 tier PracticeSections + header is fine; if needed, lazy via
  `client:visible`).

### B.3 Navigation
- CTA link to `/learn/node/lab` from `src/pages/[lang]/learn/[track]/index.astro`
  (shown for tracks with a lab; node only for now).

## Component C — Build enforcement

New `src/lint/rules/lab.ts` (+ test) run in the build pass:
1. i18n parity — every `Bi`/`BiText` field has non-empty `en` AND `ru`.
2. Per tier present for a track that exposes a Lab (warmup/build/diagnose/capstone all
   exist for node).
3. Unique challenge `id` across the track's lab.
4. Min challenge counts per tier (warmup ≥5, build ≥8, diagnose ≥5, capstone ≥2).
5. Each challenge passes `PracticeTask` schema (Zod) — pre-validate in authoring too.

## Data flow

`lab/node/*.json` → `lab` collection → `lab.astro` getStaticPaths/getEntry →
`PracticeSection` (client:visible) → `practice-state` localStorage (keyed
`node-lab-<tier>` + challenge id) → progress meter. Per-lesson practice unchanged.

## Error handling / edge cases

- Lab page for a track with no lab data → not emitted (getStaticPaths filter), no 404
  surface in nav (CTA only shown when lab exists).
- Practice JSON must be Zod-pre-validated before build (recurring gotcha): no
  `grading` wrapper on `design`/`incident`; `incident.steps` = `{label,prompt,reveal}`
  objects; `fix.starter` is a plain string; `fix`/`diagnose` self `rubric` items are
  `{en,ru}`; escape literal `{`/`}` in display text; crux ≤135.

## Testing

- `lab.test.ts` for the lint rule (parity, counts, unique ids, schema).
- Extend any track-count tests if present.
- Full `bun run test` + `bun run build` green, lint 0/0, `/en/learn/node/lab` and
  `/ru/learn/node/lab` render.

## Execution

Subagent-driven; large scope → parallel git worktrees (one branch per new unit-group
+ one for the Lab collection/page/lint), coordinator merges sequentially (units.json
union-dedup-by-id as before). Only the coordinator merges/pushes.

## Out of scope (YAGNI)

- Lab for tracks other than node (collection is generic; only node seeded).
- New task-rendering UI (reuse `PracticeSection`).
- Executable auto-grading beyond existing `exec` runtimes.
