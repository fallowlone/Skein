# Glossary Redesign — Design Spec

**Date:** 2026-05-17
**Status:** Approved (brainstorming)
**Scope:** open atlas work queue #1. The glossary page redesign — A–Z index +
per-term hub pages, build-time relation derivation — and the backfill of missing
term definitions. Two implementation plans (see section 7).

## Purpose

Turn the glossary from a flat definition list into the **visible surface of the
spiral threads** (HANDOFF locked decision #7). Today `[lang]/glossary.astro` renders
a single `<dl>` of terms that have a definition. The redesign makes every term a
**hub**: its definition plus three relations — where it is first introduced, where it
is used, and which terms relate to it. The glossary becomes the place a learner lands
when a term breaks their thread, and the place cross-topic spiral links resolve to.

The end state is a complete glossary: all 571 terms in `site/src/i18n/glossary.json`
carry a bilingual definition. Today 132 do; 439 do not. Authoring those 439 is a
large content effort and runs as its own plan (section 7).

## Decisions (from brainstorming)

1. **Relation data — hybrid derivation.** `used-in` and `introduced-in` are derived
   automatically at build time from `<Term k="…">` markup in content. `see-also` is a
   manual field on each glossary entry, authored only for key terms.
2. **Routing — index + per-term pages.** An A–Z index page plus one hub page per term
   at `/[lang]/glossary/<term>`. Real bilingual routes (EN + RU), not a standalone
   preview. Stable URLs so `<Term>` and spiral links can target them.
3. **Term scope — all 571 terms.** Every term gets an index entry and a hub page.
   Terms without a definition render a "definition pending" state. The 439 missing
   definitions are backfilled (section 7, plan 2).
4. **Index layout — A–Z editorial.** Sticky A–Z rail; main column groups terms by
   first letter; each row shows the term, a one-line definition excerpt, and relation
   count chips. Live client-side search.
5. **Hub layout — definition + sticky right rail.** Main column: term + definition.
   Right rail: the three relations. Mirrors the lesson reading page shell. Mitigation
   for short content: definitions are 2–4 sentences, the rail is compact, and a
   definition-pending hub still renders its derived relations.

## Non-goals

- No change to the `<Term>` component, the `<Term>` grounding rollout
  (`plans/2026-05-15-glossary-rollout.md`), or content authoring commands.
- No whole-graph "connections" visualisation (rejected earlier as a hairball).
- No runtime/server data — everything is derived at build time, static output.
- The 3-tier → single-level migration (queue #3) is not done here; the derivation is
  written to survive it (section 3).

## 1. Architecture and routes

The redesign is two new page files plus one build-time module, all inside the
existing `site/` Astro app. The light editorial zone and the `Topic.astro` layout are
reused unchanged.

| File | Role |
|---|---|
| `src/pages/[lang]/glossary/index.astro` | A–Z index. Replaces `[lang]/glossary.astro`. |
| `src/pages/[lang]/glossary/[term].astro` | Per-term hub. `getStaticPaths` over all term keys × `{en,ru}`. |
| `src/scripts/glossary-index.ts` | Build-time relation derivation. Pure module, consumed by both pages. |
| `src/pages/[lang]/glossary.astro` | **Deleted.** The route moves to `glossary/index.astro`; the public URL `/[lang]/glossary/` is unchanged. |

Both pages render inside `Topic.astro` (light zone chrome: head, title, lang switch,
sources footer), matching the current glossary page.

## 2. Data model

`site/src/i18n/glossary.json` keeps its current shape and gains one optional field:

```jsonc
"ack": {
  "en": "ACK",
  "ru": "ACK",
  "defEn": "…",            // existing, optional
  "defRu": "…",            // existing, optional
  "seeAlso": ["syn", "retransmission", "sequence_number"]  // NEW, optional
}
```

- `seeAlso` is an array of other glossary keys, authored manually. Absent or `[]` for
  most terms; populated for key terms during the backfill plan.
- `en` / `ru` (the term label) stay required. `defEn` / `defRu` stay optional — their
  absence is what marks a term "definition pending".
- No new collection. The glossary is not promoted to a content collection; it stays a
  plain JSON import, as `Term.astro` and the current page already use it.

`used-in` and `introduced-in` are **not stored** — they are derived (section 3).

## 3. Relation derivation — `glossary-index.ts`

A pure build-time module. Input: the `book` and `lessons` content collections plus
`glossary.json`. Output: a relation map consumed by both pages.

```ts
type Relations = {
  usedIn: Record<string, ContentRef[]>;       // key → entries that reference it
  introducedIn: Record<string, ContentRef | null>;  // key → lowest-altitude entry
  seeAlso: Record<string, string[]>;          // key → glossary keys (from JSON)
};
type ContentRef = {
  collection: "book" | "lessons";
  id: string;          // content entry id
  title: string;
  href: string;        // resolved lesson/piece URL
  altitude: number;    // sortable rank, see below
};
```

**Scan.** For each entry in `book` and `lessons`, read the raw MDX body and match
`/<Term\s+k="([^"]+)"/g`. The captured `k` is the glossary key. Deduplicate keys per
entry — one entry referencing a term three times counts once. This regex scan is the
chosen approach: the `<Term>` markup is consistent and machine-written by the
grounding rollout; a full MDX parse buys nothing here.

**`usedIn[k]`** = every content entry whose body matches key `k`.

**`introducedIn[k]`** = the entry in `usedIn[k]` with the lowest `altitude`. `null`
when the term has no `<Term>` usage anywhere.

**Altitude comparator.** A single integer rank, low = closer to zero knowledge:

- `lessons` collection (foundations) ranks below `book` (foundations precede the
  fullstack pillars on the spine). Within `lessons`, order by track order, then unit
  order, then lesson order.
- `book` ranks above. Within `book`, order by pillar order, then piece order, then
  tier (`junior` < `middle` < `senior`).
- The comparator lives in `glossary-index.ts` as one documented function. When the
  3-tier → single-level migration (queue #3) lands, only the `book` branch's tier
  term is removed; the rest is unaffected. This is the one place the spec knowingly
  depends on the pre-migration content shape.

**`seeAlso`.** Copied from `glossary.json`. Every key in any `seeAlso` array must
resolve to an existing glossary key; the module **throws and fails the build** on a
dangling reference.

**Contract.** A term referenced in prose without `<Term>` markup is not counted. The
markup is the source of truth. `used-in` completeness therefore tracks the `<Term>`
grounding rollout — currently 2 of 11 `book` pillars and the foundations lessons are
grounded (385 `<Term>` usages total). This is expected and acceptable; the glossary
fills in as grounding proceeds.

**Testing (TDD).** `glossary-index.ts` is pure and unit-tested: given a small fixture
list of content entries, assert `usedIn`, `introducedIn` (altitude tie-breaks), and
the dangling-`seeAlso` throw. Test file `src/scripts/glossary-index.test.ts`.

## 4. Index page — `[lang]/glossary/index.astro`

Layout A from brainstorming.

- **Header.** Page title + intro line (existing `glossary.intro` i18n string).
- **Search.** A plain `<input>`; a vanilla inline `<script>` filters term rows by
  substring match on the term label. No island framework — zero hydrated islands,
  within the page hydration cap.
- **A–Z rail.** Sticky vertical list of letters A–Z; each links to `#<letter>`.
  Letters with no terms are dimmed and non-interactive.
- **Term rows.** Terms grouped under letter headings (`<h2 id="a">` …). Each row:
  - term label (display serif), links to the hub;
  - one-line definition excerpt (truncated `defEn`/`defRu`), or "definition pending";
  - relation chips: `introduced`, `used N`, `see N` — chips with a zero count are
    omitted.
- **Sort.** Locale-aware sort on the term label, matching the current page.
- All 571 terms are listed regardless of definition state.

## 5. Hub page — `[lang]/glossary/[term].astro`

Layout B from brainstorming. `getStaticPaths` yields every glossary key × `{en,ru}`.

- **Breadcrumb.** Atlas / Glossary / `<term>`.
- **Main column.**
  - term label (display serif);
  - mono kicker: the other-language label (e.g. `EN: ACK` on the RU page);
  - definition (`defEn`/`defRu`), 2–4 sentences. If absent: a "definition pending"
    notice instead.
- **Sticky right rail.**
  - **First introduced in** — one link to `introducedIn[k]` (lesson/piece + altitude
    label). Hidden if `null`.
  - **Used in N** — list of `usedIn[k]` links. Hidden if empty.
  - **See also** — chips linking to other hubs, from `seeAlso[k]`. Hidden if empty.
- A hub with no definition still renders whatever relations were derived.
- Bilingual: label and definition pick `en`/`ru` and `defEn`/`defRu` by `lang`.

## 6. Build and lint impact

- **Page count.** New pages ≈ 571 × 2 (hubs) + 2 (index) = 1144. Total site ≈ 485 →
  ≈ 1630. Static output; build time grows but stays acceptable.
- **i18n parity.** `src/lint/rules/i18n-parity.ts` already validates glossary EN/RU
  label parity. No rule change required for labels.
- **`seeAlso` validation.** Enforced by `glossary-index.ts` throwing on a dangling
  key (fails the build) — no separate lint rule needed.
- **Hydration.** Index and hub use vanilla inline scripts only; 0 islands; within the
  per-page hydration cap.
- **Reduced motion.** No motion is introduced; no `reduced-motion` rule concern.

## 7. Implementation plans

Two plans, sequential. Plan 1 ships a working glossary on the 132 defined terms; plan
2 completes it.

**Plan 1 — Glossary page.** `glossary-index.ts` + its tests, the index page, the hub
page, deletion of the old `glossary.astro`, the `seeAlso` field added to the
`glossary.json` shape (empty for now). Self-contained; build clean.

**Plan 2 — Definition backfill.** Author `defEn` + `defRu` for the 439 terms that
lack them, and add `seeAlso` for key terms. Each definition: 1–3 sentences, meets the
senior-fullstack depth bar, EN/RU parity, consistent with `glossary.json` conventions.
Batched and dispatched to parallel subagents (`dispatching-parallel-agents`), grouped
by domain so each agent holds a coherent slice. Plan 2 gets its own plan file with the
term batches enumerated.

## 8. Units and isolation

- `glossary-index.ts` — pure derivation. One input (content + JSON), one output
  (relation map). Independently testable; no Astro/DOM dependency.
- `index.astro`, `[term].astro` — presentation only. They consume the relation map
  and `glossary.json`; they contain no derivation logic.
- `glossary.json` — unchanged role: the data store, plus the new `seeAlso` field.

## Open risks

- **Empty hubs.** A term with no definition and no `<Term>` usage renders a near-empty
  hub until plan 2 and the grounding rollout reach it. Accepted: stable URLs now,
  content fills in.
- **Altitude comparator vs migration.** The `book` tier ranking is pre-migration; the
  comparator is isolated to one function so the migration touches one branch.
