# Incremental Build Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a build re-render only the lesson pages whose **body or practice JSON** changed, reusing every other page from a cached `dist/` — while any change to a shared input (component/layout/script/css/config, `tracks.json`/`units.json`, or **any lesson's frontmatter**) forces a full rebuild, so a stale page can never ship.

**Architecture:** A pre-build planner hashes every input, categorized into one `GLOBAL_HASH` (everything that can affect more than one page) and a per-page hash (each lesson's MDX **body** + its practice JSON — the only inputs rendered solely on that page). If `GLOBAL_HASH` changed / there is no cache / a full build is forced → **FULL** build (the existing 6-way sharded path). Otherwise → **INCREMENTAL**: a single `astro build` renders only the changed lesson pages (every `getStaticPaths` is gated, mirroring the existing `build-shard.ts`), then the freshly-rendered HTML is overlaid onto the restored cached `dist/`, the existing completeness guard + lint run, and the site deploys.

**Tech Stack:** Astro 6 (static output, `build.concurrency: 1`), Bun, Vitest, GitHub Actions, `node:crypto`. Builds directly on the Phase 0 render-sharding (`src/scripts/build-shard.ts`, `.github/workflows/deploy.yml`).

**Design refinement vs the approved spec (read first):** the spec originally split lesson frontmatter into "nav" (global) vs "non-nav" (per-lesson, incl. `summary/sources/estMin`). Grounding against the code disproved that split — `estMin` is rendered cross-lesson on the track index (`src/pages/[lang]/learn/[track]/index.astro` shows every sibling lesson's `estMin`), so treating any frontmatter field as per-lesson risks a stale page. **This plan implements the safe model: all frontmatter is global; only the MDX body + practice JSON are per-lesson.** Verified there is no build-time aggregate (no pagefind/sitemap/search index/JSON endpoint) that embeds lesson bodies, so a body/practice change provably affects only its own page. The spec's §3/§4 were amended to match.

---

## File Structure

**New files:**
- `site/src/scripts/incremental-hash.ts` — pure hashing + the build decision. Imports `node:crypto`. Imported by the `.mjs` scripts + its test. One responsibility: turn categorized inputs into hashes and a `full`/`incremental` decision.
- `site/src/scripts/incremental-hash.test.ts` — unit tests for the above.
- `site/src/scripts/build-incremental.ts` — the `getStaticPaths` gates (`incrementalConfig`/`selectLessons`/`selectOther`). **Zero node imports** (parses one env var), so it is safe to import from `.astro` route files, exactly like `build-shard.ts`.
- `site/src/scripts/build-incremental.test.ts` — unit tests for the gates.
- `site/scripts/incremental-plan.mjs` — pre-build: walk `src/`, compute current `GLOBAL_HASH` + per-page hashes, read the restored manifest, decide, write `build-cache/plan.json` + `build-cache/next-manifest.json`, print the mode.
- `site/scripts/incremental-merge.mjs` — post-build (incremental only): overlay the cached dist under the freshly-built pages, run the completeness guard, promote the manifest.
- `site/scripts/incremental-build.mjs` — local orchestrator that chains plan → build → merge for `bun run build:incremental`.

**Modified files:**
- `site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro` — compose `selectLessons()` with the existing `shardPaths()`.
- 22 other dynamic routes under `site/src/pages/` — wrap `getStaticPaths` output in `selectOther()`.
- `site/.gitignore` — ignore `build-cache/`.
- `site/package.json` — add the `build:incremental` script.
- `.github/workflows/deploy.yml` — add the `plan` job, branch full vs incremental, cache `dist/` + manifest, add force-full + nightly self-heal.

**Generated (gitignored) at `site/build-cache/`:** `manifest.json`, `plan.json`, `next-manifest.json` (+ a transient `prev-dist/` locally).

---

## Phase 1 — Local incremental engine (fully TDD, independently shippable)

At the end of Phase 1, `bun run build:incremental` works locally: the first run does a full build and writes a manifest; editing one practice file or one lesson body re-renders only those pages in seconds and overlays them onto the cached dist, with the completeness guard + lint green.

### Task 1: Frontmatter split + scalar extraction (`incremental-hash.ts`)

**Files:**
- Create: `site/src/scripts/incremental-hash.ts`
- Test: `site/src/scripts/incremental-hash.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/incremental-hash.test.ts
import { describe, it, expect } from "vitest";
import { splitFrontmatter, frontmatterField } from "./incremental-hash";

describe("splitFrontmatter", () => {
  it("separates the YAML frontmatter block from the body", () => {
    const raw = `---\ntitle: Hello\nslug: 01-intro\n---\n# Body\n\nText.`;
    const { frontmatter, body } = splitFrontmatter(raw);
    expect(frontmatter).toBe("title: Hello\nslug: 01-intro");
    expect(body).toBe("# Body\n\nText.");
  });

  it("returns empty frontmatter and the whole input as body when there is no fence", () => {
    const { frontmatter, body } = splitFrontmatter("no frontmatter here");
    expect(frontmatter).toBe("");
    expect(body).toBe("no frontmatter here");
  });
});

describe("frontmatterField", () => {
  const fm = `slug: 03-tcp-handshake\nlang: en\ntrack: networking\nunit: 03-tcp\ntitle: "Quoted Value"`;
  it("reads a bare scalar", () => {
    expect(frontmatterField(fm, "track")).toBe("networking");
  });
  it("strips surrounding quotes", () => {
    expect(frontmatterField(fm, "title")).toBe("Quoted Value");
  });
  it("returns null for an absent field", () => {
    expect(frontmatterField(fm, "estMin")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- incremental-hash`
Expected: FAIL — `Cannot find module './incremental-hash'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// site/src/scripts/incremental-hash.ts
import { createHash } from "node:crypto";

/** Split an MDX/MD file into its YAML frontmatter block and the body after it. */
export function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: "", body: raw };
  return { frontmatter: m[1], body: m[2] };
}

/** Read a single-line scalar field out of a frontmatter block (quotes stripped). */
export function frontmatterField(fm: string, name: string): string | null {
  const re = new RegExp(`^${name}:[ \\t]*["']?([^"'\\n]+?)["']?[ \\t]*$`, "m");
  const m = fm.match(re);
  return m ? m[1].trim() : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test -- incremental-hash`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/incremental-hash.ts site/src/scripts/incremental-hash.test.ts
git commit -m "feat(build-cache): frontmatter split + scalar extraction"
```

---

### Task 2: Hashing primitives (`incremental-hash.ts`)

**Files:**
- Modify: `site/src/scripts/incremental-hash.ts`
- Test: `site/src/scripts/incremental-hash.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `site/src/scripts/incremental-hash.test.ts`:

```ts
import { hashParts, pageHash, pageKeyOf } from "./incremental-hash";

describe("hashParts", () => {
  it("is deterministic for the same parts", () => {
    expect(hashParts(["a", "b"])).toBe(hashParts(["a", "b"]));
  });
  it("is order-sensitive", () => {
    expect(hashParts(["a", "b"])).not.toBe(hashParts(["b", "a"]));
  });
  it("is unambiguous across part boundaries (NUL-separated)", () => {
    // ["a","b"] must not collide with ["ab"]
    expect(hashParts(["a", "b"])).not.toBe(hashParts(["ab"]));
  });
});

describe("pageHash", () => {
  it("changes when the body changes", () => {
    expect(pageHash("body1", "practice")).not.toBe(pageHash("body2", "practice"));
  });
  it("changes when the practice changes", () => {
    expect(pageHash("body", "p1")).not.toBe(pageHash("body", "p2"));
  });
  it("is stable when neither changes", () => {
    expect(pageHash("body", "p")).toBe(pageHash("body", "p"));
  });
});

describe("pageKeyOf", () => {
  it("builds <lang>/<track>/<unit>/<slug>", () => {
    expect(pageKeyOf({ lang: "en", track: "networking", unit: "03-tcp", slug: "01-intro" }))
      .toBe("en/networking/03-tcp/01-intro");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- incremental-hash`
Expected: FAIL — `hashParts is not a function` (not exported yet).

- [ ] **Step 3: Add the implementation**

Append to `site/src/scripts/incremental-hash.ts`:

```ts
/** SHA-256 over an ordered list of parts, NUL-separated so boundaries are unambiguous. */
export function hashParts(parts: string[]): string {
  const h = createHash("sha256");
  for (const p of parts) {
    h.update(p);
    h.update("\0");
  }
  return h.digest("hex");
}

/** Per-page hash: the only inputs rendered solely on a lesson's own page. */
export function pageHash(bodyRaw: string, practiceRaw: string): string {
  return hashParts([bodyRaw, practiceRaw]);
}

/** The page identity the lesson route's getStaticPaths keys on. */
export function pageKeyOf(p: { lang: string; track: string; unit: string; slug: string }): string {
  return `${p.lang}/${p.track}/${p.unit}/${p.slug}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test -- incremental-hash`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/incremental-hash.ts site/src/scripts/incremental-hash.test.ts
git commit -m "feat(build-cache): sha256 hashing primitives"
```

---

### Task 3: The build decision (`decideBuild`)

**Files:**
- Modify: `site/src/scripts/incremental-hash.ts`
- Test: `site/src/scripts/incremental-hash.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `site/src/scripts/incremental-hash.test.ts`:

```ts
import { decideBuild, type Manifest } from "./incremental-hash";

const prev: Manifest = {
  globalHash: "G1",
  pages: { "en/n/01/a": "h1", "ru/n/01/a": "h2" },
};

describe("decideBuild", () => {
  it("is FULL when there is no previous manifest", () => {
    expect(decideBuild(null, { globalHash: "G1", pages: {} }).mode).toBe("full");
  });
  it("is FULL when the global hash changed", () => {
    const d = decideBuild(prev, { globalHash: "G2", pages: prev.pages });
    expect(d.mode).toBe("full");
    expect(d.changedPages).toEqual([]);
  });
  it("is FULL when forceFull is set, even if nothing else changed", () => {
    expect(decideBuild(prev, { globalHash: "G1", pages: prev.pages }, true).mode).toBe("full");
  });
  it("is INCREMENTAL listing only the pages whose hash changed", () => {
    const d = decideBuild(prev, { globalHash: "G1", pages: { "en/n/01/a": "h1-NEW", "ru/n/01/a": "h2" } });
    expect(d.mode).toBe("incremental");
    expect(d.changedPages).toEqual(["en/n/01/a"]);
  });
  it("is INCREMENTAL with an empty change set when global is unchanged and no body/practice moved", () => {
    const d = decideBuild(prev, { globalHash: "G1", pages: prev.pages });
    expect(d.mode).toBe("incremental");
    expect(d.changedPages).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- incremental-hash`
Expected: FAIL — `decideBuild is not a function`.

- [ ] **Step 3: Add the implementation**

Append to `site/src/scripts/incremental-hash.ts`:

```ts
export interface Manifest {
  globalHash: string;
  pages: Record<string, string>;
  pageCount?: number;
  builtAt?: string;
}

export interface BuildDecision {
  mode: "full" | "incremental";
  changedPages: string[];
}

/**
 * Decide full vs incremental. FULL whenever anything shared could affect other
 * pages (no cache, global hash changed, or forced). Otherwise INCREMENTAL with
 * the exact set of pages whose body/practice hash moved.
 *
 * Note: a lesson added or removed changes the frontmatter projection inside the
 * global hash, so such structural changes always land in the FULL branch — the
 * incremental branch only ever sees the same key set with some hashes changed.
 */
export function decideBuild(
  prev: Manifest | null,
  current: { globalHash: string; pages: Record<string, string> },
  forceFull = false,
): BuildDecision {
  if (forceFull || !prev || prev.globalHash !== current.globalHash) {
    return { mode: "full", changedPages: [] };
  }
  const changedPages: string[] = [];
  for (const [key, h] of Object.entries(current.pages)) {
    if (prev.pages[key] !== h) changedPages.push(key);
  }
  return { mode: "incremental", changedPages };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test -- incremental-hash`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/incremental-hash.ts site/src/scripts/incremental-hash.test.ts
git commit -m "feat(build-cache): full-vs-incremental decision"
```

---

### Task 4: getStaticPaths gates (`build-incremental.ts`)

**Files:**
- Create: `site/src/scripts/build-incremental.ts`
- Test: `site/src/scripts/build-incremental.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/build-incremental.test.ts
import { describe, it, expect } from "vitest";
import { incrementalConfig, selectLessons, selectOther } from "./build-incremental";

const FULL = { INCREMENTAL_PLAN: undefined } as unknown as NodeJS.ProcessEnv;
const INCR = { INCREMENTAL_PLAN: JSON.stringify({ mode: "incremental", changedPages: ["en/n/01/a"] }) } as NodeJS.ProcessEnv;

describe("incrementalConfig", () => {
  it("defaults to full when the env var is absent", () => {
    expect(incrementalConfig(FULL).mode).toBe("full");
  });
  it("defaults to full when the env var is malformed", () => {
    expect(incrementalConfig({ INCREMENTAL_PLAN: "{not json" } as NodeJS.ProcessEnv).mode).toBe("full");
  });
  it("reads incremental mode + the changed set", () => {
    const cfg = incrementalConfig(INCR);
    expect(cfg.mode).toBe("incremental");
    expect(cfg.changed.has("en/n/01/a")).toBe(true);
  });
});

describe("selectLessons", () => {
  const paths = [{ k: "en/n/01/a" }, { k: "en/n/01/b" }];
  const keyOf = (p: { k: string }) => p.k;
  it("keeps everything in full mode", () => {
    expect(selectLessons(paths, keyOf, incrementalConfig(FULL))).toHaveLength(2);
  });
  it("keeps only changed pages in incremental mode", () => {
    const got = selectLessons(paths, keyOf, incrementalConfig(INCR));
    expect(got).toEqual([{ k: "en/n/01/a" }]);
  });
});

describe("selectOther", () => {
  const paths = [1, 2, 3];
  it("keeps everything in full mode", () => {
    expect(selectOther(paths, incrementalConfig(FULL))).toEqual([1, 2, 3]);
  });
  it("drops everything in incremental mode", () => {
    expect(selectOther(paths, incrementalConfig(INCR))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- build-incremental`
Expected: FAIL — `Cannot find module './build-incremental'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// site/src/scripts/build-incremental.ts
// getStaticPaths gates for the incremental build. Mirrors build-shard.ts:
// ZERO node imports so this is safe to import from .astro route files. The
// plan (mode + changed page set) arrives as a JSON string in INCREMENTAL_PLAN.
// Any missing/malformed plan defaults to a FULL render — wasteful, never wrong.

export interface IncrementalConfig {
  mode: "full" | "incremental";
  changed: Set<string>;
}

export function incrementalConfig(env: NodeJS.ProcessEnv = process.env): IncrementalConfig {
  const raw = env.INCREMENTAL_PLAN;
  if (!raw) return { mode: "full", changed: new Set() };
  try {
    const plan = JSON.parse(raw) as { mode?: string; changedPages?: string[] };
    if (plan.mode === "incremental") {
      return { mode: "incremental", changed: new Set(plan.changedPages ?? []) };
    }
  } catch {
    /* malformed → fall through to full (safe default) */
  }
  return { mode: "full", changed: new Set() };
}

/** Lesson-route gate: full → all paths; incremental → only changed page keys. */
export function selectLessons<T>(
  paths: T[],
  keyOf: (p: T) => string,
  cfg: IncrementalConfig = incrementalConfig(),
): T[] {
  if (cfg.mode === "full") return paths;
  return paths.filter((p) => cfg.changed.has(keyOf(p)));
}

/** Non-lesson-route gate: full → all paths; incremental → none (served from cache). */
export function selectOther<T>(paths: T[], cfg: IncrementalConfig = incrementalConfig()): T[] {
  if (cfg.mode === "full") return paths;
  return [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test -- build-incremental`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/build-incremental.ts site/src/scripts/build-incremental.test.ts
git commit -m "feat(build-cache): getStaticPaths incremental gates"
```

---

### Task 5: Gate the lesson route

**Files:**
- Modify: `site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro:1-22`

- [ ] **Step 1: Add the import**

Change the import block at the top of the frontmatter (after the existing `shardPaths` import):

```astro
import { shardPaths } from "~/scripts/build-shard";
import { selectLessons } from "~/scripts/build-incremental";
```

- [ ] **Step 2: Compose the gates in getStaticPaths**

Replace the final `return shardPaths(...)` line with a composed gate (incremental filter first, then shard). The `keyOf` must match the page key the planner emits (`<lang>/<track>/<unit>/<slug>`):

```astro
  const keyOf = (p: { params: { lang: string; track: string; unit: string; lesson: string } }) =>
    `${p.params.lang}/${p.params.track}/${p.params.unit}/${p.params.lesson}`;
  // Incremental: keep only changed lessons. Full: identity, then split across shards.
  return shardPaths(selectLessons(paths, keyOf), keyOf);
```

- [ ] **Step 3: Verify a plain build is unchanged**

Run: `cd site && INCREMENTAL_PLAN= SHARD_TOTAL=1 bunx astro build --silent >/tmp/b.log 2>&1; bun scripts/check-dist-complete.mjs`
Expected: `check-dist-complete: OK — N/N lesson pages rendered.` (full count, e.g. 3372). No incremental plan ⇒ full ⇒ every lesson rendered.

- [ ] **Step 4: Verify the incremental gate keeps only the named page**

Run:
```bash
cd site
PLAN='{"mode":"incremental","changedPages":["en/networking/03-tcp-handshake/01-why-handshake"]}'
# Pick any real lesson key; list a few to choose from:
ls src/content/lessons/en/networking | head
```
Then set `changedPages` to one real `en/<track>/<unit>/<slug>` and:
```bash
INCREMENTAL_PLAN="$PLAN" SHARD_TOTAL=1 bunx astro build --silent >/tmp/b.log 2>&1
find dist -path '*/learn/*/index.html' | grep -c learn
```
Expected: a tiny count (the one gated lesson page + nothing else under `learn/` — non-lesson routes are gated to `[]`). This confirms the gate filters. (`dist` here is intentionally incomplete; the overlay in Task 8 fills it.)

- [ ] **Step 5: Commit**

```bash
git add "site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro"
git commit -m "feat(build-cache): gate lesson route with selectLessons"
```

---

### Task 6: Gate the 22 non-lesson dynamic routes

Every other route with a `getStaticPaths` must return `[]` in incremental mode so it is not re-rendered (it is served from the cached dist). A missed route only renders extra pages (wasteful, never incorrect), but gate them all for the speed win.

**Files (each: add the import, wrap the `getStaticPaths` return in `selectOther(...)`):**
- `site/src/pages/[lang]/index.astro`
- `site/src/pages/[lang]/account.astro`
- `site/src/pages/[lang]/achievements.astro`
- `site/src/pages/[lang]/calibrate.astro`
- `site/src/pages/[lang]/profile.astro`
- `site/src/pages/[lang]/projects.astro`
- `site/src/pages/[lang]/review.astro`
- `site/src/pages/[lang]/roadmap.astro`
- `site/src/pages/[lang]/settings.astro`
- `site/src/pages/[lang]/terms.astro`
- `site/src/pages/[lang]/english/index.astro`
- `site/src/pages/[lang]/english/grammar.astro`
- `site/src/pages/[lang]/english/reading.astro`
- `site/src/pages/[lang]/english/review.astro`
- `site/src/pages/[lang]/english/speaking.astro`
- `site/src/pages/[lang]/english/writing.astro`
- `site/src/pages/[lang]/glossary/index.astro`
- `site/src/pages/[lang]/glossary/[term].astro`
- `site/src/pages/[lang]/learn/index.astro`
- `site/src/pages/[lang]/learn/[track]/index.astro`
- `site/src/pages/[lang]/learn/[track]/lab.astro`
- `site/src/pages/[lang]/projects/[slug].astro`

- [ ] **Step 1: Apply the mechanical transform to every file above**

In each file, add this import to the frontmatter import block (use the `~` alias; it resolves in every `.astro`):

```astro
import { selectOther } from "~/scripts/build-incremental";
```

Then wrap whatever `getStaticPaths` returns. The routes have three shapes — apply the matching one:

**Shape A — lang-only map** (e.g. `learn/index.astro`, `index.astro`, `roadmap.astro`, `profile.astro`, most `[lang]/*`):
```astro
// before
  return (["en", "ru"] as const).map((lang) => ({ params: { lang } }));
// after
  return selectOther((["en", "ru"] as const).map((lang) => ({ params: { lang } })));
```

**Shape B — tracks × langs flatMap** (e.g. `learn/[track]/index.astro`, `learn/[track]/lab.astro`):
```astro
// before
  return tracks.flatMap((tr) =>
    (["en", "ru"] as const).map((lang) => ({ params: { lang, track: tr.data.slug } })),
  );
// after
  return selectOther(
    tracks.flatMap((tr) =>
      (["en", "ru"] as const).map((lang) => ({ params: { lang, track: tr.data.slug } })),
    ),
  );
```

**Shape C — collection-derived list** (e.g. `glossary/[term].astro`, `projects/[slug].astro`): bind the existing array to a `const paths` and return `selectOther(paths)`:
```astro
// before
  return terms.map((term) => ({ params: { lang, term: term.slug }, props: { term } }));
// after
  const paths = terms.map((term) => ({ params: { lang, term: term.slug }, props: { term } }));
  return selectOther(paths);
```

- [ ] **Step 2: Type-check + full build still green**

Run: `cd site && bun run check 2>&1 | tail -5 && SHARD_TOTAL=1 bun run build 2>&1 | tail -5`
Expected: `astro check` clean; full `bun run build` finishes with the lint summary and no errors (no `INCREMENTAL_PLAN` ⇒ full ⇒ every route renders as before).

- [ ] **Step 3: Verify incremental drops the non-lesson pages**

Run:
```bash
cd site
INCREMENTAL_PLAN='{"mode":"incremental","changedPages":[]}' SHARD_TOTAL=1 bunx astro build --silent >/tmp/b.log 2>&1
# With an empty change set, nothing lesson-side and nothing other-side renders:
find dist -name index.html | wc -l
```
Expected: `0` (or near-0) — every gate returned `[]`. Confirms the non-lesson gates fire.

- [ ] **Step 4: Commit**

```bash
git add site/src/pages
git commit -m "feat(build-cache): gate non-lesson routes with selectOther"
```

---

### Task 7: Pre-build planner (`incremental-plan.mjs`)

**Files:**
- Create: `site/scripts/incremental-plan.mjs`

- [ ] **Step 1: Write the planner**

```js
// site/scripts/incremental-plan.mjs
#!/usr/bin/env bun
// Pre-build decision. Walks src/, categorizes every input into the GLOBAL hash
// (anything that can affect >1 page, incl. ALL lesson frontmatter) vs per-page
// hashes (lesson MDX body + its practice JSON), compares to the restored
// manifest, and writes build-cache/plan.json + build-cache/next-manifest.json.
// Honors FORCE_FULL_BUILD=1. Prints the mode (and appends it to GITHUB_OUTPUT).
import { readdir, readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  splitFrontmatter, frontmatterField, hashParts, pageHash, pageKeyOf, decideBuild,
} from "../src/scripts/incremental-hash.ts";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(siteRoot, "src");
const LESSONS = join(SRC, "content", "lessons");
const PRACTICE = join(SRC, "content", "practice");
const CACHE = join(siteRoot, "build-cache");
const CONFIG = join(siteRoot, "astro.config.mjs");

const isUnder = (p, dir) => p === dir || p.startsWith(dir + "/");

async function walk(dir, acc = []) {
  let items;
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// ---- 1. read all of src/ once, categorize ----
const allSrc = await walk(SRC);
const globalFiles = [];   // {rel, content} — shared inputs
const lessonFiles = [];   // absolute paths of lesson MDX/MD
for (const p of allSrc) {
  if (isUnder(p, LESSONS) && /\.mdx?$/.test(p)) { lessonFiles.push(p); continue; }
  if (isUnder(p, PRACTICE) && p.endsWith(".json")) { continue; } // practice → per-page only
  // Everything else under src/ is a shared input (components, layouts, scripts,
  // css, i18n, tracks.json, units.json, content/path, content/projects, etc.)
  // NOTE: a lesson's frontmatter is folded into the global hash below; a lesson
  // body is per-page. Non-lesson/non-practice files go here verbatim.
  if (isUnder(p, LESSONS)) { continue; } // any non-mdx stray inside lessons/: ignore
  globalFiles.push({ rel: relative(siteRoot, p), content: await readFile(p, "utf8") });
}

// ---- 2. practice map: lessonKey -> raw json ----
const practiceRawByKey = {};
for (const p of await walk(PRACTICE)) {
  if (!p.endsWith(".json")) continue;
  const content = await readFile(p, "utf8");
  try {
    const key = JSON.parse(content).lessonKey;
    if (typeof key === "string") practiceRawByKey[key] = content;
  } catch { /* malformed practice json is the lint's problem, not ours */ }
}

// ---- 3. per-lesson: frontmatter -> global projection, body -> per-page ----
const pages = {};
const fmProjection = []; // "lessonId\0frontmatter" parts, sorted for determinism
for (const p of lessonFiles) {
  const raw = await readFile(p, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const lang = frontmatterField(frontmatter, "lang");
  const track = frontmatterField(frontmatter, "track");
  const unit = frontmatterField(frontmatter, "unit");
  const slug = frontmatterField(frontmatter, "slug");
  if (!lang || !track || !unit || !slug) {
    console.error(`incremental-plan: missing lang/track/unit/slug in ${relative(siteRoot, p)}`);
    process.exit(1);
  }
  const id = `${track}/${unit}/${slug}`;
  const key = pageKeyOf({ lang, track, unit, slug });
  fmProjection.push(`${relative(siteRoot, p)}\0${frontmatter}`);
  pages[key] = pageHash(body, practiceRawByKey[id] ?? "");
}

// ---- 4. GLOBAL_HASH = sorted shared files + config + sorted frontmatter projection ----
const globalParts = [
  ...globalFiles
    .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
    .map((f) => `${f.rel}\0${f.content}`),
  `astro.config.mjs\0${await readFile(CONFIG, "utf8")}`,
  "FRONTMATTER",
  ...fmProjection.sort(),
];
const globalHash = hashParts(globalParts);
const current = { globalHash, pages };

// ---- 5. read restored manifest, decide ----
let prev = null;
try { prev = JSON.parse(await readFile(join(CACHE, "manifest.json"), "utf8")); } catch { /* no cache */ }
const forceFull = process.env.FORCE_FULL_BUILD === "1";
const decision = decideBuild(prev, current, forceFull);

// ---- 6. write plan + next-manifest ----
await mkdir(CACHE, { recursive: true });
const plan = { mode: decision.mode, changedPages: decision.changedPages };
await writeFile(join(CACHE, "plan.json"), JSON.stringify(plan));
await writeFile(
  join(CACHE, "next-manifest.json"),
  JSON.stringify({ globalHash, pages, pageCount: Object.keys(pages).length }),
);

const summary =
  decision.mode === "full"
    ? `full (${forceFull ? "forced" : !prev ? "no cache" : "global hash changed"})`
    : `incremental — ${decision.changedPages.length} changed page(s)`;
console.log(`incremental-plan: ${summary}`);
if (process.env.GITHUB_OUTPUT) {
  await writeFile(process.env.GITHUB_OUTPUT, `mode=${decision.mode}\n`, { flag: "a" });
}
```

- [ ] **Step 2: Smoke-test full (no cache → full)**

Run: `cd site && rm -rf build-cache && bun scripts/incremental-plan.mjs`
Expected: `incremental-plan: full (no cache)`; `build-cache/plan.json` = `{"mode":"full","changedPages":[]}`; `build-cache/next-manifest.json` exists with a non-empty `pages` map (~3372 keys).

- [ ] **Step 3: Smoke-test no-op incremental (promote manifest, re-plan)**

Run:
```bash
cd site
cp build-cache/next-manifest.json build-cache/manifest.json
bun scripts/incremental-plan.mjs
```
Expected: `incremental-plan: incremental — 0 changed page(s)` (nothing changed since the manifest was just written from the same tree).

- [ ] **Step 4: Smoke-test a body change → 1 changed page**

Run:
```bash
cd site
F=$(find src/content/lessons/en -name index.mdx | head -1)
printf '\n<!-- incr-test -->\n' >> "$F"
bun scripts/incremental-plan.mjs
cat build-cache/plan.json
git checkout -- "$F"   # revert the probe
```
Expected: `incremental — 1 changed page(s)`; `plan.json.changedPages` contains exactly that lesson's `en/<track>/<unit>/<slug>` key.

- [ ] **Step 5: Smoke-test a frontmatter change → full**

Run:
```bash
cd site
F=$(find src/content/lessons/en -name index.mdx | head -1)
# bump estMin in the frontmatter to prove ANY frontmatter edit forces full
perl -0pi -e 's/^estMin:\s*\d+/estMin: 999/m' "$F"
bun scripts/incremental-plan.mjs
git checkout -- "$F"
```
Expected: `incremental-plan: full (global hash changed)` — confirms the all-frontmatter-is-global safety rule.

- [ ] **Step 6: Commit**

```bash
git add site/scripts/incremental-plan.mjs
git commit -m "feat(build-cache): pre-build planner (global + per-page hashing)"
```

---

### Task 8: Overlay + manifest promotion (`incremental-merge.mjs`)

**Files:**
- Create: `site/scripts/incremental-merge.mjs`

- [ ] **Step 1: Write the merge script**

```js
// site/scripts/incremental-merge.mjs
#!/usr/bin/env bun
// Incremental post-build: overlay the cached dist UNDER the freshly-built pages,
// run the completeness guard, then promote next-manifest.json -> manifest.json.
// Precondition: build-cache/prev-dist/ holds the previous full dist; dist/ holds
// ONLY the freshly-rendered changed lesson pages (+ their identical assets).
import { execFileSync } from "node:child_process";
import { stat, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const CACHE = join(siteRoot, "build-cache");
const PREV = join(CACHE, "prev-dist");
const DIST = join(siteRoot, "dist");

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

if (!(await exists(PREV))) {
  console.error("incremental-merge: build-cache/prev-dist/ missing — cannot overlay.");
  process.exit(1);
}

// `cp -an`: copy the cached tree into dist WITHOUT clobbering. Freshly-built
// changed pages already in dist win; every unchanged page + asset is filled from
// the cache. Identical hashed assets collide to the same bytes. Works on BSD
// (macOS) and GNU (Linux) cp alike.
execFileSync("cp", ["-an", `${PREV}/.`, `${DIST}/`], { stdio: "inherit" });

// Completeness guard: the merged dist MUST contain every lesson page.
execFileSync("bun", ["scripts/check-dist-complete.mjs"], { cwd: siteRoot, stdio: "inherit" });

// Promote the manifest only after the merged dist passed the guard.
await rename(join(CACHE, "next-manifest.json"), join(CACHE, "manifest.json"));
await rm(PREV, { recursive: true, force: true });
console.log("incremental-merge: overlay complete, manifest promoted.");
```

- [ ] **Step 2: There is no isolated unit test**

The overlay is filesystem orchestration; it is verified end-to-end in Task 10. (The hashing/decision logic it depends on is already covered in Tasks 1–3.)

- [ ] **Step 3: Commit**

```bash
git add site/scripts/incremental-merge.mjs
git commit -m "feat(build-cache): incremental overlay + manifest promotion"
```

---

### Task 9: Local orchestrator + wiring (`incremental-build.mjs`, package.json, .gitignore)

**Files:**
- Create: `site/scripts/incremental-build.mjs`
- Modify: `site/package.json` (scripts)
- Modify: `site/.gitignore`

- [ ] **Step 1: Add `build-cache/` to .gitignore**

Append to `site/.gitignore`:

```
build-cache/
```

- [ ] **Step 2: Write the local orchestrator**

```js
// site/scripts/incremental-build.mjs
#!/usr/bin/env bun
// Local convenience: chain plan -> astro build (gated) -> merge, the same steps
// CI runs as separate jobs. First run (no manifest) does a full build + writes
// the manifest; later runs go incremental when only bodies/practice changed.
import { execFileSync } from "node:child_process";
import { readFile, stat, rename, cp, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const CACHE = join(siteRoot, "build-cache");
const PREV = join(CACHE, "prev-dist");
const DIST = join(siteRoot, "dist");
const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { cwd: siteRoot, stdio: "inherit", env: { ...process.env, ...env } });
const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };

// 1. plan
run("bun", ["scripts/incremental-plan.mjs"]);
const plan = JSON.parse(await readFile(join(CACHE, "plan.json"), "utf8"));

// Incremental needs a prior dist to overlay. If it is missing (e.g. dist was
// cleaned), fall back to full so we never ship an incomplete site.
let mode = plan.mode;
if (mode === "incremental" && !(await exists(DIST))) {
  console.log("incremental-build: no prior dist/ — falling back to full.");
  mode = "full";
}

if (mode === "full") {
  // Full: plain build (no plan env, no shard) + the chained lint, then manifest.
  run("bun", ["run", "build"], { INCREMENTAL_PLAN: "", SHARD_TOTAL: "1" });
  await rename(join(CACHE, "next-manifest.json"), join(CACHE, "manifest.json"));
  console.log("incremental-build: full build done, manifest written.");
} else {
  // Incremental: snapshot the cached dist, render only changed pages, overlay.
  await rm(PREV, { recursive: true, force: true });
  await cp(DIST, PREV, { recursive: true });
  run("bunx", ["astro", "build"], {
    INCREMENTAL_PLAN: JSON.stringify(plan),
    SHARD_TOTAL: "1",
  });
  run("bun", ["scripts/incremental-merge.mjs"]);
  run("bun", ["scripts/lint-dist.mjs"]); // same lint the full `build` chains
  console.log(`incremental-build: incremental done — ${plan.changedPages.length} page(s).`);
}
```

- [ ] **Step 3: Add the package.json script**

In `site/package.json`, add to `scripts`:

```json
    "build:incremental": "bun scripts/incremental-build.mjs",
```

- [ ] **Step 4: Verify wiring loads**

Run: `cd site && bun scripts/incremental-build.mjs --help 2>/dev/null; echo "exit:$?"`
Expected: it starts planning (no `--help` handling needed) — the goal is only to confirm the script is syntactically valid and resolves its imports. A clean parse + plan output is success. (Full end-to-end is Task 10.)

- [ ] **Step 5: Commit**

```bash
git add site/scripts/incremental-build.mjs site/package.json site/.gitignore
git commit -m "feat(build-cache): local build:incremental orchestrator"
```

---

### Task 10: Local end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Clean baseline full build (writes the first manifest)**

Run:
```bash
cd site && rm -rf dist build-cache
time bun run build:incremental
bun scripts/check-dist-complete.mjs
```
Expected: `incremental-build: full build done, manifest written.`; guard prints `OK — N/N` (full lesson count); `build-cache/manifest.json` exists.

- [ ] **Step 2: No-op incremental (nothing changed)**

Run: `cd site && time bun run build:incremental`
Expected: `incremental done — 0 page(s).`; guard `OK — N/N`; wall time in **seconds** (astro renders nothing, overlay fills from cache).

- [ ] **Step 3: One practice edit → only that lesson's two pages re-render, content updates**

Run:
```bash
cd site
PF=$(find src/content/practice -name '*.json' | head -1)
KEY=$(bun -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).lessonKey)" "$PF")
echo "editing practice for $KEY"
# inject a unique marker into the first task title (en) to assert it renders
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('$PF','utf8'));j.tasks[0].title.en='INCRTEST '+j.tasks[0].title.en;fs.writeFileSync('$PF',JSON.stringify(j,null,2))"
time bun run build:incremental
cat build-cache/plan.json
# both en + ru pages for this lessonKey must be in the change set:
grep -o 'INCRTEST' "dist/en/learn/$KEY/index.html" | head -1
bun scripts/check-dist-complete.mjs
git checkout -- "$PF"
bun run build:incremental   # re-baseline the manifest to the reverted tree
```
Expected: `plan.json.changedPages` = exactly the two keys `en/$KEY` and `ru/$KEY`; the marker `INCRTEST` is present in the rendered en page; guard `OK — N/N` (overlay preserved every other page); incremental wall time in seconds.

- [ ] **Step 4: One body edit → only that single page re-renders**

Run:
```bash
cd site
LF=$(find src/content/lessons/en -name index.mdx | head -1)
printf '\n\nIncremental body probe paragraph.\n' >> "$LF"
bun run build:incremental
cat build-cache/plan.json
bun scripts/check-dist-complete.mjs
git checkout -- "$LF"
bun run build:incremental
```
Expected: `changedPages` length **1** (only the `en/...` page; the ru body is a separate file); guard `OK — N/N`.

- [ ] **Step 5: A shared-input edit → full rebuild**

Run:
```bash
cd site
printf '\n/* incr probe */\n' >> src/styles/lesson-kit.css
bun scripts/incremental-plan.mjs
git checkout -- src/styles/lesson-kit.css
```
Expected: `incremental-plan: full (global hash changed)` — editing any shared file forces full.

- [ ] **Step 6: Commit the verification note**

No code changed; record the result in the plan's tracking or proceed to Phase 2. (Nothing to commit.)

---

## Phase 2 — CI wiring (deploy.yml)

Wires the engine into the deploy pipeline: a `plan` job decides the mode; full uses the existing 6-way sharded path; incremental uses a single gated job; both overlay/guard/lint, deploy, and save the `dist/`+manifest cache for the next run. A `workflow_dispatch` toggle and a nightly schedule force a full rebuild (self-heal).

### Task 11: Rewrite `.github/workflows/deploy.yml`

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Replace the workflow with the conditional pipeline**

Full file (preserves the existing `gates`, `build-shard`, and the validated deploy step; adds `plan`, makes `build-shard`/`merge-deploy` full-only, adds `build-incremental`, adds caching + self-heal):

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  schedule:
    # Nightly forced full rebuild — re-baselines the cache against drift.
    - cron: "0 4 * * *"
  workflow_dispatch:
    inputs:
      branch:
        description: "Pages deploy branch — 'main' = production, anything else = preview URL"
        required: false
        default: "main"
      force_full:
        description: "Force a full (non-incremental) rebuild"
        required: false
        default: "false"

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  SHARD_TOTAL: "6"

jobs:
  gates:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11
      - name: Install root deps
        run: bun install --frozen-lockfile
      - name: Install site deps
        run: bun install --frozen-lockfile
        working-directory: site
      - name: Unit tests
        run: bun run test
        working-directory: site
      - name: Execute runnable code samples
        run: bun run verify:samples
        working-directory: site

  # Decide full vs incremental. Restores the manifest from the rolling cache,
  # hashes the tree, writes plan.json + next-manifest.json (shared downstream).
  plan:
    needs: gates
    runs-on: ubuntu-latest
    timeout-minutes: 15
    outputs:
      mode: ${{ steps.plan.outputs.mode }}
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11
      - name: Install site deps
        run: bun install --frozen-lockfile
        working-directory: site
      - name: Restore dist + manifest cache
        uses: actions/cache/restore@v4
        with:
          path: |
            site/dist
            site/build-cache/manifest.json
          key: site-dist-${{ github.run_id }}
          restore-keys: site-dist-
      - name: Plan build
        id: plan
        working-directory: site
        env:
          # Force full on a manual force_full=true or any scheduled run.
          FORCE_FULL_BUILD: ${{ (github.event_name == 'schedule' || inputs.force_full == 'true') && '1' || '0' }}
        run: bun scripts/incremental-plan.mjs
      - name: Upload plan
        uses: actions/upload-artifact@v4
        with:
          name: build-plan
          path: |
            site/build-cache/plan.json
            site/build-cache/next-manifest.json
          retention-days: 1
          if-no-files-found: error

  # ── FULL path ──────────────────────────────────────────────────────────────
  build-shard:
    needs: plan
    if: needs.plan.outputs.mode == 'full'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: true
      matrix:
        shard: [0, 1, 2, 3, 4, 5]
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11
      - name: Install site deps
        run: bun install --frozen-lockfile
        working-directory: site
      - name: Build shard ${{ matrix.shard }}/${{ env.SHARD_TOTAL }}
        working-directory: site
        env:
          SHARD_TOTAL: ${{ env.SHARD_TOTAL }}
          SHARD_INDEX: ${{ matrix.shard }}
        run: NODE_OPTIONS=--max-old-space-size=10240 bunx astro build
      - name: Upload shard artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist-${{ matrix.shard }}
          path: site/dist
          retention-days: 1
          if-no-files-found: error

  merge-deploy:
    needs: [plan, build-shard]
    if: needs.plan.outputs.mode == 'full'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11
      - name: Install root deps (provides wrangler)
        run: bun install --frozen-lockfile
      - name: Install site deps (for lint + guard)
        run: bun install --frozen-lockfile
        working-directory: site
      - name: Download shard artifacts
        uses: actions/download-artifact@v4
        with:
          pattern: dist-*
          path: shards
      - name: Download plan
        uses: actions/download-artifact@v4
        with:
          name: build-plan
          path: site/build-cache
      - name: Merge shards
        run: |
          mkdir -p site/dist
          shopt -s nullglob
          count=0
          for d in shards/dist-*; do
            cp -a "$d/." site/dist/
            count=$((count + 1))
          done
          echo "Merged $count shard(s)."
          if [ "$count" -ne "$SHARD_TOTAL" ]; then
            echo "Expected $SHARD_TOTAL shards, merged $count" >&2
            exit 1
          fi
      - name: Verify dist completeness
        run: bun scripts/check-dist-complete.mjs
        working-directory: site
      - name: Lint merged dist
        run: bun scripts/lint-dist.mjs
        working-directory: site
      - name: Promote manifest
        run: mv site/build-cache/next-manifest.json site/build-cache/manifest.json
      - name: Save dist + manifest cache
        uses: actions/cache/save@v4
        with:
          path: |
            site/dist
            site/build-cache/manifest.json
          key: site-dist-${{ github.run_id }}
      - name: Resolve deploy branch
        id: branch
        env:
          EVENT_NAME: ${{ github.event_name }}
          INPUT_BRANCH: ${{ inputs.branch }}
        run: |
          if [ "$EVENT_NAME" = "workflow_dispatch" ] && [ -n "$INPUT_BRANCH" ]; then
            name="$INPUT_BRANCH"
          else
            name="main"
          fi
          if ! printf '%s' "$name" | grep -Eq '^[A-Za-z0-9._/-]+$'; then
            echo "Invalid branch name: $name" >&2
            exit 1
          fi
          echo "name=$name" >> "$GITHUB_OUTPUT"
      - name: Deploy to Cloudflare Pages
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          DEPLOY_BRANCH: ${{ steps.branch.outputs.name }}
        run: bunx wrangler pages deploy site/dist --project-name=awesome-everything --branch="$DEPLOY_BRANCH"

  # ── INCREMENTAL path ────────────────────────────────────────────────────────
  build-incremental:
    needs: plan
    if: needs.plan.outputs.mode == 'incremental'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11
      - name: Install root deps (provides wrangler)
        run: bun install --frozen-lockfile
      - name: Install site deps
        run: bun install --frozen-lockfile
        working-directory: site
      - name: Restore dist + manifest cache
        uses: actions/cache/restore@v4
        with:
          path: |
            site/dist
            site/build-cache/manifest.json
          key: site-dist-${{ github.run_id }}
          restore-keys: site-dist-
      - name: Download plan
        uses: actions/download-artifact@v4
        with:
          name: build-plan
          path: site/build-cache
      - name: Snapshot cached dist
        run: |
          if [ ! -d site/dist ]; then
            echo "Restored cache had no dist/ — cannot run incremental." >&2
            exit 1
          fi
          rm -rf site/build-cache/prev-dist
          cp -a site/dist site/build-cache/prev-dist
      - name: Render changed pages
        working-directory: site
        env:
          SHARD_TOTAL: "1"
        run: |
          INCREMENTAL_PLAN="$(cat build-cache/plan.json)" \
            NODE_OPTIONS=--max-old-space-size=10240 bunx astro build
      - name: Overlay + guard + promote manifest
        run: bun scripts/incremental-merge.mjs
        working-directory: site
      - name: Lint merged dist
        run: bun scripts/lint-dist.mjs
        working-directory: site
      - name: Save dist + manifest cache
        uses: actions/cache/save@v4
        with:
          path: |
            site/dist
            site/build-cache/manifest.json
          key: site-dist-${{ github.run_id }}
      - name: Resolve deploy branch
        id: branch
        env:
          EVENT_NAME: ${{ github.event_name }}
          INPUT_BRANCH: ${{ inputs.branch }}
        run: |
          if [ "$EVENT_NAME" = "workflow_dispatch" ] && [ -n "$INPUT_BRANCH" ]; then
            name="$INPUT_BRANCH"
          else
            name="main"
          fi
          if ! printf '%s' "$name" | grep -Eq '^[A-Za-z0-9._/-]+$'; then
            echo "Invalid branch name: $name" >&2
            exit 1
          fi
          echo "name=$name" >> "$GITHUB_OUTPUT"
      - name: Deploy to Cloudflare Pages
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          DEPLOY_BRANCH: ${{ steps.branch.outputs.name }}
        run: bunx wrangler pages deploy site/dist --project-name=awesome-everything --branch="$DEPLOY_BRANCH"
```

- [ ] **Step 2: Validate the YAML locally**

Run: `cd /Users/artemmac/dev/awesome-everything && bunx --yes js-yaml .github/workflows/deploy.yml >/dev/null && echo "yaml ok"`
Expected: `yaml ok` (well-formed). (If `js-yaml` is unavailable offline, instead open the file and confirm the four jobs `gates`/`plan`/`build-shard`+`merge-deploy`/`build-incremental` and the two `if: needs.plan.outputs.mode == ...` guards.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(build-cache): conditional full/incremental deploy with rolling dist cache + nightly self-heal"
```

---

### Task 12: First CI run is full; verify the cache round-trips

**Files:** none (CI verification).

- [ ] **Step 1: Push the branch and open the PR / merge to main per the project flow**

The FIRST run after this lands has no `site-dist-*` cache → `plan` outputs `full` → the sharded path runs and SAVES the cache. Confirm in the Actions log: `incremental-plan: full (no cache)`, all 6 shards green, `check-dist-complete: OK`, deploy success.

- [ ] **Step 2: Verify the second run (a body/practice-only change) goes incremental**

After the full run cached the dist, push a commit that edits only a lesson body or a practice JSON. Confirm: `plan` outputs `incremental`, `build-incremental` runs (not `build-shard`), `incremental-merge: overlay complete`, `check-dist-complete: OK — N/N`, lint clean, deploy success — in a fraction of the full-run wall time.

- [ ] **Step 3: Verify a frontmatter/shared change forces full**

Push a commit touching a component or any lesson frontmatter field; confirm `plan` outputs `full` and the sharded path runs.

- [ ] **Step 4: Verify the nightly + manual self-heal**

Trigger `workflow_dispatch` with `force_full=true`; confirm `plan` outputs `full`. (The `schedule` cron does the same nightly.)

---

## Self-Review

**1. Spec coverage:**
- §3 GLOBAL_HASH gate → Tasks 3 (`decideBuild`) + 7 (planner computes global vs per-page). The nav/non-nav refinement is implemented as all-frontmatter-global (Task 7 folds every lesson's frontmatter into the global hash; only body+practice are per-page). ✓
- §4.1 `build-incremental.ts` hashing + select gates → Tasks 1–4. ✓
- §4.2 `incremental-plan.mjs` → Task 7. ✓
- §4.3 route gates (lesson + ~23 others) → Tasks 5–6. ✓
- §4.4 overlay + manifest → Task 8. ✓
- §4.5 CI (cache, plan→build→merge, full path kept, force-full + periodic) → Task 11. ✓
- §4.6 manifest shape `{globalHash, pages, pageCount, builtAt}` → Task 7 writes it (builtAt is optional and omitted; `Date.now()` is intentionally avoided in pure code — `builtAt` can be added in the save step later if needed; not required for correctness). ✓
- §5 risks: drift → forced+nightly full + guard (Task 11); new shared input auto-covered (Task 7 hashes all non-lesson/non-practice `src/**`); route gate missed → page count guard; assets unchanged when global unchanged. ✓
- §3 safety (never ship stale) → all-frontmatter-global + guard on merged dist + default-to-full on missing/malformed plan (Task 4). ✓

**2. Placeholder scan:** No TBD/“handle edge cases”/“similar to Task N”. Every code step shows complete code; the 22-route transform (Task 6) shows all three concrete shapes. ✓

**3. Type consistency:** `Manifest`/`BuildDecision`/`IncrementalConfig` defined once (Tasks 3–4) and reused. `pageKeyOf` / route `keyOf` both emit `<lang>/<track>/<unit>/<slug>`; the planner keys `pages` the same way; `selectLessons` filters on it; `decideBuild` diffs it. `globalHash`/`pageHash`/`hashParts`/`decideBuild`/`splitFrontmatter`/`frontmatterField` names are consistent across `incremental-hash.ts`, the planner, and the tests. `INCREMENTAL_PLAN` (JSON string) is written by the planner/orchestrator and read by `incrementalConfig`. ✓

**Known non-blocking note:** `builtAt` is omitted from the manifest to keep the planner free of `Date.now()` (deterministic, resume-safe). Add it in the cache-save step if a build timestamp is ever wanted; it has no effect on the decision.
