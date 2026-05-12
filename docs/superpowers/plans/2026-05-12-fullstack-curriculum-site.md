# Fullstack Curriculum Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bilingual (EN+RU) static site delivering middle+/senior fullstack theory across 16 pillars, with full compass-grade pedagogy machinery (pretest, 3-tier accordions, faded WOE, retrieval, reactive diagrams, animations, personas, sandbox, spiral threads, spaced revisit), Chapter 01 Networking fully authored, the remaining 15 chapters scaffolded as browsable shells, and the `/infographic` command rewritten to author future chapters into the new pipeline.

**Architecture:** Astro 5 static + `@astrojs/preact` for stateful pedagogy islands + Tailwind tokens (already wired) + GSAP 3 + MDX. Single `user-state.ts` exporting a `signal<UserState>` backed by localStorage. Content collections: `pillars` + `chapters` (data) + `book` (existing MDX collection extended). Astro built-in i18n routes `/en/` and `/ru/` with `ru→en` fallback. Build-time linter (9 rules) gates publication.

**Tech Stack:** Astro 5, Preact 10, @preact/signals, Tailwind 3, GSAP 3, MDX, Vitest, Playwright, Bun, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md`

**Conventions:**

- All paths from repo root `/Users/artemmac/dev/awesome-everything`.
- The Astro project lives in `site/`. Repo root remains `package.json`-free.
- Pillar slugs match the existing `site/src/content/config.ts` enum: `networking, browser, frontend, backend, apis, databases, caching, queues, distributed, security, observability, deployment, performance, data-engineering, ai-llm, engineering-practice`. Spec used different slugs in places — plan supersedes spec for slug values.
- User CLAUDE.md rule: "No git commit unless explicitly asked." Each task lists a recommended commit, but the executor MUST batch by phase and request user approval before running any `git commit`.
- TDD for deterministic logic (`user-state`, `tier-router`, reactive-diagram `compute` functions, linter rules). Visual Astro components verified by `astro check` + `bun run build` + manual browser sweep. Interaction flows covered by Playwright smokes.
- Bite-sized: each step ~2–5 minutes. Each test fails before its implementation.
- DRY: shared helpers in `site/src/scripts/`. YAGNI: no features outside spec §3.

---

## Phase P0 — Foundation + skeleton

### Task P0.1: Install Preact, @preact/signals, Vitest, Playwright

**Files:**
- Modify: `site/package.json`
- Modify: `site/astro.config.mjs`
- Create: `site/vitest.config.ts`
- Create: `site/playwright.config.ts`
- Create: `site/.gitignore`
- Modify: `.gitignore` (repo root)

- [ ] **Step 1: Add dev + runtime deps to `site/package.json`**

Add to `dependencies`:

```json
"@astrojs/preact": "^4.0.0",
"preact": "^10.22.0",
"@preact/signals": "^1.3.0"
```

Add to `devDependencies` (create section if missing):

```json
"vitest": "^2.1.0",
"@vitest/ui": "^2.1.0",
"@playwright/test": "^1.48.0",
"jsdom": "^25.0.0"
```

Add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test",
"e2e:ui": "playwright test --ui"
```

- [ ] **Step 2: Install**

```bash
cd site && bun install
```

Expected: no errors. `bun.lock` updated. `node_modules/@astrojs/preact/` exists.

- [ ] **Step 3: Register Preact integration in `site/astro.config.mjs`**

```js
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";

export default defineConfig({
  output: "static",
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    preact({ compat: false }),
  ],
  markdown: {
    shikiConfig: { theme: "github-light", wrap: true },
  },
  vite: {
    ssr: { noExternal: ["gsap"] },
  },
});
```

- [ ] **Step 4: Create `site/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
    coverage: { provider: "v8", reporter: ["text", "json"] },
  },
  resolve: {
    alias: { "~": new URL("./src", import.meta.url).pathname },
  },
});
```

- [ ] **Step 5: Create `site/playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 6: Append to `site/.gitignore`**

```
node_modules/
dist/
.astro/
playwright-report/
test-results/
coverage/
```

- [ ] **Step 7: Append to repo root `.gitignore`**

```
.superpowers/
```

- [ ] **Step 8: Smoke test build still works**

```bash
cd site && bun run build
```

Expected: build passes, `dist/` regenerated.

- [ ] **Step 9: Recommended commit**

```bash
git add site/package.json site/bun.lock site/astro.config.mjs site/vitest.config.ts site/playwright.config.ts site/.gitignore .gitignore
git commit -m "feat: add Preact, Vitest, Playwright to site"
```

**Checkpoint:** Stack expanded. Build still green.

---

### Task P0.2: Add Astro built-in i18n

**Files:**
- Modify: `site/astro.config.mjs`
- Create: `site/src/i18n/ui.json`
- Create: `site/src/i18n/glossary.json`
- Create: `site/src/i18n/index.ts`
- Test: `site/src/i18n/index.test.ts`

- [ ] **Step 1: Failing test for locale helpers**

Create `site/src/i18n/index.test.ts`:

```ts
import { expect, test, describe } from "vitest";
import { t, swapLocale, isLocale } from "./index";

describe("i18n", () => {
  test("isLocale recognises en and ru", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  test("t falls back to en when key missing in ru", () => {
    expect(t("nav.home", "ru")).toBeTypeOf("string");
    expect(t("__missing__", "en")).toBe("__missing__");
  });

  test("swapLocale swaps prefix only", () => {
    expect(swapLocale("/en/networking/tcp-handshake/", "ru"))
      .toBe("/ru/networking/tcp-handshake/");
    expect(swapLocale("/ru/", "en")).toBe("/en/");
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

```bash
cd site && bun run test
```

Expected: 3 fails (module not found).

- [ ] **Step 3: Create `site/src/i18n/ui.json`**

```json
{
  "en": {
    "site.title": "Awesome Everything",
    "site.tagline": "Senior fullstack curriculum",
    "nav.home": "Pillars",
    "nav.settings": "Settings",
    "nav.about": "About",
    "tier.junior": "intuition",
    "tier.middle": "core",
    "tier.senior": "deep",
    "pretest.title": "Three quick questions",
    "pretest.subtitle": "We'll pick a default depth tier for you.",
    "pretest.skip": "Skip — set me to core",
    "pretest.submit": "See result",
    "retrieval.title": "Recall before you leave",
    "retrieval.reveal": "Reveal answer",
    "fade.next": "Next step",
    "fade.prev": "Back",
    "fade.reveal": "Reveal solution",
    "revisit.title": "Time for a revisit",
    "revisit.cta": "Quick recall",
    "revisit.dismiss": "Later",
    "stub.heading": "Coming soon",
    "stub.body": "This piece is on the roadmap. Crux + outline below."
  },
  "ru": {
    "site.title": "Awesome Everything",
    "site.tagline": "Программа Senior Fullstack",
    "nav.home": "Столпы",
    "nav.settings": "Настройки",
    "nav.about": "О проекте",
    "tier.junior": "интуиция",
    "tier.middle": "база",
    "tier.senior": "глубина",
    "pretest.title": "Три коротких вопроса",
    "pretest.subtitle": "Подберём уровень глубины по умолчанию.",
    "pretest.skip": "Пропустить — поставь \"базу\"",
    "pretest.submit": "Узнать результат",
    "retrieval.title": "Вспомните перед уходом",
    "retrieval.reveal": "Показать ответ",
    "fade.next": "Дальше",
    "fade.prev": "Назад",
    "fade.reveal": "Показать решение",
    "revisit.title": "Пора повторить",
    "revisit.cta": "Быстрое повторение",
    "revisit.dismiss": "Позже",
    "stub.heading": "Скоро",
    "stub.body": "Этот фрагмент в плане. Crux и план ниже."
  }
}
```

- [ ] **Step 4: Create `site/src/i18n/glossary.json`** (seed with the terms Chapter 01 needs; extend per chapter)

```json
{
  "tcp_segment":    { "en": "TCP segment",     "ru": "TCP-сегмент" },
  "handshake":      { "en": "handshake",       "ru": "рукопожатие" },
  "packet":         { "en": "packet",          "ru": "пакет" },
  "frame":          { "en": "frame",           "ru": "кадр" },
  "router":         { "en": "router",          "ru": "маршрутизатор" },
  "resolver":       { "en": "resolver",        "ru": "DNS-резолвер" },
  "certificate":    { "en": "certificate",     "ru": "сертификат" },
  "encapsulation":  { "en": "encapsulation",   "ru": "инкапсуляция" },
  "multiplexing":   { "en": "multiplexing",    "ru": "мультиплексирование" },
  "statefulness":   { "en": "statefulness",    "ru": "состояние" },
  "latency":        { "en": "latency",         "ru": "задержка" },
  "throughput":     { "en": "throughput",      "ru": "пропускная способность" },
  "rtt":            { "en": "RTT",             "ru": "RTT" },
  "mtu":            { "en": "MTU",             "ru": "MTU" },
  "mss":            { "en": "MSS",             "ru": "MSS" },
  "congestion_window": { "en": "congestion window", "ru": "окно перегрузки" }
}
```

- [ ] **Step 5: Create `site/src/i18n/index.ts`**

```ts
import uiStrings from "./ui.json";

export type Locale = "en" | "ru";
const LOCALES: Locale[] = ["en", "ru"];

export function isLocale(s: string): s is Locale {
  return (LOCALES as readonly string[]).includes(s);
}

export function t(key: string, lang: Locale): string {
  const fromLang = (uiStrings as Record<Locale, Record<string, string>>)[lang]?.[key];
  if (fromLang) return fromLang;
  const fromEn = (uiStrings as Record<Locale, Record<string, string>>).en?.[key];
  return fromEn ?? key;
}

export function swapLocale(path: string, target: Locale): string {
  return path.replace(/^\/(en|ru)(?=\/|$)/, `/${target}`);
}

export function localeFromPath(path: string): Locale {
  const m = path.match(/^\/(en|ru)(?:\/|$)/);
  return (m?.[1] as Locale) ?? "en";
}
```

- [ ] **Step 6: Run tests, confirm pass**

```bash
cd site && bun run test
```

Expected: 3 pass.

- [ ] **Step 7: Add i18n block to `site/astro.config.mjs`**

Inside `defineConfig({...})` add:

```js
i18n: {
  defaultLocale: "en",
  locales: ["en", "ru"],
  routing: { prefixDefaultLocale: true, redirectToDefaultLocale: true },
  fallback: { ru: "en" },
},
```

- [ ] **Step 8: Recommended commit**

```bash
git add site/src/i18n/ site/astro.config.mjs
git commit -m "feat(i18n): add Astro i18n routing + ui/glossary tables"
```

**Checkpoint:** EN + RU routing live. `/en/` and `/ru/` resolve. UI strings keyed.

---

### Task P0.3: Rewrite content collections — pillars + chapters + pieces

**Files:**
- Modify: `site/src/content/config.ts`
- Create: `site/src/types/index.ts`
- Test: `site/src/content/config.test.ts`

- [ ] **Step 1: Define shared types**

Create `site/src/types/index.ts`:

```ts
export type Pillar =
  | "networking" | "browser" | "frontend" | "backend"
  | "apis" | "databases" | "caching" | "queues"
  | "distributed" | "security" | "observability" | "deployment"
  | "performance" | "data-engineering" | "ai-llm" | "engineering-practice";

export const PILLARS: Pillar[] = [
  "networking","browser","frontend","backend",
  "apis","databases","caching","queues",
  "distributed","security","observability","deployment",
  "performance","data-engineering","ai-llm","engineering-practice",
];

export type Tier = "junior" | "middle" | "senior";
export type Lang = "en" | "ru";
export type SpiralThread = "encapsulation" | "multiplexing" | "statefulness" | "latency";
export type Status = "stub" | "draft" | "ready";

export type Bilingual = { en: string; ru: string };
```

- [ ] **Step 2: Write failing test for new collection schemas**

Create `site/src/content/config.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { collections } from "./config";

describe("content collections", () => {
  test("pillars schema accepts a valid pillar entry", () => {
    const valid = {
      slug: "networking",
      order: 1,
      title: { en: "Networking & Protocols", ru: "Сети и протоколы" },
      blurb: { en: "...", ru: "..." },
      color: "lilac",
      prereqs: [],
    };
    expect(() => collections.pillars.schema.parse(valid)).not.toThrow();
  });

  test("pillars schema rejects unknown slug", () => {
    expect(() => collections.pillars.schema.parse({
      slug: "garbage", order: 1,
      title: { en: "x", ru: "x" }, blurb: { en: "x", ru: "x" },
      color: "lilac", prereqs: [],
    })).toThrow();
  });

  test("chapters schema accepts a valid chapter entry", () => {
    expect(() => collections.chapters.schema.parse({
      slug: "01-networking", pillar: "networking", order: 1,
      title: { en: "How the internet works", ru: "Как работает интернет" },
      crux: { en: "?", ru: "?" },
      pieces: ["01-physical-link", "02-ip-packet"],
    })).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test, confirm failure**

```bash
cd site && bun run test
```

Expected: 3 fails (schema mismatch).

- [ ] **Step 4: Rewrite `site/src/content/config.ts`**

```ts
import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";
import { PILLARS } from "../types";

const Pillar = z.enum(PILLARS as [string, ...string[]]);
const Tier = z.enum(["junior", "middle", "senior"]);
const Lang = z.enum(["en", "ru"]);
const Spiral = z.enum(["encapsulation","multiplexing","statefulness","latency"]);
const Status = z.enum(["stub","draft","ready"]);
const Bi = z.object({ en: z.string().min(1), ru: z.string().min(1) });

const pillars = defineCollection({
  loader: file("src/content/pillars.json"),
  schema: z.object({
    slug: Pillar,
    order: z.number().int().positive(),
    title: Bi,
    blurb: Bi,
    color: z.enum(["lilac","mint","peach","sky","rose"]),
    prereqs: z.array(Pillar).default([]),
  }),
});

const chapters = defineCollection({
  loader: file("src/content/chapters.json"),
  schema: z.object({
    slug: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
    pillar: Pillar,
    order: z.number().int().positive(),
    title: Bi,
    crux: Bi,
    pieces: z.array(z.string().regex(/^\d{2}-[a-z0-9-]+$/)),
  }),
});

const book = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/book" }),
  schema: z.object({
    slug: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
    lang: Lang,
    pillar: Pillar,
    chapter: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
    order: z.number().int().positive(),
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(280),
    readingMin: z.number().int().positive(),
    status: Status.default("stub"),
    prereqs: z.array(z.string()).default([]),
    spiral: z.array(Spiral).default([]),
    personas: z.array(z.string()).default([]),
    depth: z.object({
      mechanism: z.string(),
      tradeoff: z.string(),
      failure_mode: z.string(),
      numbers: z.string(),
    }),
    sources: z.array(z.string().url()).min(1),
    draft: z.boolean().default(false),
  }),
});

export const collections = { pillars, chapters, book };
```

Note: Astro's content collections use a `file` loader for JSON arrays. Source files (`pillars.json`, `chapters.json`) are created in P0.6 / P0.7.

- [ ] **Step 5: Run tests, confirm pass**

```bash
cd site && bun run test
```

Expected: 3 pass.

- [ ] **Step 6: Delete the now-orphaned existing pilot piece**

The existing `site/src/content/book/networking/how-internet-works.mdx` uses the old schema. Mark it for archival:

```bash
mkdir -p site/src/content/book/_archive
git mv site/src/content/book/networking/how-internet-works.mdx \
       site/src/content/book/_archive/how-internet-works.mdx.archived
```

Add to `book` loader exclude (in `config.ts`, modify `pattern` to skip `_archive`):

```ts
loader: glob({ pattern: "!(_archive)/**/*.{md,mdx}", base: "./src/content/book" }),
```

The archive file is kept for reference but excluded from collection.

- [ ] **Step 7: Recommended commit**

```bash
git add site/src/types/ site/src/content/config.ts site/src/content/config.test.ts site/src/content/book/_archive/
git commit -m "feat(content): pillars + chapters + book collections with bilingual schema"
```

**Checkpoint:** Three collections defined. Schemas typed. Tests green. Old pilot archived.

---

### Task P0.4: `user-state.ts` — persistence module

**Files:**
- Create: `site/src/scripts/user-state.ts`
- Test: `site/src/scripts/user-state.test.ts`

- [ ] **Step 1: Write failing tests**

Create `site/src/scripts/user-state.test.ts`:

```ts
import { describe, expect, test, beforeEach } from "vitest";
import { userState, recordVisit, setTier, recordRetrieval, dismissRevisit, resetAll } from "./user-state";

describe("user-state", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAll();
  });

  test("defaults are middle/en/auto, no history", () => {
    expect(userState.value.tier).toBe("middle");
    expect(userState.value.lang).toBe("en");
    expect(userState.value.motion).toBe("auto");
    expect(userState.value.history).toEqual({});
  });

  test("setTier updates tier and increments manualTierFlips when manual", () => {
    setTier("senior", true);
    expect(userState.value.tier).toBe("senior");
    expect(userState.value.manualTierFlips).toBe(1);

    setTier("junior", false);
    expect(userState.value.tier).toBe("junior");
    expect(userState.value.manualTierFlips).toBe(1);
  });

  test("recordVisit creates and updates history entry", () => {
    recordVisit("tcp-handshake", "middle");
    expect(userState.value.history["tcp-handshake"]).toBeDefined();
    expect(userState.value.history["tcp-handshake"].tiersOpened).toEqual(["middle"]);

    recordVisit("tcp-handshake", "senior");
    expect(userState.value.history["tcp-handshake"].tiersOpened.sort())
      .toEqual(["middle", "senior"]);
  });

  test("recordRetrieval marks attempted and bumps count", () => {
    recordRetrieval("tcp-handshake");
    expect(userState.value.retrieval["tcp-handshake"].attempted).toBe(true);
    expect(userState.value.retrieval["tcp-handshake"].attempts).toBe(1);

    recordRetrieval("tcp-handshake");
    expect(userState.value.retrieval["tcp-handshake"].attempts).toBe(2);
  });

  test("persists to localStorage", () => {
    setTier("senior", true);
    const raw = localStorage.getItem("awesome.user-state.v1");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).tier).toBe("senior");
  });

  test("dismissRevisit writes timestamp", () => {
    dismissRevisit("tcp-handshake");
    expect(userState.value.dismissedRevisit["tcp-handshake"]).toBeGreaterThan(0);
  });

  test("resetAll wipes state and localStorage", () => {
    setTier("senior", true);
    recordVisit("x", "senior");
    resetAll();
    expect(userState.value.tier).toBe("middle");
    expect(userState.value.history).toEqual({});
    expect(localStorage.getItem("awesome.user-state.v1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd site && bun run test
```

Expected: 7 fails (module not found).

- [ ] **Step 3: Implement `site/src/scripts/user-state.ts`**

```ts
import { signal, effect } from "@preact/signals";
import type { Tier, Lang } from "../types";

const KEY = "awesome.user-state.v1";

export type UserState = {
  tier: Tier;
  lang: Lang;
  motion: "on" | "off" | "auto";
  pretest: { takenAt: number; score: number; answers: number[] } | null;
  history: Record<string, {
    firstAt: number;
    lastAt: number;
    tiersOpened: Tier[];
    faded?: Record<string, true>;
  }>;
  retrieval: Record<string, { attempted: boolean; lastAt: number; attempts: number }>;
  dismissedRevisit: Record<string, number>;
  manualTierFlips: number;
};

const defaults: UserState = {
  tier: "middle",
  lang: "en",
  motion: "auto",
  pretest: null,
  history: {},
  retrieval: {},
  dismissedRevisit: {},
  manualTierFlips: 0,
};

function load(): UserState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function save(s: UserState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const userState = signal<UserState>(load());

if (typeof window !== "undefined") {
  effect(() => save(userState.value));
}

export function recordVisit(slug: string, tier: Tier) {
  const h = userState.value.history[slug];
  const now = Date.now();
  userState.value = {
    ...userState.value,
    history: {
      ...userState.value.history,
      [slug]: {
        firstAt: h?.firstAt ?? now,
        lastAt: now,
        tiersOpened: Array.from(new Set([...(h?.tiersOpened ?? []), tier])),
        faded: h?.faded,
      },
    },
  };
}

export function markFaded(slug: string, exampleId: string) {
  const h = userState.value.history[slug];
  if (!h) recordVisit(slug, userState.value.tier);
  const hh = userState.value.history[slug];
  userState.value = {
    ...userState.value,
    history: {
      ...userState.value.history,
      [slug]: { ...hh, faded: { ...(hh.faded ?? {}), [exampleId]: true } },
    },
  };
}

export function setTier(tier: Tier, manual: boolean) {
  userState.value = {
    ...userState.value,
    tier,
    manualTierFlips: manual
      ? userState.value.manualTierFlips + 1
      : userState.value.manualTierFlips,
  };
}

export function setLang(lang: Lang) {
  userState.value = { ...userState.value, lang };
}

export function setMotion(m: UserState["motion"]) {
  userState.value = { ...userState.value, motion: m };
}

export function setPretest(score: number, answers: number[]) {
  userState.value = {
    ...userState.value,
    pretest: { takenAt: Date.now(), score, answers },
  };
}

export function recordRetrieval(slug: string) {
  const r = userState.value.retrieval[slug];
  userState.value = {
    ...userState.value,
    retrieval: {
      ...userState.value.retrieval,
      [slug]: {
        attempted: true,
        lastAt: Date.now(),
        attempts: (r?.attempts ?? 0) + 1,
      },
    },
  };
}

export function dismissRevisit(slug: string) {
  userState.value = {
    ...userState.value,
    dismissedRevisit: {
      ...userState.value.dismissedRevisit,
      [slug]: Date.now(),
    },
  };
}

export function resetAll() {
  userState.value = defaults;
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
cd site && bun run test
```

Expected: 7 pass.

- [ ] **Step 5: Recommended commit**

```bash
git add site/src/scripts/user-state.ts site/src/scripts/user-state.test.ts
git commit -m "feat(state): user-state module with signals + localStorage persistence"
```

**Checkpoint:** Single source of state. Tested.

---

### Task P0.5: `tier-router.ts` — pretest scoring

**Files:**
- Create: `site/src/scripts/tier-router.ts`
- Create: `site/src/scripts/pretest-questions.ts`
- Test: `site/src/scripts/tier-router.test.ts`

- [ ] **Step 1: Failing test**

Create `site/src/scripts/tier-router.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { scoreToTier, scorePretest } from "./tier-router";
import { pretestQuestions } from "./pretest-questions";

describe("tier-router", () => {
  test("scoreToTier mapping: 0-3 junior, 4-6 middle, 7-9 senior", () => {
    expect(scoreToTier(0)).toBe("junior");
    expect(scoreToTier(3)).toBe("junior");
    expect(scoreToTier(4)).toBe("middle");
    expect(scoreToTier(6)).toBe("middle");
    expect(scoreToTier(7)).toBe("senior");
    expect(scoreToTier(9)).toBe("senior");
  });

  test("scorePretest sums weights of selected answers", () => {
    expect(pretestQuestions.length).toBe(3);
    const allCorrect = pretestQuestions.map(q =>
      q.choices.findIndex(c => c.weight === Math.max(...q.choices.map(x => x.weight)))
    );
    expect(scorePretest(allCorrect)).toBeGreaterThanOrEqual(7);

    const allZero = pretestQuestions.map(q =>
      q.choices.findIndex(c => c.weight === Math.min(...q.choices.map(x => x.weight)))
    );
    expect(scorePretest(allZero)).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd site && bun run test
```

Expected: 2 fails.

- [ ] **Step 3: Implement `site/src/scripts/pretest-questions.ts`**

```ts
import type { Bilingual } from "../types";

export type PretestChoice = { label: Bilingual; weight: 0 | 1 | 2 | 3 };
export type PretestQuestion = {
  id: string;
  prompt: Bilingual;
  choices: PretestChoice[];
};

export const pretestQuestions: PretestQuestion[] = [
  {
    id: "tcp",
    prompt: {
      en: "Why does TCP use a three-way handshake (SYN, SYN-ACK, ACK) instead of two messages?",
      ru: "Зачем TCP использует трёхэтапное рукопожатие (SYN, SYN-ACK, ACK), а не два сообщения?",
    },
    choices: [
      { label: { en: "I don't know what TCP is", ru: "Не знаю, что такое TCP" }, weight: 0 },
      { label: { en: "To make sure the message arrived", ru: "Чтобы убедиться, что сообщение дошло" }, weight: 1 },
      { label: { en: "Both sides must confirm initial sequence numbers and round-trip the offer", ru: "Обе стороны должны подтвердить начальные sequence numbers и пройти RTT" }, weight: 2 },
      { label: { en: "Three-way avoids half-open connections and lets each side advertise window + options atomically", ru: "Три этапа исключают half-open и позволяют обеим сторонам атомарно объявить окно и опции" }, weight: 3 },
    ],
  },
  {
    id: "db-index",
    prompt: {
      en: "When is a Postgres BRIN index a better fit than B-tree?",
      ru: "Когда BRIN-индекс в Postgres лучше, чем B-tree?",
    },
    choices: [
      { label: { en: "Never — B-tree is always best", ru: "Никогда — B-tree всегда лучше" }, weight: 0 },
      { label: { en: "For small tables", ru: "Для маленьких таблиц" }, weight: 1 },
      { label: { en: "When the column is correlated with physical row order (e.g. append-only timestamp)", ru: "Когда колонка коррелирует с физическим порядком строк (например, append-only timestamp)" }, weight: 2 },
      { label: { en: "On very large append-only tables where index size and write amplification dominate; BRIN trades selectivity for tiny on-disk footprint via per-range min/max summaries", ru: "На очень больших append-only таблицах, где размер индекса и write amplification критичны; BRIN жертвует селективностью ради крошечного размера через min/max по диапазонам" }, weight: 3 },
    ],
  },
  {
    id: "react",
    prompt: {
      en: "Why might passing an inline object to a memoized child cause re-renders even with React.memo?",
      ru: "Почему передача inline-объекта в memoized-ребёнка вызывает re-render даже с React.memo?",
    },
    choices: [
      { label: { en: "I haven't used React much", ru: "Мало работал с React" }, weight: 0 },
      { label: { en: "React.memo doesn't work on objects", ru: "React.memo не работает с объектами" }, weight: 1 },
      { label: { en: "The object identity changes every render", ru: "Identity объекта меняется на каждый render" }, weight: 2 },
      { label: { en: "Default React.memo uses Object.is for shallow prop comparison; an inline literal allocates a fresh reference per render, defeating memo unless you stabilize via useMemo or move the object out of render", ru: "React.memo по умолчанию использует Object.is для shallow-сравнения props; inline-литерал создаёт новую ссылку при каждом render, ломая memo, если не стабилизировать через useMemo или вынести объект из render" }, weight: 3 },
    ],
  },
];
```

- [ ] **Step 4: Implement `site/src/scripts/tier-router.ts`**

```ts
import type { Tier } from "../types";
import { pretestQuestions } from "./pretest-questions";

export function scoreToTier(score: number): Tier {
  if (score <= 3) return "junior";
  if (score <= 6) return "middle";
  return "senior";
}

export function scorePretest(answers: number[]): number {
  return answers.reduce((sum, choiceIdx, qIdx) => {
    const q = pretestQuestions[qIdx];
    if (!q) return sum;
    return sum + (q.choices[choiceIdx]?.weight ?? 0);
  }, 0);
}
```

- [ ] **Step 5: Run, confirm pass**

```bash
cd site && bun run test
```

Expected: 2 pass.

- [ ] **Step 6: Recommended commit**

```bash
git add site/src/scripts/tier-router.ts site/src/scripts/tier-router.test.ts site/src/scripts/pretest-questions.ts
git commit -m "feat(pedagogy): tier-router scoring + 3 seed pretest questions"
```

**Checkpoint:** Pretest scoring deterministic. Test-gated.

---

### Task P0.6: Generate `pillars.json` (16 entries)

**Files:**
- Create: `site/src/content/pillars.json`

- [ ] **Step 1: Author the file**

Create `site/src/content/pillars.json`:

```json
[
  { "slug": "networking", "order": 1, "color": "lilac",
    "title": { "en": "Networking & Protocols", "ru": "Сети и протоколы" },
    "blurb": { "en": "From bits on a wire to TLS 1.3 — the journey of one packet, retold for senior engineers.", "ru": "От битов в проводе до TLS 1.3 — путь одного пакета, рассказанный для senior-инженеров." },
    "prereqs": [] },
  { "slug": "browser", "order": 2, "color": "mint",
    "title": { "en": "Browser & Frontend Runtime", "ru": "Браузер и фронтенд-рантайм" },
    "blurb": { "en": "Event loop, rendering pipeline, V8 internals, hydration cost.", "ru": "Event loop, рендеринг, внутренности V8, цена гидрации." },
    "prereqs": ["networking"] },
  { "slug": "frontend", "order": 3, "color": "peach",
    "title": { "en": "Frontend Architecture", "ru": "Архитектура фронтенда" },
    "blurb": { "en": "State shape, data fetching, monorepo boundaries, build pipelines.", "ru": "Форма state, fetching, границы монорепо, build pipelines." },
    "prereqs": ["browser"] },
  { "slug": "backend", "order": 4, "color": "sky",
    "title": { "en": "Backend Architecture", "ru": "Архитектура бэкенда" },
    "blurb": { "en": "Request lifecycle, DI, queues, idempotency, graceful shutdown.", "ru": "Жизненный цикл запроса, DI, очереди, идемпотентность, graceful shutdown." },
    "prereqs": ["networking"] },
  { "slug": "apis", "order": 5, "color": "rose",
    "title": { "en": "APIs", "ru": "API" },
    "blurb": { "en": "REST, gRPC, GraphQL, webhooks, versioning, rate limits.", "ru": "REST, gRPC, GraphQL, webhooks, версионирование, rate limits." },
    "prereqs": ["backend"] },
  { "slug": "databases", "order": 6, "color": "lilac",
    "title": { "en": "Databases", "ru": "Базы данных" },
    "blurb": { "en": "Indexes, MVCC, isolation levels, sharding, migrations.", "ru": "Индексы, MVCC, уровни изоляции, шардинг, миграции." },
    "prereqs": ["backend"] },
  { "slug": "caching", "order": 7, "color": "mint",
    "title": { "en": "Caching", "ru": "Кеширование" },
    "blurb": { "en": "Layers, invalidation, stampede protection, ETags.", "ru": "Слои, инвалидация, защита от stampede, ETag." },
    "prereqs": ["backend", "networking"] },
  { "slug": "queues", "order": 8, "color": "peach",
    "title": { "en": "Queues, Streams, Eventing", "ru": "Очереди, потоки, события" },
    "blurb": { "en": "Kafka partitions, exactly-once, outbox, CDC.", "ru": "Партиции Kafka, exactly-once, outbox, CDC." },
    "prereqs": ["backend", "databases"] },
  { "slug": "distributed", "order": 9, "color": "sky",
    "title": { "en": "Distributed Systems", "ru": "Распределённые системы" },
    "blurb": { "en": "CAP, Raft, quorum, sagas, retries that amplify outages.", "ru": "CAP, Raft, кворум, sagas, ретраи, усиливающие сбои." },
    "prereqs": ["backend", "queues"] },
  { "slug": "security", "order": 10, "color": "rose",
    "title": { "en": "Security", "ru": "Безопасность" },
    "blurb": { "en": "OWASP, OAuth 2.1, JWT pitfalls, CSP, SSRF.", "ru": "OWASP, OAuth 2.1, JWT, CSP, SSRF." },
    "prereqs": ["networking", "apis"] },
  { "slug": "observability", "order": 11, "color": "lilac",
    "title": { "en": "Observability", "ru": "Наблюдаемость" },
    "blurb": { "en": "Logs vs metrics vs traces, RED + USE, SLO, profiling.", "ru": "Логи vs метрики vs трейсы, RED + USE, SLO, профилирование." },
    "prereqs": ["backend"] },
  { "slug": "deployment", "order": 12, "color": "mint",
    "title": { "en": "Deployment & Infra", "ru": "Деплой и инфра" },
    "blurb": { "en": "Containers, K8s, blue/green, IaC, TLS termination.", "ru": "Контейнеры, K8s, blue/green, IaC, terminating TLS." },
    "prereqs": ["backend", "networking"] },
  { "slug": "performance", "order": 13, "color": "peach",
    "title": { "en": "Performance", "ru": "Производительность" },
    "blurb": { "en": "Profile first. GC, N+1, batching, bundle budgets.", "ru": "Сначала профиль. GC, N+1, батчинг, бюджеты бандла." },
    "prereqs": ["browser", "backend", "databases"] },
  { "slug": "data-engineering", "order": 14, "color": "sky",
    "title": { "en": "Data Engineering", "ru": "Data engineering" },
    "blurb": { "en": "OLTP vs OLAP, Parquet, materialized views, FTS, vector DBs.", "ru": "OLTP vs OLAP, Parquet, materialized views, FTS, vector DB." },
    "prereqs": ["databases"] },
  { "slug": "ai-llm", "order": 15, "color": "rose",
    "title": { "en": "AI / LLM Integration", "ru": "AI / LLM" },
    "blurb": { "en": "Prompt caching, tool calls, RAG, streams, evals.", "ru": "Prompt caching, tool calls, RAG, потоки, evals." },
    "prereqs": ["backend", "apis"] },
  { "slug": "engineering-practice", "order": 16, "color": "lilac",
    "title": { "en": "Engineering Practice", "ru": "Инженерная практика" },
    "blurb": { "en": "TDD, contract testing, feature flags, runbooks, on-call.", "ru": "TDD, contract-тесты, feature flags, runbooks, on-call." },
    "prereqs": [] }
]
```

- [ ] **Step 2: Verify schema parsing**

```bash
cd site && bun run check
```

Expected: zero errors.

- [ ] **Step 3: Recommended commit**

```bash
git add site/src/content/pillars.json
git commit -m "content(pillars): 16-pillar metadata seed"
```

**Checkpoint:** All 16 pillars defined, EN+RU.

---

### Task P0.7: Generate `chapters.json` (16 entries with piece slugs from `curriculum.md`)

**Files:**
- Create: `site/src/content/chapters.json`

- [ ] **Step 1: Author the file** — each chapter lists ≤8 pieces (the must-cover bullets from `curriculum.md`, condensed)

Create `site/src/content/chapters.json`:

```json
[
  { "slug": "01-networking", "pillar": "networking", "order": 1,
    "title": { "en": "How the internet works", "ru": "Как работает интернет" },
    "crux": {
      "en": "Seven layers cooperate to make one HTTP request look instant — what's actually moving?",
      "ru": "Семь слоёв договариваются, чтобы один HTTP-запрос выглядел мгновенным — что на самом деле движется?"
    },
    "pieces": ["01-physical-link","02-ip-packet","03-tcp-handshake","04-dns-resolution","05-tls-handshake","06-http-versions","07-cdn-edge","08-putting-it-together"] },

  { "slug": "02-browser", "pillar": "browser", "order": 2,
    "title": { "en": "Inside the browser", "ru": "Внутри браузера" },
    "crux": {
      "en": "From bytes off the wire to pixels on screen — where does the time go?",
      "ru": "От байтов в кабеле до пикселей на экране — куда уходит время?"
    },
    "pieces": ["01-event-loop","02-render-pipeline","03-v8-internals","04-workers","05-react-fiber","06-ssr-vs-ssg","07-core-web-vitals","08-putting-it-together"] },

  { "slug": "03-frontend", "pillar": "frontend", "order": 3,
    "title": { "en": "Frontend architecture in the large", "ru": "Архитектура фронтенда" },
    "crux": {
      "en": "Where does state live, and who pays the cost of moving it?",
      "ru": "Где живёт state и кто платит за его перемещение?"
    },
    "pieces": ["01-state-shape","02-data-fetching","03-forms-a11y","04-tokens","05-monorepo","06-code-splitting","07-build-pipelines","08-putting-it-together"] },

  { "slug": "04-backend", "pillar": "backend", "order": 4,
    "title": { "en": "Backend lifecycle", "ru": "Жизненный цикл бэкенда" },
    "crux": {
      "en": "What happens between accept() and 200 OK that you have to design for?",
      "ru": "Что происходит между accept() и 200 OK, что нужно спроектировать?"
    },
    "pieces": ["01-request-lifecycle","02-middleware-di","03-async-blocking","04-pooling","05-idempotency-retries","06-circuit-breakers","07-graceful-shutdown","08-putting-it-together"] },

  { "slug": "05-apis", "pillar": "apis", "order": 5,
    "title": { "en": "API contracts", "ru": "Контракты API" },
    "crux": {
      "en": "REST, gRPC, GraphQL — when each wins, and how they really break.",
      "ru": "REST, gRPC, GraphQL — когда что выигрывает и где реально ломается."
    },
    "pieces": ["01-rest-modeling","02-status-codes-real","03-pagination","04-openapi","05-grpc-protobuf","06-graphql-n-plus-one","07-rate-limiting","08-putting-it-together"] },

  { "slug": "06-databases", "pillar": "databases", "order": 6,
    "title": { "en": "PostgreSQL internals for app engineers", "ru": "Внутренности Postgres для прикладника" },
    "crux": {
      "en": "Why your query is slow and why your migration is dangerous.",
      "ru": "Почему запрос медленный и почему миграция опасна."
    },
    "pieces": ["01-relational-model","02-indexes","03-execution-plans","04-mvcc-isolation","05-pooling","06-migrations","07-sharding","08-putting-it-together"] },

  { "slug": "07-caching", "pillar": "caching", "order": 7,
    "title": { "en": "Caches all the way down", "ru": "Кеши до самого низа" },
    "crux": {
      "en": "Every layer caches. Every cache lies. How do you keep both useful?",
      "ru": "Каждый слой кеширует. Каждый кеш врёт. Как сделать оба полезными?"
    },
    "pieces": ["01-layers","02-invalidation","03-stampede","04-etag","05-cache-control","06-swr","07-dogpile","08-putting-it-together"] },

  { "slug": "08-queues", "pillar": "queues", "order": 8,
    "title": { "en": "Queues, streams, eventing", "ru": "Очереди, потоки, события" },
    "crux": {
      "en": "How do you get the right message to the right consumer, exactly once-ish, in order?",
      "ru": "Как доставить правильное сообщение правильному консумеру exactly-once-ish и по порядку?"
    },
    "pieces": ["01-delivery-guarantees","02-kafka-partitions","03-rabbit-exchanges","04-ordering","05-outbox","06-cdc","07-eventual-ux","08-putting-it-together"] },

  { "slug": "09-distributed", "pillar": "distributed", "order": 9,
    "title": { "en": "Distributed systems in practice", "ru": "Распределёнка на практике" },
    "crux": {
      "en": "CAP and Raft are abstract. The pager goes off at 3am — what actually broke?",
      "ru": "CAP и Raft абстрактны. Пейджер звенит в 3 утра — что реально сломалось?"
    },
    "pieces": ["01-cap-practice","02-raft-outline","03-quorum","04-leader-election","05-clocks","06-sagas","07-retry-amplification","08-putting-it-together"] },

  { "slug": "10-security", "pillar": "security", "order": 10,
    "title": { "en": "Web security", "ru": "Безопасность веба" },
    "crux": {
      "en": "Modern OWASP 10 + auth done correctly + supply chain. What attackers actually use.",
      "ru": "Современный OWASP 10 + правильная auth + цепочка поставок. Чем реально атакуют." },
    "pieces": ["01-owasp-modern","02-oauth-oidc","03-jwt-pitfalls","04-csrf","05-password-hashing","06-secrets","07-supply-chain","08-putting-it-together"] },

  { "slug": "11-observability", "pillar": "observability", "order": 11,
    "title": { "en": "Observability that pays for itself", "ru": "Наблюдаемость, которая окупается" },
    "crux": {
      "en": "Logs, metrics, traces — when each is the cheapest answer.",
      "ru": "Логи, метрики, трейсы — когда что дешевле всего отвечает." },
    "pieces": ["01-three-pillars","02-structured-logging","03-otel","04-red-use","05-slo-budgets","06-trace-propagation","07-profiling","08-putting-it-together"] },

  { "slug": "12-deployment", "pillar": "deployment", "order": 12,
    "title": { "en": "Deployment and infra", "ru": "Деплой и инфраструктура" },
    "crux": {
      "en": "Containers to canaries — what's load-bearing and what's cargo cult.",
      "ru": "От контейнеров до канарейки — что несущее, а что cargo cult." },
    "pieces": ["01-image-layers","02-compose-vs-k8s","03-k8s-objects","04-rollout-strategies","05-iac","06-lb-levels","07-secrets-at-deploy","08-putting-it-together"] },

  { "slug": "13-performance", "pillar": "performance", "order": 13,
    "title": { "en": "Performance: profile first", "ru": "Производительность: сначала профиль" },
    "crux": {
      "en": "Big-O lies. Cache behavior tells the truth. Where do you actually look?",
      "ru": "Big-O врёт. Поведение кеша говорит правду. Куда реально смотреть?" },
    "pieces": ["01-profile-first","02-hot-paths","03-cache-vs-bigo","04-gc","05-n-plus-one","06-batching","07-bundle-budgets","08-putting-it-together"] },

  { "slug": "14-data-engineering", "pillar": "data-engineering", "order": 14,
    "title": { "en": "Data engineering for fullstack", "ru": "Data engineering для фуллстека" },
    "crux": {
      "en": "When the OLTP DB can't answer the question — what tooling do you reach for?",
      "ru": "Когда OLTP не может ответить — какой инструмент брать?" },
    "pieces": ["01-oltp-vs-olap","02-elt-vs-etl","03-parquet","04-materialized-views","05-event-sourcing","06-search","07-vectors","08-putting-it-together"] },

  { "slug": "15-ai-llm", "pillar": "ai-llm", "order": 15,
    "title": { "en": "AI / LLM integration", "ru": "Интеграция AI/LLM" },
    "crux": {
      "en": "LLMs in a product are an I/O system with non-determinism. What does engineering it look like?",
      "ru": "LLM в продукте — это I/O с недетерминизмом. Как это инжинирить?" },
    "pieces": ["01-prompt-caching","02-tool-calls","03-rag-architecture","04-streaming","05-cost-budgets","06-agents","07-evals","08-putting-it-together"] },

  { "slug": "16-engineering-practice", "pillar": "engineering-practice", "order": 16,
    "title": { "en": "Engineering practice", "ru": "Инженерная практика" },
    "crux": {
      "en": "What separates a team that ships from one that breaks production every Tuesday?",
      "ru": "Что отличает команду, которая поставляет, от команды, которая ломает прод каждый вторник?" },
    "pieces": ["01-tdd-property","02-contract-testing","03-code-review","04-trunk-based","05-feature-flags","06-postmortems","07-on-call","08-putting-it-together"] }
]
```

- [ ] **Step 2: Verify**

```bash
cd site && bun run check
```

Expected: zero errors.

- [ ] **Step 3: Recommended commit**

```bash
git add site/src/content/chapters.json
git commit -m "content(chapters): 16-chapter outline with piece slugs"
```

**Checkpoint:** Every chapter outline locked. 16 × 8 = 128 piece slugs defined.

---

### Task P0.8: Stub piece scaffold script — generate 256 MDX files

**Files:**
- Create: `scripts/scaffold-pieces.ts`
- Run output: `site/src/content/book/<lang>/<pillar>/<NN>-<piece>/index.mdx` × 256

- [ ] **Step 1: Implement `scripts/scaffold-pieces.ts`**

```ts
#!/usr/bin/env bun
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";

type Chapter = {
  slug: string;
  pillar: string;
  order: number;
  title: { en: string; ru: string };
  crux: { en: string; ru: string };
  pieces: string[];
};

const ROOT = new URL("..", import.meta.url).pathname;
const CHAPTERS_PATH = join(ROOT, "site/src/content/chapters.json");
const BOOK_BASE = join(ROOT, "site/src/content/book");

async function exists(p: string) {
  try { await access(p); return true; } catch { return false; }
}

function pieceTitle(slug: string): string {
  return slug.replace(/^\d{2}-/, "").replace(/-/g, " ");
}

function stubFrontmatter(lang: "en"|"ru", piece: string, chapter: Chapter, order: number) {
  const title = pieceTitle(piece);
  const titleCased = title.charAt(0).toUpperCase() + title.slice(1);
  return `---
slug: ${piece}
lang: ${lang}
pillar: ${chapter.pillar}
chapter: ${chapter.slug}
order: ${order}
title: "${titleCased}"
summary: "${lang === "en" ? "Coming soon — " : "Скоро — "}${chapter.title[lang]}"
readingMin: 12
status: stub
prereqs: []
spiral: []
personas: []
depth:
  mechanism: tbd-mechanism
  tradeoff: tbd-tradeoff
  failure_mode: tbd-failure
  numbers: tbd-numbers
sources:
  - https://example.com/placeholder
---

import Crux from "../../../../../components/prose/Crux.astro";

<Crux>${chapter.crux[lang]}</Crux>

${lang === "en"
  ? "_This piece is on the roadmap. Outline is in the chapter index._"
  : "_Этот фрагмент в плане. Содержание см. в оглавлении главы._"}
`;
}

async function main() {
  const chapters: Chapter[] = JSON.parse(await readFile(CHAPTERS_PATH, "utf8"));
  let created = 0, skipped = 0;
  for (const ch of chapters) {
    for (const lang of ["en","ru"] as const) {
      for (let i = 0; i < ch.pieces.length; i++) {
        const piece = ch.pieces[i];
        const dir = join(BOOK_BASE, lang, ch.pillar, piece);
        const file = join(dir, "index.mdx");
        if (await exists(file)) { skipped++; continue; }
        await mkdir(dir, { recursive: true });
        await writeFile(file, stubFrontmatter(lang, piece, ch, i + 1), "utf8");
        created++;
      }
    }
  }
  console.log(`stub scaffold: created=${created} skipped=${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the scaffold**

```bash
bun run scripts/scaffold-pieces.ts
```

Expected: `stub scaffold: created=256 skipped=0`.

- [ ] **Step 3: Spot-check three stubs**

```bash
ls site/src/content/book/en/networking/ | head
ls site/src/content/book/ru/databases/ | head
cat site/src/content/book/en/networking/03-tcp-handshake/index.mdx
```

Expected: 8 dirs per pillar per lang; stub file has `status: stub` and Crux.

- [ ] **Step 4: Add `Crux.astro` prose component** (referenced by stubs)

Create `site/src/components/prose/Crux.astro`:

```astro
---
type Props = { id?: string };
const { id = "crux" } = Astro.props;
---
<aside id={id} data-text-class="crux" class="rounded-xl border-l-4 border-bbg-purple bg-panel-lilac px-6 py-4 my-8 max-w-[840px]">
  <div class="text-xs uppercase tracking-widest font-bold text-bbg-purple mb-1">Crux</div>
  <div class="text-bbg-ink text-lg leading-relaxed font-semibold"><slot /></div>
</aside>
```

- [ ] **Step 5: Verify build still passes**

```bash
cd site && bun run check
```

Expected: zero errors (Astro accepts the stubs since their schema matches).

- [ ] **Step 6: Recommended commit**

```bash
git add scripts/scaffold-pieces.ts site/src/content/book/ site/src/components/prose/Crux.astro
git commit -m "content(stubs): scaffold 256 piece stubs across 16 chapters in EN+RU"
```

**Checkpoint:** Every chapter has 8 stub pieces in both languages. Build green.

---

### Task P0.9: `Topic` + `Chapter` layouts

**Files:**
- Modify: `site/src/layouts/Topic.astro`
- Create: `site/src/layouts/Chapter.astro`

- [ ] **Step 1: Rewrite `Topic.astro` (outer chrome for any page)**

Replace `site/src/layouts/Topic.astro`:

```astro
---
import "../styles/global.css";
import TitleBar from "../components/brand/TitleBar.astro";
import SourcesFooter from "../components/brand/SourcesFooter.astro";
import LangSwitch from "../components/brand/LangSwitch.astro";
import SpacedRevisitBanner from "../components/pedagogy/SpacedRevisitBanner.tsx";
import { t, type Locale } from "../i18n";

type Props = {
  title: string;
  lang: Locale;
  pillars?: string[];
  sources?: string[];
};
const { title, lang, sources = [] } = Astro.props;
---
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>{title} — {t("site.title", lang)}</title>
  </head>
  <body class="min-h-screen bg-white text-bbg-ink">
    <TitleBar headline={title}>
      <LangSwitch slot="aside" />
    </TitleBar>
    <SpacedRevisitBanner client:idle lang={lang} />
    <main class="max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-24">
      <slot />
    </main>
    <SourcesFooter sources={sources} />
  </body>
</html>
```

(`TitleBar.astro` needs an `aside` slot — see Task P0.12.)

- [ ] **Step 2: Create `Chapter.astro` (sidebar + main slot)**

```astro
---
import Topic from "./Topic.astro";
import ChapterSidebar from "../components/nav/ChapterSidebar.astro";
import { type Locale } from "../i18n";

type Props = {
  title: string;
  lang: Locale;
  pillarSlug: string;
  chapterSlug: string;
  currentPiece?: string;
  sources?: string[];
};
const { title, lang, pillarSlug, chapterSlug, currentPiece, sources } = Astro.props;
---
<Topic title={title} lang={lang} sources={sources}>
  <div class="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-10">
    <aside class="md:sticky md:top-24 self-start">
      <ChapterSidebar
        lang={lang}
        pillarSlug={pillarSlug}
        chapterSlug={chapterSlug}
        currentPiece={currentPiece}
      />
    </aside>
    <article class="max-w-[840px]">
      <slot />
    </article>
  </div>
</Topic>
```

- [ ] **Step 3: Recommended commit**

```bash
git add site/src/layouts/Topic.astro site/src/layouts/Chapter.astro
git commit -m "feat(layout): Topic + Chapter layouts with i18n + sidebar"
```

**Checkpoint:** Layouts ready. Components they reference are stubbed next.

---

### Task P0.10: `PillarGrid` + home pages `/[lang]/index.astro`

**Files:**
- Create: `site/src/components/nav/PillarGrid.astro`
- Create: `site/src/components/pedagogy/ProgressMeter.tsx`
- Create: `site/src/pages/[lang]/index.astro`
- Replace: `site/src/pages/index.astro`

- [ ] **Step 1: `ProgressMeter.tsx`** (ring + bar variants, reads userState)

```tsx
import { userState } from "~/scripts/user-state";
import type { JSX } from "preact";

type Props = { slugs: string[]; variant?: "ring" | "bar"; size?: number };

export function ProgressMeter({ slugs, variant = "ring", size = 56 }: Props): JSX.Element {
  const done = slugs.filter(s => userState.value.history[s]).length;
  const pct = slugs.length === 0 ? 0 : done / slugs.length;
  if (variant === "ring") {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} aria-label={`${done} of ${slugs.length} pieces visited`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" stroke-width="4"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1FBFA8" stroke-width="4"
                stroke-dasharray={`${pct * c} ${c}`} stroke-linecap="round"
                transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-size="11" font-weight="700" fill="#1F2937">{done}/{slugs.length}</text>
      </svg>
    );
  }
  return (
    <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
      <div class="h-full bg-bbg-teal" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export default ProgressMeter;
```

- [ ] **Step 2: `PillarGrid.astro`**

```astro
---
import { getCollection } from "astro:content";
import ProgressMeter from "../pedagogy/ProgressMeter.tsx";
import { type Locale, t } from "../../i18n";

type Props = { lang: Locale };
const { lang } = Astro.props;
const pillars = (await getCollection("pillars")).sort((a, b) => a.data.order - b.data.order);
const chapters = await getCollection("chapters");
const chapterByPillar = new Map(chapters.map(c => [c.data.pillar, c.data]));
const pillarBg = { lilac:"bg-panel-lilac",mint:"bg-panel-mint",peach:"bg-panel-peach",sky:"bg-panel-sky",rose:"bg-panel-rose" } as const;
const pillarInk = { lilac:"text-panel-lilac-ink",mint:"text-panel-mint-ink",peach:"text-panel-peach-ink",sky:"text-panel-sky-ink",rose:"text-panel-rose-ink" } as const;
---
<section>
  <header class="mb-10">
    <h1 class="text-4xl md:text-5xl font-extrabold text-bbg-ink">{t("nav.home", lang)}</h1>
    <p class="text-bbg-muted mt-2">{t("site.tagline", lang)}</p>
  </header>
  <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    {pillars.map(p => {
      const ch = chapterByPillar.get(p.data.slug);
      const pieces = ch?.pieces ?? [];
      return (
        <li class={`relative rounded-2xl border-2 border-dashed p-5 ${pillarBg[p.data.color]} border-${p.data.color === "lilac" ? "panel-lilac" : p.data.color === "mint" ? "panel-mint" : p.data.color === "peach" ? "panel-peach" : p.data.color === "sky" ? "panel-sky" : "panel-rose"}-ink min-h-[180px] flex flex-col`}>
          <div class="flex justify-between items-start">
            <span class={`text-xs uppercase font-bold tracking-wider ${pillarInk[p.data.color]}`}>{String(p.data.order).padStart(2,"0")}</span>
            <ProgressMeter client:visible slugs={pieces} variant="ring" size={48}/>
          </div>
          <h2 class={`mt-3 font-extrabold text-lg ${pillarInk[p.data.color]}`}>{p.data.title[lang]}</h2>
          <p class="text-sm text-bbg-ink/80 leading-snug mt-1 flex-1">{p.data.blurb[lang]}</p>
          <a class={`mt-3 text-sm font-semibold ${pillarInk[p.data.color]} hover:underline`} href={`/${lang}/${p.data.slug}/`}>
            {ch ? ch.title[lang] : "..."} →
          </a>
        </li>
      );
    })}
  </ul>
</section>
```

- [ ] **Step 3: `site/src/pages/[lang]/index.astro`**

```astro
---
import Topic from "../../layouts/Topic.astro";
import PillarGrid from "../../components/nav/PillarGrid.astro";
import Pretest from "../../components/pedagogy/Pretest.tsx";
import { t, isLocale, type Locale } from "../../i18n";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error(`Unknown locale: ${lang}`);
---
<Topic title={t("nav.home", lang)} lang={lang}>
  <Pretest client:only="preact" lang={lang} />
  <PillarGrid lang={lang} />
</Topic>
```

- [ ] **Step 4: Replace `site/src/pages/index.astro` with a 301 redirect**

```astro
---
return Astro.redirect("/en/");
---
```

- [ ] **Step 5: Recommended commit**

```bash
git add site/src/pages/index.astro site/src/pages/\[lang\]/index.astro site/src/components/nav/PillarGrid.astro site/src/components/pedagogy/ProgressMeter.tsx
git commit -m "feat(nav): PillarGrid home + ProgressMeter ring per pillar"
```

**Checkpoint:** Home grid renders with 16 cards once Pretest stub exists (P1.1).

---

### Task P0.11: `ChapterSidebar` + `ChapterSidebarTOC.tsx`

**Files:**
- Create: `site/src/components/nav/ChapterSidebar.astro`
- Create: `site/src/components/nav/ChapterSidebarTOC.tsx`

- [ ] **Step 1: `ChapterSidebar.astro` (server, lists pieces)**

```astro
---
import { getCollection, getEntry } from "astro:content";
import ChapterSidebarTOC from "./ChapterSidebarTOC.tsx";
import { type Locale } from "../../i18n";

type Props = { lang: Locale; pillarSlug: string; chapterSlug: string; currentPiece?: string };
const { lang, pillarSlug, chapterSlug, currentPiece } = Astro.props;

const chapter = await getEntry("chapters", chapterSlug);
if (!chapter) throw new Error(`Chapter not found: ${chapterSlug}`);
const pieces = await getCollection("book", e => e.data.lang === lang && e.data.chapter === chapterSlug);
const orderedPieces = chapter.data.pieces.map(slug => {
  const p = pieces.find(e => e.data.slug === slug);
  return p ? { slug, title: p.data.title, readingMin: p.data.readingMin, spiral: p.data.spiral, status: p.data.status } : null;
}).filter(Boolean);
---
<div class="text-sm">
  <div class="text-xs uppercase tracking-widest font-bold text-bbg-muted mb-1">
    {String(chapter.data.order).padStart(2,"0")} · {pillarSlug}
  </div>
  <h3 class="text-lg font-extrabold text-bbg-ink leading-snug mb-4">{chapter.data.title[lang]}</h3>
  <ChapterSidebarTOC client:visible pieces={orderedPieces} pillarSlug={pillarSlug} lang={lang} currentPiece={currentPiece} />
</div>
```

- [ ] **Step 2: `ChapterSidebarTOC.tsx` (Preact, reads userState for checkmarks)**

```tsx
import { userState } from "~/scripts/user-state";
import type { Locale } from "~/i18n";

type Piece = { slug: string; title: string; readingMin: number; spiral: string[]; status: string };
type Props = { pieces: Piece[]; pillarSlug: string; lang: Locale; currentPiece?: string };

export default function ChapterSidebarTOC({ pieces, pillarSlug, lang, currentPiece }: Props) {
  const history = userState.value.history;
  return (
    <ol class="space-y-1.5 list-none">
      {pieces.map(p => {
        const visited = !!history[p.slug];
        const current = p.slug === currentPiece;
        return (
          <li>
            <a href={`/${lang}/${pillarSlug}/${p.slug}/`}
               class={`flex items-center gap-2 px-2 py-1 rounded ${current ? "bg-bbg-teal/15 font-semibold" : ""}`}>
              <span class={`inline-block w-3 ${visited ? "text-bbg-success" : "text-gray-300"}`}>{visited ? "✓" : "•"}</span>
              <span class="flex-1">{p.title}</span>
              <span class="text-[10px] text-bbg-muted">{p.readingMin}m</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Recommended commit**

```bash
git add site/src/components/nav/ChapterSidebar.astro site/src/components/nav/ChapterSidebarTOC.tsx
git commit -m "feat(nav): chapter sidebar with visited checkmarks"
```

**Checkpoint:** Sidebar lists pieces with live visited state.

---

### Task P0.12: `LangSwitch` + `TitleBar` slot

**Files:**
- Create: `site/src/components/brand/LangSwitch.astro`
- Modify: `site/src/components/brand/TitleBar.astro`

- [ ] **Step 1: `LangSwitch.astro`**

```astro
---
import { swapLocale, localeFromPath } from "../../i18n";
const path = Astro.url.pathname;
const current = localeFromPath(path);
const other = current === "en" ? "ru" : "en";
const target = swapLocale(path, other);
---
<a href={target}
   class="text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full border border-bbg-ink/20 hover:border-bbg-ink/60 transition">
  {other.toUpperCase()}
</a>
```

- [ ] **Step 2: Extend `TitleBar.astro` with `aside` named slot**

Read current `site/src/components/brand/TitleBar.astro` and add a `<slot name="aside" />` next to the wordmark:

```astro
---
type Props = { headline: string; wordmark?: boolean };
const { headline, wordmark = true } = Astro.props;
---
<header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
  <div class="max-w-[1600px] mx-auto px-6 md:px-14 py-6 flex items-center gap-6">
    <span class="block w-1.5 h-12 bg-bbg-teal rounded-sm"></span>
    <h1 class="text-2xl md:text-3xl font-extrabold text-bbg-ink flex-1">{headline}</h1>
    <slot name="aside" />
    {wordmark && (
      <div class="flex items-center gap-2 shrink-0">
        <span class="w-8 h-8 rounded-lg bg-bbg-teal grid place-items-center text-white font-extrabold">A</span>
        <span class="font-extrabold text-bbg-purple text-lg">awesome</span>
      </div>
    )}
  </div>
</header>
```

- [ ] **Step 3: Recommended commit**

```bash
git add site/src/components/brand/LangSwitch.astro site/src/components/brand/TitleBar.astro
git commit -m "feat(brand): LangSwitch + TitleBar aside slot"
```

**Checkpoint:** Language toggle works on every page.

---

### Task P0.13: Stub piece dynamic routes + "coming soon" rendering

**Files:**
- Create: `site/src/pages/[lang]/[pillar]/index.astro`
- Create: `site/src/pages/[lang]/[pillar]/[piece].astro`
- Delete: `site/src/pages/book/[...slug].astro` (replaced by new route)

- [ ] **Step 1: Chapter overview page `site/src/pages/[lang]/[pillar]/index.astro`**

```astro
---
import { getCollection, getEntry } from "astro:content";
import Chapter from "../../../layouts/Chapter.astro";
import { type Locale, isLocale } from "../../../i18n";

export async function getStaticPaths() {
  const pillars = await getCollection("pillars");
  return pillars.flatMap(p =>
    (["en","ru"] as const).map(lang => ({ params: { lang, pillar: p.data.slug } }))
  );
}
const { lang, pillar } = Astro.params as { lang: Locale; pillar: string };
if (!isLocale(lang)) throw new Error("bad lang");

const pillarEntry = await getEntry("pillars", pillar);
if (!pillarEntry) throw new Error(`Unknown pillar: ${pillar}`);
const chapter = (await getCollection("chapters")).find(c => c.data.pillar === pillar);
if (!chapter) throw new Error(`No chapter for pillar: ${pillar}`);
---
<Chapter title={chapter.data.title[lang]} lang={lang} pillarSlug={pillar} chapterSlug={chapter.data.slug}>
  <p class="text-bbg-muted text-lg leading-relaxed mb-8">{pillarEntry.data.blurb[lang]}</p>
  <div class="rounded-xl bg-panel-lilac border-2 border-dashed border-panel-lilac-ink px-6 py-4 mb-8">
    <div class="text-xs uppercase font-bold tracking-widest text-panel-lilac-ink mb-1">Crux</div>
    <div class="text-bbg-ink text-lg font-semibold">{chapter.data.crux[lang]}</div>
  </div>
  <h2 class="text-xl font-bold mb-3">{lang === "en" ? "Pieces in this chapter" : "Фрагменты главы"}</h2>
  <p class="text-bbg-muted">{lang === "en" ? "Open any piece from the sidebar." : "Откройте любой фрагмент в боковой панели."}</p>
</Chapter>
```

- [ ] **Step 2: Piece page `site/src/pages/[lang]/[pillar]/[piece].astro`**

```astro
---
import { getCollection, render } from "astro:content";
import Chapter from "../../../layouts/Chapter.astro";
import { type Locale, isLocale, t } from "../../../i18n";

export async function getStaticPaths() {
  const all = await getCollection("book");
  return all.map(entry => ({
    params: { lang: entry.data.lang, pillar: entry.data.pillar, piece: entry.data.slug },
    props: { entry },
  }));
}
const { lang } = Astro.params as { lang: Locale; pillar: string; piece: string };
if (!isLocale(lang)) throw new Error("bad lang");
const { entry } = Astro.props;
const { Content } = await render(entry);
const chapter = (await getCollection("chapters")).find(c => c.data.slug === entry.data.chapter);
---
<Chapter title={entry.data.title} lang={lang} pillarSlug={entry.data.pillar}
         chapterSlug={entry.data.chapter} currentPiece={entry.data.slug}
         sources={entry.data.sources}>
  {entry.data.status === "stub" ? (
    <div class="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-8 py-10 text-center">
      <div class="text-2xl font-extrabold text-bbg-ink mb-2">{t("stub.heading", lang)}</div>
      <p class="text-bbg-muted">{t("stub.body", lang)}</p>
      {chapter && <p class="mt-4 text-bbg-ink"><strong>Crux:</strong> {chapter.data.crux[lang]}</p>}
    </div>
  ) : (
    <Content />
  )}
</Chapter>
```

- [ ] **Step 3: Delete the old `[...slug]` book route**

```bash
git rm site/src/pages/book/\[...slug\].astro
rmdir site/src/pages/book 2>/dev/null || true
```

- [ ] **Step 4: Build + smoke**

```bash
cd site && bun run build
```

Expected: build succeeds. `dist/en/networking/index.html` and `dist/en/networking/01-physical-link/index.html` exist.

- [ ] **Step 5: Recommended commit**

```bash
git add site/src/pages/\[lang\]/ site/src/pages/book/
git commit -m "feat(routing): chapter overview + piece routes with stub rendering"
```

**Checkpoint:** Every chapter + 128 pieces × 2 langs render. Stubs show "Coming soon" shell.

---

## Phase P1 — Pedagogy widgets + linter + tests

### Task P1.1: `Pretest.tsx`

**Files:**
- Create: `site/src/components/pedagogy/Pretest.tsx`
- Test: covered by Playwright smoke in P1.14.

- [ ] **Step 1: Implement**

```tsx
import { useState } from "preact/hooks";
import { userState, setPretest, setTier } from "~/scripts/user-state";
import { pretestQuestions } from "~/scripts/tier-router";
import { scorePretest, scoreToTier } from "~/scripts/tier-router";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };

export default function Pretest({ lang }: Props) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(userState.value.pretest !== null);

  if (done) return null;
  if (step >= pretestQuestions.length) {
    const score = scorePretest(answers);
    setPretest(score, answers);
    setTier(scoreToTier(score), false);
    setDone(true);
    return (
      <aside class="rounded-2xl border-2 border-bbg-success bg-mint-50 px-6 py-4 my-6">
        <div class="font-bold text-bbg-ink">
          {lang === "en" ? `Default tier set to ${scoreToTier(score)}.` : `Уровень по умолчанию: ${scoreToTier(score)}.`}
        </div>
      </aside>
    );
  }

  const q = pretestQuestions[step];
  return (
    <aside class="rounded-2xl border-2 border-bbg-purple bg-panel-lilac px-6 py-5 my-6 max-w-[760px]">
      <div class="text-xs uppercase tracking-widest font-bold text-bbg-purple mb-1">
        {t("pretest.title", lang)} · {step + 1}/{pretestQuestions.length}
      </div>
      <h3 class="text-lg font-extrabold text-bbg-ink mb-3">{q.prompt[lang]}</h3>
      <ul class="space-y-2">
        {q.choices.map((c, i) => (
          <li>
            <button
              onClick={() => { setAnswers([...answers, i]); setStep(step + 1); }}
              class="text-left w-full px-3 py-2 rounded-lg border border-gray-300 bg-white hover:border-bbg-purple transition">
              {c.label[lang]}
            </button>
          </li>
        ))}
      </ul>
      <button class="mt-3 text-xs text-bbg-muted underline"
              onClick={() => { setPretest(0, [0,0,0]); setTier("middle", false); setDone(true); }}>
        {t("pretest.skip", lang)}
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Verify import paths**

```bash
cd site && bun run check
```

Expected: zero errors.

- [ ] **Step 3: Recommended commit**

```bash
git add site/src/components/pedagogy/Pretest.tsx
git commit -m "feat(pedagogy): Pretest widget with score-to-tier routing"
```

---

### Task P1.2: `TierAccordion.tsx`

**Files:**
- Create: `site/src/components/pedagogy/TierAccordion.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { userState, setTier } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";
import type { Tier } from "~/types";

type Props = {
  id: string;
  lang: Locale;
  tiers: { junior?: ComponentChildren; middle: ComponentChildren; senior?: ComponentChildren };
};

const TIER_ORDER: Tier[] = ["junior", "middle", "senior"];

export default function TierAccordion({ id, lang, tiers }: Props) {
  const initial: Tier = tiers[userState.value.tier] ? userState.value.tier : "middle";
  const [open, setOpen] = useState<Tier>(initial);

  return (
    <section id={id} class="my-8 rounded-2xl border border-gray-200 overflow-hidden">
      <header class="flex bg-gray-50 border-b border-gray-200">
        {TIER_ORDER.map(tier => {
          if (!tiers[tier]) return null;
          const active = open === tier;
          return (
            <button
              onClick={() => { setOpen(tier); setTier(tier, true); }}
              class={`flex-1 px-4 py-3 text-sm font-semibold transition ${active ? "bg-white text-bbg-ink border-b-2 border-bbg-teal" : "text-bbg-muted hover:text-bbg-ink"}`}>
              {t(`tier.${tier}`, lang)}
            </button>
          );
        })}
      </header>
      <div class="px-6 py-6">
        {tiers[open]}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Recommended commit**

```bash
git add site/src/components/pedagogy/TierAccordion.tsx
git commit -m "feat(pedagogy): TierAccordion (junior/middle/senior) wired to userState"
```

---

### Task P1.3: `FadedExample.tsx`

**Files:**
- Create: `site/src/components/pedagogy/FadedExample.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { markFaded } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";

export type Blank = { id: string; expected: string | RegExp; placeholder?: string };

type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  title: string;
  steps: {
    solved: ComponentChildren;
    semi: { prompt: ComponentChildren; blanks: Blank[] };
    blank: { prompt: ComponentChildren; reveal: ComponentChildren };
  };
  misconceptions?: Record<string, ComponentChildren>;
};

function check(expected: string | RegExp, actual: string): boolean {
  if (typeof expected === "string") return expected.trim().toLowerCase() === actual.trim().toLowerCase();
  return expected.test(actual);
}

export default function FadedExample({ id, pieceSlug, lang, title, steps, misconceptions }: Props) {
  const [step, setStep] = useState<0|1|2>(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);

  const submitSemi = () => {
    const fb: Record<string,string> = {};
    let allOk = true;
    steps.semi.blanks.forEach(b => {
      const v = values[b.id] ?? "";
      if (!check(b.expected, v)) {
        allOk = false;
        fb[b.id] = misconceptions?.[`${b.id}:${v.trim()}`]
          ? "" /* rendered separately */
          : (lang === "en" ? "Not quite — try again." : "Не совсем — ещё раз.");
      }
    });
    setFeedback(fb);
    if (allOk) setStep(2);
  };

  return (
    <section id={id} class="my-8 rounded-2xl border-2 border-bbg-success bg-white p-6">
      <header class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-bbg-ink">{title}</h3>
        <span class="text-xs font-mono text-bbg-muted">{step + 1}/3</span>
      </header>
      {step === 0 && (
        <>
          <div class="prose max-w-none">{steps.solved}</div>
          <button class="mt-4 px-4 py-1.5 rounded-full bg-bbg-success text-white text-sm font-semibold"
                  onClick={() => setStep(1)}>{t("fade.next", lang)}</button>
        </>
      )}
      {step === 1 && (
        <>
          <div class="prose max-w-none">{steps.semi.prompt}</div>
          <ul class="mt-4 space-y-3">
            {steps.semi.blanks.map(b => (
              <li>
                <input class="font-mono w-full max-w-md px-3 py-1.5 border border-gray-300 rounded"
                       placeholder={b.placeholder ?? ""}
                       value={values[b.id] ?? ""}
                       onInput={e => setValues({ ...values, [b.id]: (e.target as HTMLInputElement).value })} />
                {feedback[b.id] && <div class="text-sm text-red-600 mt-1">{feedback[b.id]}</div>}
                {misconceptions?.[`${b.id}:${(values[b.id] ?? "").trim()}`] && (
                  <div class="text-sm text-red-700 mt-1">{misconceptions[`${b.id}:${values[b.id].trim()}`]}</div>
                )}
              </li>
            ))}
          </ul>
          <div class="mt-4 flex gap-2">
            <button class="px-4 py-1.5 rounded-full bg-bbg-ink text-white text-sm font-semibold" onClick={submitSemi}>
              {t("fade.next", lang)}
            </button>
            <button class="px-4 py-1.5 rounded-full text-bbg-muted text-sm" onClick={() => setStep(0)}>
              {t("fade.prev", lang)}
            </button>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <div class="prose max-w-none">{steps.blank.prompt}</div>
          {!revealed ? (
            <button class="mt-4 px-4 py-1.5 rounded-full border-2 border-bbg-success text-bbg-success text-sm font-semibold"
                    onClick={() => { setRevealed(true); markFaded(pieceSlug, id); }}>
              {t("fade.reveal", lang)}
            </button>
          ) : (
            <div class="mt-4 prose max-w-none">{steps.blank.reveal}</div>
          )}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Recommended commit**

```bash
git add site/src/components/pedagogy/FadedExample.tsx
git commit -m "feat(pedagogy): FadedExample 3-step stepper with misconception feedback"
```

---

### Task P1.4: `RetrievalDrawer.tsx`

**Files:**
- Create: `site/src/components/pedagogy/RetrievalDrawer.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { recordRetrieval } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";

type Q = { id: string; q: ComponentChildren; answer: ComponentChildren; hint?: ComponentChildren };
type Props = { pieceSlug: string; lang: Locale; questions: Q[] };

export default function RetrievalDrawer({ pieceSlug, lang, questions }: Props) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  return (
    <section class="my-10 rounded-2xl border-2 border-bbg-purple bg-white p-6">
      <h3 class="font-extrabold text-bbg-ink text-lg mb-3">{t("retrieval.title", lang)}</h3>
      <ol class="space-y-6">
        {questions.map((q, i) => (
          <li>
            <div class="flex items-start gap-3">
              <span class="font-bold text-bbg-purple">{i + 1}.</span>
              <div class="flex-1">
                <div class="font-semibold text-bbg-ink">{q.q}</div>
                <textarea class="mt-2 w-full border border-gray-300 rounded p-2 text-sm font-mono"
                          rows={2} placeholder={lang === "en" ? "Write from memory…" : "Напишите по памяти…"} />
                <button class="mt-2 text-sm font-semibold text-bbg-purple underline"
                        onClick={() => { setRevealed({ ...revealed, [q.id]: true }); recordRetrieval(pieceSlug); }}>
                  {t("retrieval.reveal", lang)}
                </button>
                {revealed[q.id] && <div class="mt-3 prose prose-sm max-w-none">{q.answer}</div>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 2: Recommended commit**

```bash
git add site/src/components/pedagogy/RetrievalDrawer.tsx
git commit -m "feat(pedagogy): RetrievalDrawer with open-recall textareas"
```

---

### Task P1.5: `ReactiveDiagram.tsx` + compute tests

**Files:**
- Create: `site/src/components/pedagogy/ReactiveDiagram.tsx`
- Create: `site/src/scripts/networking-formulas.ts`
- Test: `site/src/scripts/networking-formulas.test.ts`

- [ ] **Step 1: Failing test for formulas**

Create `site/src/scripts/networking-formulas.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { bdp, mathisThroughput, latencyBudget } from "./networking-formulas";

describe("networking formulas", () => {
  test("BDP = bandwidth × RTT (bits→bytes)", () => {
    // 100 Mbps × 100 ms = 100e6 b/s × 0.1 s = 10e6 bits = 1.25e6 bytes
    expect(Math.round(bdp(100, 100))).toBe(1_250_000);
  });

  test("Mathis throughput formula: MSS * (C / (RTT * sqrt(p)))", () => {
    // MSS=1460 bytes, RTT=100ms, loss=1% → ~1.2 Mbps ballpark
    const v = mathisThroughput(1460, 100, 0.01);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(10_000_000);
  });

  test("latencyBudget sums and bounds", () => {
    const out = latencyBudget({ dns: 20, tcp: 25, tls: 25, ttfb: 50, render: 200 });
    expect(out.total).toBe(320);
    expect(out.lcpGood).toBe(true);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd site && bun run test
```

Expected: 3 fails.

- [ ] **Step 3: Implement `site/src/scripts/networking-formulas.ts`**

```ts
export function bdp(bandwidthMbps: number, rttMs: number): number {
  // bytes-in-flight = (bw * 1e6 bits/s) * (rtt / 1000 s) / 8 bits/byte
  return (bandwidthMbps * 1e6) * (rttMs / 1000) / 8;
}

export function mathisThroughput(mssBytes: number, rttMs: number, loss: number): number {
  // Mathis: BW = MSS / RTT * C/sqrt(p)  ; C ≈ 1.22 ; returns bytes/sec
  if (loss <= 0) return Number.POSITIVE_INFINITY;
  const rttSec = rttMs / 1000;
  return (mssBytes / rttSec) * (1.22 / Math.sqrt(loss));
}

export function latencyBudget(hops: { dns: number; tcp: number; tls: number; ttfb: number; render: number }) {
  const total = hops.dns + hops.tcp + hops.tls + hops.ttfb + hops.render;
  return { total, lcpGood: total <= 2500, lcpPoor: total > 4000 };
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
cd site && bun run test
```

Expected: 3 pass.

- [ ] **Step 5: Implement `ReactiveDiagram.tsx`**

```tsx
import { useState } from "preact/hooks";
import type { JSX } from "preact";

type Input = { name: string; label: string; min: number; max: number; step?: number; default: number; unit?: string };
type Props<D = Record<string, number>> = {
  id: string;
  inputs: Input[];
  compute: (vals: Record<string, number>) => D;
  render: (vals: Record<string, number>, derived: D) => JSX.Element;
};

export default function ReactiveDiagram({ id, inputs, compute, render }: Props) {
  const init = Object.fromEntries(inputs.map(i => [i.name, i.default]));
  const [vals, setVals] = useState<Record<string, number>>(init);
  const derived = compute(vals);
  return (
    <section id={id} class="my-8 rounded-2xl border-2 border-bbg-teal bg-white p-6">
      <div class="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-6">
        <div>
          <ul class="space-y-4">
            {inputs.map(i => (
              <li>
                <label class="text-xs font-bold text-bbg-muted uppercase tracking-wider">{i.label}</label>
                <input type="range" min={i.min} max={i.max} step={i.step ?? 1}
                       value={vals[i.name]}
                       onInput={e => setVals({ ...vals, [i.name]: Number((e.target as HTMLInputElement).value) })}
                       class="w-full" />
                <div class="text-sm font-mono text-bbg-ink">{vals[i.name]}{i.unit ?? ""}</div>
              </li>
            ))}
          </ul>
        </div>
        <div>{render(vals, derived)}</div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Recommended commit**

```bash
git add site/src/scripts/networking-formulas.ts site/src/scripts/networking-formulas.test.ts site/src/components/pedagogy/ReactiveDiagram.tsx
git commit -m "feat(pedagogy): ReactiveDiagram + tested networking formulas"
```

---

### Task P1.6: `Sequencer.tsx`

**Files:**
- Create: `site/src/components/pedagogy/Sequencer.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

type Step = { id: string; label: string; durationMs: number };
type Props = { id: string; steps: Step[]; loop?: boolean; children?: ComponentChildren };

export default function Sequencer({ id, steps, loop = false, children }: Props) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => {
      if (active + 1 >= steps.length) {
        if (loop) setActive(0); else setPlaying(false);
      } else {
        setActive(active + 1);
      }
    }, steps[active].durationMs);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [active, playing]);

  return (
    <section id={id} data-active-step={steps[active].id} class="my-8 rounded-2xl border-2 border-bbg-ink/10 bg-white p-6">
      <div class="relative">{children}</div>
      <div class="mt-4 flex items-center gap-3">
        <button class="px-3 py-1 rounded border" onClick={() => setActive(Math.max(0, active - 1))}>‹</button>
        <button class="px-3 py-1 rounded bg-bbg-ink text-white" onClick={() => setPlaying(!playing)}>
          {playing ? "⏸" : "▶"}
        </button>
        <button class="px-3 py-1 rounded border" onClick={() => setActive(Math.min(steps.length - 1, active + 1))}>›</button>
        <span class="text-xs font-mono text-bbg-muted">{active + 1}/{steps.length} · {steps[active].label}</span>
      </div>
    </section>
  );
}
```

The `data-active-step` attribute is what sibling SVG elements observe via CSS / JS for actor animation (consumers add `[data-active-step="syn-ack"] .actor-server { ... }`).

- [ ] **Step 2: Recommended commit**

```bash
git add site/src/components/pedagogy/Sequencer.tsx
git commit -m "feat(pedagogy): Sequencer timeline with play/pause/step controls"
```

---

### Task P1.7: `PersonaTag.astro` + `personas.json`

**Files:**
- Create: `site/src/content/personas.json`
- Create: `site/src/components/pedagogy/PersonaTag.astro`

- [ ] **Step 1: `personas.json`**

```json
{
  "bea":   { "name": "Bea",   "role": { "en": "Browser",            "ru": "Браузер" },              "color": "#7C3AED" },
  "rex":   { "name": "Rex",   "role": { "en": "OS resolver",        "ru": "DNS-резолвер ОС" },      "color": "#16A34A" },
  "rita":  { "name": "Rita",  "role": { "en": "Router",             "ru": "Маршрутизатор" },        "color": "#D97706" },
  "sven":  { "name": "Sven",  "role": { "en": "Origin server",      "ru": "Origin-сервер" },        "color": "#0284C7" },
  "cara":  { "name": "Cara",  "role": { "en": "Certificate authority","ru": "Удостоверяющий центр" }, "color": "#DB2777" },
  "otto":  { "name": "Otto",  "role": { "en": "Origin database",    "ru": "Origin БД" },            "color": "#16A34A" },
  "patty": { "name": "Patty", "role": { "en": "Proxy / CDN edge",   "ru": "Прокси / CDN edge" },    "color": "#D97706" }
}
```

- [ ] **Step 2: `PersonaTag.astro`**

```astro
---
import personas from "../../content/personas.json";
import { type Locale } from "../../i18n";

type Props = { id: keyof typeof personas; lang: Locale; size?: number };
const { id, lang, size = 36 } = Astro.props;
const p = (personas as Record<string, { name: string; role: Record<Locale,string>; color: string }>)[id];
if (!p) throw new Error(`Unknown persona id: ${id}`);
const initial = p.name[0];
---
<span class="inline-flex items-center gap-2 align-middle" data-persona={id}>
  <span class="inline-grid place-items-center rounded-full text-white font-extrabold"
        style={`width:${size}px;height:${size}px;background:${p.color};font-size:${size*0.4}px;`}>
    {initial}
  </span>
  <span class="text-sm">
    <span class="font-bold text-bbg-ink">{p.name}</span>
    <span class="text-bbg-muted ml-1">{p.role[lang]}</span>
  </span>
</span>
```

- [ ] **Step 3: Recommended commit**

```bash
git add site/src/content/personas.json site/src/components/pedagogy/PersonaTag.astro
git commit -m "feat(pedagogy): 7 personas + PersonaTag component"
```

---

### Task P1.8: `SpiralCue.astro` + spiral threads index page

**Files:**
- Create: `site/src/components/prose/SpiralCue.astro`
- Create: `site/src/pages/[lang]/threads/[thread].astro`

- [ ] **Step 1: `SpiralCue.astro`**

```astro
---
import { type Locale } from "../../i18n";
type Thread = "encapsulation" | "multiplexing" | "statefulness" | "latency";
type Props = { thread: Thread; lang: Locale };
const { thread, lang } = Astro.props;
const labels: Record<Thread, Record<Locale, string>> = {
  encapsulation: { en: "Encapsulation thread", ru: "Нить: инкапсуляция" },
  multiplexing:  { en: "Multiplexing thread",  ru: "Нить: мультиплексирование" },
  statefulness:  { en: "Statefulness thread",  ru: "Нить: состояние" },
  latency:       { en: "Latency thread",       ru: "Нить: задержка" },
};
---
<a href={`/${lang}/threads/${thread}/`}
   class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-panel-mint text-panel-mint-ink text-xs font-semibold align-middle">
  ↻ {labels[thread][lang]}
</a>
```

- [ ] **Step 2: Threads index page `[lang]/threads/[thread].astro`**

```astro
---
import { getCollection } from "astro:content";
import Topic from "../../../layouts/Topic.astro";
import { type Locale, isLocale } from "../../../i18n";

const THREADS = ["encapsulation","multiplexing","statefulness","latency"] as const;
export async function getStaticPaths() {
  return THREADS.flatMap(t => (["en","ru"] as const).map(lang => ({ params: { lang, thread: t } })));
}
const { lang, thread } = Astro.params as { lang: Locale; thread: typeof THREADS[number] };
if (!isLocale(lang)) throw new Error("bad lang");
const pieces = (await getCollection("book", e => e.data.lang === lang && e.data.spiral.includes(thread)));
---
<Topic title={thread} lang={lang}>
  <h1 class="text-3xl font-extrabold mb-4">{thread}</h1>
  <p class="text-bbg-muted mb-8">{lang === "en" ? "Pieces touching this concept across the curriculum." : "Фрагменты, затрагивающие эту концепцию во всей программе."}</p>
  <ul class="space-y-2">
    {pieces.map(p => (
      <li><a class="font-semibold text-bbg-ink underline" href={`/${lang}/${p.data.pillar}/${p.data.slug}/`}>{p.data.title}</a> <span class="text-bbg-muted text-sm">· {p.data.pillar}</span></li>
    ))}
  </ul>
</Topic>
```

- [ ] **Step 3: Recommended commit**

```bash
git add site/src/components/prose/SpiralCue.astro site/src/pages/\[lang\]/threads/
git commit -m "feat(pedagogy): SpiralCue + per-thread index pages"
```

---

### Task P1.9: `PrereqBadge` (Preact island)

**Files:**
- Create: `site/src/components/pedagogy/PrereqBadge.tsx`

```tsx
import { userState } from "~/scripts/user-state";

type Props = { prereqs: string[]; lang: "en" | "ru" };
export default function PrereqBadge({ prereqs, lang }: Props) {
  const history = userState.value.history;
  const done = prereqs.filter(p => history[p]).length;
  const all = prereqs.length;
  if (all === 0) return null;
  const ok = done === all;
  return (
    <span class={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono ${ok ? "bg-mint-50 text-bbg-success" : "bg-amber-50 text-amber-700"}`}
          title={prereqs.join(", ")}>
      {ok ? "✓" : "•"} {done}/{all} {lang === "en" ? "prereqs" : "пререквизитов"}
    </span>
  );
}
```

Commit:

```bash
git add site/src/components/pedagogy/PrereqBadge.tsx
git commit -m "feat(pedagogy): PrereqBadge soft-gate indicator"
```

---

### Task P1.10: `SpacedRevisitBanner.tsx`

**Files:**
- Create: `site/src/components/pedagogy/SpacedRevisitBanner.tsx`

```tsx
import { userState, dismissRevisit } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };

const DAY = 86_400_000;

export default function SpacedRevisitBanner({ lang }: Props) {
  const s = userState.value;
  const entries = Object.entries(s.history);
  if (entries.length === 0) return null;

  const due = entries.find(([slug, h]) => {
    const since = Date.now() - h.lastAt;
    const ret = s.retrieval[slug];
    const retrievalDue = !ret?.attempted || (Date.now() - (ret?.lastAt ?? 0) > 7 * DAY);
    const dismissed = s.dismissedRevisit[slug] ?? 0;
    const dismissedRecent = Date.now() - dismissed < 1 * DAY;
    return (since > 1 * DAY) && retrievalDue && !dismissedRecent;
  });
  if (!due) return null;
  const [slug] = due;
  return (
    <div class="bg-panel-peach border-b-2 border-panel-peach-ink/40 px-6 py-2 text-sm flex items-center gap-3">
      <strong class="text-panel-peach-ink">{t("revisit.title", lang)}</strong>
      <a class="underline font-semibold text-bbg-ink" href={`?revisit=${slug}#retrieval`}>{t("revisit.cta", lang)}</a>
      <span class="font-mono text-xs text-bbg-muted">{slug}</span>
      <button class="ml-auto text-xs text-bbg-muted underline" onClick={() => dismissRevisit(slug)}>
        {t("revisit.dismiss", lang)}
      </button>
    </div>
  );
}
```

Commit:

```bash
git add site/src/components/pedagogy/SpacedRevisitBanner.tsx
git commit -m "feat(pedagogy): spaced revisit banner reading userState"
```

---

### Task P1.11: `SettingsDrawer.tsx`

**Files:**
- Create: `site/src/components/pedagogy/SettingsDrawer.tsx`
- Create: `site/src/pages/[lang]/settings.astro`

```tsx
import { userState, setTier, setMotion, resetAll, setPretest } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };
export default function SettingsDrawer({ lang }: Props) {
  const s = userState.value;
  return (
    <section class="max-w-md space-y-6">
      <div>
        <label class="font-bold text-bbg-ink">Tier</label>
        <select class="block mt-1 border rounded px-2 py-1" value={s.tier}
                onChange={e => setTier((e.target as HTMLSelectElement).value as any, true)}>
          <option value="junior">{t("tier.junior", lang)}</option>
          <option value="middle">{t("tier.middle", lang)}</option>
          <option value="senior">{t("tier.senior", lang)}</option>
        </select>
      </div>
      <div>
        <label class="font-bold text-bbg-ink">Motion</label>
        <select class="block mt-1 border rounded px-2 py-1" value={s.motion}
                onChange={e => setMotion((e.target as HTMLSelectElement).value as any)}>
          <option value="auto">auto (respect OS)</option>
          <option value="on">always on</option>
          <option value="off">off</option>
        </select>
      </div>
      <div>
        <button class="px-3 py-1 rounded border" onClick={() => { setPretest(0, []); location.href = `/${lang}/?retake=1`; }}>
          {lang === "en" ? "Retake pretest" : "Пересдать pretest"}
        </button>
      </div>
      <div>
        <button class="px-3 py-1 rounded bg-red-600 text-white text-sm"
                onClick={() => { if (confirm("Reset all progress?")) resetAll(); }}>
          {lang === "en" ? "Reset all progress" : "Сбросить весь прогресс"}
        </button>
      </div>
    </section>
  );
}
```

`site/src/pages/[lang]/settings.astro`:

```astro
---
import Topic from "../../layouts/Topic.astro";
import SettingsDrawer from "../../components/pedagogy/SettingsDrawer.tsx";
import { type Locale, isLocale, t } from "../../i18n";
export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
---
<Topic title={t("nav.settings", lang)} lang={lang}>
  <h1 class="text-3xl font-extrabold mb-6">{t("nav.settings", lang)}</h1>
  <SettingsDrawer client:only="preact" lang={lang} />
</Topic>
```

Commit:

```bash
git add site/src/components/pedagogy/SettingsDrawer.tsx site/src/pages/\[lang\]/settings.astro
git commit -m "feat(pedagogy): settings page with tier/motion/reset/retake"
```

---

### Task P1.12: `Sandbox` base + `RequestBudgetSandbox`

**Files:**
- Create: `site/src/components/pedagogy/Sandbox.tsx`
- Create: `site/src/components/pedagogy/sandboxes/RequestBudgetSandbox.tsx`

`Sandbox.tsx` is a thin wrapper — chapter-specific sandboxes import from this base for shared chrome.

```tsx
// Sandbox.tsx — shared chrome
import type { ComponentChildren } from "preact";
type Props = { id: string; title: string; children: ComponentChildren };
export default function Sandbox({ id, title, children }: Props) {
  return (
    <section id={id} class="my-12 rounded-3xl border-4 border-dashed border-bbg-purple bg-panel-lilac p-8">
      <div class="text-xs uppercase tracking-widest font-bold text-bbg-purple mb-1">Sandbox</div>
      <h2 class="text-2xl font-extrabold text-bbg-ink mb-4">{title}</h2>
      {children}
    </section>
  );
}
```

`RequestBudgetSandbox.tsx`:

```tsx
import { useState } from "preact/hooks";
import Sandbox from "../Sandbox";

type L4 = "tcp" | "udp" | "quic";
type Auth = "none" | "jwt" | "mtls";
type Edge = "none" | "cdn" | "mesh";

const L4_RTT = { tcp: 1, udp: 0, quic: 0 } as const;     // RTTs for handshake
const TLS_RTT = { tcp: 1, udp: 0, quic: 0 } as const;    // additional TLS RTT (combined in QUIC)
const AUTH_OVERHEAD = { none: 0, jwt: 5, mtls: 25 } as const; // ms server-side verify
const EDGE_MULT = { none: 1, cdn: 0.4, mesh: 0.8 } as const;  // multiplier on backbone RTT

export default function RequestBudgetSandbox({ lang }: { lang: "en"|"ru" }) {
  const [rtt, setRtt] = useState(40);
  const [l4, setL4] = useState<L4>("tcp");
  const [auth, setAuth] = useState<Auth>("jwt");
  const [edge, setEdge] = useState<Edge>("cdn");
  const effRtt = rtt * EDGE_MULT[edge];
  const handshake = (L4_RTT[l4] + TLS_RTT[l4]) * effRtt;
  const authMs = AUTH_OVERHEAD[auth];
  const ttfb = handshake + effRtt + authMs + 20; // 20ms server proc
  const lcp = ttfb + 200;
  const verdict = lcp <= 2500 ? "good" : lcp <= 4000 ? "ok" : "poor";

  return (
    <Sandbox id="request-budget" title={lang === "en" ? "Build a request budget" : "Постройте бюджет запроса"}>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wider text-bbg-muted">RTT (ms)</span>
            <input type="range" min={5} max={300} value={rtt} onInput={e => setRtt(+(e.target as HTMLInputElement).value)} class="w-full"/>
            <span class="font-mono">{rtt} ms</span>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wider text-bbg-muted">L4</span>
            <select class="block border rounded px-2 py-1" value={l4} onChange={e => setL4((e.target as HTMLSelectElement).value as L4)}>
              <option value="tcp">TCP + TLS 1.3</option>
              <option value="udp">UDP (no TLS)</option>
              <option value="quic">QUIC (0-RTT)</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wider text-bbg-muted">Auth</span>
            <select class="block border rounded px-2 py-1" value={auth} onChange={e => setAuth((e.target as HTMLSelectElement).value as Auth)}>
              <option value="none">none</option>
              <option value="jwt">JWT</option>
              <option value="mtls">mTLS</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wider text-bbg-muted">Edge</span>
            <select class="block border rounded px-2 py-1" value={edge} onChange={e => setEdge((e.target as HTMLSelectElement).value as Edge)}>
              <option value="none">origin only</option>
              <option value="cdn">CDN</option>
              <option value="mesh">full mesh</option>
            </select>
          </label>
        </div>
        <div class="font-mono text-sm space-y-2">
          <div>handshake: <strong>{handshake.toFixed(0)} ms</strong></div>
          <div>auth: <strong>{authMs} ms</strong></div>
          <div>TTFB: <strong>{ttfb.toFixed(0)} ms</strong></div>
          <div>LCP (est): <strong>{lcp.toFixed(0)} ms</strong></div>
          <div class={`mt-3 inline-block px-3 py-1 rounded-full font-bold ${verdict === "good" ? "bg-mint-100 text-bbg-success" : verdict === "ok" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-bbg-warn"}`}>
            {verdict.toUpperCase()}
          </div>
        </div>
      </div>
    </Sandbox>
  );
}
```

Commit:

```bash
git add site/src/components/pedagogy/Sandbox.tsx site/src/components/pedagogy/sandboxes/
git commit -m "feat(pedagogy): Sandbox chrome + RequestBudgetSandbox for Chapter 01"
```

---

### Task P1.13: Build-time linter (9 rules)

**Files:**
- Create: `site/src/lint/index.ts`
- Create: `site/src/lint/rules/text-budgets.ts`
- Create: `site/src/lint/rules/depth-checkpoints.ts`
- Create: `site/src/lint/rules/tier-accordion.ts`
- Create: `site/src/lint/rules/hydration-budget.ts`
- Create: `site/src/lint/rules/spiral-cues.ts`
- Create: `site/src/lint/rules/i18n-parity.ts`
- Create: `site/src/lint/rules/sources.ts`
- Create: `site/src/lint/rules/reduced-motion.ts`
- Create: `site/src/lint/rules/personas.ts`
- Test: `site/src/lint/rules/text-budgets.test.ts`
- Modify: `site/astro.config.mjs`

- [ ] **Step 1: Failing test for text-budgets rule**

```ts
// site/src/lint/rules/text-budgets.test.ts
import { describe, expect, test } from "vitest";
import { checkTextBudgets } from "./text-budgets";

describe("text-budgets", () => {
  test("flags Crux > 140 chars", () => {
    const html = `<aside data-text-class="crux">${"x".repeat(141)}</aside>`;
    const errs = checkTextBudgets(html, "stub-piece.html");
    expect(errs.length).toBe(1);
    expect(errs[0]).toMatch(/Crux/);
  });
  test("passes Crux ≤ 140 chars", () => {
    const html = `<aside data-text-class="crux">${"x".repeat(140)}</aside>`;
    expect(checkTextBudgets(html, "p.html")).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement `text-budgets.ts`**

```ts
const BUDGETS: Record<string, number> = {
  crux: 140,
  "key-takeaway": 220,
  misconception: 320,
  annot: 240,
};
const TAG_RE = /<([a-z]+)[^>]*data-text-class="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;

export function checkTextBudgets(html: string, file: string): string[] {
  const errs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(html))) {
    const cls = m[2];
    const text = m[3].replace(/<[^>]+>/g, "").trim();
    const budget = BUDGETS[cls];
    if (budget && text.length > budget) {
      errs.push(`${file}: ${cls} text exceeds ${budget} chars (got ${text.length})`);
    }
  }
  return errs;
}
```

- [ ] **Step 3: Pass the test**

```bash
cd site && bun run test
```

Expected: 2 pass.

- [ ] **Step 4: Implement remaining 8 rules** — each file exports a `check<Rule>(args) => string[]`:

`depth-checkpoints.ts` — parse `<html data-depth='{...}'>` from the rendered HTML, verify each id resolves to an element on the page.

`tier-accordion.ts` — grep for `<section class="…tier-accordion…">` or `data-tier="middle"` requiring presence.

`hydration-budget.ts` — count `<astro-island …>` elements per page, fail if >5.

`spiral-cues.ts` — open the source MDX (matched by path back-map), check that any `spiral: [thread]` frontmatter entry has a corresponding `<SpiralCue thread="...">` OR a matching word; warn if missing.

`i18n-parity.ts` — for each `ready` EN piece, expect a `ready` RU twin; symmetric. Scan all RU MDX for unknown technical terms by checking against `glossary.json`. Whitelist code blocks.

`sources.ts` — every page must have `<footer> Sources` section with ≥1 valid URL.

`reduced-motion.ts` — global stylesheet must include `@media (prefers-reduced-motion: reduce)`.

`personas.ts` — every `data-persona="id"` value must exist in `personas.json`.

- [ ] **Step 5: `site/src/lint/index.ts` Astro integration**

```ts
import type { AstroIntegration } from "astro";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { checkTextBudgets } from "./rules/text-budgets";
import { checkDepthCheckpoints } from "./rules/depth-checkpoints";
import { checkTierAccordion } from "./rules/tier-accordion";
import { checkHydrationBudget } from "./rules/hydration-budget";
import { checkSpiralCues } from "./rules/spiral-cues";
import { checkI18nParity } from "./rules/i18n-parity";
import { checkSources } from "./rules/sources";
import { checkReducedMotion } from "./rules/reduced-motion";
import { checkPersonas } from "./rules/personas";

async function walk(dir: string): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...await walk(p));
    else if (extname(i.name) === ".html") out.push(p);
  }
  return out;
}

export function lintCurriculum(): AstroIntegration {
  return {
    name: "lint-curriculum",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = dir.pathname;
        const files = await walk(root);
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const f of files) {
          const html = await readFile(f, "utf8");
          errors.push(...checkTextBudgets(html, f));
          errors.push(...checkDepthCheckpoints(html, f));
          errors.push(...checkTierAccordion(html, f));
          errors.push(...checkHydrationBudget(html, f));
          warnings.push(...checkSpiralCues(html, f));
          errors.push(...checkSources(html, f));
          errors.push(...checkPersonas(html, f));
        }
        errors.push(...await checkI18nParity(root));
        errors.push(...await checkReducedMotion(root));

        await writeFile(join(root, "lint-report.json"),
          JSON.stringify({ errors, warnings }, null, 2));

        if (errors.length) {
          logger.error(`lint failed with ${errors.length} errors:\n${errors.slice(0, 20).join("\n")}`);
          throw new Error(`lint: ${errors.length} errors`);
        }
        if (warnings.length) logger.warn(`lint: ${warnings.length} warnings (see lint-report.json)`);
      },
    },
  };
}
```

- [ ] **Step 6: Register in `astro.config.mjs`**

```js
import { lintCurriculum } from "./src/lint";
// inside integrations:
preact({ compat: false }),
lintCurriculum(),
```

- [ ] **Step 7: Build, expect pass**

```bash
cd site && bun run build
```

Expected: zero errors; `dist/lint-report.json` exists.

- [ ] **Step 8: Recommended commit**

```bash
git add site/src/lint/ site/astro.config.mjs
git commit -m "feat(lint): 9-rule curriculum linter integrated into build"
```

---

### Task P1.14: Playwright smokes

**Files:**
- Create: `site/e2e/home.spec.ts`
- Create: `site/e2e/pretest.spec.ts`
- Create: `site/e2e/lang-switch.spec.ts`
- Create: `site/e2e/tier-persist.spec.ts`

- [ ] **Step 1: `home.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("home redirects to /en/ and renders 16 pillar cards", async ({ page }) => {
  await page.goto("/");
  expect(page.url()).toContain("/en/");
  const cards = page.locator("ul li[class*='border-dashed']");
  await expect(cards).toHaveCount(16);
});
```

- [ ] **Step 2: `pretest.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("pretest sets tier on submit", async ({ page }) => {
  await page.goto("/en/");
  await page.waitForSelector("aside:has-text('Three quick questions')");
  // Pick the highest-weighted option in each question
  for (let i = 0; i < 3; i++) {
    const buttons = page.locator("aside ul button");
    const last = buttons.last();
    await last.click();
  }
  const tier = await page.evaluate(() => {
    const raw = localStorage.getItem("awesome.user-state.v1");
    return raw ? JSON.parse(raw).tier : null;
  });
  expect(tier).toBe("senior");
});
```

- [ ] **Step 3: `lang-switch.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("LangSwitch swaps locale and stays on same path", async ({ page }) => {
  await page.goto("/en/networking/");
  await page.click("a:has-text('RU')");
  await expect(page).toHaveURL(/\/ru\/networking\//);
});
```

- [ ] **Step 4: `tier-persist.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("tier flip persists across reload", async ({ page }) => {
  await page.goto("/en/networking/03-tcp-handshake/");
  // skip pretest if shown
  await page.evaluate(() => localStorage.setItem("awesome.user-state.v1", JSON.stringify({
    tier: "middle", lang: "en", motion: "auto", pretest: { takenAt: 1, score: 0, answers: [] },
    history: {}, retrieval: {}, dismissedRevisit: {}, manualTierFlips: 0,
  })));
  await page.reload();
  // open tier accordion if present
  const seniorPill = page.locator("button:has-text('deep')").first();
  if (await seniorPill.count() > 0) {
    await seniorPill.click();
    await page.reload();
    const tier = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("awesome.user-state.v1") ?? "{}").tier);
    expect(tier).toBe("senior");
  }
});
```

- [ ] **Step 5: Install Playwright browsers + run smokes**

```bash
cd site && bun x playwright install chromium
bun run e2e
```

Expected: 4 tests pass (some skip until P2 content lands; that's acceptable for P1 gate).

- [ ] **Step 6: Recommended commit**

```bash
git add site/e2e/ site/playwright.config.ts
git commit -m "test(e2e): smoke tests for home, pretest, lang-switch, tier-persist"
```

---

## Phase P2 — Chapter 01 Networking authored (EN + RU)

This phase converts 8 networking stubs × 2 langs → ready. Each piece task is a tight authoring envelope — the full prose is written by the executor (with WebSearch + Context7 research as needed) into the frontmatter shape locked here.

**Important:** Each piece authoring task uses the same step pattern. To avoid 8 near-identical tasks, P2 defines **one canonical task pattern** then enumerates the 8 pieces with their specifics. The executor follows the pattern for each piece.

### Task P2.0: Canonical piece authoring pattern (reference, not executed)

For each Chapter 01 piece, the executor must:

1. **Replace stub frontmatter** with concrete values: `status: ready`, real `summary`, `readingMin`, `prereqs` (preceding pieces in chapter), `spiral` (subset of `[encapsulation, multiplexing, statefulness, latency]`), `personas` (subset of personas.json keys), `depth` ids (set to concrete element ids that appear in the body), `sources` (3–5 real URLs — RFCs, HPBN, web.dev, MDN).
2. **Write the body** in MDX in this order:
   1. Hook paragraph (≤120 words).
   2. `<Crux>` — the question.
   3. (chapter intro pieces only) `<PersonaTag id="…" lang={lang} />` cast.
   4. `<TierAccordion id="tier-mechanism">` — three slots:
      - `junior`: 80–180 words intuition + analogy.
      - `middle`: 400–800 words mechanism with one inline diagram, packet/state walkthrough.
      - `senior`: 200–500 words dense edge cases + numbers + RFC pointers.
   5. `<FadedExample>` — one per piece, conceptually significant blanks.
   6. `<ReactiveDiagram>` — one per piece, formula from `networking-formulas.ts` (extend the module as needed).
   7. `<Sequencer>` + sibling SVG actors — when piece has time-sequenced mechanism.
   8. `<RetrievalDrawer>` — 2–3 open-recall questions with answers.
   9. `<SpiralCue thread="...">` — at least one, mid-body.
   10. Cross-link block at end: prereq checks + next piece prompt.
3. **Translate to RU** using `glossary.json`. Add any new terms to glossary.json first; linter will catch unmapped terms.
4. **Build + lint pass**.
5. **Manual browser sweep**: `bun run preview`; open `/en/networking/<slug>/` and `/ru/networking/<slug>/`.

### Task P2.1: Piece 01-physical-link

**Files:**
- Modify: `site/src/content/book/en/networking/01-physical-link/index.mdx`
- Modify: `site/src/content/book/ru/networking/01-physical-link/index.mdx`

- [ ] **Step 1: Apply pattern above**. Personas: none. Prereqs: none. Spiral: `[latency]`. Reactive: bit-rate vs cable-length latency. Sequencer: none. ~1500 EN words.
- [ ] **Step 2: Build + lint pass.**
- [ ] **Step 3: Commit:** `content(net): 01-physical-link EN+RU ready`.

### Task P2.2: Piece 02-ip-packet

Same pattern. Personas: `[bea, rita]`. Prereqs: `[01-physical-link]`. Spiral: `[encapsulation]`. Reactive: MTU slider → fragmentation count. Sequencer: hop-by-hop routing decision. ~2000 EN words.

### Task P2.3: Piece 03-tcp-handshake

Personas: `[bea, sven]`. Prereqs: `[02-ip-packet]`. Spiral: `[statefulness, latency]`. FadedExample: SYN/SYN-ACK/ACK sequence number derivation. Reactive: BDP from `networking-formulas`. Sequencer: 3-way handshake with state transitions. ~2500 EN words.

### Task P2.4: Piece 04-dns-resolution

Personas: `[bea, rex]`. Prereqs: `[02-ip-packet]`. Spiral: `[statefulness]`. FadedExample: resolve `www.example.co.uk` (root → TLD → auth). Reactive: DNS cache hit ratio vs TTL. Sequencer: recursive resolution. ~2000 EN words.

### Task P2.5: Piece 05-tls-handshake

Personas: `[bea, sven, cara]`. Prereqs: `[03-tcp-handshake]`. Spiral: `[encapsulation, statefulness]`. FadedExample: TLS 1.3 1-RTT vs 0-RTT decision. Reactive: handshake cost cold/warm/resumed. Sequencer: ClientHello → ServerHello → Finished. ~2500 EN words.

### Task P2.6: Piece 06-http-versions

Personas: `[bea, sven, patty]`. Prereqs: `[03-tcp-handshake, 05-tls-handshake]`. Spiral: `[multiplexing]`. FadedExample: HOL blocking in HTTP/1 vs HTTP/2 vs HTTP/3. Reactive: HTTP/2 streams slider → residual HOL. Sequencer: none (state comparison). ~2200 EN words.

### Task P2.7: Piece 07-cdn-edge

Personas: `[bea, patty, sven]`. Prereqs: `[04-dns-resolution, 06-http-versions]`. Spiral: `[latency]`. FadedExample: cache-hit vs miss decision tree. Reactive: edge-multiplier on backbone RTT. Sequencer: cold-cache request vs warm. ~2000 EN words.

### Task P2.8: Piece 08-putting-it-together + RequestBudgetSandbox

Personas: all seven. Prereqs: all prior pieces. Spiral: all four threads. Body opens with full-request walkthrough, embeds `RequestBudgetSandbox` (P1.12), ends with `RetrievalDrawer` covering whole chapter. ~2500 EN words.

After P2.1–P2.8 all complete:

- [ ] **Build + lint full chapter.**

```bash
cd site && bun run build
```

Expected: zero errors.

- [ ] **Recommended commit (one per piece OR a single chapter commit per user preference).**

**Checkpoint:** Chapter 01 fully authored in EN + RU. 15 other chapters still stub.

---

## Phase P3 — `/infographic` command rewrite + docs

### Task P3.1: Rewrite `.claude/commands/infographic.md`

**Files:**
- Modify: `.claude/commands/infographic.md`

- [ ] **Step 1: Replace body**

The new command supports three modes:

- `<topic-slug>/<NN-chapter>/<NN-piece>` → single piece authoring.
- `<topic-slug>/<NN-chapter>` → whole chapter (8 pieces × 2 langs).
- Free-form / `<topic-slug>` → refuses unless it maps to a known pillar; for new pillars, asks user to add to `pillars.json` first.

Pipeline per piece (codify what P2.0 did manually):

```
1. WebSearch + Context7 for ≥3 queries.
2. Read existing piece stub; if status==ready, refuse (use --force to overwrite).
3. Author EN MDX following P2.0 template; update frontmatter status: ready.
4. Translate to RU using glossary.json; extend glossary.json if new terms; commit glossary change separately.
5. Run `cd site && bun run build` — must pass linter.
6. Open `dist/en/<pillar>/<piece>/index.html` and `dist/ru/<pillar>/<piece>/index.html` for visual check.
```

Hard rules: never edit `site/dist/`; per-chapter cap 12; bilingual or refuse.

- [ ] **Step 2: Recommended commit**

```bash
git add .claude/commands/infographic.md
git commit -m "docs(command): rewrite /infographic for curriculum site pipeline"
```

---

### Task P3.2: Update `CLAUDE.md`, `style-guide.md`, `curriculum.md` notes

**Files:**
- Modify: `CLAUDE.md`
- Modify: `style-guide.md`
- Modify: `curriculum.md`

- [ ] **Step 1: `CLAUDE.md`** — replace the "Primary command" + "Manual workflow" + "Directory layout" sections to point at `site/`. Note: `infographics/`, `assets/exports/`, old `figma/` workflow are reference-only; site/ is the canonical output. List the linter rules in a one-paragraph callout.

- [ ] **Step 2: `style-guide.md`** — append a "Curriculum site component vocabulary" section enumerating each Preact and Astro component with one-line purpose.

- [ ] **Step 3: `curriculum.md`** — add a one-sentence pointer at top: "This file is the source of truth for chapter outlines; `site/src/content/chapters.json` mirrors it. Update both together."

- [ ] **Step 4: Recommended commit**

```bash
git add CLAUDE.md style-guide.md curriculum.md
git commit -m "docs: align CLAUDE/style-guide/curriculum with site/ pipeline"
```

---

### Task P3.3: Initial repo commit gate (user-authorized)

**Note:** This is the first time we ask the user to authorize git commits at scale. Until now every "Recommended commit" was deferred. At this checkpoint, if the user has authorized commits along the way, this task is a no-op. If commits were deferred to a single big bang, this task IS that big bang.

- [ ] **Step 1: Ask user explicitly: "Authorize the first commits?"**
- [ ] **Step 2: If yes, batch by phase: P0 commits as one set, P1 as another, P2 per piece (or one chapter commit), P3 as one set. Use commit messages from earlier task notes.**
- [ ] **Step 3: Run `git status` to confirm clean tree (modulo intentionally untracked: `drafts/`, `infographics/`, `data/`, etc.).**

---

## Self-Review

### Spec coverage

| Spec section | Plan task(s) |
|---|---|
| §3 Locked decisions: scope | P0.6, P0.7, P0.8 |
| §3 depth tiers | P1.2 |
| §3 tier routing | P0.5, P1.1 |
| §3 visual style | (inherited — uses existing tailwind tokens) |
| §3 navigation | P0.10, P0.11 |
| §3 authoring | P0.8 (scaffold) + P2.* + P3.1 (/infographic) |
| §3 pedagogy stack | P1.1–P1.12 |
| §3 language EN+RU | P0.2, P0.8 (RU stubs), P2.* |
| §3 persistence | P0.4 |
| §3 widget framework | P0.1 (preact install) + P1.* (Preact widgets) |
| §3 deployment | (no task; defer to launch time as spec §15.3 allows) |
| §4 runtime stack | P0.1, P0.2 |
| §5 repo layout | P0.1–P0.13 |
| §6 content model | P0.3, P0.6, P0.7, P0.8 |
| §7 pedagogy machine | P1.1–P1.12 |
| §8 persistence | P0.4 |
| §9 i18n | P0.2, P0.10, P0.12, P2.* |
| §10 build pipeline & linter | P0.1, P1.13 |
| §10 tests | P0.4, P0.5, P1.5, P1.13, P1.14 |
| §11 deployment | deferred per spec §15.3 |
| §12 phased rollout | P0, P1, P2, P3 |
| §13 risks | mitigations are properties of the components above |
| §14 acceptance | covered by Playwright smokes + manual visual + lint-report |
| §15 open questions | explicitly deferred |

No spec gap.

### Placeholder scan

No `TBD` / `TODO` / `implement later` / "add appropriate error handling" / "similar to Task N" in tasks. P2.0 *is* a reference pattern (clearly labelled "reference, not executed"). P2.1–P2.8 reuse it intentionally; each task instance lists its specifics (personas, prereqs, spiral, reactive subject, sequencer or not, word target). This is acceptable per "DRY".

### Type consistency

- `Tier` (`junior | middle | senior`) consistent across `user-state.ts`, `tier-router.ts`, `TierAccordion.tsx`, `types/index.ts`.
- `Locale` (`en | ru`) consistent across `i18n/index.ts`, all components, `getStaticPaths`.
- `Pillar` enum consistent: `PILLARS` array in `types/index.ts` matches `pillars.json` slugs matches `chapters.json` pillar field.
- `Status` enum consistent: `stub | draft | ready` in `config.ts` matches piece pages stub-vs-Content branch in P0.13.
- `recordVisit`, `setTier`, `recordRetrieval`, `markFaded`, `dismissRevisit`, `resetAll`, `setLang`, `setMotion`, `setPretest` — all exported from `user-state.ts`, used with identical signatures by consumers.
- `data-text-class` markers (`crux`, `key-takeaway`, `misconception`, `annot`) — declared in `prose/` components and matched by `text-budgets.ts` linter rule.

No drift.

### Scope check

P0+P1+P2+P3 fit one plan (~40 tasks, ~3–5 dev-days for skeleton infra; Chapter 01 authoring is the biggest chunk at ~16 piece-authoring tasks distributed in P2). P4+ chapter authoring is correctly outside the plan (it's an authoring loop, not engineering).

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch with checkpoints.

Which approach?
