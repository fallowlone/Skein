# Historical Spec/Plan Supersession Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three-plan series that just fixed `curriculum.md`, root `CLAUDE.md`, and `style-guide.md` (all now describe the live track → unit → lesson model) left two documents unaddressed that `CLAUDE.md`'s own `## References` section still points readers to as "architecture spec" / "implementation plan": `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` (427 lines, 51 stale-term hits) and `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` (3166 lines, 193 stale-term hits). Both describe the original piece/chapter/topic 3-tier design that was retired by commit `80f024601` and the later Atlas redesign — a reader following `CLAUDE.md`'s pointer to either file today gets pulled straight back into the retired model. This plan does NOT rewrite either document's body — they are historical design/execution records of a real, already-shipped decision, and rewriting 3593 lines of history to match a later architecture would misrepresent what was actually decided and built at the time. Instead: add a clear, impossible-to-miss supersession notice at the top of each, and correct `CLAUDE.md`'s own description of them so it no longer presents them as current architecture references without that context.

**Architecture:** Documentation-only edits to three files: two historical docs get a short banner inserted at the very top (before their existing content, which stays untouched), and root `CLAUDE.md` gets its two `## References` lines for these files reworded. No site code, schema, or command changes.

**Tech Stack:** Markdown. Correctness is checked by confirming the banner accurately names the real current source of truth (re-verified live, not assumed) and that the historical content below the banner is byte-for-byte unchanged.

**Spec:** No separate spec doc. This plan is the fourth in a series; the prior three are `docs/superpowers/plans/2026-08-15-curriculum-md-fix.md`, `docs/superpowers/plans/2026-08-15-root-claude-md-fix.md`, and `docs/superpowers/plans/2026-08-16-style-guide-md-fix.md`, all on `main`. Ground truth for "what's the current source of truth to point to" is the now-fixed `curriculum.md` (`## Authoring model` section) and `CLAUDE.md` (`## Purpose`, `## Directory layout`, `## Primary command` sections) — re-read these live inside the task, don't assume this plan's paraphrase of them stays accurate.

## Global Constraints

- Do not touch `site/` code or content files — docs-only.
- Do NOT rewrite, delete, or "modernize" any existing content in either historical document below the inserted banner — every existing line must survive byte-for-byte. This plan adds a banner; it does not edit history.
- Do NOT touch any other file's content beyond the two specific `## References` lines in `CLAUDE.md` that describe these two documents (currently lines 192–193, but locate by content match, not hardcoded line number, since line numbers shift).
- The banner must not just say "this is stale" — it must name the *specific* retired concepts (piece/chapter/topic tiers, `pillars.json`/`chapters.json`/`book/` collections) and point to the specific current-source-of-truth section(s) a reader should go to instead, mirroring the level of specificity the prior three plans used.
- Every fact in the banner (what replaced what, which file/section is now authoritative) must be re-verified against the live, already-fixed sibling docs in the same task — not assumed from this plan's own prose.

---

### Task 1: Add a supersession banner to both historical documents

**Files:**
- Modify: `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` — insert a banner immediately after the existing header block (after the `**Depth bar source:**` line and its trailing `---`, before `## 1. Goal`).
- Modify: `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` — insert a banner immediately after the file's own opening header (read the file's first ~10 lines to find the right insertion point — it may not have the exact same header shape as the spec file).
- Reference (read-only): `curriculum.md`'s `## Authoring model` section, `CLAUDE.md`'s `## Purpose` and `## Directory layout` sections, `.claude/commands/infographic.md`.

**Interfaces:**
- Consumes: nothing from another task in this plan.
- Produces: two banners whose factual claims Task 2's sweep will cross-check against the live sibling docs.

- [ ] **Step 1: Re-read the current, correct architecture description — don't paraphrase from memory of this session**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
sed -n '/## Authoring model/,/### Forbidden splitting/p' curriculum.md
sed -n '/^## Purpose/,/^## Directory layout/p' CLAUDE.md
sed -n '/^## Directory layout/,/^## Primary command/p' CLAUDE.md
```
Confirm the exact current facts to cite in the banner: track → unit → lesson model, `/infographic <track>/<unit>` command, output path `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`, data files `tracks.json`/`units.json`.

- [ ] **Step 2: Confirm the exact retirement commit and date for accuracy**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
git log --oneline -1 80f024601 2>&1
git show -s --format='%ad' --date=short 80f024601 2>&1
```
Use the real commit SHA and date in the banner rather than a vague "later migration" — this grounds the claim the same way the prior plans grounded every fact they wrote.

- [ ] **Step 3: Write the banner for the design spec**

Using `Edit`, insert this block immediately after the existing header (after the `---` that follows `**Depth bar source:**`, before `## 1. Goal`) in `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md`:

```markdown
> **⚠️ Superseded — historical design record, not current architecture.**
> This spec describes the original 16-pillar / chapter / piece three-tier
> content model (`pillars.json` + `chapters.json` + `site/src/content/book/`
> collections, `/infographic <pillar>/<NN-chapter>/<NN-piece>` command form).
> That model was retired starting with commit `<SHA from Step 2>`
> (`<date from Step 2>`, "chore(migration): retire book/pillars/chapters
> collections") in favor of the live track → unit → lesson model. This
> document is kept as a historical record of the original design decision —
> its body below is unmodified since 2026-05-12 and should not be read as
> describing the current site. For current architecture, see `curriculum.md`'s
> `## Authoring model` section and root `CLAUDE.md`'s `## Purpose` /
> `## Directory layout` sections.
```
Fill in the actual SHA/date from Step 2 (use the short SHA form, e.g. `80f024601`, consistent with how the prior plans cited it).

- [ ] **Step 4: Write the banner for the implementation plan**

Using `Edit`, insert an equivalent banner at the top of `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` (adapt the wording slightly since this is a plan, not a design spec — e.g. "This plan describes the original engineering work to build the now-retired..." — read the file's actual opening lines first to place the banner correctly relative to whatever header structure it has, and to match its voice).

- [ ] **Step 5: Verify the banners are accurate and the rest of both files is untouched**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
git diff --stat docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md
```
Confirm each file shows only insertions (no deletions) — the diff stat's deletion count must be 0 for both files, proving nothing existing was altered.

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md
git commit -m "docs: mark the original piece/chapter/pillar design spec + plan as superseded"
```

---

### Task 2: Update CLAUDE.md's References to these documents, and final sweep

**Files:**
- Modify: `CLAUDE.md` — the two `## References` lines describing these documents (currently: `` `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` — architecture spec. `` and `` `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` — implementation plan (P2 pattern). ``).
- Reference (read-only): Task 1's banners.

**Interfaces:**
- Consumes: Task 1's banner text (the References line should describe them consistently with what the banner now says).
- Produces: nothing new — this is the final gate for this plan.

- [ ] **Step 1: Locate the current References lines**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -n "2026-05-12-fullstack-curriculum-site" CLAUDE.md
```

- [ ] **Step 2: Reword both lines**

Using `Edit`, change the two lines so they no longer present these documents as plain current-architecture references. For example:
```
- `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` — original design spec (superseded — see its own banner; describes the retired piece/chapter/pillar model).
- `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` — original implementation plan (superseded — see its own banner; P2 pattern kept for historical reference only).
```
Adjust wording to fit the surrounding list's style; keep each to one line.

- [ ] **Step 3: Full sweep — confirm no other file points at these two docs without the same context**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -rn "2026-05-12-fullstack-curriculum-site" --include="*.md" . 2>/dev/null | grep -v "^./docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md\|^./docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md\|^./docs/superpowers/plans/2026-08-16-historical-spec-supersession-notice.md"
```
If any other file references these two docs (besides `CLAUDE.md`, already fixed in Step 2, and this plan's own file), read it and judge whether it also needs the same superseded context, or whether its own reference is already historically-scoped (e.g. another old plan doc referencing "the design spec" in its own historical context needs no change — only a *currently-read* reference document like `CLAUDE.md` matters here). Report any judgment call rather than silently editing further files beyond `CLAUDE.md`.

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
git diff --stat CLAUDE.md
```
Confirm only the two targeted lines changed (2 deletions, 2 insertions — or close to it if wording required a line-count change).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add CLAUDE.md
git commit -m "docs(claude-md): mark References to the original design spec/plan as superseded"
```

---

## Self-Review Notes

- **Spec coverage:** the goal names exactly two documents and one small follow-up edit (CLAUDE.md's References lines); Task 1 covers the two documents, Task 2 covers the References fix plus a sweep for any other unexpected reference. No gap.
- **Placeholder scan:** Task 1 Steps 1-2 require live re-derivation of the exact facts (current architecture description, retirement commit SHA/date) before Step 3-4 write them — consistent with the prior three plans' established pattern, and for the same reason: a banner with a vague or wrong fact would itself become a new instance of the defect this whole series exists to close.
- **Type/name consistency:** "track/unit/lesson" terminology and the exact retirement-commit citation style match how the prior three plans (all merged to `main`) already describe this exact migration.
