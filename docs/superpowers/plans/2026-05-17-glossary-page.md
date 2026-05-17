# Glossary Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the redesigned glossary — an A–Z index page plus one hub page per term — with build-time derivation of `used-in` / `introduced-in` relations.

**Architecture:** A pure, unit-tested module (`glossary-index.ts`) scans `<Term k="…">` markup in content and derives a relation map. A thin Astro-glue module (`glossary-data.ts`) feeds it the content collections and resolves content references to per-language titles + URLs. Two new Astro pages render the index and the hubs inside the existing light-zone `Topic.astro` layout. This is plan 1 of 2 from the spec; plan 2 (definition backfill) is separate.

**Tech Stack:** Astro 5 content collections, TypeScript, Vitest, Tailwind utility classes (light editorial zone).

**Spec:** `docs/superpowers/specs/2026-05-17-glossary-redesign-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `site/src/scripts/glossary-index.ts` | **Create.** Pure derivation: types + `deriveRelations()`. No Astro imports. |
| `site/src/scripts/glossary-index.test.ts` | **Create.** Vitest unit tests for `deriveRelations()`. |
| `site/src/scripts/glossary-data.ts` | **Create.** Astro glue: reads collections, computes altitude, calls `deriveRelations`, resolves refs per language. |
| `site/src/pages/[lang]/glossary/index.astro` | **Create.** A–Z index page. |
| `site/src/pages/[lang]/glossary/[term].astro` | **Create.** Per-term hub page. |
| `site/src/pages/[lang]/glossary.astro` | **Delete.** Route moves to `glossary/index.astro`; public URL `/[lang]/glossary/` unchanged. |

Notes for the engineer:
- `<Term>` markup in content looks like `<Term k="tcp" lang="ru">…</Term>`. The `k` value is the glossary key; it is language-independent. EN and RU files of the same piece reference the same `k`.
- Content collections: `book` (fullstack pieces, id like `en/networking/01-networking/03-tcp-handshake`) and `lessons` (foundations, id like `en/math/01-numbers/01-counting`). Each entry has `.body` = raw MDX source and `.data` with schema fields.
- Vitest runs with `bun run test` (config: `site/vitest.config.ts`). Test files co-locate next to source, e.g. `src/scripts/tier-router.test.ts`.

---

## Task 1: Pure derivation module — scan, used-in, introduced-in

**Files:**
- Create: `site/src/scripts/glossary-index.ts`
- Test: `site/src/scripts/glossary-index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/scripts/glossary-index.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveRelations, type ScanEntry } from "./glossary-index";

const glossary = {
  tcp: { en: "TCP", ru: "TCP" },
  syn: { en: "SYN", ru: "SYN" },
  heap: { en: "heap", ru: "куча" },
};

// altitude: lower = closer to zero knowledge
const entries: ScanEntry[] = [
  { collection: "lessons", group: "algorithms", slug: "01-heaps", altitude: 100,
    body: 'A <Term k="heap" lang="en">heap</Term> orders by priority.' },
  { collection: "book", group: "networking", slug: "03-tcp-handshake", altitude: 9000,
    body: 'The <Term k="tcp" lang="en">TCP</Term> <Term k="syn" lang="en">SYN</Term> packet. <Term k="tcp" lang="en">TCP</Term> again.' },
  { collection: "book", group: "networking", slug: "01-osi", altitude: 8000,
    body: 'Early mention of <Term k="tcp" lang="en">TCP</Term>.' },
];

describe("deriveRelations — usedIn / introducedIn", () => {
  const rel = deriveRelations(entries, glossary);

  it("collects every entry that references a key, deduped per entry", () => {
    expect(rel.usedIn.tcp.map((r) => r.slug).sort()).toEqual(["01-osi", "03-tcp-handshake"]);
    expect(rel.usedIn.syn.map((r) => r.slug)).toEqual(["03-tcp-handshake"]);
  });

  it("usedIn is sorted by altitude ascending", () => {
    expect(rel.usedIn.tcp.map((r) => r.altitude)).toEqual([8000, 9000]);
  });

  it("introducedIn is the lowest-altitude entry", () => {
    expect(rel.introducedIn.tcp?.slug).toBe("01-osi");
    expect(rel.introducedIn.heap?.slug).toBe("01-heaps");
  });

  it("introducedIn is null and usedIn is [] for an unreferenced key", () => {
    const r2 = deriveRelations([], glossary);
    expect(r2.introducedIn.tcp).toBeNull();
    expect(r2.usedIn.tcp).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd site && bun run test -- glossary-index`
Expected: FAIL — `deriveRelations` / `ScanEntry` not exported (module does not exist).

- [ ] **Step 3: Write the minimal implementation**

Create `site/src/scripts/glossary-index.ts`:

```ts
// Pure, build-time glossary relation derivation. No Astro imports — unit-tested.

export type GlossEntry = {
  en: string;
  ru: string;
  defEn?: string;
  defRu?: string;
  seeAlso?: string[];
};

export type ScanEntry = {
  collection: "book" | "lessons";
  group: string; // pillar slug (book) | track slug (lessons)
  slug: string; // piece slug | lesson slug
  altitude: number; // lower = closer to zero knowledge
  body: string; // raw MDX source
};

export type ContentRef = {
  collection: "book" | "lessons";
  group: string;
  slug: string;
  altitude: number;
};

export type Relations = {
  usedIn: Record<string, ContentRef[]>;
  introducedIn: Record<string, ContentRef | null>;
  seeAlso: Record<string, string[]>;
};

const TERM_RE = /<Term\b[^>]*\bk="([^"]+)"/g;

/** Glossary keys referenced via <Term k="..."> in one MDX body, deduped. */
export function scanKeys(body: string): Set<string> {
  const keys = new Set<string>();
  for (const m of body.matchAll(TERM_RE)) keys.add(m[1]);
  return keys;
}

export function deriveRelations(
  entries: ScanEntry[],
  glossary: Record<string, GlossEntry>,
): Relations {
  const usedIn: Record<string, ContentRef[]> = {};
  const introducedIn: Record<string, ContentRef | null> = {};
  const seeAlso: Record<string, string[]> = {};

  for (const key of Object.keys(glossary)) {
    usedIn[key] = [];
    introducedIn[key] = null;
    seeAlso[key] = [];
  }

  for (const entry of entries) {
    const ref: ContentRef = {
      collection: entry.collection,
      group: entry.group,
      slug: entry.slug,
      altitude: entry.altitude,
    };
    for (const key of scanKeys(entry.body)) {
      if (!(key in usedIn)) continue; // ignore <Term> keys absent from glossary.json
      usedIn[key].push(ref);
    }
  }

  for (const key of Object.keys(usedIn)) {
    usedIn[key].sort((a, b) => a.altitude - b.altitude);
    introducedIn[key] = usedIn[key][0] ?? null;
  }

  return { usedIn, introducedIn, seeAlso };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd site && bun run test -- glossary-index`
Expected: PASS — 4 tests in the "usedIn / introducedIn" describe block.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/glossary-index.ts site/src/scripts/glossary-index.test.ts
git commit -m "feat(glossary): pure relation derivation — used-in, introduced-in"
```

---

## Task 2: Derivation module — see-also with dangling-reference guard

**Files:**
- Modify: `site/src/scripts/glossary-index.ts`
- Test: `site/src/scripts/glossary-index.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `site/src/scripts/glossary-index.test.ts`:

```ts
describe("deriveRelations — seeAlso", () => {
  it("copies seeAlso arrays from the glossary", () => {
    const g = {
      tcp: { en: "TCP", ru: "TCP", seeAlso: ["syn"] },
      syn: { en: "SYN", ru: "SYN" },
    };
    const rel = deriveRelations([], g);
    expect(rel.seeAlso.tcp).toEqual(["syn"]);
    expect(rel.seeAlso.syn).toEqual([]);
  });

  it("throws on a seeAlso reference to a missing key", () => {
    const g = { tcp: { en: "TCP", ru: "TCP", seeAlso: ["ghost"] } };
    expect(() => deriveRelations([], g)).toThrow(/seeAlso.*ghost/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd site && bun run test -- glossary-index`
Expected: FAIL — `seeAlso.tcp` is `[]` (not yet copied); the throw test fails (no throw).

- [ ] **Step 3: Write the minimal implementation**

In `site/src/scripts/glossary-index.ts`, replace the `seeAlso` population. Change the per-key init loop and add a resolution pass. The final `deriveRelations` body becomes:

```ts
export function deriveRelations(
  entries: ScanEntry[],
  glossary: Record<string, GlossEntry>,
): Relations {
  const usedIn: Record<string, ContentRef[]> = {};
  const introducedIn: Record<string, ContentRef | null> = {};
  const seeAlso: Record<string, string[]> = {};

  for (const key of Object.keys(glossary)) {
    usedIn[key] = [];
    introducedIn[key] = null;
    const refs = glossary[key].seeAlso ?? [];
    for (const ref of refs) {
      if (!(ref in glossary)) {
        throw new Error(`glossary "${key}": seeAlso references unknown key "${ref}"`);
      }
    }
    seeAlso[key] = refs;
  }

  for (const entry of entries) {
    const ref: ContentRef = {
      collection: entry.collection,
      group: entry.group,
      slug: entry.slug,
      altitude: entry.altitude,
    };
    for (const key of scanKeys(entry.body)) {
      if (!(key in usedIn)) continue;
      usedIn[key].push(ref);
    }
  }

  for (const key of Object.keys(usedIn)) {
    usedIn[key].sort((a, b) => a.altitude - b.altitude);
    introducedIn[key] = usedIn[key][0] ?? null;
  }

  return { usedIn, introducedIn, seeAlso };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd site && bun run test -- glossary-index`
Expected: PASS — all 6 tests (4 from Task 1 + 2 here).

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/glossary-index.ts site/src/scripts/glossary-index.test.ts
git commit -m "feat(glossary): see-also field with dangling-reference guard"
```

---

## Task 3: Astro glue — `glossary-data.ts`

Reads the content collections, computes altitude, calls `deriveRelations`, and exposes a per-language reference resolver.

**Files:**
- Create: `site/src/scripts/glossary-data.ts`

- [ ] **Step 1: Write the module**

Create `site/src/scripts/glossary-data.ts`:

```ts
// Astro-side glue for the glossary. Bridges content collections into the pure
// deriveRelations() and resolves ContentRefs to per-language titles + URLs.

import { getCollection } from "astro:content";
import glossaryJson from "../i18n/glossary.json";
import type { Locale } from "../i18n";
import {
  deriveRelations,
  type ContentRef,
  type GlossEntry,
  type Relations,
  type ScanEntry,
} from "./glossary-index";

export const glossary = glossaryJson as Record<string, GlossEntry>;

export type ResolvedRef = { title: string; href: string; group: string };

// Altitude: foundations lessons rank below all book pieces.
// lessons:  trackOrder*1e6 + unitOrder*1e3 + lessonOrder
// book:     1e9 + pillarOrder*1e3 + pieceOrder
function lessonAltitude(trackOrder: number, unitOrder: number, order: number): number {
  return trackOrder * 1_000_000 + unitOrder * 1_000 + order;
}
function bookAltitude(pillarOrder: number, order: number): number {
  return 1_000_000_000 + pillarOrder * 1_000 + order;
}

/** Derive relations once. Scans the EN entries only — <Term k> keys are
 *  language-independent, so one language is enough and avoids double counting. */
async function buildRelations(): Promise<Relations> {
  const pillars = await getCollection("pillars");
  const tracks = await getCollection("tracks");
  const units = await getCollection("units");
  const pillarOrder = new Map(pillars.map((p) => [p.data.slug, p.data.order]));
  const trackOrder = new Map(tracks.map((t) => [t.data.slug, t.data.order]));
  const unitOrder = new Map(units.map((u) => [u.data.slug, u.data.order]));

  const book = await getCollection("book", (e) => e.data.lang === "en");
  const lessons = await getCollection("lessons", (e) => e.data.lang === "en");

  const scan: ScanEntry[] = [];
  for (const e of book) {
    scan.push({
      collection: "book",
      group: e.data.pillar,
      slug: e.data.slug,
      altitude: bookAltitude(pillarOrder.get(e.data.pillar) ?? 999, e.data.order),
      body: e.body ?? "",
    });
  }
  for (const e of lessons) {
    scan.push({
      collection: "lessons",
      group: e.data.track,
      slug: e.data.slug,
      altitude: lessonAltitude(
        trackOrder.get(e.data.track) ?? 999,
        unitOrder.get(e.data.unit) ?? 999,
        e.data.order,
      ),
      body: e.body ?? "",
    });
  }

  return deriveRelations(scan, glossary);
}

/** Relations + a resolver that turns a ContentRef into a title + URL for `lang`. */
export async function loadGlossary(lang: Locale): Promise<{
  relations: Relations;
  resolveRef: (ref: ContentRef) => ResolvedRef;
}> {
  const relations = await buildRelations();

  const book = await getCollection("book", (e) => e.data.lang === lang);
  const lessons = await getCollection("lessons", (e) => e.data.lang === lang);
  const pillars = await getCollection("pillars");
  const tracks = await getCollection("tracks");
  const pillarTitle = new Map(pillars.map((p) => [p.data.slug, p.data.title[lang]]));
  const trackTitle = new Map(tracks.map((t) => [t.data.slug, t.data.title[lang]]));

  // key: `${collection}:${group}:${slug}` → entry title for `lang`
  const titleByKey = new Map<string, string>();
  for (const e of book) titleByKey.set(`book:${e.data.pillar}:${e.data.slug}`, e.data.title);
  for (const e of lessons) titleByKey.set(`lessons:${e.data.track}:${e.data.slug}`, e.data.title);

  function resolveRef(ref: ContentRef): ResolvedRef {
    const k = `${ref.collection}:${ref.group}:${ref.slug}`;
    const title = titleByKey.get(k) ?? ref.slug;
    if (ref.collection === "book") {
      return {
        title,
        href: `/${lang}/${ref.group}/${ref.slug}/`,
        group: pillarTitle.get(ref.group) ?? ref.group,
      };
    }
    return {
      title,
      href: `/${lang}/learn/${ref.group}/${ref.slug}/`,
      group: trackTitle.get(ref.group) ?? ref.group,
    };
  }

  return { relations, resolveRef };
}
```

- [ ] **Step 2: Type-check the module**

Run: `cd site && bun run check`
Expected: no errors in `glossary-data.ts`. (Pre-existing unrelated warnings elsewhere are acceptable; there must be no error in the new file.)

- [ ] **Step 3: Commit**

```bash
git add site/src/scripts/glossary-data.ts
git commit -m "feat(glossary): astro glue — collection scan, altitude, ref resolver"
```

---

## Task 4: Hub page — `[lang]/glossary/[term].astro`

**Files:**
- Create: `site/src/pages/[lang]/glossary/[term].astro`

- [ ] **Step 1: Write the page**

Create `site/src/pages/[lang]/glossary/[term].astro`:

```astro
---
import Topic from "../../../layouts/Topic.astro";
import { type Locale, isLocale, t } from "../../../i18n";
import { glossary, loadGlossary, type ResolvedRef } from "../../../scripts/glossary-data";

type HubVM = {
  key: string;
  label: string;
  otherLabel: string;
  otherLang: "EN" | "RU";
  def: string | null;
  introducedIn: ResolvedRef | null;
  usedIn: ResolvedRef[];
  seeAlso: { key: string; label: string; href: string }[];
};

export async function getStaticPaths() {
  const paths: { params: { lang: string; term: string }; props: { vm: HubVM; lang: Locale } }[] = [];
  for (const lang of ["en", "ru"] as const) {
    const { relations, resolveRef } = await loadGlossary(lang);
    for (const [key, entry] of Object.entries(glossary)) {
      const intro = relations.introducedIn[key];
      const vm: HubVM = {
        key,
        label: entry[lang],
        otherLabel: lang === "en" ? entry.ru : entry.en,
        otherLang: lang === "en" ? "RU" : "EN",
        def: (lang === "en" ? entry.defEn : entry.defRu) ?? null,
        introducedIn: intro ? resolveRef(intro) : null,
        usedIn: relations.usedIn[key].map(resolveRef),
        seeAlso: relations.seeAlso[key].map((sk) => ({
          key: sk,
          label: glossary[sk][lang],
          href: `/${lang}/glossary/${sk}/`,
        })),
      };
      paths.push({ params: { lang, term: key }, props: { vm, lang } });
    }
  }
  return paths;
}

const { lang } = Astro.params as { lang: Locale; term: string };
if (!isLocale(lang)) throw new Error("bad lang");
const { vm } = Astro.props as { vm: HubVM; lang: Locale };
---

<Topic title={vm.label} lang={lang}>
  <div class="max-w-[920px] mx-auto px-4 lg:px-8 mt-6">
    <nav class="font-mono text-[11px] text-muted mb-6">
      <a href={`/${lang}/`} class="hover:text-ink">{t("nav.home", lang)}</a>
      <span class="mx-1.5 text-muted-2">/</span>
      <a href={`/${lang}/glossary/`} class="hover:text-ink">{t("nav.glossary", lang)}</a>
      <span class="mx-1.5 text-muted-2">/</span>
      <b class="text-ink font-semibold">{vm.label}</b>
    </nav>

    <div class="grid grid-cols-1 md:grid-cols-[1fr_232px] gap-10 items-start">
      <article>
        <h1 class="font-display text-[clamp(30px,4vw,42px)] font-bold leading-[1.08] tracking-[-0.02em] m-0 text-ink">
          {vm.label}
        </h1>
        <p class="font-mono text-[11px] uppercase tracking-[0.12em] text-muted mt-2">
          {vm.otherLang}: {vm.otherLabel}
        </p>
        {vm.def ? (
          <p class="text-ink-2 text-[17px] leading-relaxed mt-5">{vm.def}</p>
        ) : (
          <p class="mt-5 text-muted italic border-l-2 border-rule pl-4 py-1">
            {lang === "en" ? "Definition pending." : "Определение готовится."}
          </p>
        )}
      </article>

      <aside class="md:border-l md:border-rule md:pl-6 flex flex-col gap-6">
        {vm.introducedIn && (
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[0.13em] text-muted-2 mb-2">
              {lang === "en" ? "First introduced in" : "Впервые вводится в"}
            </p>
            <a href={vm.introducedIn.href} class="block text-ink font-medium hover:text-ac">
              {vm.introducedIn.title}
            </a>
            <span class="font-mono text-[10.5px] text-muted">{vm.introducedIn.group}</span>
          </div>
        )}
        {vm.usedIn.length > 0 && (
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[0.13em] text-muted-2 mb-2">
              {lang === "en" ? `Used in ${vm.usedIn.length}` : `Используется в ${vm.usedIn.length}`}
            </p>
            <ul class="m-0 p-0 list-none flex flex-col gap-1.5">
              {vm.usedIn.map((r) => (
                <li>
                  <a href={r.href} class="text-ink-2 text-[13.5px] hover:text-ac">{r.title}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {vm.seeAlso.length > 0 && (
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[0.13em] text-muted-2 mb-2">
              {lang === "en" ? "See also" : "См. также"}
            </p>
            <div class="flex flex-wrap gap-1.5">
              {vm.seeAlso.map((s) => (
                <a href={s.href}
                  class="font-mono text-[11px] border border-rule rounded-[2px] px-2 py-0.5 text-ink-2 hover:border-ac hover:text-ac">
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        )}
        {!vm.introducedIn && vm.usedIn.length === 0 && vm.seeAlso.length === 0 && (
          <p class="font-mono text-[11px] text-muted-2">
            {lang === "en" ? "No connections yet." : "Связей пока нет."}
          </p>
        )}
      </aside>
    </div>
  </div>
</Topic>
```

- [ ] **Step 2: Build to verify the hub generates**

Run: `cd site && bun run build`
Expected: build completes; output includes `dist/en/glossary/<term>/index.html` pages (e.g. `dist/en/glossary/tcp/index.html`). Page count rises by roughly 571×2. Lint report stays clean (`dist/lint-report.json` has no new errors).

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/[lang]/glossary/[term].astro
git commit -m "feat(glossary): per-term hub page with derived relations"
```

---

## Task 5: Index page + delete the old glossary page

**Files:**
- Create: `site/src/pages/[lang]/glossary/index.astro`
- Delete: `site/src/pages/[lang]/glossary.astro`

- [ ] **Step 1: Delete the old page**

```bash
git rm site/src/pages/[lang]/glossary.astro
```

- [ ] **Step 2: Write the index page**

Create `site/src/pages/[lang]/glossary/index.astro`:

```astro
---
import Topic from "../../../layouts/Topic.astro";
import { type Locale, isLocale, t } from "../../../i18n";
import { glossary, loadGlossary } from "../../../scripts/glossary-data";

type Row = {
  key: string;
  label: string;
  excerpt: string | null;
  usedCount: number;
  introduced: boolean;
  seeCount: number;
};
type Group = { letter: string; rows: Row[] };

function excerpt(def: string | undefined, n = 96): string | null {
  if (!def) return null;
  return def.length > n ? def.slice(0, n).trimEnd() + "…" : def;
}

export async function getStaticPaths() {
  const paths: { params: { lang: string }; props: { groups: Group[]; total: number } }[] = [];
  for (const lang of ["en", "ru"] as const) {
    const { relations } = await loadGlossary(lang);
    const rows: Row[] = Object.entries(glossary).map(([key, e]) => ({
      key,
      label: e[lang],
      excerpt: excerpt(lang === "en" ? e.defEn : e.defRu),
      usedCount: relations.usedIn[key].length,
      introduced: relations.introducedIn[key] !== null,
      seeCount: relations.seeAlso[key].length,
    }));
    rows.sort((a, b) => a.label.localeCompare(b.label, lang));

    const byLetter = new Map<string, Row[]>();
    for (const r of rows) {
      const first = r.label[0]?.toUpperCase() ?? "#";
      const letter = /[A-ZА-Я]/.test(first) ? first : "#";
      if (!byLetter.has(letter)) byLetter.set(letter, []);
      byLetter.get(letter)!.push(r);
    }
    const groups: Group[] = [...byLetter.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], lang))
      .map(([letter, gr]) => ({ letter, rows: gr }));

    paths.push({ params: { lang }, props: { groups, total: rows.length } });
  }
  return paths;
}

const { lang } = Astro.params as { lang: Locale };
if (!isLocale(lang)) throw new Error("bad lang");
const { groups, total } = Astro.props as { groups: Group[]; total: number };
const labelChip = (n: number, word: string) => `${n} ${word}`;
---

<Topic title={t("nav.glossary", lang)} lang={lang}>
  <div class="max-w-[1080px] mx-auto px-4 lg:px-8 mt-6">
    <h1 class="font-display text-[clamp(28px,4vw,40px)] font-bold leading-[1.1] tracking-[-0.02em] m-0 text-ink">
      {t("nav.glossary", lang)}
    </h1>
    <p class="text-ink-2 leading-relaxed mt-3 mb-6">{t("glossary.intro", lang)}</p>

    <input
      id="gloss-search"
      type="search"
      placeholder={lang === "en" ? `Search ${total} terms…` : `Поиск среди ${total} терминов…`}
      class="w-full max-w-[420px] bg-card border border-rule-strong rounded-[3px] px-3 py-2 text-ink text-[14px] mb-8"
    />

    <div class="grid grid-cols-[28px_1fr] gap-6">
      <nav class="sticky top-6 self-start flex flex-col gap-0.5" aria-label="A–Z">
        {groups.map((g) => (
          <a href={`#L-${g.letter}`} class="font-mono text-[11px] text-ac hover:text-ink text-center">{g.letter}</a>
        ))}
      </nav>

      <div id="gloss-list">
        {groups.map((g) => (
          <section data-letter={g.letter}>
            <h2 id={`L-${g.letter}`} class="font-mono text-[15px] font-bold text-ac border-b border-rule pb-1 mt-8 mb-2 scroll-mt-6">
              {g.letter}
            </h2>
            {g.rows.map((r) => (
              <a
                href={`/${lang}/glossary/${r.key}/`}
                class="gloss-row block py-3 border-t border-rule first:border-t-0 group"
                data-label={r.label.toLowerCase()}
              >
                <span class="font-display font-bold text-ink text-[16px] group-hover:text-ac">{r.label}</span>
                {r.excerpt ? (
                  <span class="text-ink-2 text-[13.5px] ml-2">{r.excerpt}</span>
                ) : (
                  <span class="text-muted-2 text-[12px] italic ml-2">
                    {lang === "en" ? "definition pending" : "определение готовится"}
                  </span>
                )}
                <span class="flex gap-1.5 mt-1.5">
                  {r.introduced && (
                    <span class="font-mono text-[9.5px] text-ac border border-rule rounded-[2px] px-1.5">
                      {lang === "en" ? "introduced" : "вводится"}
                    </span>
                  )}
                  {r.usedCount > 0 && (
                    <span class="font-mono text-[9.5px] text-ac border border-rule rounded-[2px] px-1.5">
                      {labelChip(r.usedCount, lang === "en" ? "used" : "исп.")}
                    </span>
                  )}
                  {r.seeCount > 0 && (
                    <span class="font-mono text-[9.5px] text-ac border border-rule rounded-[2px] px-1.5">
                      {labelChip(r.seeCount, lang === "en" ? "see" : "см.")}
                    </span>
                  )}
                </span>
              </a>
            ))}
          </section>
        ))}
        <p id="gloss-empty" hidden class="text-muted py-8">
          {lang === "en" ? "No terms match." : "Ничего не найдено."}
        </p>
      </div>
    </div>
  </div>

  <script is:inline>
    (function () {
      var input = document.getElementById("gloss-search");
      var rows = Array.prototype.slice.call(document.querySelectorAll(".gloss-row"));
      var sections = Array.prototype.slice.call(document.querySelectorAll("#gloss-list section"));
      var empty = document.getElementById("gloss-empty");
      if (!input) return;
      input.addEventListener("input", function () {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        rows.forEach(function (row) {
          var hit = q === "" || row.getAttribute("data-label").indexOf(q) !== -1;
          row.hidden = !hit;
          if (hit) shown++;
        });
        sections.forEach(function (s) {
          var any = s.querySelectorAll(".gloss-row:not([hidden])").length > 0;
          s.hidden = !any;
        });
        if (empty) empty.hidden = shown !== 0;
      });
    })();
  </script>
</Topic>
```

- [ ] **Step 3: Build to verify the index generates and the old route still resolves**

Run: `cd site && bun run build`
Expected: build completes; `dist/en/glossary/index.html` and `dist/ru/glossary/index.html` exist; no leftover from the deleted page; lint report clean.

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/[lang]/glossary/index.astro
git commit -m "feat(glossary): A-Z index page; remove old flat glossary"
```

---

## Task 6: Preview verification

**Files:** none — verification only.

- [ ] **Step 1: Build**

Run: `cd site && bun run build`
Expected: ~1630 pages, lint clean.

- [ ] **Step 2: Start the preview server and check the index**

Use the Claude Preview server `atlas-preview` (serves `site/dist` on port 4400).
Navigate to `/en/glossary/`. Verify: A–Z rail present, letter sections, term rows with definition excerpts and relation chips, search input.

- [ ] **Step 3: Test search**

In the preview, type a known term fragment (e.g. `tcp`) into `#gloss-search`. Verify rows filter live and empty sections hide. Clear it; verify all rows return.

- [ ] **Step 4: Check a hub with relations**

Navigate to `/en/glossary/tcp/`. Verify: breadcrumb, term + RU label, definition (tcp has a definition) or pending notice, right rail with "First introduced in" / "Used in N" / "See also" — only the non-empty groups render.

- [ ] **Step 5: Check a definition-pending hub**

Navigate to a hub for a term with no definition (e.g. `/en/glossary/ack/` — `ack` has no `defEn`). Verify the "Definition pending" notice shows and the page does not error.

- [ ] **Step 6: Check RU and mobile**

Navigate to `/ru/glossary/` and `/ru/glossary/tcp/`. Verify RU labels and UI strings. Resize to mobile width; verify the index A–Z rail and the hub rail stack/remain usable.

- [ ] **Step 7: Commit (if any fixes were made)**

```bash
git add -A
git commit -m "fix(glossary): preview verification adjustments"
```

(Skip if steps 1–6 needed no changes.)

---

## Task 7: Update the handoff

**Files:**
- Modify: `docs/open-atlas/HANDOFF.md`

- [ ] **Step 1: Move queue item to "Built so far"**

In `docs/open-atlas/HANDOFF.md`, add a "Built so far" bullet describing the glossary index + hub pages and the `glossary-index.ts` / `glossary-data.ts` modules. Remove the glossary item from the Work queue and renumber the rest. Note that plan 2 (definition backfill of 439 terms) is still pending.

- [ ] **Step 2: Commit**

```bash
git add docs/open-atlas/HANDOFF.md
git commit -m "docs(open-atlas): glossary page done, update handoff"
```

---

## Self-Review

**Spec coverage:**
- Spec §1 routes — Tasks 4, 5 (both pages), Task 5 deletes old page. ✓
- Spec §2 data model (`seeAlso` field) — Task 2 (type + guard); no JSON edit needed, field is optional. ✓
- Spec §3 derivation (scan, usedIn, introducedIn, altitude, seeAlso guard) — Tasks 1–3. ✓
- Spec §4 index page (A–Z rail, rows, chips, search) — Task 5. ✓
- Spec §5 hub page (breadcrumb, def, rail, pending state) — Task 4. ✓
- Spec §6 build/lint — Tasks 4–6 build + lint checks. ✓
- Spec §7 plan 2 (backfill) — out of scope here by design; noted in Task 7. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands have expected output. ✓

**Type consistency:** `ScanEntry`, `ContentRef`, `Relations`, `GlossEntry` defined in Task 1, reused unchanged in Tasks 2–3. `ResolvedRef` defined in Task 3, used in Task 4. `loadGlossary` / `glossary` exports from Task 3 consumed by Tasks 4–5. `deriveRelations` signature stable across Tasks 1–2. ✓

**Note on the altitude comparator:** isolated to `lessonAltitude` / `bookAltitude` in `glossary-data.ts`. When the 3-tier → single-level migration (queue #3) lands, only these two functions may need revisiting.
