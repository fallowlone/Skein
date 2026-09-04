# curriculum.md Accuracy Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `curriculum.md` back into sync with the live `/infographic` (track → unit → lesson) and `/teach` (foundations) authoring pipelines, removing every reference to the retired piece/chapter/topic model.

**Architecture:** Documentation-only edit to a single file, `/Users/artemmac/dev/awesome-everything/curriculum.md`. No site code, schema, or command changes. Three sequential edits to the same file (structural section replacement, pillar-list extension, consistency sweep), each independently verifiable with `grep`.

**Tech Stack:** Markdown. No build step; correctness is checked by `grep` against the live source-of-truth files `site/src/content/tracks.json`, `site/src/content/units.json`, and `.claude/commands/infographic.md`.

**Spec:** No separate spec doc — the defect and its evidence trail are captured in this plan's Task 0 (already done) and the conversation that produced it. Ground truth for "what's actually true today" is the three files named above, read live in each task rather than assumed.

## Global Constraints

- Do not touch `site/` code, `tracks.json`, or `units.json` — this is a docs-only fix.
- Do not re-add any reference to `infographics/<slug>/`, `book/`, `MAP.md`, `INDEX.md`, or "Tier 1/2/3" terminology — these describe the retired pipeline (confirmed dead by commit `80f024601` "chore(migration): retire book/pillars/chapters collections" and commit `70f53fdb2` "feat(migration): /infographic authors topic lessons").
- Every path and slug written into `curriculum.md` must be verified against the live JSON files in the same task, not copied from memory.
- Preserve the Depth bar (lines ~12–22) and Forbidden simplifications (lines ~165–171) sections verbatim — both already verified accurate and both are actively read by `.claude/commands/infographic.md` rule 2.
- Keep the existing "16 pillars, must-cover bullets" content (lines ~26–88) verbatim — only append to the section, don't rewrite the existing bullets.

---

### Task 1: Replace the "Three-tier scoping" section with the real track → unit → lesson model

**Files:**
- Modify: `curriculum.md` (the block currently running from the `## Three-tier scoping` heading through the end of the `### Forbidden upsizing / downsizing` subsection — locate by heading text, not line number, since Task's own header-note edit already shifted line numbers once).
- Reference (read-only, do not modify): `.claude/commands/infographic.md`, `.claude/commands/teach.md`, `site/src/content/units.json`.

**Interfaces:**
- Consumes: nothing from another task in this plan.
- Produces: the section headings `## Authoring model` and `### Forbidden splitting mistakes` that Task 3's consistency sweep will scan for stale terms one level up/down from.

- [ ] **Step 1: Re-read the current section to get exact boundaries**

Run:
```bash
grep -n "^##\|^###" /Users/artemmac/dev/awesome-everything/curriculum.md
```
Confirm the section to replace starts at the `## Three-tier scoping` heading and ends immediately before `## Forbidden simplifications`. Note the exact line range.

- [ ] **Step 2: Re-verify the authoring pipeline facts against the live command file**

Run:
```bash
grep -n "unit mode\|lessons/{en,ru}\|typically 3–7\|prereqs\|deepensInto\|level.*junior.*middle.*senior" /Users/artemmac/dev/awesome-everything/.claude/commands/infographic.md
```
Confirm: input is `<track>/<unit>` (2 segments, validated against `tracks.json`/`units.json`); output is `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`; a unit typically splits into 3–7 lessons banded `junior`/`middle`/`senior`; `units.json` gets the unit's `lessons` array updated as the final data step. These are the facts the new section must state — if any grep comes back empty, read the file directly and re-derive the fact before writing it.

- [ ] **Step 3: Confirm foundations tracks are out of scope for `/infographic`**

Run:
```bash
head -10 /Users/artemmac/dev/awesome-everything/.claude/commands/teach.md
```
Confirm the domain lock line: `/teach` owns math, algorithms, and Base CS; `/infographic` explicitly excludes them (already true in `curriculum.md`'s header note fixed in the prior session — this step is just re-confirming so Task 1's new section states it consistently).

- [ ] **Step 4: Replace the section**

Using `Edit`, replace everything from `## Three-tier scoping` through the end of `### Forbidden upsizing / downsizing` (i.e., stop right before `## Forbidden simplifications`) with:

```markdown
## Authoring model

Every request maps to one **unit** inside one **track**. There is no
chapter/piece/topic tier above the unit — `site/src/content/tracks.json`
lists the tracks, `site/src/content/units.json` lists each track's units,
and each unit's `lessons` array lists its lesson slugs in junior→senior
order.

- **Track** — one pillar or specialization (e.g. `networking`, `sql-postgres`,
  `security-offensive`). Matches a `curriculum.md` pillar 1:1 for the 16
  core pillars below; see "Beyond the 16 core pillars" for the rest.
- **Unit** — the addressable authoring target. Run `/infographic
  <track>/<unit>` (see `.claude/commands/infographic.md`) to author one.
  Covers one coherent sub-topic of the track (e.g. `03-tcp-handshake`
  inside `networking`).
- **Lesson** — the smallest content file. A unit typically splits into
  3–7 lessons banded by level: one `junior` intro, 1–2 `middle` mechanism
  lessons, 1–2 `senior` internals/edge-case lessons. Lives at
  `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`.
  Every lesson is bilingual (EN+RU) or the command refuses.

Foundations content (math, algorithms, Base CS) is a separate track
group authored via `/teach <track>/<NN-unit>/<NN-lesson>`
(`.claude/commands/teach.md`), not `/infographic` — see "Beyond the 16
core pillars" below.

### Forbidden splitting mistakes

- Don't cram a unit that actually needs 3+ distinct mechanisms into one
  lesson — split by level band, not by cramming.
- Don't split a single mechanism across lessons just to pad the count —
  if one lesson can carry it, ship one lesson.
- Don't skip a level band a unit's topic genuinely needs (e.g. shipping
  only `junior`+`middle` when the topic has real senior-level failure
  modes) — the depth bar above applies per lesson, not just to the unit
  as a whole.
```

- [ ] **Step 5: Verify the replacement reads correctly**

Run:
```bash
sed -n '1,250p' /Users/artemmac/dev/awesome-everything/curriculum.md | grep -n "^##\|^###"
```
Confirm heading order now reads: `# Fullstack Curriculum...` → `## Depth bar...` → `## Pillars` (with `### 1.` … `### 16.`) → `## Authoring model` (with `### Forbidden splitting mistakes`) → `## Forbidden simplifications`.

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add curriculum.md
git commit -m "docs(curriculum): replace retired piece/chapter/topic tiers with the real track/unit/lesson model"
```

---

### Task 2: Extend the Pillars section with the 28 tracks not covered by the 16-pillar map

**Files:**
- Modify: `curriculum.md` — insert a new subsection immediately after `### 16. Engineering Practice` and before `## Authoring model`.
- Reference (read-only): `site/src/content/tracks.json`.

**Interfaces:**
- Consumes: nothing from Task 1 except the now-correct `## Authoring model` heading this task's new subsection must precede.
- Produces: a `### Beyond the 16 core pillars` subsection that Task 3's sweep will confirm contains no stale terminology and that every listed slug round-trips against `tracks.json`.

- [ ] **Step 1: Re-derive the live track list — don't trust the list in this plan's own prompt**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
node -e "
const t = require('./src/content/tracks.json');
const core = new Set(['networking','browser','frontend','backend','apis','databases','caching','queues','distributed','security','observability','deployment','performance','data-engineering','ai-llm','engineering-practice']);
const extra = t.filter(x => !core.has(x.slug));
extra.forEach(x => console.log(x.slug, '|', typeof x.title === 'object' ? x.title.en : x.title));
console.log('---');
console.log('total tracks:', t.length, '| core:', core.size, '| extra:', extra.length);
"
```
Use this exact, freshly-run output for the list in Step 2 — `tracks.json` may have gained or lost tracks since this plan was written.

- [ ] **Step 2: Insert the new subsection**

Using `Edit`, insert immediately after the `### 16. Engineering Practice` paragraph (before the `## Authoring model` heading added in Task 1) — group the Step 1 output into foundations vs. specialized, using whatever the live grouping actually is (foundations = tracks with no core-pillar analog that exist to bring an absolute beginner up to the point where the 16 core pillars assume they start; specialized = deep-dives or adjacent stacks layered on top of a core pillar):

```markdown
### Beyond the 16 core pillars

The 16 pillars above are the depth-calibration map for `/infographic`.
`site/src/content/tracks.json` also carries tracks these pillars don't
map to — they don't get their own must-cover bullets here because they
either sit below this file's depth bar (foundations) or extend a single
pillar into stack-specific depth (specialized) rather than adding a new
domain:

- **Foundations** (absolute-beginner, authored via `/teach`, not
  `/infographic` — out of scope for the depth bar above): `math`,
  `algorithms`, `base-cs`, `logic`.
- **Specialized / stack-specific deep-dives** (authored via
  `/infographic`, must-cover content lives in the unit's own research
  step rather than in this file): [insert the freshly-derived slug list
  from Step 1, grouped by the pillar each one extends — e.g. `sql-postgres`
  under Databases, `js-engine`/`typescript`/`react`/`react-patterns`/`nextjs`
  under Browser & Frontend Runtime / Frontend Architecture, `node`/`nest`/`go`
  under Backend Architecture, `security-foundations`/`security-offensive`/
  `security-defensive`/`security-cloud` under Security, `aws`/`docker`/`ci-cd`
  under Deployment & Infra, `python` as a language-adjacent track, `cli`/
  `linux`/`git` as tooling foundations, `code-patterns`/`architecture-patterns`
  as cross-cutting practice, `system-design`/`system-design-cases` as an
  applied synthesis of multiple pillars].

If a specialized track's must-cover content needs the same explicit
calibration the 16 core pillars get, promote it to its own numbered
pillar above instead of growing this list indefinitely.
```

- [ ] **Step 3: Verify every slug mentioned resolves in `tracks.json`**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
node -e "
const fs = require('fs');
const t = require('./src/content/tracks.json').map(x => x.slug);
const doc = fs.readFileSync('../curriculum.md', 'utf8');
const section = doc.split('### Beyond the 16 core pillars')[1]?.split('## Authoring model')[0] ?? '';
const mentioned = [...section.matchAll(/\`([a-z0-9-]+)\`/g)].map(m => m[1]);
const bad = mentioned.filter(s => !t.includes(s));
console.log(bad.length ? 'STALE SLUGS: ' + bad.join(', ') : 'all mentioned slugs resolve');
"
```
If it prints any stale slugs, fix the subsection text before proceeding — every backtick-quoted slug in this subsection must be a real `tracks.json` slug.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add curriculum.md
git commit -m "docs(curriculum): document the 28 tracks outside the 16-pillar must-cover map"
```

---

### Task 3: Consistency sweep — confirm no dead references remain and no other file needs a matching update

**Files:**
- Modify: `curriculum.md` only if the sweep finds a leftover reference (should be none if Tasks 1–2 were done correctly).
- Reference (read-only): `.claude/commands/infographic.md`, `.claude/commands/teach.md`, `style-guide.md`, root `CLAUDE.md`.

**Interfaces:**
- Consumes: the fully-edited `curriculum.md` from Tasks 1–2.
- Produces: nothing new — this is a verification-only task. If it finds root `CLAUDE.md` or `style-guide.md` also describe the retired pipeline, it reports that as follow-up scope rather than silently expanding into editing those files (they're outside this plan's stated single-file scope).

- [ ] **Step 1: Grep curriculum.md for every dead term**

Run:
```bash
grep -n "infographics/\|book/\|MAP\.md\|INDEX\.md\|Tier 1\|Tier 2\|Tier 3\|<pillar>/<NN-chapter>\|classification heuristic" /Users/artemmac/dev/awesome-everything/curriculum.md
```
Expected: no output. If anything matches, open `curriculum.md` at that line and remove/rewrite it — Tasks 1–2 should have already eliminated every one of these strings, so a hit here means a Task 1 or 2 edit was incomplete.

- [ ] **Step 2: Confirm `.claude/commands/infographic.md` doesn't itself reference anything Task 1/2 just renamed**

Run:
```bash
grep -n "curriculum.md" /Users/artemmac/dev/awesome-everything/.claude/commands/infographic.md
```
Read each matching line. `infographic.md` only needs `curriculum.md` for the depth bar and forbidden-simplifications sections (per its own rule 2), both left untouched by this plan — confirm none of the matched lines reference `## Three-tier scoping`, `## Pillars` tier language, or any heading this plan renamed. No edit expected; this step exists to catch a coupling this plan's author didn't anticipate.

- [ ] **Step 3: Check root `CLAUDE.md` and `style-guide.md` for the same staleness, without editing them**

Run:
```bash
grep -n "infographics/<slug>\|book/{en,ru}\|MAP\.md\|INDEX\.md\|Tier 1 —" /Users/artemmac/dev/awesome-everything/CLAUDE.md /Users/artemmac/dev/awesome-everything/style-guide.md
```
If either file has hits, do **not** edit them as part of this plan (out of scope — this plan is curriculum.md only). Instead, report the finding in the final summary as recommended follow-up scope for a separate plan.

- [ ] **Step 4: Full-file read-through**

Read the complete, final `curriculum.md` top to bottom once to confirm it reads as one coherent document — heading hierarchy is consistent (`##` for top-level sections, `###` for subsections), no orphaned cross-references, and the header note from the prior session's edit (line 1) still matches what Tasks 1–2 actually built (i.e., it promised `tracks.json`/`units.json` as the mirror and both `/infographic` + `/teach` as the commands — confirm both are still true after the rewrite).

- [ ] **Step 5: Final commit (only if Step 1 or 3 required a fix)**

```bash
cd /Users/artemmac/dev/awesome-everything
git add curriculum.md
git commit -m "docs(curriculum): consistency sweep — remove remaining dead pipeline references"
```

If Steps 1–4 found nothing to fix, skip this commit — Tasks 1–2's commits already cover the work.

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers remaining-item 1 (pipeline section rewrite) from the checkpoint summary; Task 2 covers remaining-item 2 (28 missing tracks); Task 3 covers remaining-item 3 (consistency + no-matching-update-needed check). All three checkpoint bullets have a task.
- **Placeholder scan:** Task 1 Step 4 and Task 2 Step 2 contain full literal markdown to write, not descriptions of what to write — the one bracketed placeholder (Task 2 Step 2's slug grouping) is intentional: it's re-derived live from Task 2 Step 1's fresh `node` output rather than hardcoded, because the whole point of this plan is not to trust a slug list that could already be stale by execution time. Task 3 Step 3 explicitly defers any found staleness to a separate plan rather than silently expanding scope.
- **Type/name consistency:** "track", "unit", "lesson" terminology is used identically across all three tasks and matches `.claude/commands/infographic.md`'s own vocabulary (`<track>/<unit>` input, `lessons` array in `units.json`).
