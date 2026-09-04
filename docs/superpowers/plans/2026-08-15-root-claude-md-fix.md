# Root CLAUDE.md Accuracy Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the repo-root `/Users/artemmac/dev/awesome-everything/CLAUDE.md` — read at the start of every session in this repo — back into sync with the live track → unit → lesson content model, after a prior plan (`docs/superpowers/plans/2026-08-15-curriculum-md-fix.md`, already shipped as commits `1f7bb7032`/`8b2fa1753`) fixed the same staleness in `curriculum.md`.

**Architecture:** Documentation-only edit to a single file, root `CLAUDE.md`. No site code, schema, or command changes. Four sequential edits to the same file (Purpose section, Directory layout tree, Primary-command section, consistency sweep of the remaining scattered references), each independently verifiable against the live filesystem, `tracks.json`/`units.json`, and `.claude/commands/infographic.md`.

**Tech Stack:** Markdown. No build step; correctness is checked by reading the live directory tree and JSON data files directly (`ls`, `find`, `node -e`) rather than trusting any fact in this plan that could have drifted since it was written.

**Spec:** No separate spec doc. Ground truth is the live repository state, re-derived inside each task rather than assumed. The staleness this plan fixes was discovered and characterized in the conversation that produced it; the key findings are captured as this plan's Task 0 (already done, see below) so an executor doesn't have to re-derive them from nothing — but every fact an executor writes into `CLAUDE.md` must still be re-verified live in that task's own steps, because the site is actively developed and any of these facts can have moved between plan-writing time and execution time.

## Global Constraints

- Do not touch `site/` code, `tracks.json`, `units.json`, or any content file — this is a docs-only fix to root `CLAUDE.md`.
- Do not re-add any reference to `site/src/content/book/`, `site/src/content/pillars/`, `site/src/content/chapters.json`, `ChapterSidebar.astro`, `PillarGrid.astro` (as a live component — it was deleted), `Chapter.astro` (layout), or the `<pillar>/<NN-chapter>/<NN-piece>` input form — all retired by commit `80f024601` ("chore(migration): retire book/pillars/chapters collections") and the later Atlas-redesign work.
- Every path, count, filename, and component name written into `CLAUDE.md` must be re-verified against the live filesystem/JSON in the same task, not copied from this plan's prose — this plan's own numbers (44 tracks, 440 units, 32 files under `src/lint/rules/`, etc.) are point-in-time observations from when this plan was written, not values to hardcode.
- Preserve the `## MCP servers`, `## Working style`, and any section not named in a task below, verbatim.
- `## Secondary command: /teach ...` is already accurate (verified — it correctly describes `tracks.json`/`units.json`/`site/src/content/lessons/` today) — do not rewrite it, only cross-check other sections stay consistent with what it already says.
- The word "pillar" is not automatically stale — `curriculum.md` (already fixed) still uses "pillar" for the 16 core domains, and `tracks.json` track slugs map to them 1:1. Only flag/fix a "pillar" reference where it implies the *retired* `site/src/content/pillars/*.json` collection or the old `[lang]/[pillar]/[piece].astro` route — not every occurrence of the word.

---

### Task 1: Rewrite the "Purpose" section

**Files:**
- Modify: `CLAUDE.md` — the block from `## Purpose` through (but not including) `## Directory layout`. Currently this spans four paragraphs: the curriculum-site summary sentence ("16 pillars × ~8 pieces..."), the Domain lock paragraph, the Depth bar paragraph, and the "Three-tier hierarchy" bullet list (Piece/Chapter/Topic).
- Reference (read-only): `curriculum.md` (already fixed — its `## Authoring model` section is the canonical description of the track/unit/lesson model this task must match), `site/src/content/tracks.json`, `site/src/content/units.json`, `site/src/components/pedagogy/`.

**Interfaces:**
- Consumes: nothing from another task in this plan.
- Produces: an accurate `## Purpose` section that Task 3 will cross-reference when it rewrites the `## Primary command` section (both must describe the track/unit/lesson model identically — don't invent a second vocabulary).

- [ ] **Step 1: Re-derive live content stats — don't trust any number in this plan**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
node -e "
const t = require('./src/content/tracks.json');
const u = require('./src/content/units.json');
console.log('tracks:', t.length);
console.log('units:', u.length);
const readyUnits = u.filter(x => x.status === 'ready').length;
console.log('units with status ready:', readyUnits, '(sample unit keys:', Object.keys(u[0]).join(','), ')');
"
```
If `status` isn't a field on unit objects, drop that line rather than inventing a number — inspect a sample unit (`console.log(JSON.stringify(u[0], null, 1))`) to see what fields actually exist and pick an honest one (e.g. `lessons.length > 0` as a proxy for "has content").

- [ ] **Step 2: Re-derive the live pedagogy widget list — the old list contains at least one name that may no longer exist**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
ls src/components/pedagogy/*.astro src/components/pedagogy/*.tsx 2>/dev/null | xargs -n1 basename | sort
```
Cross-check against the CURRENT `## Purpose` text's list (Pretest, TierAccordion, FadedExample, RetrievalDrawer, ReactiveDiagram, Sequencer, PersonaTag, SpiralCue, PrereqBadge, SpacedRevisitBanner, SettingsDrawer, Sandbox) — some of these may not exist under `src/components/pedagogy/` at all (e.g. `SpiralCue` actually lives in `src/components/prose/`, not `pedagogy/` — check both dirs before concluding a name is gone). Use only names you actually found on disk in the new sentence; don't carry forward a name you couldn't verify.

- [ ] **Step 3: Re-derive the live lint rule surface**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
ls src/lint/rules/*.ts | grep -v '\.test\.ts$' | xargs -n1 basename
```
The current text claims "9 rules" with a specific illustrative list including "hydration cap on piece pages" (stale — should be lesson pages, if a hydration rule still exists at all — check for `hydration-budget.ts` in the output). Do not commit to an exact rule count in the new text (it drifts) — instead phrase it as "the linter (`src/lint/rules/*.ts`) enforces structural and bilingual rules — text budgets, hydration caps on lesson pages, i18n parity + glossary, sources required, and more" or similar, naming 3-5 real rules from the Step 3 output rather than asserting a total.

- [ ] **Step 4: Write the replacement**

Using `Edit`, replace the four paragraphs from `## Purpose` through the end of the "Three-tier hierarchy" bullet list (i.e., everything up to but not including `## Directory layout`) with new text that:
- States the site is `site/` (Astro 5 + Preact + Tailwind + i18n), and gives the Step 1 live counts (tracks, units) instead of "16 pillars × ~8 pieces × 2 langs = 256 piece slots."
- Replaces "Chapter 01 (Networking) is fully authored EN+RU. Subsequent chapters land via `/infographic` invocations." with an accurate equivalent using Step 1's ready/authored proxy for the `networking` track specifically (check `u.filter(x => x.track === 'networking')` status/lessons in Step 1's script) — state which track(s) are most complete today rather than asserting a specific "chapter" is done, since "chapter" isn't a unit of authoring status anymore.
- Uses Step 2's live pedagogy widget list.
- Uses Step 3's live-grounded (not over-specific) lint description.
- Replaces the "Domain lock" and "Depth bar" paragraphs' cross-references to `curriculum.md` — these are still accurate in substance (curriculum.md still holds the depth bar and domain lock is still enforced by `/infographic`), just reword "Every piece must meet this bar" → "Every unit's lessons must meet this bar" for consistency with the new vocabulary.
- Replaces the "Three-tier hierarchy" bullet list (Piece/Chapter/Topic definitions, with the `site/src/content/book/{en,ru}/<pillar>/<NN>-<piece>/` path) with a short pointer instead of a duplicate definition: `curriculum.md`'s `## Authoring model` section (fixed by the prior plan) is now the canonical description of the track → unit → lesson model — this section should state the model in 2-3 sentences (track → unit → lesson, `/infographic <track>/<unit>` authors a unit, output path `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`) and say "see `curriculum.md`'s Authoring model section for the full definition" rather than re-deriving a parallel, driftable copy.

- [ ] **Step 5: Verify no orphaned terms remain in this section**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
sed -n '/## Purpose/,/## Directory layout/p' CLAUDE.md | grep -n "piece\|Piece\|Chapter\|chapter\|book/\|256 piece"
```
Expected: no hits (the section header `## Purpose` itself won't match; if `## Directory layout` region bleeds in because your `sed` range is inclusive of the second pattern, ignore hits that are clearly part of the next section's heading line only — but any hit inside the Purpose paragraphs themselves must be fixed).

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add CLAUDE.md
git commit -m "docs(claude-md): rewrite Purpose section for the track/unit/lesson model"
```

---

### Task 2: Rewrite the "Directory layout" ASCII tree

**Files:**
- Modify: `CLAUDE.md` — the fenced code block under `## Directory layout` (the ASCII directory tree).
- Reference (read-only): live `site/src/` tree, `site/src/pages/`, `site/src/layouts/`, `site/src/components/`.

**Interfaces:**
- Consumes: nothing from Task 1 except that both sections must agree on terminology (track/unit/lesson, not pillar/chapter/piece).
- Produces: an accurate directory map that Task 4's sweep will spot-check for any remaining `book/`/`pillars/`/`chapters/` references.

- [ ] **Step 1: Re-derive the live top-level structure of each subtree the old ASCII map claims**

Run each of these and read the output — do not assume any of it matches what the current `CLAUDE.md` claims:
```bash
cd /Users/artemmac/dev/awesome-everything/site
echo "--- content/ ---" && ls src/content/
echo "--- content .json data files ---" && find src/content -maxdepth 1 -name '*.json'
echo "--- pages/[lang]/ (top level only) ---" && find "src/pages/[lang]" -maxdepth 1 -type f -o -maxdepth 1 -type d | sort
echo "--- pages/[lang]/learn/ ---" && find "src/pages/[lang]/learn" -type f | sort
echo "--- layouts/ ---" && ls src/layouts/
echo "--- components/ (top level) ---" && ls src/components/
echo "--- components/nav/ ---" && ls src/components/nav/
echo "--- components/atlas/ ---" && ls src/components/atlas/ | head -10
echo "--- components/lesson/ ---" && ls src/components/lesson/
echo "--- i18n/ ---" && ls src/i18n/
```

- [ ] **Step 2: Re-derive the live legacy-directory and reference-file claims**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
ls -d infographics assets drafts figma 2>&1
ls curriculum.md style-guide.md CLAUDE.md .claude/commands/infographic.md 2>&1
```
The old tree's `[LEGACY — reference only, not maintained]` block and the `curriculum.md`/`style-guide.md`/top-level-file listing are likely still accurate — confirm they are before leaving them unchanged; if any listed legacy dir is now gone, remove its line.

- [ ] **Step 3: Write the replacement tree**

Using `Edit`, replace the fenced ASCII tree under `## Directory layout` so that:
- The `content/` subtree shows the real data files and collections from Step 1 (`tracks.json`, `units.json`, `lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`, and any other top-level content dirs Step 1's `ls src/content/` revealed — e.g. `drill/`, `interview/`, `lab/`, `path/`, `practice/`, `projects/`, `personas.json` — describe each with the same one-line-comment style the old tree used, only for entries Step 1 actually confirmed exist) — remove the `pillars/`, `chapters/`, and `book/` lines entirely.
- The `pages/` subtree reflects Step 1's real routes: `index.astro` (redirect to `/en/`), `[lang]/index.astro` (Atlas-layout homepage — check Step 1's finding of what it imports/renders, e.g. track-band driven, not `PillarGrid`), `[lang]/learn/index.astro`, `[lang]/learn/[track]/index.astro`, `[lang]/learn/[track]/[unit]/[lesson].astro`, `[lang]/learn/[track]/lab.astro` — plus `[lang]/about.astro`, `[lang]/settings.astro` if still present (Step 1 confirms). Do not attempt to enumerate every single page under `[lang]/` (there are dozens covering assess/english/interview/projects/etc.) — the old tree didn't either; keep it representative of the pattern, matching the old tree's level of detail.
- The `layouts/` subtree lists what Step 1's `ls src/layouts/` actually returned (expect `Atlas.astro`, `Lesson.astro`, `Topic.astro` — not `Chapter.astro`, which no longer exists) with a one-line description of each's real role (derive from a quick look at each file's own top-of-file comment/imports if the role isn't obvious from the name alone).
- The `components/` subtree drops `PillarGrid.astro`, `ChapterSidebar.astro`, `ChapterSidebarTOC.tsx` from the `nav/` line (confirmed gone in Step 1) and lists what's actually in `nav/` now, and adds a line for `lesson/` (confirmed to exist and hold lesson-article components like `Hook.astro`/`Explanation.astro`/`Recap.astro`) and `atlas/` (confirmed to exist and hold the homepage/nav chrome) if Step 1 confirms their role — keep the existing `brand/`, `prose/`, `layout/`, `diagram/`, `pedagogy/` lines but re-verify their listed component names still exist (spot-check 2-3 names per dir against Step 1's `ls` output; fix any that don't).
- The `i18n/` subtree, `scripts/` subtree, `dist/` line, and everything below (`docs/superpowers/`, `curriculum.md`, `style-guide.md`, `CLAUDE.md`, `.claude/commands/infographic.md`, the `[LEGACY...]` block) stay as-is if Step 2 confirmed them, or get corrected to match Step 2's findings if not.

- [ ] **Step 4: Verify the new tree has no dangling references**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
sed -n '/## Directory layout/,/## Primary command/p' CLAUDE.md | grep -n "pillars/\|chapters/\|book/\|ChapterSidebar\|PillarGrid\.astro\|Chapter\.astro"
```
Expected: no hits.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add CLAUDE.md
git commit -m "docs(claude-md): rewrite Directory layout tree to match the live site structure"
```

---

### Task 3: Rewrite the "Primary command: /infographic" section

**Files:**
- Modify: `CLAUDE.md` — the block from `## Primary command: ...` through (but not including) `## Secondary command: /teach ...`.
- Reference (read-only): `.claude/commands/infographic.md` (the authoritative, already-live command definition), `curriculum.md`'s `## Authoring model` section (already fixed).

**Interfaces:**
- Consumes: Task 1's vocabulary (track/unit/lesson) — this task's rewrite must use the same terms, not reintroduce piece/chapter language.
- Produces: a `## Primary command` section whose input form, pipeline summary, and enforced-rules list all match `.claude/commands/infographic.md` — Task 4's sweep will spot-check this against that file directly.

- [ ] **Step 1: Re-read the authoritative command file — do not paraphrase from memory of an earlier session**

Run:
```bash
cat /Users/artemmac/dev/awesome-everything/.claude/commands/infographic.md
```
Confirm (re-derive, don't assume): the heading naming convention (`# /infographic — ...`), the input form is `<track>/<unit>` (2 path segments, e.g. `networking/03-tcp-handshake`), the output path is `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`, the numbered "Hard rules" list (bilingual-or-refuse, domain lock, text budgets, hydration cap = 5, status flow stub→draft→ready, scaffold requirement, commit format), and the commit-message format the file specifies for a completed unit.

- [ ] **Step 2: Replace the section**

Using `Edit`, replace the heading `## Primary command: /infographic <pillar>/<NN-chapter>/<NN-piece>` and its body with:
- New heading: `## Primary command: /infographic <track>/<unit>`
- A summary sentence matching what Step 1 found: authors a unit's lessons (stub → draft → ready), bilingual EN+RU or refuse.
- An "Input form" example block using 2-3 REAL track/unit pairs — verify each exists before writing it:
  ```bash
  cd /Users/artemmac/dev/awesome-everything/site
  node -e "
  const u = require('./src/content/units.json');
  console.log(u.filter(x => x.track === 'networking').slice(0,2).map(x => x.track + '/' + x.slug).join('\n'));
  console.log(u.filter(x => x.track === 'databases').slice(0,1).map(x => x.track + '/' + x.slug).join('\n'));
  "
  ```
  Use this script's actual output as the example lines (replacing the old `/infographic networking/01-networking/03-tcp-handshake` 3-segment examples, which used the retired piece-path form).
- A pipeline summary condensed from Step 1's numbered steps (research → author EN → translate RU → verify build → visual check → commit) — do not invent steps not in the source file, and do not just copy all 10 steps verbatim; this is a summary section, matching the old section's level of brevity (it had 7 bullet points, not the source file's full 10-step detail).
- The "commit format" bullet updated to Step 1's actual format: `git commit -m "content(<track>): <unit> EN+RU ready"` (not the old `content(<pillar>): <NN-piece> EN+RU ready`).
- The "command enforces" bullet list updated to match Step 1's Hard rules: bilingual-or-refuse, text budgets (keep the exact numeric values Step 1 found — Crux/KeyTakeaway/Misconception/Card-annotation character limits — verify these numbers directly from Step 1's read rather than copying the old ones, in case they changed), hydration cap (verify the exact number Step 1 found — it may still be 5, confirm), status flow (stub → draft → ready), and the `~/` import-alias rule.

- [ ] **Step 3: Fix the curriculum.md self-reference and the References-section stale path in the same pass**

These live outside the `## Primary command` section boundary but are the same category of staleness this task is already fixing, and are small enough to fold in rather than spinning up a 5th task:

1. Find the line describing `curriculum.md` in the `## Directory layout` block (added/rewritten by Task 2 — re-read it) and in the `## References` section near the end of the file. Both currently (or after Task 2) may still say something like "Fullstack depth bar + 16 pillars + 3-tier scoping" — since `curriculum.md` no longer has "3-tier scoping" (that section was replaced with `## Authoring model` by the prior plan), update both mentions to say "Fullstack depth bar + pillar must-cover map + authoring model (source of truth)" or similarly accurate wording. Verify by running `grep -n "^##" /Users/artemmac/dev/awesome-everything/curriculum.md` and matching the description to what's actually there.
2. In `## References`, find the line pointing at `site/src/content/book/en/networking/03-tcp-handshake/index.mdx` as a "template piece." Replace it with a real, currently-existing lesson file — verify first:
   ```bash
   find /Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/networking/03-tcp-handshake -maxdepth 1 -type d
   ```
   Pick one real lesson directory from the output (e.g. the first non-`quiz-*`/non-`project` one) and point the reference at its `index.mdx`, describing it as a template lesson (not "piece").

- [ ] **Step 4: Verify against the source file**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
diff <(grep -oE '<track>/<unit>|<pillar>/<NN-chapter>/<NN-piece>' CLAUDE.md) <(echo "<track>/<unit>")
```
This should show CLAUDE.md now contains only the new form. Also re-run:
```bash
grep -n "pillar>/<NN-chapter>\|content(<pillar>)\|book/en/networking" CLAUDE.md
```
Expected: no hits.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add CLAUDE.md
git commit -m "docs(claude-md): rewrite Primary command section to match the live /infographic <track>/<unit> form"
```

---

### Task 4: Consistency sweep — remaining scattered references and no-dead-terms verification

**Files:**
- Modify: `CLAUDE.md` — small, scattered edits in `## Skills (when to invoke)` and `## Build and deploy` (Fenix rules) only, if Step 1/2 find anything.
- Reference (read-only): the fully-edited `CLAUDE.md` from Tasks 1-3, `.claude/commands/teach.md`.

**Interfaces:**
- Consumes: the fully-edited `CLAUDE.md` from Tasks 1-3.
- Produces: nothing new beyond the small in-place fixes below — this is the final gate.

- [ ] **Step 1: Sweep the Skills section for "piece" wording**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
sed -n '/## Skills/,/## Build and deploy/p' CLAUDE.md | grep -n "piece\|chapter\|pillar"
```
For each hit, judge in context — a skill bullet like "required before designing a new piece concept" should become "required before designing new unit/lesson content" (both `/infographic` and `/teach` produce lessons now, not "pieces"). Fix each hit found; a bullet that already reads fine without "piece" language needs no change.

- [ ] **Step 2: Sweep the Fenix rules / Build-and-deploy section**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -n "piece content\|piece stub\|any piece" CLAUDE.md
```
Fix "Run the site build (`bun run build` in `site/`) if you touch any piece content." → "...if you touch any lesson content." (or equivalent). Fix any other hit the same way.

- [ ] **Step 3: Full-file dead-term sweep**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -n "site/src/content/book\|site/src/content/pillars\|content/chapters\.json\|ChapterSidebar\|PillarGrid\.astro\|<pillar>/<NN-chapter>\|content(<pillar>): <NN-piece>" CLAUDE.md
```
Expected: no hits. If anything remains, it means Tasks 1-3 missed a spot — fix it here rather than leaving it for a hypothetical Task 5.

- [ ] **Step 4: Confirm the `/teach` section still reads consistently with the rewritten sections above it**

Read the full file once, start to finish. Confirm: the `## Purpose` section's model description (Task 1), the `## Directory layout` tree (Task 2), and the `## Primary command` section (Task 3) all agree with each other and with the already-accurate `## Secondary command: /teach` section on terminology (track/unit/lesson) and on the shared facts both commands depend on (`tracks.json`, `units.json`, the `site/src/content/lessons/` path shape). Confirm the `## References` list at the end still resolves — spot check with `ls` that every file path mentioned in `## References` actually exists.

- [ ] **Step 5: Commit (only if Steps 1-3 found something to fix)**

```bash
cd /Users/artemmac/dev/awesome-everything
git add CLAUDE.md
git commit -m "docs(claude-md): consistency sweep — remaining piece/chapter/pillar wording"
```

If Steps 1-3 found nothing, skip this commit — Tasks 1-3's commits already cover the work.

---

## Self-Review Notes

- **Spec coverage:** every stale reference identified during discovery (Purpose section's piece/chapter framing, the ASCII directory tree's `pillars/`/`chapters/`/`book/` paths and dead component/route names, the `/infographic <pillar>/<NN-chapter>/<NN-piece>` primary-command section, the scattered "piece" wording in Skills/Build-and-deploy, and the stale `curriculum.md` self-description + dead References path) has an assigned task. The `## Secondary command: /teach` section was independently verified accurate during discovery and is explicitly excluded from all four tasks' edit scope.
- **Placeholder scan:** every task step gives an exact command to run and instructs writing the replacement FROM that command's live output, rather than asserting fixed prose — this is deliberate, not a placeholder gap: every fact in the old CLAUDE.md this plan touches was found stale at least once already (curriculum.md's near-identical staleness was caused by content drifting since a doc was last hand-written), so baking a second generation of soon-to-be-stale hardcoded facts into the fix would recreate the same defect. Where a fact is stable enough to hardcode safely (e.g. the shape of a file path, a fixed input-form syntax), the task states it directly.
- **Type/name consistency:** "track", "unit", "lesson" terminology is used identically across all four tasks and matches both `.claude/commands/infographic.md` and the already-fixed `curriculum.md`'s `## Authoring model` section (see `docs/superpowers/plans/2026-08-15-curriculum-md-fix.md`, Task 1).
