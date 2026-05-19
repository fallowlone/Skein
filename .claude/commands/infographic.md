---
description: Fullstack curriculum site topic lesson authoring. Queries/researches/authors bilingual EN+RU topic lessons per unit. Strict to site/ pipeline.
argument-hint: <track>/<unit> (e.g. networking/03-tcp-handshake)
allowed-tools: Bash, Read, Write, Edit, WebSearch, WebFetch, mcp__plugin_context7_context7__resolve-library-id, mcp__plugin_context7_context7__query-docs
---

# /infographic — fullstack curriculum site topic lesson authoring

**Input:** `$ARGUMENTS`

**Purpose:** Author a unit's N single-level `topic` lessons (stub → draft → ready) for the site's bilingual curriculum. Lessons live under `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`. Every lesson is bilingual or the command refuses.

**Hard rules:**

1. **Domain locked to fullstack development.** Off-domain input → refuse with 2-line message, stop immediately.
2. **Read `curriculum.md` depth bar + forbidden simplifications before drafting.** Middle+/senior engineer only.
3. **Bilingual EN+RU or refuse.** No partial-language lessons.
4. **Site-only output.** Write to `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`. Never edit `site/dist/` or legacy `infographics/` or `book/` trees.
5. **Component imports use the `~/` alias** (`~` → `site/src/`); never use `..` relative segments. All component imports start with `~/components/`.
6. **Text budgets enforced** (linter + manual): Crux ≤140 chars, KeyTakeaway ≤220 chars, Misconception ≤320 chars, Card annotation ≤240 chars.
7. **Hydration cap = 5 islands per lesson** (linter-enforced). Typical budget: RetrievalDrawer + exercises + 2–3 baseline.
8. **Status flow:** stub → draft (optional) → ready. Only `ready` renders real content to users.
9. **Commit only when all lessons in the unit are ready.** Format: `git commit -m "content(<track>): <unit> EN+RU ready"`.
10. **Topic skeleton mandatory.** Every lesson starts from `site/scaffolds/topic-lesson.mdx` (copy → fill placeholders). Do not write MDX from scratch.
11. **Linter contract (`checkTopicLesson`) enforced.** Required sections: `hook`, `crux`, `explanation`, `key-takeaway`, `recap`; ≥1 element with `data-lesson-visual`; ≥2 exercise widgets; exactly 1 `RetrievalDrawer`. Build fails if any requirement is missing.
12. **Set lesson metadata.** Each lesson's frontmatter must include: `level` (`junior`|`middle`|`senior`), `prereqs` (lesson slugs this one builds on), `deepensInto` (lesson slugs this one spirals up into, same subtopic higher level), `spiral` (cross-topic thread tags).

---

## Input parsing

If `$ARGUMENTS` matches:

- `<track>/<unit>` (2 path segments, e.g. `networking/03-tcp-handshake`) → **unit mode**: extract track and unit slugs.
- Anything else → **refuse** with message: "Unit form: `/infographic <track>/<unit>`. Track must exist in `site/src/content/tracks.json`. Unit must exist in `site/src/content/units.json`."

Validate:
- Track slug exists in `site/src/content/tracks.json`.
- Unit slug exists in `site/src/content/units.json` under that track.

If validation fails, report the missing entry and stop.

---

## Pipeline (per unit)

### Step 1 — Verify unit exists

```bash
# Check tracks.json contains the track
node -e "const t=require('./site/src/content/tracks.json');console.log(t.find(x=>x.slug==='<track>')?'ok':'MISSING')"

# Check units.json contains the unit under that track
node -e "const u=require('./site/src/content/units.json');console.log(u.find(x=>x.slug==='<unit>'&&x.track==='<track>')?'ok':'MISSING')"
```

Both must return `ok`. On failure, report the missing path and stop.

### Step 2 — Plan the lesson inventory (cut plan)

Read the unit's entry in `site/src/content/units.json` to understand its scope: `title`, `crux`, any existing `lessons` list.

If this is a migration from a `book/` piece (Phase B), also read:
- `site/src/content/book/en/<track>/<unit>/index.mdx` — source piece

Decide the split (typically 3–7 lessons per unit):
- One focused lesson per distinct subtopic/level band.
- Junior-level intro → 1 lesson (level: `junior`).
- Middle-level mechanism → 1–2 lessons (level: `middle`).
- Senior-level internals / edge cases → 1–2 lessons (level: `senior`).

Write the lesson inventory before authoring: for each lesson record `slug`, `level`, `title`, the subtopic it covers. Example:

```
01-what-and-why        junior   What TCP handshake is and why it exists
02-three-way-mechanics middle   SYN/SYN-ACK/ACK packet sequence and state machine
03-latency-and-numbers middle   RTT budgets, window scaling, slow start
04-failure-modes       senior   SYN floods, RST injection, TIME_WAIT exhaustion
```

### Step 3 — Research (WebSearch + Context7)

Execute **≥3 queries** targeting middle+/senior depth per unit topic:

- Query 1 → mechanism details (e.g., "TCP three-way handshake RFC packet flow").
- Query 2 → one tradeoff or failure mode (e.g., "TCP SYN flood attack mitigation").
- Query 3 → concrete numbers / benchmarks (e.g., "TCP RTT latency typical values").

Log sources into a scratch note. Use `context7:resolve-library-id` + `context7:query-docs` for APIs/frameworks (e.g., fetching Node.js `net` module docs).

**Depth checkpoint:** Can you explain mechanism + one tradeoff + one failure mode + one number without guessing? If not, research more.

### Step 4 — Author EN lessons

For each lesson in the plan, copy the scaffold and fill placeholders:

```bash
mkdir -p site/src/content/lessons/en/<track>/<unit>/<lesson>/
cp site/scaffolds/topic-lesson.mdx site/src/content/lessons/en/<track>/<unit>/<lesson>/index.mdx
```

Edit the copy — fill every placeholder:

**Frontmatter fields:**
- `slug`: lesson slug (e.g., `02-three-way-mechanics`).
- `lang: en`.
- `track`: pillar track slug.
- `unit`: unit slug.
- `order`: integer (1, 2, 3, …).
- `title`, `summary`, `estMin`.
- `status: draft`.
- `lessonType: topic`.
- `level`: `junior` | `middle` | `senior`.
- `prereqs`: list of lesson slugs this lesson builds on (empty for first lesson in unit; previous lessons for subsequent ones).
- `deepensInto`: list of lesson slugs this one spirals into (higher-level lessons covering the same subtopic; empty if this is the highest-level lesson on this subtopic).
- `spiral`: cross-topic thread tags (e.g., `["latency", "multiplexing"]`).
- `concepts`: key concepts introduced.
- `sources`: ≥3 primary sources (RFC numbers, documentation URLs, papers).

**Body structure (fixed — `topic` skeleton):**

```mdx
<Hook>
{/* 1-2 sentences. Open with a concrete production pain point or everyday
    situation. No jargon in the first sentence. */}
</Hook>

<Crux>One-sentence core question or insight this lesson answers (≤140 chars).</Crux>

<Explanation>
{/* Mechanism: how it works, concrete steps, numbers where meaningful.
    Tradeoff: explicit cost statement — what you gain, what you pay.
    Failure mode: what breaks first, how to detect it.

    Required: ≥1 Visual element with data-lesson-visual attribute.
    Required: ≥2 exercise widgets (Quiz, DragOrder, TraceScenario, etc.)
    interleaved with prose sections.
    Optional: <Inset kind="why|mistake|edgecase"> for deep-dive asides. */}

{/* VISUAL — required example: */}
{/* <StructureFigure cells={[...]} caption="..." data-lesson-visual /> */}

<Inset kind="why" lang="en">
{/* Use for lateral insights, historical notes, or design-choice explanations
    that would break the main flow. Senior-tier material maps well here. */}
</Inset>

{/* EXERCISES — interleave with prose */}
{/* <PracticeSet id="<slug>-practice" lessonSlug="<slug>" lang="en" problems={[...]} /> */}
</Explanation>

<KeyTakeaway>One-paragraph synthesis (≤220 chars). State the tradeoff, not just the definition.</KeyTakeaway>

<RetrievalDrawer
  client:load
  id="<slug>-retrieval"
  lang="en"
  questions={[
    { q: "<question 1>", a: "<answer 1>" },
    { q: "<question 2>", a: "<answer 2>" },
    { q: "<question 3>", a: "<answer 3>" },
  ]}
/>

<Recap lang="en">
{/* 3-5 sentences. Restate mechanism, tradeoff, and failure mode.
    Do NOT copy KeyTakeaway — expand with one concrete number or name. */}
</Recap>
```

**Import block (fixed):**
```mdx
import Hook from "~/components/lesson/Hook.astro";
import Explanation from "~/components/lesson/Explanation.astro";
import Recap from "~/components/lesson/Recap.astro";
import Inset from "~/components/lesson/Inset.astro";
import Crux from "~/components/prose/Crux.astro";
import KeyTakeaway from "~/components/prose/KeyTakeaway.astro";
import RetrievalDrawer from "~/components/pedagogy/RetrievalDrawer.tsx";
```

Add exercise/visual component imports as needed — all via `~/components/`.

**Hydration budget:**
- RetrievalDrawer (1 island) — required.
- Exercise widgets (1 island each) — 1–3 typical.
- SpacedRevisitBanner / sticky nav = 2 islands baseline.
- **Total ≤ 5.** If your lesson needs more, split exercise sets.

### Step 5 — Translate to RU

For each EN lesson, create the RU mirror:

```bash
mkdir -p site/src/content/lessons/ru/<track>/<unit>/<lesson>/
cp site/src/content/lessons/en/<track>/<unit>/<lesson>/index.mdx \
   site/src/content/lessons/ru/<track>/<unit>/<lesson>/index.mdx
```

Change frontmatter `lang: ru`. Translate the body using `site/src/i18n/glossary.json` as the canonical source.

For new technical terms not yet in the glossary:
1. Add them in **alphabetical order** (by English term).
2. Include both EN and RU versions.
3. Example: `"TCP handshake": { "en": "TCP handshake", "ru": "трёхсторонний хендшейк TCP" }`.

**RU rules:**
- Latin acronyms (TCP, RTT, RFC, SYN, HTTP) stay Latin.
- Prose flow must match EN, but RU idioms ≥ EN idioms (avoid word-for-word translation).
- No auto-translate tools; manual + glossary only.
- If you cannot translate with confidence, report DONE_WITH_CONCERNS and leave the RU files unmerged.

### Step 6 — Update frontmatter status

Set both EN and RU frontmatter to `status: ready` for every lesson in the unit once authored and reviewed.

### Step 7 — Update units.json

Add (or update) the `lessons` array in the unit's `units.json` entry with the lesson slugs in junior→senior order:

```json
{
  "slug": "<unit>",
  "track": "<track>",
  "order": <N>,
  "title": { "en": "...", "ru": "..." },
  "crux":  { "en": "...", "ru": "..." },
  "lessons": ["01-what-and-why", "02-three-way-mechanics", "03-latency-and-numbers", "04-failure-modes"]
}
```

### Step 8 — Verify build passes

```bash
cd /Users/artemmac/dev/awesome-everything/.claude/worktrees/interesting-antonelli-002bf7/site && bun run build
```

Check:
- Build completes without error.
- `site/dist/lint-report.json` shows 0 errors, 0 warnings for these lessons.
- No WARN for missing translations.
- No dangling `prereqs` / `deepensInto` references (`connection-integrity` rule).

If linter errors, fix and re-run.

### Step 9 — Visual verification

Open both locales in a browser (or inspect `dist/` output):
- `site/dist/en/learn/<track>/<lesson>/index.html`
- `site/dist/ru/learn/<track>/<lesson>/index.html`

Verify for each lesson:
- Layout renders without shift.
- Hook / Crux / Explanation / KeyTakeaway / Recap sections present.
- Hydration islands load (RetrievalDrawer, exercises are interactive).
- RU text is readable (no mojibake, correct line breaks).
- Visual element is visible on the page.

### Step 10 — Commit

```bash
cd /Users/artemmac/dev/awesome-everything/.claude/worktrees/interesting-antonelli-002bf7
git add site/src/content/lessons/en/<track>/<unit>/ \
        site/src/content/lessons/ru/<track>/<unit>/ \
        site/src/content/units.json \
        site/src/i18n/glossary.json
git commit -m "content(<track>): <unit> EN+RU ready"
git log -1 --oneline  # Report the commit SHA
```

---

## Final report (mandatory format)

```
Status:         DONE / DONE_WITH_CONCERNS / BLOCKED
Unit:           <track>/<unit>
Lessons:        <N> lessons (slugs: ...)
Files:          site/src/content/lessons/{en,ru}/<track>/<unit>/*/index.mdx
Glossary:       + N new terms
Build:          [last 3 lines of build output]
Lint report:    [link to dist/lint-report.json or "clean"]
Commit:         <SHA> [one-line message]
Concerns:       [none / list]
```

Example:
```
Status:         DONE
Unit:           networking/03-tcp-handshake
Lessons:        4 lessons (01-what-and-why, 02-three-way-mechanics, 03-latency-and-numbers, 04-failure-modes)
Files:          site/src/content/lessons/{en,ru}/networking/03-tcp-handshake/*/index.mdx
Glossary:       + 2 new terms (TCP window, congestion window)
Build:          ✓ 320 pages, lint 0 errors 0 warnings
Lint report:    clean
Commit:         abc1234 content(networking): 03-tcp-handshake EN+RU ready
Concerns:       none
```

---

## Failure modes

- **Validating wrong paths.** Always check `tracks.json` and `units.json` before starting. The old `book/` tree is not the target.
- **Import path mismatch.** Component imports must start with `~/components/` — no `..` relative segments.
- **Missing required sections.** `checkTopicLesson` linter flags any lesson missing `hook`, `crux`, `explanation`, `key-takeaway`, or `recap` sentinels. Build fails.
- **Missing visual.** Every lesson must have ≥1 element emitting `data-lesson-visual`. Linter fails if absent.
- **Too few exercises.** ≥2 exercise widgets required per lesson. Linter fails below this.
- **RetrievalDrawer count.** Exactly 1 `RetrievalDrawer` per lesson — linter fails on 0 or 2+.
- **Hydration overrun.** >5 islands per lesson → linter error. Split exercise sets if needed.
- **Text budget overruns.** Crux >140, KeyTakeaway >220, Misconception >320 → linter fails.
- **Dangling prereqs / deepensInto.** Every slug in `prereqs` and `deepensInto` must resolve to an existing lesson. `connection-integrity` rule catches dangling refs.
- **Partial translation.** If RU is absent or incomplete, status cannot be `ready`. Report DONE_WITH_CONCERNS.
- **units.json not updated.** The `lessons` array in the unit entry must be filled before committing.
- **Building stale site/dist.** Always run `bun run build` after edits. The linter runs at build time.
- **Forgetting glossary.json.** New RU terms must be added and committed together with the lessons.
- **Off-domain topic.** If the topic is not fullstack engineering, refuse immediately.
- **Skipping scaffold.** Always copy `site/scaffolds/topic-lesson.mdx` — keeps imports and section sentinel wiring consistent.
