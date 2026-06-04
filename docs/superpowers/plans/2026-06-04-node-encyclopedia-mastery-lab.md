# Node Encyclopedia + Mastery Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the `node` track's remaining theory gaps with 5 new units (~13 lessons EN+RU) and add a tiered hands-on **Node Mastery Lab** at `/learn/node/lab` (~35 curated challenges), reaching ~220+ total exercises with a clear 100+ progression.

**Architecture:** Infra first on `main` (a new `lab` content collection mirroring `drill`, a build-time lint rule, a `[lang]/learn/[track]/lab.astro` page reusing the existing `PracticeSection` island, a nav CTA). Then content authored in parallel git worktrees (one branch per new unit + one for Lab content), coordinator merges sequentially with `units.json` union-dedup-by-id.

**Tech Stack:** Astro 5 content collections (`astro:content` + Zod), Preact island `PracticeSection`, `practice-state` localStorage, build-pass linter (`src/lint/`), bun.

**Spec:** `docs/superpowers/specs/2026-06-04-node-encyclopedia-mastery-lab-design.md`
**Authoring protocol (all gotchas):** `docs/superpowers/parallel-prompts/PROTOCOL.md`
**Exemplar lesson + practice:** `site/src/content/lessons/en/deployment/01-image-layers/01-overview/index.mdx` and the matching practice JSON.

---

## Phase 0 — Lab infrastructure (SERIAL, on `main`)

These four tasks must land on `main` before any content branch is cut, so content worktrees branch off an updated `main` that already builds the Lab green. Run them in order, single session.

### Task 1: `lab` content collection + minimal seed data

**Files:**
- Modify: `site/src/content.config.ts` (add schema near drill at `:143-178`, register in `collections` at `:205`)
- Create: `site/src/content/lab/node/00-warmup.json`
- Create: `site/src/content/lab/node/01-build.json`
- Create: `site/src/content/lab/node/02-diagnose.json`
- Create: `site/src/content/lab/node/03-capstone.json`
- Test: `site/src/content.config.test.ts` (new) OR a standalone `site/src/lint/rules/lab.test.ts` (created in Task 2). For Task 1, validate via build.

- [ ] **Step 1: Add the `lab` collection schema** to `site/src/content.config.ts` immediately after the `drill` block (after line 178, before `// ── Projects`):

```ts
// ── Lab ──────────────────────────────────────────────────────────────────────
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

export type LabData = z.infer<typeof lab.schema>;
```

- [ ] **Step 2: Register `lab`** — change line 205:

```ts
export const collections = { tracks, units, lessons, practice, projects, drill, lab };
```

- [ ] **Step 3: Seed minimal valid data** so the collection + page build green before content. Each file uses real `PracticeTask` shapes. `00-warmup.json`:

```json
{
  "track": "node",
  "tier": "warmup",
  "order": 0,
  "title": { "en": "Warmup", "ru": "Разминка" },
  "intro": { "en": "Reaffirm the runtime model before you build.", "ru": "Закрепи модель рантайма перед стройкой." },
  "challenges": [
    {
      "id": "warmup-event-loop-order",
      "type": "predict",
      "difficulty": "recall",
      "estMin": 5,
      "title": { "en": "Order of output", "ru": "Порядок вывода" },
      "prompt": { "en": "Given sync logs, a setTimeout(0), a Promise.then, and process.nextTick — predict the print order.", "ru": "Дано: синхронные логи, setTimeout(0), Promise.then и process.nextTick — предскажи порядок печати." },
      "scenario": { "en": "console.log('a'); setTimeout(()=>console.log('b'),0); Promise.resolve().then(()=>console.log('c')); process.nextTick(()=>console.log('d')); console.log('e');", "ru": "console.log('a'); setTimeout(()=>console.log('b'),0); Promise.resolve().then(()=>console.log('c')); process.nextTick(()=>console.log('d')); console.log('e');" },
      "reveal": { "en": "a, e, d, c, b — sync first, then nextTick, then promise microtask, then the timer macrotask.", "ru": "a, e, d, c, b — сначала синхронно, затем nextTick, потом микротаска промиса, затем макротаска таймера." }
    },
    {
      "id": "warmup-blocking-spot",
      "type": "predict",
      "difficulty": "recall",
      "estMin": 4,
      "title": { "en": "Which call blocks", "ru": "Какой вызов блокирует" },
      "prompt": { "en": "Pick the call that freezes the event loop for every client.", "ru": "Выбери вызов, который замораживает event loop для всех клиентов." },
      "scenario": { "en": "a) await readFile(p)  b) crypto.pbkdf2Sync(...)  c) await fetch(u)", "ru": "a) await readFile(p)  b) crypto.pbkdf2Sync(...)  c) await fetch(u)" },
      "reveal": { "en": "b — the *Sync* CPU call runs on the one JS thread with no I/O to offload, blocking everyone.", "ru": "b — *Sync* CPU-вызов исполняется на единственном JS-потоке без I/O для офлоада и блокирует всех." }
    },
    {
      "id": "warmup-stream-vs-buffer",
      "type": "predict",
      "difficulty": "apply",
      "estMin": 5,
      "title": { "en": "Stream or buffer", "ru": "Стрим или буфер" },
      "prompt": { "en": "A 2GB file must be sent to a client on a 512MB box. Stream or readFile? Why?", "ru": "Файл 2ГБ нужно отдать клиенту на машине с 512МБ. Стрим или readFile? Почему?" },
      "scenario": { "en": "res sends a 2GB file; container memory limit 512MB.", "ru": "res отдаёт файл 2ГБ; лимит памяти контейнера 512МБ." },
      "reveal": { "en": "Stream (createReadStream + pipe): readFile buffers the whole 2GB into memory and OOMs; streaming holds only a small chunk and respects backpressure.", "ru": "Стрим (createReadStream + pipe): readFile буферизует все 2ГБ в память и упадёт по OOM; стриминг держит лишь маленький чанк и уважает backpressure." }
    }
  ]
}
```

  `01-build.json`, `02-diagnose.json`, `03-capstone.json`: same shape with `tier`/`order`/`title` set (`build`/1, `diagnose`/2, `capstone`/3) and 3 placeholder challenges each (a `design` task is simplest — `{id,type:"design",difficulty,estMin,title,prompt,constraints:Bi,rubric:[Bi,Bi],model:Bi}`). These are replaced by real content in Task 10; they exist now only to make the build green.

- [ ] **Step 4: Build to verify schema + seed parse**

Run: `cd site && bun run build 2>&1 | tail -15`
Expected: build completes, no `lab` schema errors, lint report still `0/0`.

- [ ] **Step 5: Commit**

```bash
git add site/src/content.config.ts site/src/content/lab
git commit -m "feat(lab): add lab content collection + minimal node seed"
```

### Task 2: Lab lint rule (i18n parity, tier presence, unique ids, counts)

**Files:**
- Create: `site/src/lint/rules/lab.ts`
- Create: `site/src/lint/rules/lab.test.ts`
- Modify: `site/src/lint/index.ts` (import at `:17` region, invoke after `checkDrill` at `:87`)

- [ ] **Step 1: Write the failing test** `site/src/lint/rules/lab.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { lintLabData, aggregateLab } from "./lab";

const ok = {
  track: "node", tier: "build", order: 1,
  title: { en: "Build", ru: "Стройка" },
  intro: { en: "Build real things.", ru: "Строй настоящее." },
  challenges: [
    { id: "b-1", type: "design", difficulty: "apply", estMin: 30,
      title: { en: "Static server", ru: "Статик-сервер" },
      prompt: { en: "Build a static file server on net.", ru: "Собери статик-сервер на net." },
      constraints: { en: "No frameworks.", ru: "Без фреймворков." },
      rubric: [{ en: "Streams the file", ru: "Стримит файл" }, { en: "Handles 404", ru: "Обрабатывает 404" }],
      model: { en: "Use net.createServer + createReadStream.", ru: "Используй net.createServer + createReadStream." } },
  ],
};

describe("lintLabData", () => {
  it("passes clean data", () => {
    expect(lintLabData("f.json", ok).errors).toEqual([]);
  });
  it("flags untranslated en===ru", () => {
    const bad = { ...ok, challenges: [{ ...ok.challenges[0], title: { en: "Static file server", ru: "Static file server" } }] };
    expect(lintLabData("f.json", bad).errors.some((e) => e.includes("untranslated"))).toBe(true);
  });
  it("flags whitespace-only field", () => {
    const bad = { ...ok, intro: { en: "Build real things.", ru: "   " } };
    expect(lintLabData("f.json", bad).errors.some((e) => e.includes("whitespace"))).toBe(true);
  });
});

describe("aggregateLab", () => {
  it("flags duplicate challenge ids across files of one track", () => {
    const res = aggregateLab([
      { file: "a.json", data: ok },
      { file: "b.json", data: { ...ok, tier: "diagnose", order: 2 } },
    ]);
    expect(res.errors.some((e) => e.includes("duplicated"))).toBe(true);
  });
  it("flags a track missing a required tier", () => {
    const res = aggregateLab([{ file: "a.json", data: ok }]);
    expect(res.errors.some((e) => e.includes("missing tier"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/lint/rules/lab.test.ts 2>&1 | tail -15`
Expected: FAIL — `Cannot find module './lab'`.

- [ ] **Step 3: Implement `site/src/lint/rules/lab.ts`** (mirrors `drill.ts` structure):

```ts
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const UNTRANSLATED_MIN_LEN = 12;
const REQUIRED_TIERS = ["warmup", "build", "diagnose", "capstone"] as const;
const TIER_MIN: Record<string, number> = { warmup: 5, build: 8, diagnose: 5, capstone: 2 };

function biFields(task: any): { en?: string; ru?: string }[] {
  const out: any[] = [];
  const push = (v: any) => { if (v && typeof v === "object" && ("en" in v || "ru" in v)) out.push(v); };
  push(task.title); push(task.prompt); push(task.scenario); push(task.reveal);
  push(task.evidence); push(task.constraints); push(task.model);
  for (const r of task.rubric ?? []) push(r);
  for (const s of task.steps ?? []) { push(s.label); push(s.prompt); push(s.reveal); }
  if (task.grading) { push(task.grading.model); for (const r of task.grading.rubric ?? []) push(r); for (const b of task.grading.blanks ?? []) push(b.hint); }
  return out;
}

export function lintLabData(file: string, data: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const v of [data.title, data.intro]) {
    if (v && (!v.en?.trim() || !v.ru?.trim())) errors.push(`lab: "${file}" header has a whitespace-only en/ru field`);
  }
  for (const c of data.challenges ?? []) {
    for (const b of biFields(c)) {
      if (!b.en?.trim() || !b.ru?.trim()) errors.push(`lab: "${file}" challenge "${c.id}" has a whitespace-only en/ru field`);
      else if (b.en.length >= UNTRANSLATED_MIN_LEN && b.en.trim() === b.ru.trim()) errors.push(`lab: "${file}" challenge "${c.id}" has an untranslated field (en === ru)`);
    }
  }
  return { errors, warnings };
}

export function aggregateLab(all: { file: string; data: any }[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Map<string, string>();          // `${track}:${id}` -> file
  const tiersByTrack = new Map<string, Set<string>>(); // track -> tiers present
  const countByTrackTier = new Map<string, number>();  // `${track}:${tier}` -> challenge count

  for (const { file, data } of all) {
    const r = lintLabData(file, data);
    errors.push(...r.errors); warnings.push(...r.warnings);
    const track = data.track, tier = data.tier;
    if (!tiersByTrack.has(track)) tiersByTrack.set(track, new Set());
    tiersByTrack.get(track)!.add(tier);
    countByTrackTier.set(`${track}:${tier}`, (countByTrackTier.get(`${track}:${tier}`) ?? 0) + (data.challenges?.length ?? 0));
    for (const c of data.challenges ?? []) {
      const key = `${track}:${c.id}`;
      if (seenIds.has(key)) errors.push(`lab: challenge id "${c.id}" duplicated in "${file}" and "${seenIds.get(key)}"`);
      else seenIds.set(key, file);
    }
  }
  for (const [track, tiers] of tiersByTrack) {
    for (const t of REQUIRED_TIERS) {
      if (!tiers.has(t)) errors.push(`lab: track "${track}" missing tier "${t}"`);
      else {
        const n = countByTrackTier.get(`${track}:${t}`) ?? 0;
        if (n < TIER_MIN[t]) warnings.push(`lab: track "${track}" tier "${t}" has ${n} challenges (< ${TIER_MIN[t]} target)`);
      }
    }
  }
  return { errors, warnings };
}

async function readLab(siteSrc: string): Promise<{ file: string; data: any }[]> {
  const dir = join(siteSrc, "content/lab");
  const files: string[] = [];
  async function walk(d: string) {
    let items: import("node:fs").Dirent[];
    try { items = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const i of items) {
      const p = join(d, i.name);
      if (i.isDirectory()) await walk(p);
      else if (i.name.endsWith(".json")) files.push(p);
    }
  }
  await walk(dir);
  const out: { file: string; data: any }[] = [];
  for (const f of files) { try { out.push({ file: f, data: JSON.parse(await readFile(f, "utf8")) }); } catch { /* schema handles malformed */ } }
  return out;
}

export async function checkLab(siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  return aggregateLab(await readLab(siteSrc));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/lint/rules/lab.test.ts 2>&1 | tail -15`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire into the build linter** — `site/src/lint/index.ts`. Add after line 17:

```ts
import { checkLab } from "./rules/lab";
```

  And after the `drillRes` block (after line 89):

```ts
        const labRes = await checkLab(siteSrc);
        errors.push(...labRes.errors);
        warnings.push(...labRes.warnings);
```

- [ ] **Step 6: Build to verify lint integration green**

Run: `cd site && bun run build 2>&1 | tail -8`
Expected: `Complete!`, lint `0/0` (the 4 seed tiers each have 3 challenges → warmup/build/diagnose under target → **warnings**, not errors; acceptable until Task 10). Confirm `dist/lint-report.json` `errors:0`.

- [ ] **Step 7: Commit**

```bash
git add site/src/lint/rules/lab.ts site/src/lint/rules/lab.test.ts site/src/lint/index.ts
git commit -m "feat(lab): build-time lint rule (parity, tiers, unique ids, counts)"
```

### Task 3: Lab page `/learn/[track]/lab`

**Files:**
- Create: `site/src/pages/[lang]/learn/[track]/lab.astro`
- Reference (no change): `site/src/components/pedagogy/PracticeSection.tsx:17` (props `{ lang, lessonKey, tasks }`), `site/src/layouts/Atlas.astro`, `site/src/pages/[lang]/learn/[track]/index.astro` (class vocabulary).

- [ ] **Step 1: Implement the page**:

```astro
---
import Atlas from "~/layouts/Atlas.astro";
import { getCollection } from "astro:content";
import { type Locale, isLocale } from "~/i18n";
import PracticeSection from "~/components/pedagogy/PracticeSection.tsx";

export async function getStaticPaths() {
  const labs = await getCollection("lab");
  const tracks = [...new Set(labs.map((l) => l.data.track))];
  return tracks.flatMap((track) =>
    (["en", "ru"] as const).map((lang) => ({ params: { lang, track } })),
  );
}

const { lang, track } = Astro.params as { lang: Locale; track: string };
if (!isLocale(lang)) throw new Error("bad lang");

const trackEntry = (await getCollection("tracks")).find((t) => t.data.slug === track);
if (!trackEntry) throw new Error(`Unknown track: ${track}`);

const tiers = (await getCollection("lab"))
  .filter((l) => l.data.track === track)
  .sort((a, b) => a.data.order - b.data.order);

const total = tiers.reduce((n, t) => n + t.data.challenges.length, 0);

const L = {
  lab: lang === "en" ? "Mastery Lab" : "Лаборатория мастерства",
  path: lang === "en" ? "Start here → build up → mastery" : "Начни здесь → по нарастающей → мастерство",
  challenges: lang === "en" ? "challenges" : "челленджей",
  back: lang === "en" ? "Back to track" : "Назад к треку",
};
const DOMAIN: Record<string, string> = { lilac: "var(--d-network)", mint: "var(--d-data)", peach: "var(--d-frontend)", sky: "var(--d-backend)", rose: "var(--d-ai)" };
const dvar = DOMAIN[trackEntry.data.color] ?? "var(--accent)";
---

<Atlas title={`${trackEntry.data.title[lang]} — ${L.lab}`} lang={lang}>
  <div class="oa-wrap-narrow" style="padding-bottom: var(--s-9);">
    <header class="oa-pagehead">
      <p class="kicker"><span class="domain-tag" style={`--d: ${dvar};`}><span class="sq"></span>{track}</span></p>
      <h1 style="margin-top: var(--s-4);">{L.lab}</h1>
      <p class="ph-blurb">{L.path}</p>
      <p class="ph-meta"><span>{total} {L.challenges}</span></p>
      <a class="oa-btn" href={`/${lang}/learn/${track}/`} style="margin-top: var(--s-5);">← {L.back}</a>
    </header>

    {tiers.map((t) => (
      <section class="oa-unit" style="margin-top: var(--s-7);">
        <div class="oa-unit-head">
          <span class="u-num">{String(t.data.order + 1).padStart(2, "0")}</span>
          <h3>{t.data.title[lang]}</h3>
          <span class="u-crux">{t.data.intro[lang]}</span>
        </div>
        <PracticeSection
          client:visible
          lang={lang}
          lessonKey={`${track}-lab-${t.data.tier}`}
          tasks={t.data.challenges}
        />
      </section>
    ))}
  </div>
</Atlas>
```

- [ ] **Step 2: Build + verify both locales render**

Run: `cd site && bun run build 2>&1 | tail -6 && ls dist/en/learn/node/lab dist/ru/learn/node/lab`
Expected: `Complete!`; both `index.html` exist. Hydration cap (≤5 islands/page) holds — 4 tiers = 4 `PracticeSection` islands.

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/[lang]/learn/[track]/lab.astro
git commit -m "feat(lab): /learn/[track]/lab page reusing PracticeSection"
```

### Task 4: Nav CTA to the Lab from the track index

**Files:**
- Modify: `site/src/pages/[lang]/learn/[track]/index.astro`

- [ ] **Step 1: Detect a lab + add a CTA.** In the frontmatter (after line 34, the `next` line) add:

```ts
const hasLab = (await getCollection("lab")).some((l) => l.data.track === track);
const labLabel = lang === "en" ? "Open the Mastery Lab" : "Открыть Лабораторию мастерства";
const labBlurb = lang === "en" ? "Curated hands-on challenges: build, diagnose, master." : "Курируемые hands-on челленджи: строй, диагностируй, овладей.";
```

  Add `getCollection` is already imported. In the body, right after the `</header>` (line 69) insert:

```astro
    {hasLab ? (
      <a class="track-card" href={`/${lang}/learn/${track}/lab/`} style="margin-top: var(--s-5);">
        <div class="tc-meta"><span class="tc-num">★ Lab</span></div>
        <h4>{labLabel}</h4>
        <p class="tc-blurb">{labBlurb}</p>
      </a>
    ) : null}
```

- [ ] **Step 2: Build + verify CTA only on node**

Run: `cd site && bun run build 2>&1 | tail -5`
Expected: `Complete!`, lint errors `0`. (Other tracks have no lab → no CTA, no broken link.)

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/[lang]/learn/[track]/index.astro
git commit -m "feat(lab): CTA to Mastery Lab on track index"
```

- [ ] **Step 4: Do NOT push infra to main yet.** Infra is committed to the *local* `main`; content worktrees cut from it (a worktree shares the repo's local commits, so unpushed infra is still present in every worktree). Local `main` will carry 3 lab count-*warnings* (seed tiers below `TIER_MIN`) until Task 10 fills the Lab — acceptable because it is not deployed. The single push to origin happens only in Task 11, when the merged tree is `0/0`.

---

## Phase 1 — New units (PARALLEL worktrees, one branch each)

Each unit is one branch (`expand-node-net`, `-tls`, `-ffi`, `-mods`, `-v8`) in its own worktree, cut from the local `main` that already has Phase 0 infra, authored by an independent instance, committed but NOT merged. Every lesson: EN+RU, `status: ready`, middle/senior depth, ≥1 structural diagram, per-lesson practice JSON (~6 tasks). **Each branch follows `docs/superpowers/parallel-prompts/PROTOCOL.md` exactly** (Zod-pre-validate practice before build; crux ≤135; no `grading` wrapper on `design`/`incident`; `incident.steps`=`{label,prompt,reveal}`; `fix.starter`=string; escape literal `{`/`}` in display text; `RetrievalDrawer` client:load only; assert on-branch before commit; never merge/push). Each task appends its unit object to `site/src/content/units.json` (orders 10–14) and scaffolds lesson dirs under `site/src/content/lessons/{en,ru}/node/<unit>/<lesson>/` + practice under `site/src/content/practice/node/<unit>/`.

### Task 5: Unit `10-networking-deep`

**Files (create EN+RU each + practice):**
- `site/src/content/lessons/{en,ru}/node/10-networking-deep/01-tcp-and-net/index.mdx`
- `.../02-udp-and-dgram/index.mdx`
- `.../03-sockets-in-production/index.mdx`
- `site/src/content/practice/node/10-networking-deep/{01-tcp-and-net,02-udp-and-dgram,03-sockets-in-production}.json`
- Modify: `site/src/content/units.json` (append unit object, order 10)

- [ ] **Step 1: Append the unit to `units.json`**:

```json
{ "id": "node/10-networking-deep", "slug": "10-networking-deep", "track": "node", "order": 10,
  "title": { "en": "Networking, deep", "ru": "Сеть, глубже" },
  "crux": { "en": "Below HTTP: raw TCP and UDP sockets, and the production traps.", "ru": "Ниже HTTP: сырые TCP- и UDP-сокеты и продакшн-ловушки." },
  "lessons": ["01-tcp-and-net", "02-udp-and-dgram", "03-sockets-in-production"] }
```

- [ ] **Step 2: Author the 3 lessons (EN then RU)** to the depth bar. Theory each must cover:
  - `01-tcp-and-net` (middle): `net` module, `net.createServer`/`net.Socket`, the connection lifecycle, `data`/`end`/`error`/`close` events, half-open connections (`allowHalfOpen`), Nagle's algorithm + `socket.setNoDelay`, `socket.setKeepAlive`, writing and the boolean return (backpressure at the socket level), `ref`/`unref`.
  - `02-udp-and-dgram` (middle): `dgram`, datagrams vs streams, `send`/`message`, no delivery/order guarantees, message size/MTU, broadcast + multicast, when UDP wins (metrics, discovery, games, DNS).
  - `03-sockets-in-production` (senior): timeouts (`setTimeout`), idle/keep-alive tuning, socket backpressure under load, `ECONNRESET`/`EPIPE` handling, connection limits + `server.maxConnections`, graceful close, the "thundering accept" / file-descriptor exhaustion failure mode.
  - Sources: nodejs.org `net`/`dgram` API docs + a real production write-up. Frontmatter `prereqs` may reference `05-http-and-frameworks/01-http-module`.

- [ ] **Step 3: Author the 3 practice JSON** (~6 tasks each, mix of `predict`/`diagnose`/`fix`/`design`). Zod-pre-validate per PROTOCOL.md before building.

- [ ] **Step 4: Build green on branch**

Run: `cd site && bun run build 2>&1 | tail -10`
Expected: `Complete!`, lint errors `0` (practice on node only warns if absent; here it's present).

- [ ] **Step 5: Correctness review + commit** — dispatch a READ-ONLY reviewer over the new lessons (TCP/UDP claims, socket semantics, RU accuracy); fix confirmed errors; then:

```bash
git add site/src/content/lessons/{en,ru}/node/10-networking-deep site/src/content/practice/node/10-networking-deep site/src/content/units.json
git commit -m "content(node): unit 10-networking-deep EN+RU ready"
```

### Task 6: Unit `11-tls-and-http2`

**Files:** lessons+practice for `01-tls-and-https`, `02-http2-and-alpn`, `03-http-client-deep`; append unit order 11 to `units.json`.

- [ ] **Step 1: Append unit** to `units.json`:

```json
{ "id": "node/11-tls-and-http2", "slug": "11-tls-and-http2", "track": "node", "order": 11,
  "title": { "en": "TLS and HTTP/2", "ru": "TLS и HTTP/2" },
  "crux": { "en": "Encrypted transport and the multiplexed protocol above it.", "ru": "Шифрованный транспорт и мультиплексируемый протокол над ним." },
  "lessons": ["01-tls-and-https", "02-http2-and-alpn", "03-http-client-deep"] }
```

- [ ] **Step 2: Author lessons.** Theory:
  - `01-tls-and-https` (middle): `tls`/`https.createServer`, certificates + chain, the handshake, SNI, session resumption/tickets, `secureContext`, common cert errors.
  - `02-http2-and-alpn` (senior): `http2` core module, streams + multiplexing (head-of-line blocking solved at HTTP layer), ALPN negotiation, why server push was deprecated, h2c vs h2, when HTTP/2 helps.
  - `03-http-client-deep` (middle): the client side — `undici` (the modern client), keep-alive connection pools, `Agent`/`Pool`, connection reuse vs per-request sockets, timeouts/retries, the global `fetch` built on undici.
  - Sources: nodejs.org `tls`/`http2`, undici docs, the HTTP/2 RFC summary.

- [ ] **Step 3: Practice JSON** (~6 each), Zod-pre-validate.
- [ ] **Step 4: Build green.** Run: `cd site && bun run build 2>&1 | tail -10` → `Complete!`, errors `0`.
- [ ] **Step 5: Review + commit** `content(node): unit 11-tls-and-http2 EN+RU ready`.

### Task 7: Unit `12-native-and-ffi`

**Files:** lessons+practice for `01-native-addons-napi`, `02-build-and-wasm-alternatives`; append unit order 12.

- [ ] **Step 1: Append unit**:

```json
{ "id": "node/12-native-and-ffi", "slug": "12-native-and-ffi", "track": "node", "order": 12,
  "title": { "en": "Native addons & FFI", "ru": "Нативные аддоны и FFI" },
  "crux": { "en": "Calling C/C++ from Node — and when not to.", "ru": "Вызов C/C++ из Node — и когда этого не делать." },
  "lessons": ["01-native-addons-napi", "02-build-and-wasm-alternatives"] }
```

- [ ] **Step 2: Author lessons.** Theory:
  - `01-native-addons-napi` (senior): N-API / node-addon-api, the ABI-stability guarantee (why N-API over raw V8/NAN), the addon boundary, passing values across, async work (`napi_async_work`), the cost of crossing into native.
  - `02-build-and-wasm-alternatives` (senior): node-gyp, `binding.gyp`, prebuilds/`prebuildify`, install-time compilation pain, and the alternatives — WebAssembly (`WASI`/wasm modules), child process to a native binary, pure-JS — with a decision rule for *when NOT to* write a native addon.
  - Sources: nodejs.org N-API docs, node-gyp README, a WASM-in-Node reference.

- [ ] **Step 3: Practice** (~6 each), Zod-pre-validate.
- [ ] **Step 4: Build green.**
- [ ] **Step 5: Review + commit** `content(node): unit 12-native-and-ffi EN+RU ready`.

### Task 8: Unit `13-modules-deep`

**Files:** lessons+practice for `01-module-resolution-algorithm`, `02-package-exports-and-conditions`; append unit order 13.

- [ ] **Step 1: Append unit**:

```json
{ "id": "node/13-modules-deep", "slug": "13-modules-deep", "track": "node", "order": 13,
  "title": { "en": "Modules, deep", "ru": "Модули, глубже" },
  "crux": { "en": "How Node finds code, and how packages expose it.", "ru": "Как Node находит код и как пакеты его экспонируют." },
  "lessons": ["01-module-resolution-algorithm", "02-package-exports-and-conditions"] }
```

- [ ] **Step 2: Author lessons.** Theory:
  - `01-module-resolution-algorithm` (middle): CJS `require` resolution (the `node_modules` walk, file/dir/index, extensions) vs ESM resolution (URL-based, mandatory extensions, `import` specifiers), `package.json` `main`/`module`/`type`, the interop edges.
  - `02-package-exports-and-conditions` (senior): the `exports` field, subpath exports + patterns, `imports` (private `#` specifiers), conditional exports (`import`/`require`/`node`/`default`/`types`), the dual-package hazard and how to avoid it, encapsulation (blocking deep imports).
  - Sources: nodejs.org "Modules: Packages", "ESM" docs.

- [ ] **Step 3: Practice** (~6 each), Zod-pre-validate. A `diagnose` "why does this import fail" fits well here.
- [ ] **Step 4: Build green.**
- [ ] **Step 5: Review + commit** `content(node): unit 13-modules-deep EN+RU ready`.

### Task 9: Unit `14-v8-and-crypto`

**Files:** lessons+practice for `01-v8-optimization`, `02-crypto-deep`, `03-heap-snapshots-and-flamegraphs`; append unit order 14.

- [ ] **Step 1: Append unit**:

```json
{ "id": "node/14-v8-and-crypto", "slug": "14-v8-and-crypto", "track": "node", "order": 14,
  "title": { "en": "V8 internals & crypto", "ru": "Внутренности V8 и crypto" },
  "crux": { "en": "How V8 optimizes your code, and using crypto correctly.", "ru": "Как V8 оптимизирует код и как правильно использовать crypto." },
  "lessons": ["01-v8-optimization", "02-crypto-deep", "03-heap-snapshots-and-flamegraphs"] }
```

- [ ] **Step 2: Author lessons.** Theory:
  - `01-v8-optimization` (senior): hidden classes / object shapes (and what breaks them), inline caches (mono/poly/megamorphic), the JIT tiers + deoptimization triggers, GC generations (scavenge young gen vs mark-sweep-compact old gen), why "monomorphic, stable-shape" code is fast. Mention `--allow-natives-syntax`/`%GetOptimizationStatus` as a *peek*, not production.
  - `02-crypto-deep` (middle): `crypto` — hashing vs HMAC, `createHash`/`createHmac`, sign/verify (asymmetric), password KDFs (`scrypt`/`pbkdf2`, never plain SHA for passwords), `randomBytes`/`randomUUID`, `timingSafeEqual` and why `===` on secrets leaks timing.
  - `03-heap-snapshots-and-flamegraphs` (senior): taking heap snapshots (`v8.writeHeapSnapshot`/inspector), reading retainers + the 3-snapshot leak technique, CPU profiling `--cpu-prof`/`--prof`, flame graphs, distinguishing a leak from churn.
  - Sources: V8 blog (hidden classes, ICs), nodejs.org `crypto`, the "don't block / diagnostics" guides.

- [ ] **Step 3: Practice** (~6 each), Zod-pre-validate. `crypto-deep` is the natural home for a `fix` exec(js) task on `timingSafeEqual`.
- [ ] **Step 4: Build green.**
- [ ] **Step 5: Review + commit** `content(node): unit 14-v8-and-crypto EN+RU ready`.

---

## Phase 2 — Lab content (PARALLEL branch `expand-node-lab`)

### Task 10: Author the full Mastery Lab challenge set

**Files (overwrite the Task-1 seeds):**
- `site/src/content/lab/node/00-warmup.json` (≥5 challenges)
- `site/src/content/lab/node/01-build.json` (≥8)
- `site/src/content/lab/node/02-diagnose.json` (≥5)
- `site/src/content/lab/node/03-capstone.json` (≥2)

- [ ] **Step 1: Re-read the lab schema** — each challenge is a `PracticeTask` (`site/src/content.config.ts:77-130`). Allowed types: `predict` (`scenario`,`reveal`), `design` (`constraints`,`rubric[≥2]`,`model`), `incident` (`steps[3..6]` each `{label,prompt,reveal}`), `fix` (`starter?` string, `grading` self/exec), `diagnose` (`grading` blanks/self). No `grading` wrapper on `design`/`incident`/`predict`.

- [ ] **Step 2: Author `00-warmup.json` (≥5, `predict`/`fix`)** — reinforce runtime/async/streams/modules reasoning (output ordering, blocking spot, stream-vs-buffer, ESM/CJS resolution, microtask starvation). Each EN+RU.

- [ ] **Step 3: Author `01-build.json` (≥8, mostly `design`)** — build-from-scratch challenges, each with `constraints`, a 2+ item `rubric`, and a `model` answer sketch:
  - static file server on raw `net` (stream the file, handle 404, backpressure)
  - UDP service-discovery responder on `dgram`
  - a `Transform` stream that honors backpressure (line-splitter / gzip)
  - a dual-package library with a correct `exports` map (ESM+CJS, types)
  - an N-API "hello world" addon (or WASM alternative) with a build note
  - an HTTP/2 server negotiating ALPN with a TLS cert
  - a timing-safe token comparison endpoint (`timingSafeEqual`)
  - a keep-alive HTTP client pool with `undici`

- [ ] **Step 4: Author `02-diagnose.json` (≥5, `incident`/`fix`)** — debugging challenges:
  - find the memory leak via the 3-heap-snapshot technique (`incident`, 3–6 steps)
  - fix a V8 deopt surfaced by `--prof` (polymorphic shape) (`fix`)
  - trace event-loop lag to a sync call (`incident`)
  - resolve a TLS handshake failure (cert chain / SNI) (`incident`)
  - debug a dual-package hazard (two copies of state) (`incident`)

- [ ] **Step 5: Author `03-capstone.json` (≥2, `design`)** — integrative:
  - a production service combining net/TLS/streams/crypto/observability
  - a CLI tool or a library published with correct module resolution + exports

- [ ] **Step 6: Zod-pre-validate ALL four files** before building (per PROTOCOL.md — reconstruct `PracticeTask` from `content.config.ts` and `safeParse` each challenge).

- [ ] **Step 7: Build green on branch**

Run: `cd site && bun run build 2>&1 | tail -10`
Expected: `Complete!`, lint `0/0` — every tier now meets its `TIER_MIN`, so the Task-2 count warnings are gone.

- [ ] **Step 8: Correctness review + commit** — READ-ONLY reviewer over challenge prompts/models (technical accuracy, RU); fix; then:

```bash
git add site/src/content/lab/node
git commit -m "content(lab): full node Mastery Lab challenge set (warmup/build/diagnose/capstone)"
```

---

## Phase 3 — Integration (COORDINATOR, on `main`)

### Task 11: Merge all branches, verify, push

- [ ] **Step 1: Precompute `units.json` union** across `main` + the 5 unit branches (node net/tls/ffi/mods/v8), dedup by `id`, write to `/tmp/units-union.json` (same node script as the prior expansion).

- [ ] **Step 2: Merge sequentially** — `git checkout main`, then `git merge --no-ff` each branch (`expand-node-net`, `-tls`, `-ffi`, `-mods`, `-v8`, `expand-node-lab`). On any `units.json` conflict, `cp /tmp/units-union.json site/src/content/units.json && git add` then commit.

- [ ] **Step 3: Verify union** — `node -e` count: `units.json` has the 5 new node units (orders 10–14), all unique ids, valid JSON.

- [ ] **Step 4: Full gate**

Run: `cd site && bun run test 2>&1 | tail -5 && bun run build 2>&1 | tail -8`
Expected: tests all pass; build `Complete!`; `dist/lint-report.json` `errors:0, warnings:0`; `dist/{en,ru}/learn/node/lab/index.html` exist.

- [ ] **Step 5: Push (single deploy)**

```bash
git push origin main
```

- [ ] **Step 6: Cleanup** — `git worktree remove --force` each, `git worktree prune`, `git branch -d` each merged branch.

---

## Notes for the executor

- **Parallel safety:** only the coordinator merges/pushes. Instances commit to their branch only. (Recurring constraint — reviewers are READ-ONLY git: never checkout/reset/stash.)
- **Practice gotchas** are in `docs/superpowers/parallel-prompts/PROTOCOL.md` — read it before authoring any practice/lab JSON.
- **`units.json`** is the only file multiple branches touch; resolve by union-dedup-by-`id`.
- **Hydration cap** = 5 islands/page; the Lab page has 4 (`PracticeSection` per tier) — fine.
- **node is not in `PRACTICE_REQUIRED_TRACKS`**, so missing per-lesson practice only warns; author it anyway.
