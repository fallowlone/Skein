# CS Foundations — Topic 2 design

Date: 2026-05-13
Status: Spec — awaiting review
Scope: Second curriculum topic alongside the existing fullstack topic. Adds 16 pillars × 8 pieces × 2 langs = 256 piece slots. Schema additions + route migration, pipeline unchanged.

## Goal

Author a second curriculum topic ("CS Foundations") on the same Astro site after Phase C of Topic 1 (fullstack) completes. Target audience and depth mirror Topic 1: middle+/senior engineers, 3-tier disclosure (junior 200-700w + middle 2500-3700w + senior 2500-4000w), exercise-driven, bilingual EN+RU.

Topic 2 is motivated by three engineering goals — all confirmed during brainstorm:
1. **Senior interview prep** — system-design tradeoffs, big-O analysis, complexity reasoning, common data-structure choices.
2. **Filling the CS gap** — engineers building production systems without formal CS training. OS internals, compilers, complexity theory through a production lens.
3. **Algorithms as engineering signal** — when to reach for B-tree vs trie vs bloom vs skip list, what big-O actually costs in cache misses, why DP beats memoized recursion for some shapes.

ML/AI math is explicitly out of scope as a primary motivation, but linear algebra and probability pillars stay in the list because they appear in algorithm analysis (probabilistic structures) and naturally bridge to the existing `ai-llm` pillar in Topic 1.

## Non-goals

- Replicate full university CS curriculum (compiler construction at semester depth, formal verification, programming-language theory at PhD depth).
- Pure LeetCode grinding without engineering context.
- Math depth beyond what supports algorithm analysis (no functional analysis, measure theory, advanced statistics).
- Standalone repository / separate deploy. Pipeline and components stay shared.

## Topic 2 pillars (16)

Ordered by teaching dependency. Each pillar slug is prefixed `cs-` so the union remains flat (32 unique slugs once Topic 2 ships). Prereqs reference other Topic 2 pillars only.

| # | Slug | Focus | Prereqs |
|---|---|---|---|
| 1 | `cs-discrete-math` | sets, logic, induction, combinatorics, recurrences | none |
| 2 | `cs-probability` | Bayes, distributions, sampling, expectation, randomized analysis | `cs-discrete-math` |
| 3 | `cs-linear-algebra` | vectors, matrices, eigen, SVD (bridges to AI/ML) | `cs-discrete-math` |
| 4 | `cs-computer-org` | CPU, ISA, caches, memory hierarchy, branch prediction | none |
| 5 | `cs-operating-systems` | processes, threads, scheduling, MMU, syscalls, FS | `cs-computer-org` |
| 6 | `cs-data-structures` | arrays, lists, trees (B/AVL/red-black), heaps, hash, tries | `cs-discrete-math` |
| 7 | `cs-algorithms-classic` | sort, search, divide-conquer, recursion, big-O | `cs-data-structures` |
| 8 | `cs-graph-algos` | BFS/DFS, shortest path, MST, max-flow, topological | `cs-algorithms-classic` |
| 9 | `cs-dp-greedy` | optimal substructure, memoization, greedy proofs, exchange argument | `cs-algorithms-classic` |
| 10 | `cs-string-algos` | KMP, Z-algo, suffix array, Aho-Corasick, regex engines | `cs-data-structures` |
| 11 | `cs-complexity` | P/NP, reductions, approximation, parameterized complexity | `cs-discrete-math`, `cs-algorithms-classic` |
| 12 | `cs-theory-computation` | DFA/NFA/PDA, Turing, halting, decidability | `cs-discrete-math` |
| 13 | `cs-compilers` | lex/parse, AST/IR, JIT, GC, type inference | `cs-data-structures` |
| 14 | `cs-concurrency-theory` | memory models, locks, lock-free, CSP, actor | `cs-operating-systems` |
| 15 | `cs-info-theory-crypto` | entropy, compression, primes, ECC math | `cs-probability` |
| 16 | `cs-numerical-geometry` | float stability, linear solvers, computational geometry | `cs-linear-algebra` |

Chapter slugs follow the established `NN-pillar-slug` convention (e.g. `06-cs-data-structures`). Per-chapter piece counts default to 8, matching Topic 1.

## Architecture additions

The site already supports a single implicit topic (fullstack). Topic 2 adoption requires three schema-level extensions and a routing migration. **All execution deferred until Phase C of Topic 1 completes.**

### 1. Schema additions

`site/src/content/pillars.json`, `chapters.json`, and the `book` collection each gain a `topic` field:

```ts
const Topic = z.enum(["fullstack", "cs-foundations"]);

// pillars / chapters / book schemas all add:
topic: Topic
```

`site/src/types/index.ts` extends:

```ts
export type Topic = "fullstack" | "cs-foundations";
export const TOPICS: Topic[] = ["fullstack", "cs-foundations"];

export type Pillar =
  | "networking" | "browser" | /* ...existing 16 fullstack pillars... */
  | "cs-discrete-math" | "cs-probability" | /* ...new 16 cs pillars... */;
```

Existing 16 pillar entries gain `topic: "fullstack"`. Existing chapters and book entries gain the same. One-off migration script writes the field into JSON + frontmatter.

### 2. Route migration

Current routes:
- `/[lang]/index.astro` — topic-less home (16 pillars)
- `/[lang]/[pillar]/index.astro` — chapter overview
- `/[lang]/[pillar]/[piece].astro` — article

Migrated routes:
- `/[lang]/index.astro` — topic switcher (2 cards: Fullstack / CS Foundations)
- `/[lang]/[topic]/index.astro` — topic landing (16-pillar grid for that topic)
- `/[lang]/[topic]/[pillar]/index.astro` — chapter overview
- `/[lang]/[topic]/[pillar]/[piece].astro` — article

Backwards compatibility via static redirects:
- `/[lang]/[pillar]/` → `/[lang]/fullstack/[pillar]/` (HTML meta-refresh + `<link rel="canonical">`)
- `/[lang]/[pillar]/[piece]/` → `/[lang]/fullstack/[pillar]/[piece]/`

Redirect pages are generated at build time for every fullstack pillar/piece slug present at the migration moment. No active SEO regression — canonical points to the new URL.

### 3. Topic switcher UI

Home page changes from PillarGrid (16 tiles) → TopicGrid (2 cards) with a copy-paste flow into pillar-grid landing. Existing `PillarGrid.astro` component is reused once a topic is selected. `TitleBar.astro` adds a topic badge + a "switch topic" affordance so users can hop between topics without going back to root.

### 4. Linter + scaffold

No changes to lint rules. Promoted `tier-word-budgets` and `exercise-counts` work identically for Topic 2 pieces. `site/scaffolds/3-tier-piece.mdx` stays single-source. The `_template` MDX gains a frontmatter line `topic: cs-foundations` when copied into a Topic 2 path.

### 5. `/infographic` command

Argument form widens to accept the topic segment:

```
/infographic cs-foundations/cs-data-structures/06-cs-data-structures/03-hash-tables
/infographic fullstack/networking/01-networking/03-tcp-handshake   # backwards-compat
```

If topic is omitted, default to `fullstack` (legacy). Path validation extends to check `site/src/content/book/<lang>/<pillar>/<NN-piece>/index.mdx` exists with matching `topic` frontmatter.

## Pipeline reuse

No fork. Every authoring artifact from Topic 1 carries forward:
- TierAccordion + 10 exercise components.
- FadedExample, RetrievalDrawer, ReactiveDiagram, Sequencer, Sandbox, Pretest, PersonaTag, SpiralCue, SettingsDrawer, SpacedRevisitBanner.
- `site/scaffolds/3-tier-piece.mdx`.
- Linter rules with current budgets (junior 200-700, middle 2500-3700, senior 2500-4000) — promoted to errors.
- `/infographic` slash command + `/verify-piece` subagent.
- Glossary `site/src/i18n/glossary.json` — Topic 2 terms append in alphabetical order with EN→RU lock; no separate glossary file per topic.

## Sequencing

| Phase | Scope | Trigger |
|---|---|---|
| Phase B (in flight) | Chapter 01 networking 3-tier migration. 8 pieces × 2 langs done. Task 9 + 10 infrastructure complete. | Active. |
| Phase C | 15 remaining fullstack chapters (~120 pieces × 2 langs = 240). Same `/infographic` pipeline. | Starts after Phase B closes. Schema unchanged. |
| Phase D-1 (Topic 2 infra) | Topic field migration, route migration, topic switcher UI, `/infographic` argument widening. | Starts when Topic 1 hits 16/16 chapters at `status: ready`. |
| Phase D-2 (Topic 2 pilot) | Pilot piece in `cs-data-structures` (analogue of 05-tls-handshake). Validates depth bar, junior tier feasibility for abstract topics, exercise inventory. | Starts when Phase D-1 ships. |
| Phase D-3 (Topic 2 fanout) | Remaining 15 Topic 2 pillars piece-by-piece via `/infographic`. | Starts when D-2 pilot passes `/verify-piece`. |

## Risks + mitigations

1. **Route migration breaks SEO / external links.** Mitigation: 301-equivalent meta-refresh redirects + `<link rel="canonical">` on every legacy path. Sitemap regenerates with new URLs only.
2. **Junior tier for abstract CS topics (complexity, formal proofs) resists metaphor.** Mitigation: validate via pilot piece before committing all 16 cs pillars. If a pillar fundamentally cannot support junior tier at 200-700w, raise a per-pillar override of the junior word floor (e.g. `cs-complexity` floor 100) rather than force-write thin metaphors.
3. **Topic switcher adds discoverability friction.** Mitigation: defer measurement to first real traffic against Topic 2. Acceptable to A/B switcher placement after initial Topic 2 pieces ship.
4. **32-pillar total dilutes "pick the right pillar" signal.** Mitigation: in-topic the grid is still 16; users only see their selected topic's pillars after the switcher.
5. **Schema migration during active Phase C breaks builds.** Mitigation: defer schema additions until Phase D-1. During Phase C the schema stays frozen, Topic 2 content stays unwritten, the `cs-*` slugs do not yet appear in `PILLARS`.
6. **Glossary churn — RU CS terminology differs from fullstack terminology.** Mitigation: incremental term-by-term glossary growth still works; per-pillar glossary review during pilot phase D-2.

## Open questions (resolved before Phase D-1 starts)

1. **Sub-topic colors.** Topic 1 uses 5 colors cycling through pillars. Topic 2 needs its own palette decision (reuse cycle, mirror Topic 1 colors per pillar order, or distinct palette).
2. **Cross-topic prereqs.** Should `cs-operating-systems` reference `networking` pillar in Topic 1, or stay Topic-2-internal only? Current design: Topic-2-internal only. Cross-topic recommendations live in SpiralCue threads, not prereqs.
3. **Pretest scope.** Topic 1 Pretest is fullstack-shaped. Topic 2 needs its own Pretest set or the Pretest must be topic-aware. Defer to Phase D-1 implementation plan.
4. **Topic switcher placement.** Sticky header chip vs landing card-grid only. Defer to UX during Phase D-1.

## Deliverables (at Topic 2 close)

- 16 cs-* pillars in `pillars.json` with `topic: "cs-foundations"`.
- 16 cs-* chapter entries in `chapters.json`.
- 128 EN + 128 RU pieces under `site/src/content/book/{en,ru}/cs-*/`.
- Glossary updated with CS / math / algorithms terms (estimated 200-400 new entries).
- Route migration + redirects shipped; legacy URLs continue to resolve.
- `/infographic` accepts topic-prefixed arguments; old form defaults to `fullstack` topic.
- Topic switcher landing page.

## References

- `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` — parent spec, Topic 1 architecture.
- `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` — Topic 1 implementation plan.
- `docs/superpowers/plans/2026-05-13-tier-text-migration-plan-b.md` — Phase B per-piece flow, reused unchanged for Topic 2.
- `curriculum.md` — Topic 1 depth bar; Topic 2 will add a parallel curriculum-cs.md once Phase D-1 starts.
- `site/scaffolds/3-tier-piece.mdx` — shared 3-tier scaffold.
- `site/src/content/book/en/networking/05-tls-handshake/index.mdx` — pilot reference for 3-tier authoring; Topic 2 will produce an analogous pilot in `cs-data-structures`.
