---
description: Fullstack curriculum site piece authoring. Queries/researches/authors bilingual EN+RU pieces. Strict to site/ pipeline.
argument-hint: <pillar>/<NN-chapter>/<NN-piece> | <pillar>/<NN-chapter> (chapter mode not yet implemented)
allowed-tools: Bash, Read, Write, Edit, WebSearch, WebFetch, mcp__plugin_context7_context7__resolve-library-id, mcp__plugin_context7_context7__query-docs
---

# /infographic — fullstack curriculum site piece authoring

**Input:** `$ARGUMENTS`

**Purpose:** Author a single piece (stub → draft → ready) for the site's bilingual curriculum. Pieces live under `site/src/content/book/{en,ru}/<pillar>/<NN-piece>/index.mdx`. Every piece is bilingual or the command refuses.

**Hard rules:**

1. **Domain locked to fullstack development.** Off-domain input → refuse with 2-line message, stop immediately.
2. **Read `curriculum.md` depth bar + forbidden simplifications before drafting.** Middle+/senior engineer only.
3. **Bilingual EN+RU or refuse.** No partial-language pieces.
4. **Site-only output.** Write to `site/src/content/book/{en,ru}/<pillar>/<NN-piece>/index.mdx`. Never edit `site/dist/` or legacy `infographics/` tree.
5. **Per-piece import path depth: exactly 5 `..` segments** (verified against `site/src/content/book/en/networking/03-tcp-handshake/index.mdx` template).
6. **Text budgets enforced** (linter + manual): Crux ≤140, KeyTakeaway ≤220, Misconception ≤320, Card annot ≤240.
7. **Hydration cap = 5 islands per page** (linter-enforced). Typical budget: TierAccordion + FadedExample + RetrievalDrawer + 2 baseline.
8. **Status flow:** stub → draft (optional) → ready. Only `ready` renders real content to users.
9. **Commit only when status = ready.** Format: `git commit -m "content(<pillar>): <NN-piece> EN+RU ready"`.

---

## Input parsing

If `$ARGUMENTS` matches:

- `<pillar>/<NN>-<chapter>/<NN>-<piece>` (3 path segments) → **piece mode**, extract pillar/chapter/piece slugs, skip classification.
- `<pillar>/<NN>-<chapter>` (2 path segments) → **chapter mode** (NOT YET IMPLEMENTED; ask user to split into per-piece invocations).
- Anything else → **refuse** with message: "Piece form: `/infographic <pillar>/<NN-chapter>/<NN-piece>`. Pillar must exist in `site/src/content/pillars/*.json`."

Validate:
- Pillar exists in `site/src/content/pillars/*.json`.
- Chapter exists in `site/src/content/chapters/<pillar>/<NN>-*.json` (if multiple chapters per pillar, verify).
- Piece stub exists at `site/src/content/book/en/<pillar>/<NN-piece>/index.mdx` (EN must exist; RU is created if absent).

If validation fails, report the missing path and stop.

---

## Pipeline (per piece)

### Step 1 — Verify piece stub exists

```bash
# Check EN stub
test -f "site/src/content/book/en/<pillar>/<NN-piece>/index.mdx" || {
  echo "ERROR: EN stub not found at site/src/content/book/en/<pillar>/<NN-piece>/index.mdx"
  exit 1
}
```

The stub file must have:
- Frontmatter: `slug`, `lang: en`, `pillar`, `chapter`, `order`, `title`, `summary`, `readingMin`, `status: stub` (or `draft` or `ready`).
- No body yet (or stub prose like "Coming soon").

### Step 2 — Research (WebSearch + Context7)

Execute **≥3 queries** targeting middle+/senior depth:

- Query 1 → mechanism details (e.g., "TCP three-way handshake RFC packet flow").
- Query 2 → one tradeoff or failure mode (e.g., "TCP SYN flood attack mitigation").
- Query 3 → concrete numbers / benchmarks (e.g., "TCP RTT latency typical values").

Log sources into a scratch note. Use `context7:resolve-library-id` + `context7:query-docs` for APIs/frameworks (e.g., fetching React reconciler details from React docs).

**Depth checkpoint:** Can you explain mechanism + one tradeoff + one failure mode + one number without guessing? If not, research more.

### Step 3 — Author EN MDX body

Update the stub's frontmatter:
- `status: draft` (not yet ready, still authoring).
- `depth.mechanism`, `depth.tradeoff`, `depth.failure_mode`, `depth.numbers` → set to element IDs you will create in the body (e.g., `section-three-way`, `card-rtt`, `mc-syn-flood`, `card-tcp-numbers`).
- Verify all four depth fields are populated (linter will catch missing ones).

Write the body following the P2 template structure:

```mdx
<Crux>
Opening question (≤140 chars) that hooks the reader.
</Crux>

## Context / Setup
Prose explaining why this piece matters.

## The Mechanism
<span id="section-three-way">
Details of what actually happens (packets, data structures, syscalls).
Include diagrams if needed (embedded SVG or reference asset).
</span>

## Deeper View: [Optional subsection]
(If needed for senior depth)

## The Tradeoff
<span id="card-rtt">
Every choice has a cost. State the tradeoff clearly.
</span>

## What Can Break
<span id="mc-syn-flood">
Failure mode: what goes wrong first, what the symptom looks like, how to detect.
(Max 320 chars if it's a Misconception component; otherwise prose is fine.)
</span>

## Numbers
<NumbersCard id="card-tcp-numbers">
  - Label: Value
  - RTT (typical): 50ms–200ms
  - Max connections (per socket): 65k
</NumbersCard>

## Key Takeaway
<KeyTakeaway>
(≤220 chars) Wrap up the learning in one sentence.
</KeyTakeaway>

## Retrieval Practice
<RetrievalDrawer>
2–3 open-ended questions. Learner types their answer, then clicks "Reveal" to see the model answer.
</RetrievalDrawer>

## Spiral & Threads
<SpiralCue thread="statefulness">
How does this connect to [thread name]? Link to the thread page or another piece in the spiral.
</SpiralCue>

## Cross-links
- **Prereqs:** List any pieces that should be read first (link format: `[slug](../<slug>)`).
- **Next:** Link to the next piece in the chapter.
```

**Import rules:**
- All components live under `../../../../../components/` (5 `..` segments from the piece's `index.mdx`).
- Example: `import TierAccordion from "../../../../../components/pedagogy/TierAccordion.tsx";`
- Verify every import path has exactly 5 `..`.

**Hydration budget:**
- TierAccordion (1 island) — tier selector if the piece has per-tier content.
- FadedExample (1 island) — optional worked example.
- RetrievalDrawer (1 island) — required for retrieval practice.
- Baseline islands: SpacedRevisitBanner (sticky) + ChapterSidebarTOC (sticky) = 2 islands.
- **Total ≤ 5.** If your piece needs more, split it or defer some widgets.

**Text budgets (enforced):**
- `<Crux>` ≤ 140 chars.
- `<KeyTakeaway>` ≤ 220 chars.
- `<Misconception>` body ≤ 320 chars.
- Card annotations ≤ 240 chars each.

### Step 4 — Translate to RU

Create `site/src/content/book/ru/<pillar>/<NN-piece>/index.mdx` with identical frontmatter but `lang: ru`.

Translate the body using `site/src/i18n/glossary.json` as the canonical translation source. For new technical terms not yet in the glossary:
1. Add them in **alphabetical order** (by English term).
2. Include both EN and RU versions.
3. Example: `"TCP handshake": { "en": "TCP handshake", "ru": "трёхсторонний хендшейк TCP" }`.

**RU rules:**
- Latin acronyms (TCP, RTT, RFC, SYN) stay Latin.
- Prose flow must match EN, but RU idioms ≥ EN idioms (don't force word-for-word).
- No auto-translate tools (Google Translate, etc.); manual + glossary only.
- If you cannot translate with confidence, report DONE_WITH_CONCERNS and leave the RU file unmerged.

### Step 5 — Update frontmatter status

Set both EN and RU frontmatter to `status: ready`.

### Step 6 — Verify build passes

```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build
```

Check:
- Build completes without error.
- `site/dist/lint-report.json` has no errors for this piece (new depth ids should be present, import paths valid, text budgets met).
- No `WARN` for missing translations.

If linter errors, fix and re-run.

### Step 7 — Visual verification

Open both locales in a browser (or `dist/` output):
- `site/dist/en/<pillar>/<NN-piece>/index.html`
- `site/dist/ru/<pillar>/<NN-piece>/index.html`

Verify:
- Layout renders without layout shift.
- Hydration islands load (TierAccordion, RetrievalDrawer, etc. are interactive).
- Depth IDs are linkable (right-click → copy link → paste and it points to `#section-three-way` etc.).
- Images load (if any).
- RU text is readable (no mojibake, correct line breaks).

### Step 8 — Tier sizing + exercise mix

The piece MUST contain (within the TierAccordion block):

| Tier | Slot | Word budget | Required components |
|---|---|---|---|
| Junior | `<Fragment slot="junior">` | 200-500 | ≥1 PersonaTag dialog, ≥1 metaphor sentence |
| Middle | `<Fragment slot="middle">` | 2500-3500 | Mechanism + tradeoff + numbers + failure mode |
| Senior | `<Fragment slot="senior">` | 2500-4000 | ≥3 RFC refs, kernel/tunable references, edge cases |

Per-tier exercise count target (linter emits warnings):

- Junior: 5 exercises (Quiz × 2, DragOrder × 1, MetaphorComplete × 1, retrieval Q × 1)
- Middle: 8 (Quiz × 2, TraceScenario × 2, DragOrder × 1, FadedExample × 1, retrieval Q × 2)
- Senior: 7 (TraceScenario × 1, DebugLog × 1, TradeoffMatrix × 1, RFCQuiz × 1, DesignPrompt × 1, retrieval Q × 2)

If a needed exercise component does not yet exist in `site/src/components/pedagogy/`, mark with TODO comment in MDX and proceed; do not block.

### Step 9 — Verify

Run `/verify-piece <pillar>/<NN-piece>`. Address all `✗` findings. `⚠` findings: judge fix-or-accept case by case.

### Step 10 — Commit

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/content/book/en/<pillar>/<NN-piece>/ site/src/content/book/ru/<pillar>/<NN-piece>/ site/src/i18n/glossary.json
git commit -m "content(<pillar>): <NN-piece> EN+RU ready"
git log -1 --oneline  # Report the commit SHA
```

---

## Final report (mandatory format)

```
Status:         DONE / DONE_WITH_CONCERNS / BLOCKED
Piece:          <pillar>/<NN-piece>
Slug:           <NN-piece-slug>
Files:          site/src/content/book/{en,ru}/<pillar>/<NN-piece>/index.mdx
Glossary:       + N new terms
Build:          [last 3 lines of build output]
Lint report:    [link to dist/lint-report.json or "clean"]
Commit:         <SHA> [one-line message]
Concerns:       [none / list]
```

Example:
```
Status:         DONE
Piece:          networking/03-tcp-handshake
Slug:           03-tcp-handshake
Files:          site/src/content/book/{en,ru}/networking/03-tcp-handshake/index.mdx
Glossary:       + 2 new terms (TCP window, congestion window)
Build:          [successful, 301 pages]
Lint report:    clean
Commit:         abc1234 content(networking): 03-tcp-handshake EN+RU ready
Concerns:       none
```

---

## Failure modes

- **Validating the wrong stub.** Always check `site/src/content/book/en/<pillar>/<NN-piece>/index.mdx` exists before starting.
- **Import path depth mismatch.** Count your `..` segments. Should be exactly 5.
- **Incomplete depth checkpoints.** If any of `mechanism`, `tradeoff`, `failure_mode`, `numbers` is missing from frontmatter, the piece fails linting and cannot merge.
- **Text budget overruns.** Crux > 140, KeyTakeaway > 220, Misconception > 320 → linter fails.
- **Partial translation.** If RU is absent or incomplete, status cannot be `ready`. Report DONE_WITH_CONCERNS.
- **Building stale site/dist.** Always run `bun run build` after edits. The linter runs at build time.
- **Forgetting glossary.json.** New RU terms must be added and committed together with the piece.
- **Off-domain topic.** If the topic is not fullstack engineering, refuse immediately.
