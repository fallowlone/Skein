# Algorithms LeetCode drill block — design

**Date:** 2026-05-29
**Status:** draft (brainstorming) → awaiting user review before plan
**Scope:** `algorithms` track only (foundations `/learn`). Not the 16 fullstack pillars.

## Goal

Close the single biggest interview gap the curriculum can't close by itself:
**solving DSA problems under time pressure, mapped to patterns.** The algorithms
track teaches *why/how* an algorithm works at depth; this block adds the *recall +
apply under a timer* layer by curating real LeetCode problems per unit, grouped by
the NeetCode-150 pattern the unit teaches, with our own hint ladders, target times,
and spaced-revisit nudges.

It is the practice analogue of the assessment blocks: quiz/project test synthesis;
the drill block trains the muscle interviews actually exercise — recognise the
pattern fast, code the optimal solution against a judge, narrate complexity aloud.

## Non-goals

- **Not** re-implementing a judge. LeetCode's own judge runs the code; we link out.
- **Not** copying LeetCode problem statements (copyright). We store only the
  problem's *identity* (number, canonical title, difficulty, our pattern tag) plus
  **our own** hints and follow-ups, and link to the problem.
- **Not** the full 150 dumped per unit. A curated, ordered, essential subset
  (~4–7 per pattern group) with a clear difficulty ramp — depth over volume.
- **Not** for the fullstack pillars or system-design (possible future block).
- **Not** scraping LeetCode at build time. The build is deterministic and offline;
  link liveness is checked by a separate, out-of-band script.

## What the block is

A per-unit **drill set**: the NeetCode-150 problems for the pattern(s) that unit
teaches, each carrying:

- canonical identity: LeetCode number + title + url slug + difficulty + pattern tag;
- a **hint ladder** (2–4 progressive hints, ours, bilingual) — never the full
  solution, just enough to unstick;
- a **target time** (e.g. 20 min) to train pace;
- an optional **follow-up** ("state the time/space complexity aloud", "handle the
  empty-input edge case") to train the speaking layer;
- optional **company-frequency** tags;
- a "solve first, then reveal" discipline + **spaced-revisit** nudge.

Problems are grouped by pattern within the unit. A track-level pattern index
("two-pointer → these canonical problems") falls out of the per-unit data and is
rendered on the track overview.

## Pattern → unit map (NeetCode-150)

The 18 NeetCode categories map onto 11 of the 12 units (`01-thinking-complexity`
is meta — no problems; it gets an optional "analyse the complexity of these
solutions" reading instead, out of scope here).

| Unit | NeetCode-150 pattern group(s) | ~150 count |
|------|-------------------------------|------------|
| 02-arrays-strings | Arrays & Hashing, Two Pointers, Sliding Window | 9 + 5 + 6 |
| 03-sorting-search | Binary Search | 7 |
| 04-recursion-backtracking | Backtracking | 9 |
| 05-hashing | Arrays & Hashing (hashing-centric subset) | (subset of 9) |
| 06-lists-stacks-queues | Linked List, Stack | 11 + 7 |
| 07-trees | Trees, Tries | 15 + 3 |
| 08-heaps | Heap / Priority Queue | 7 |
| 09-graphs | Graphs, Advanced Graphs | 13 + 6 |
| 10-dynamic-programming | 1-D DP, 2-D DP | 12 + 11 |
| 11-greedy | Greedy, Intervals | 8 + 6 |
| 12-toolbox | Math & Geometry, Bit Manipulation | 8 + 7 |

`05-hashing` overlaps Arrays & Hashing with `02`; to avoid duplication, `02`
carries the array/two-pointer/sliding-window problems and `05` carries the
hashing-identity problems (group-anagrams, top-k-frequent, valid-sudoku,
longest-consecutive-sequence). The per-problem `pattern` tag + a `primaryUnit`
field keep each problem owned by exactly one unit.

## Data model

A new content collection `drill`, mirroring the existing `practice` collection
(structured JSON, schema-validated, lint-checked) rather than free-form MDX — the
data is regular and benefits from validation + a link-checker script.

```
site/src/content/drill/<track>/<unit>.json
```

### Zod schema (added to `site/src/content.config.ts`)

```ts
const Difficulty3 = z.enum(["easy", "medium", "hard"]);
const NeetPattern = z.enum([
  "arrays-hashing", "two-pointers", "sliding-window", "stack",
  "binary-search", "linked-list", "trees", "tries", "heap-priority-queue",
  "backtracking", "graphs", "advanced-graphs", "1d-dp", "2d-dp",
  "greedy", "intervals", "math-geometry", "bit-manipulation",
]);

const DrillProblem = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),       // our stable key, == leetcode slug
  leetcodeId: z.number().int().positive(),     // problem number (stable identity)
  slug: z.string().regex(/^[a-z0-9-]+$/),      // leetcode url slug → URL derived
  title: z.string().min(1),                    // canonical English title (reference only)
  difficulty: Difficulty3,
  pattern: NeetPattern,
  neetcode150: z.boolean().default(true),
  targetMinutes: z.number().int().positive(),
  appliesToLesson: z.string().regex(SlugRe).optional(), // which unit lesson it drills
  hints: z.array(Bi).min(2).max(4),            // OUR progressive hints, bilingual
  followUp: Bi.optional(),                     // "say complexity aloud", edge case
  companies: z.array(z.string()).default([]),  // optional frequency tags
  // NO `statement` field — copying LeetCode prose is forbidden by schema design.
});

const drill = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/drill" }),
  schema: z.object({
    track: Track,
    unit: z.string().regex(SlugRe),
    patterns: z.array(NeetPattern).min(1),      // patterns this unit owns
    intro: Bi,                                  // 1–2 sentence framing
    problems: z.array(DrillProblem).min(3).max(12),
  }),
});
```

`Bi = { en: string, ru: string }` already exists in the config. The canonical
problem **URL is derived**, never stored: `https://leetcode.com/problems/<slug>/`.
Storing `leetcodeId + slug + title` means the problem's identity survives even if
LeetCode changes a URL — a maintainer can re-find it by number/title.

### Why JSON collection, not MDX frontmatter

The assessment blocks are MDX (prose-heavy, component-driven). Drill data is
tabular and machine-checkable (link liveness, difficulty ramp, pattern coverage),
so it follows the `practice` collection precedent: structured JSON + a thin MDX
block that renders it. This keeps lint meaningful and enables the link-checker.

## The block page (per unit)

A unit-level block, exactly like `quiz-code`/`project`, at:

```
site/src/content/lessons/{en,ru}/algorithms/<unit>/drill/index.mdx
```

Frontmatter mirrors the assessment blocks: `slug: drill`, `order: 11` (after
`project: 10`), `status: ready`, `lessonType: coding`, `level: senior`, `track`,
`unit`, `concepts`, `sources` (NeetCode + the problems' canonical pages),
`summary` (quoted), `estMin` (e.g. 120 — it's a working session, not a read).

Body is thin:

```mdx
<Hook>…framing: why drilling this pattern under a timer matters…</Hook>
<Goal lang="en">…</Goal>
<DrillSet unitKey="algorithms/02-arrays-strings" client:visible />
<Recap lang="en">…how to use spaced revisit; narrate complexity aloud…</Recap>
```

`SlugRe` is extended to allow the bare `drill` slug:

```ts
const SlugRe = /^(?:\d{2}-[a-z0-9-]+|quiz-[a-z]+|project(?:-[a-z]+)?|drill)$/;
```

`units.json` for each algorithms unit gains `"drill"` in its `lessons[]` array
(after `"project"`).

## The `<DrillSet>` component

`site/src/components/algo/DrillSet.tsx` — one Preact island (`client:visible`),
within the 5-island hydration cap (drill pages carry only this island). Reads the
`drill` collection entry for `unitKey` at build time (passed as a prop or imported
via `getCollection`), renders:

- problems grouped by `pattern`, ordered easy → medium → hard within each group;
- per problem: `#<leetcodeId> <title>` linking to the derived URL (target=_blank,
  rel=noopener), a difficulty badge, the target-time chip, optional company tags;
- a **hint ladder**: hints revealed one at a time ("Reveal hint 1 of 3"), never
  all at once — preserves the solve-first discipline;
- the follow-up prompt, collapsed;
- a per-problem **status toggle** (unattempted → attempted → solved), persisted in
  `localStorage` (key `awesome.drill.v1`), feeding a per-unit progress meter and a
  **spaced-revisit** nudge ("solved 6 days ago — try again from memory");
- a "shuffle / timed mode" affordance (optional): start a visible countdown to
  `targetMinutes` to simulate pressure.

Because the auth feature added server progress sync, drill status is part of the
synced `UserState` namespace automatically if we route it through `user-state.ts`
(optional follow-up; v1 can keep it local).

## Pedagogy (the rules the block enforces by shape)

1. **Solve before reveal.** Hints are laddered and collapsed; the solution is not
   stored at all — you go to LeetCode and submit.
2. **Train pace.** Every problem has a target time; optional countdown.
3. **Pattern-first.** Grouping by NeetCode pattern trains "recognise the pattern in
   2 minutes", which is what interviews actually test.
4. **Narrate aloud.** The follow-up prompts the spoken-complexity / edge-case habit
   that closes the system-design-style speaking gap.
5. **Spaced revisit.** Status + timestamps nudge re-solving from memory, not
   re-reading.

## i18n

Bilingual EN+RU like everything else. Translatable: `intro`, every `hints[]` entry,
`followUp`, and the block prose (Hook/Goal/Recap). **Not** translated: problem
`title` (canonical English LeetCode names are proper nouns) and `slug`. RU hints
keep technical terms (hash map, two pointers, sliding window, heap, DP, …). The
single JSON file holds both languages per field (`Bi`), so the EN and RU MDX block
pages render from the same data — no parity drift possible by construction.

## Lint rules (`site/src/lint/rules/drill.ts`, runs in the existing build pass)

For every `status: ready` drill block + its JSON:
1. `DrillSet unitKey` resolves to an existing `drill` JSON entry.
2. `problems.length ≥ 3`; difficulty is non-decreasing within each pattern group
   (ramp sanity) — warn, not error, if violated.
3. Each problem: `leetcodeId` positive, `slug`/`id` match `^[a-z0-9-]+$`,
   `pattern ∈ block.patterns`, `hints.length ≥ 2`, every `hints[i]`/`followUp` has
   non-empty `en` AND `ru` (i18n parity).
4. No forbidden `statement`/`description` field present (guards against pasting
   LeetCode prose).
5. `sources` includes the NeetCode roadmap URL.
6. No duplicate `leetcodeId` across the whole track (each problem owned once).

Lint failures are build errors (consistent with the assessment-block linter); the
ramp check is a warning.

## Link-rot mitigation (out-of-band)

The build never touches the network. A standalone script
`scripts/check-drill-links.mjs` (run manually / in a quarterly CI cron, not in the
page build):

- iterates every `drill` JSON, derives each URL, issues a `HEAD` (or lightweight
  GET) to `leetcode.com/problems/<slug>/`;
- reports non-200 / redirects / premium-gated problems in a small report;
- never edits content — a human re-curates.

Because identity is `leetcodeId + title + slug`, a broken slug is trivially
re-found. The script is the only network dependency and is fully optional to the
build.

## Legal / ethical

We store and display only: problem number, canonical title, difficulty, our own
pattern tag, **our own** hints/follow-ups, and an outbound link. We never copy or
mirror LeetCode's problem statements, test cases, or editorial solutions. This is
the same posture as the existing `sources` footer (reference + link, no copying).

## Exemplar: `02-arrays-strings` (fully specified)

`site/src/content/drill/algorithms/02-arrays-strings.json` (abridged — real file
carries full RU for every field):

```json
{
  "track": "algorithms",
  "unit": "02-arrays-strings",
  "patterns": ["arrays-hashing", "two-pointers", "sliding-window"],
  "intro": {
    "en": "Drill the three sweeps that cover most array interview questions: hash for O(1) lookup, two pointers to converge, a window to amortise. Solve each cold, under the clock.",
    "ru": "Отработай три приёма, закрывающих большинство собеседных задач на массивы: hash для O(1)-поиска, two pointers для схождения, sliding window для амортизации. Решай каждую вхолодную, на время."
  },
  "problems": [
    {
      "id": "two-sum", "leetcodeId": 1, "slug": "two-sum", "title": "Two Sum",
      "difficulty": "easy", "pattern": "arrays-hashing", "targetMinutes": 10,
      "appliesToLesson": "05-hashing",
      "hints": [
        { "en": "Brute force is O(n²). What would make the 'is the complement here?' question O(1)?", "ru": "Перебор — O(n²). Что сделает вопрос «есть ли дополнение?» O(1)?" },
        { "en": "Store value → index in a hash map as you scan; check for target − x before inserting x.", "ru": "Складывай value → index в hash map по ходу; проверяй target − x до вставки x." }
      ],
      "followUp": { "en": "State the time and space complexity aloud, and why one pass suffices.", "ru": "Проговори вслух time и space сложность и почему хватает одного прохода." },
      "companies": ["Amazon", "Google"]
    },
    {
      "id": "valid-anagram", "leetcodeId": 242, "slug": "valid-anagram", "title": "Valid Anagram",
      "difficulty": "easy", "pattern": "arrays-hashing", "targetMinutes": 10,
      "hints": [
        { "en": "Two strings are anagrams iff their character multisets match.", "ru": "Две строки — анаграммы тогда и только тогда, когда совпадают мультимножества символов." },
        { "en": "A 26-int count array (or one hash map) compared after one pass each.", "ru": "Массив из 26 счётчиков (или одна hash map), сравниваемый после одного прохода по каждой строке." }
      ],
      "followUp": { "en": "What changes if the input is full Unicode, not lowercase a–z?", "ru": "Что меняется, если на входе весь Unicode, а не строчные a–z?" }
    },
    {
      "id": "two-sum-ii", "leetcodeId": 167, "slug": "two-sum-ii-input-array-is-sorted", "title": "Two Sum II - Input Array Is Sorted",
      "difficulty": "medium", "pattern": "two-pointers", "targetMinutes": 12,
      "hints": [
        { "en": "The array is sorted — a hash map wastes that. What two indices can you move toward each other?", "ru": "Массив отсортирован — hash map это не использует. Какие два индекса можно двигать навстречу?" },
        { "en": "Left and right pointers: sum too big → move right in; too small → move left out.", "ru": "Указатели left и right: сумма велика → двигай right влево; мала → двигай left вправо." }
      ],
      "followUp": { "en": "Why is this O(1) space while Two Sum is O(n)?", "ru": "Почему здесь O(1) по памяти, а в Two Sum O(n)?" }
    },
    {
      "id": "best-time-to-buy-and-sell-stock", "leetcodeId": 121, "slug": "best-time-to-buy-and-sell-stock", "title": "Best Time to Buy and Sell Stock",
      "difficulty": "easy", "pattern": "sliding-window", "targetMinutes": 12,
      "hints": [
        { "en": "Track the cheapest price seen so far; at each day the best sale is price − min-so-far.", "ru": "Веди минимальную цену на текущий момент; в каждый день лучшая продажа — price − min-so-far." }
      ],
      "followUp": { "en": "Reframe it as a sliding window: what are the window's two ends?", "ru": "Переформулируй как sliding window: что за два конца у окна?" }
    },
    {
      "id": "longest-substring-without-repeating-characters", "leetcodeId": 3, "slug": "longest-substring-without-repeating-characters", "title": "Longest Substring Without Repeating Characters",
      "difficulty": "medium", "pattern": "sliding-window", "targetMinutes": 18,
      "hints": [
        { "en": "Grow a window on the right; when a repeat enters, shrink from the left until it's gone.", "ru": "Расширяй окно справа; когда входит повтор, сжимай слева, пока он не уйдёт." },
        { "en": "A set/map of chars in the current window gives O(1) repeat detection.", "ru": "Set/map символов текущего окна даёт O(1)-детект повтора." }
      ],
      "followUp": { "en": "What's the amortised complexity, and why isn't the inner shrink loop O(n) per step?", "ru": "Какова амортизированная сложность и почему внутренний цикл сжатия не O(n) на шаг?" }
    }
  ]
}
```

Both `en/.../02-arrays-strings/drill/index.mdx` and the `ru/…` mirror render this
one file via `<DrillSet unitKey="algorithms/02-arrays-strings" />`.

## Rollout / phasing

1. **Schema + component + lint + one pilot unit** (`02-arrays-strings`, the JSON
   above) — review the rendered EN/RU pages and the hint-ladder UX.
2. **Roll out remaining 10 units** (03–12) — one curated set each, ~4–7 problems,
   following the pattern map. ~55–70 problems total (a focused essential subset of
   the 150, not all 150).
3. **Link-checker script** + a documented quarterly run.
4. (Optional follow-up) route drill status through `user-state.ts` so it syncs to
   the account like learning progress.

## Resolved decisions

- **Coverage depth (decided 2026-05-29):** curate an **essential subset — ~4–7
  problems per unit, ≈60 total** across the track. Depth over volume: less
  overwhelm, tractable to author good bilingual hint ladders, smaller link-rot
  surface. The schema (`problems` min 3, max 12) already supports this; expanding
  toward the full NeetCode-150 later is a pure data addition, no schema change.
