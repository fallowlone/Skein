---
description: Full-auto ByteByteGo infographic pipeline. Topic/Chapter/Piece tier auto-classified. Fullstack middle+/senior depth.
argument-hint: <fullstack topic> | <topic-slug>/<chapter-slug> | <topic-slug>/<chapter-slug>/<piece-slug>
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Task, mcp__claude_ai_Figma__*
---

# /infographic — fullstack infographic pipeline (full auto, 3 tiers)

Input: **$ARGUMENTS**

## Hard rules

1. **Domain locked to fullstack development.** Off-domain → refuse with 2-line message and stop.
2. **Strictly follow `style-guide.md`** for visuals.
3. **Strictly meet `curriculum.md` depth bar** — re-read Depth bar + Forbidden simplifications before drafting.
4. **Output local SVG + PNG only.** No Figma write tools.
5. **Stack assets-only.** No package.json / node_modules.
6. **Series cap: 12 pieces per chapter.** Hard limit. Hierarchy is how you go beyond.

## Step 1 — Parse input

If `$ARGUMENTS` matches:

- `<a>/<b>/<c>` (3 segments) → **piece** tier, slug-of-piece = `<c>`, parent chapter = `<a>/<b>`. Skip classification.
- `<a>/<b>` (2 segments) → **chapter** tier, chapter-slug = `<b>`, parent topic = `<a>`. Skip classification.
- single segment / free-form text → **classify** (Step 2).

Slugify any free-form text → kebab-case ASCII ≤40 chars.

## Step 2 — Classify (only for single-segment input)

Map the input onto `curriculum.md` pillars using its **Classification heuristic**:

- 1 sub-area of 1 pillar, single mechanism → **piece**
- 1 pillar whole, OR feature with 3+ mechanisms → **chapter**
- 2+ pillars OR role-shaped ("become X", "production X") → **topic**

Then dispatch to the matching tier branch below.

---

## Tier A — Piece (1 infographic)

Folder: `infographics/<slug>/` (no parent unless inferred from path-shaped input).

1. **Research** — WebSearch 3–5 queries, calibrated for middle+/senior: mechanism, concrete numbers, one tradeoff, one failure mode, one non-obvious detail. Authoritative sources only.
2. **Spec** — `<dir>/spec.md`:

   ```markdown
   # <Title>
   - **Tier**: piece
   - **Audience**: middle+/senior fullstack engineer
   - **One-liner**: <single sentence>
   - **Composition pattern**: step-by-step | system-diagram | before-after | trade-off-matrix
   - **Canvas**: 1600x900 (or 1920x1080 if >7 steps)
   - **Depth checkpoints**:
     - [ ] Mechanism: ...
     - [ ] Tradeoff: ...
     - [ ] Failure mode: ...
     - [ ] Concrete numbers: ...
   - **Key points**: 1. ... 2. ...
   - **Sources**: https://...
   - **Misconception addressed**: ...
   ```

3. **Data** — `<dir>/data.json` with `title`, `steps[]|components[]`, `numbers[]`, `tradeoffs[]`, `failure_modes[]`, `sources[]`.
4. **Layout plan** inline: pattern, 8-pt grid coords, ≤4 hues, 3–8 inline Lucide-style icons. Sanity-check against style-guide.md + curriculum.md.
5. **SVG** — `<dir>/infographic.svg` starting from `templates/svg-skeleton.svg`. Pure SVG, inline icons, group with `<g class id>`. If part of a chapter, embed `Part NN / total` in upper-right.
6. **PNG** — `bash scripts/svg-to-png.sh <dir>/infographic.svg`.

**Final report** (5 lines): topic, slug, files written, export path, pattern.

---

## Tier B — Chapter (series, 3–12 pieces)

Folder: `infographics/<chapter-slug>/` (or `infographics/<topic-slug>/<NN-chapter-slug>/` if from topic).

1. **Decompose** — plan 3–12 sub-topics. Order = learning path. Final = "putting it together" system-diagram. If decomposition > 12, merge until ≤12.
2. **INDEX.md**:

   ```markdown
   # <Chapter Title>
   **Tier**: chapter
   **Audience**: middle+/senior fullstack engineer
   **Pillars touched**: <pillars>

   ## Sequence
   | # | Slug | Title | Pattern | Why it's here |
   |---|------|-------|---------|---------------|
   | 01 | <slug> | ... | step-by-step | ... |
   | ... | | | | |
   | NN | putting-it-together | ... | system-diagram | Ties pieces. |

   ## Sources
   - https://...
   ```

3. **Per-piece loop** — for each row in INDEX.md, execute Tier A steps 1–6 in `<chapter-dir>/<NN-piece-slug>/`. Vary composition patterns across pieces (no two consecutive pieces with the same pattern). Each piece must stand alone — a reader can open piece 07 without seeing 01–06.
4. **Final report**: chapter title, root path, INDEX path, parts count, exports dir, pillars.

---

## Tier C — Topic (mega, hierarchical)

Folder: `infographics/<topic-slug>/`.

1. **Decompose into chapters** — unbounded count (the hierarchy is the cap, not the chapter list length). Order = learning path. Final chapter = master synthesis ("putting it together" tying every prior chapter). Each chapter must be runnable independently as a Tier B run later.

2. **MAP.md**:

   ```markdown
   # <Topic Title>
   **Tier**: topic
   **Audience**: middle+/senior fullstack engineer
   **Pillars covered**: <pillars>

   ## Chapters
   | # | Slug | Title | Pillar | Why it's here |
   |---|------|-------|--------|---------------|
   | 01 | <chapter-slug> | ... | <pillar> | ... |
   | 02 | ... | | | |
   | ... | | | | |
   | NN | putting-it-together | ... | synthesis | Ties topic. |

   ## How to continue
   The first chapter has been rendered. To render the rest, run each on its own:
   ```
   /infographic <topic-slug>/02-<chapter-slug>
   ...
   /infographic <topic-slug>/NN-<chapter-slug>
   ```

3. **Auto-run chapter 01** — execute Tier B on the first chapter so the user gets immediate value (full series under `<topic-slug>/01-<chapter-slug>/`).

4. **Final report**:
   ```
   Topic:       <title>
   Root:        infographics/<topic-slug>/
   Map:         infographics/<topic-slug>/MAP.md
   Rendered:    01-<chapter-slug> (NN pieces)
   To continue: /infographic <topic-slug>/02-...  ... (NN-1 commands)
   Pillars:     <list>
   ```

   Do NOT continue rendering further chapters automatically. The user runs each chapter explicitly.

---

## Universal failure modes

- Promoting a piece to a chapter for show (or compressing a topic into a chapter).
- Skipping `style-guide.md` / `curriculum.md` re-reads.
- Same composition pattern for every piece in a chapter.
- Sub-topics that restate junior-level material — push deeper or merge.
- Pieces that only make sense after reading the previous one.
- Fabricated numbers — every stat in `data.json` traces to a `sources[]` URL.
- Auto-running Tier C chapters 02+ without explicit command (only chapter 01 auto-runs).
- More than 12 pieces in any single chapter.
