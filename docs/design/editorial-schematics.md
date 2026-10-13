# Skein Editorial Schematic Language

For the current `js-engine` course redesign, also use the [user-provided visual reference and its application notes](./js-engine-visual-reference.md).

Official reference for designing technical visual explanations in Skein lessons.

Status: **reference implementation** — the TCP three-way-handshake pilot
(`networking/03-tcp-handshake/01-the-three-way-handshake`).
The implementation is the source of truth. Where the original design
specification and the pilot differ, this document describes the pilot.

Audience: a developer or designer building a new lesson visualization.

---

## 1. What the system is

The **Skein Editorial Schematic Language** explains software engineering
concepts through a coherent visual grammar that combines:

- editorial technical illustration
- information design
- schematic geometry
- software-system notation
- print-inspired composition
- progressive explanation
- restrained interaction

Skein diagrams feel like a modern illustrated engineering manual.

They do NOT feel like:

- Mermaid output
- UML tooling
- SaaS dashboards
- presentation slides
- generic infographics
- random SVG illustrations
- decorative AI-generated imagery

Primary rule:

> A visualization must explain something that prose explains less effectively.

If the concept reads better as prose, a list, or a code block — do not draw it.

---

## 2. Why it exists

Prose is good at narrative, definitions, and reasoning. It is bad at:

- showing two actors' **simultaneous but different** knowledge (who knows what, when)
- showing **causality** (this message caused that state change)
- showing **cost** that accumulates over time (latency timelines)
- showing **structure** (what lives where: network core vs endpoint memory)
- showing **why-not** (the comparison that makes the correct design obvious)

The TCP pilot exists because none of those five things read well as paragraphs.
Each figure answers one question prose answers poorly (see section 24).

---

## 3. When to use it — and when not to

Use a schematic when:

- the learner must hold **two or more states side by side** (client vs server, before vs after, 2-step vs 3-step);
- the learner must see **change over time** (a stepper, a timeline);
- the learner must see **where state lives** (architecture, TCB, buffers);
- intuition needs a bridge to wire reality (metaphor → contract → segment).

Do NOT visualize:

- a definition (write it);
- a sequence with no branching state (a list is clearer);
- something just to "add visual interest" (decoration is a failure mode);
- a concept that needs three sentences (a figure costs more attention than it returns).

---

## 4. Visualization hierarchy — three tiers

Validated by the pilot. Tier determines ceremony: numbering, header weight,
breakout width, caption length.

### Tier A — Major Reference Figure

Use for: major conceptual models, important system behavior, centerpiece
explanations, interactive causal models.

May include: figure number, category tag, editorial serif title, conceptual
thesis, technical clarification, breakout layout.

Example: `InteractiveHandshakeFig` (FIG. 03 in the pilot).

Rule: **major figures must be rare.** A lesson should not contain several
competing hero figures. The pilot has exactly one Tier A interactive figure.

### Tier B — Supporting Technical Schematic

Use for: comparisons, supporting architecture, focused technical explanations,
secondary state relationships.

Characteristics: lighter metadata (compact mono `techTag` instead of a full
figure plate), usually learning-width, concise caption, strongly integrated
with surrounding prose.

Examples: `TwoVsThreeFig`, `StatefulEndpointFig`.

Note from the pilot: FIG. 01 `HandshakeLatencyFig` was refined toward a
learning-width supporting figure during implementation — its job is
a latency timeline plus illustrative RTT scenarios, not a hero moment.

### Tier C — Integrated Micro-Schematic

Use for: mappings, tiny state transitions, intuition → implementation bridges,
compact comparisons, inline protocol relationships.

Characteristics: **no formal FIG plate required**, embedded directly in article
flow, typography and whitespace define structure, minimal framing.

Example: `MetaphorMappingFig` — an integrated editorial table in the pilot.
Column hairline rules, not cards.

Core rule:

> **Not every visualization is a Figure.**

Numbering is ceremony. Ceremony must be proportional to importance (see section 25, Q18–19).

Component mapping (all in `site/src/components/schematic/`):

| Tier | Component | Plate |
| --- | --- | --- |
| A | `SkeinFigure` (+ interactive body) | Full: `FIG. NN / CATEGORY`, serif title, hairline rule, thesis + caption |
| B | compact `techTag` + thesis + caption, or `SkeinFigure` with `span="learning"` | Light: mono tag, no full plate |
| C | plain `<figure data-lesson-visual>` + thesis + caption | None: table/grid, hairline dividers |

---

## 5. Visual budget

Wide visual breakouts are intentionally rare. The pilot's validated rhythm:

```text
reading → supporting schematic → reading → major visual → reading → supporting schematic → reading
```

The pilot's actual span sequence: FIG. 01 `learning` → metaphor table
`learning` → FIG. 03 `canvas` → `TwoVsThree` `learning` → `StatefulEndpoint`
`learning`. **Exactly one `canvas` breakout per lesson** (FIG. 03).

Rules:

- The `canvas` tier must feel exceptional.
- Do not use canvas width because a component supports it.
- The explanatory need determines width — complex sequence diagrams, endpoint
  inspectors, interactive causal models earn canvas; timelines and comparisons
  usually do not.

## 6. Width system

Three tiers. Implementation: `SkeinFigure` `span` prop → `data-span` attribute
→ breakout widths in `site/src/layouts/Lesson.astro`
(`.lesson-content :global([data-span="learning"|"canvas"])`).
`SkeinFigure.astro` declares `max-width: 680 / 860 / 1140px` for
reading / learning / canvas.

| Tier | Width | Use for |
| --- | --- | --- |
| `reading` | ~640–700px | prose, headings, lists, short code, conceptual explanations |
| `learning` | ~760–860px | supporting diagrams, quizzes, comparisons, exercises, mappings |
| `canvas` | ~1000–1140px | only when spatial relationships genuinely require it: complex sequence diagrams, endpoint inspectors, interactive causal models, architecture visualizations |

Behavior: on smaller viewports all tiers collapse into available width
(`width: 100%`, `overflow-x: auto` on figure bodies). **Never shrink labels
until unreadable** — scroll or stack instead. SVG bodies use
`preserveAspectRatio="xMidYMid meet"` so diagrams scale down intact.

Pilot spans: FIG. 01 `learning`, metaphor `learning`, FIG. 03 `canvas`,
`TwoVsThree` `learning`, `StatefulEndpoint` `learning`.

---

## 7. Typography — semantic roles

Three voices. Each has a job; never substitute one for another.

Tokens (`site/src/styles/tokens.css`):

- `--font-display`: Fraunces Variable / Source Serif Pro / Georgia — serif
- `--font-body`: Inter Tight Variable / Inter — sans
- `--font-mono`: JetBrains Mono Variable / SF Mono / Menlo — mono

### Serif / display

Use for: lesson titles, major figure titles (`.sk-figure-title`,
`clamp(20px, 2.4vw, 26px)`), conceptual thesis (`.sk-cap-thesis`, italic
14.5px), important editorial statements.

Do NOT: use serif for decoration; set long technical paragraphs in italic
serif; write whole captions in display serif.

### Sans-serif

Use for: explanatory copy, annotations, actor names (`CLIENT` / `SERVER`,
sans 700, tracked wide), UI, captions (`.sk-cap-text`, 12.5px body),
controls, subtitles.

### Monospace

Use for: protocol fields, state values, sequence numbers, memory addresses,
identifiers, timestamps, machine state, commands, code.

> Machine information must be recognizable **before** it is read: if it came
off the wire or out of kernel memory, it is mono.

SVG text follows the same contract: timeline labels and `seq=`/`ack=` fields
are `var(--font-mono)`; actor names are sans; nothing in a diagram body is serif.

Text-on-arrow rule (learned from FIG. 01 refinement): diagonal message arrows
must not touch their labels. Offset labels ≥ ~12px off the stroke AND give
mono diagram labels a paper halo —
`paint-order: stroke; stroke: var(--paper); stroke-width: 3px` — so the line
passes behind glyphs, never through them.

---

## 8. Caption contract

Validated pattern for important figures. Two parts, two voices:

1. **CONCEPTUAL THESIS** — exactly one concise editorial sentence, serif
   italic (`.sk-cap-thesis` / `thesis` prop).
2. **TECHNICAL CLARIFICATION** — a precise mechanical explanation in body
   typography when needed (`.sk-cap-text` / `caption` prop).

Implementation: `SkeinFigure` accepts `thesis?` + `caption?` and renders
`FIG. NN` (mono) + thesis (serif italic) + clarification (sans). Tier C
components replicate the same pair with local classes
(`.sk-metaphor-thesis` + `.sk-metaphor-caption-text`, and equivalents in Tier B).

Rules:

- Do not write entire caption paragraphs in display serif.
- Do not duplicate body text — a caption adds **interpretation**.
- Keep the thesis to one sentence.

Pilot examples:

- FIG. 01 — thesis: *"The handshake is paid in full before the first useful
  byte moves."* Clarification: the third packet may already carry payload, so
  useful data starts at +1.0 RTT.
- FIG. 03 — thesis: *"The two ends do not become ready at the same moment."*
  Clarification: at step 2 the client is ESTABLISHED while the server is still
  SYN-RECEIVED; step 3 exists to close that gap.

---

## 9. Semantic color

Document roles, never decorative palettes. Tokens:
`--ok` / `--warn` / `--danger` (oklch), `--ink` (default), `--muted` (context),
`--accent` / `--d-*` per-domain hue (TCP uses `var(--d-network)`).

| Role | Meaning |
| --- | --- |
| GREEN (`--ok`) | established · valid · successful · verified |
| RED (`--danger`) | invalid · rejected · failed · destructive |
| AMBER (`--warn`) | transition · pending · warning · uncertain |
| BLUE / accent (`--d`, `--accent`) | selected · informational interaction |
| NEUTRAL INK (`--ink`) | default system state |
| MUTED (`--muted`) | context · inactive · prior state |

Pilot mapping: `ESTABLISHED` → ok, `SYN-SENT` / `SYN-RECEIVED` → warn,
`CLOSED` / `LISTEN` → neutral, final-ACK arrow and payload zone → ok,
2-step hypothetical column → warn, 3-step column → ok.

Iron rules:

- **Color is never the only signal.** Always pair with text, shape, stroke,
  symbol, state label, or another non-color cue.
- Most schematics use neutral ink plus **one** semantic accent.
- `StateBadge` encodes the mapping mechanically (`getTone`: ESTABLISHED→ok,
  SYN/WAIT/CLOSING→warn, RST/DROP/TIMEOUT→danger, else neutral) — reuse it
  instead of inventing new state colors.

---

## 10. Stroke vocabulary

Strokes carry meaning. Keep it consistent across lessons:

| Stroke | Meaning | Pilot use |
| --- | --- | --- |
| Medium solid (1.5px ink) | PRIMARY FLOW — real segments on the wire | SYN / SYN-ACK arrows |
| Heavier solid (1.8px, semantic color) | EMPHASIS — the packet that completes the work | final ACK arrow in `--ok` |
| Dashed | HYPOTHETICAL / FUTURE — did not / has not happened | lifelines, the 2-step hypothetical column, unconfirmed marker |
| Low-contrast | INACTIVE — prior state, context | dimmed step-0 rows, `--muted` text |
| Hairline (0.5px) | BOUNDARY — structure, not meaning | column dividers, caption rules, card borders |
| Wash + outline + dotted underline | MUTATED / ACTIVE — changed by this event | FIG. 03 mutation cells (see section 15) |

Stroke meaning must remain consistent between lessons. Do not restyle the same
relationship differently next unit.

---

## 11. Geometry vocabulary

Reusable shapes with fixed meaning:

- filled dot — active node / endpoint / current step (carousel dots, `StateBadge` dot)
- hollow ring — inactive or available (unselected dots)
- rectangle — process / component (endpoint panels, buffer tracks)
- larger boundary — system / subsystem (TCB block, network-core column)
- solid arrow — movement / execution / dependency / message (SVG `<marker>` arrowheads, one ink + one `--ok` variant)
- dashed arrow / dashed box — hypothetical or deferred path (2-step column, delayed-duplicate note)
- pill / chip — small machine state or protocol flag (`MachineValue` pill, `SYN`/`ACK` flag chips, buffer fills)

Do not turn every entity into a rounded rectangle. Geometry communicates
meaning — if two things look the same, the learner assumes they *are* the same.

Background signature: the faint 28px cartographic grid
(`linear-gradient(var(--hairline)…)` over `var(--paper)`) marks a drawing
canvas. It is atmosphere, never information: keep contrast near-invisible and
never place meaning in the grid.

## 12. Information vs container rule

One of the most important pilot lessons:

- INFORMATION → typography + whitespace by default
- INTERACTION → container when useful
- DIAGRAM → visual canvas (grid surface)
- MACHINE STATE → structured schematic notation (`MachineValue`, `StateBadge`)
- CODE → code surface

Do not use cards to create separation. Avoid **card inside card inside
bordered canvas**. Prefer whitespace, hairlines, alignment, grids, typography,
spatial grouping.

Pilot evidence:

- FIG. 01 scenarios column: flattened from nested cards to a hairline-ruled
  list (title row + rows + 3px bar tracks).
- Metaphor table: column hairline dividers replaced card borders; integrated
  into article flow instead of a FIG plate.
- Tier B figures: compact `techTag` line instead of full editorial plate.

---

## 13. Progressive explanation

Standard narrative arc:

```text
QUESTION → MODEL → CHANGE → CONSEQUENCE → INSIGHT
```

Complexity must be earned: simple system → first state → mutation →
additional state → complete model. Never show the final complex diagram first.

Pilot: FIG. 03 steps 0→3 (quiescent → SYN → SYN-ACK → ACK/ESTABLISHED), each
step showing only what is known *so far*; the full picture exists only at the
end. The lesson's figure order does the same at lesson scale (cost → intuition
→ mechanism → why-not-2 → where-state-lives).

---

## 14. Causal interaction pattern

For stateful system behavior, validated by FIG. 03:

```text
MESSAGE → STATE → DELTA
```

Explicitly: WHAT HAPPENED → WHAT CHANGED → WHAT EACH ACTOR NOW KNOWS →
WHAT STATE THE SYSTEM ENTERED.

Every FIG. 03 panel exposes: MESSAGE (packet on the wire) · WHAT CHANGED
(causal delta) · CLIENT / SERVER local knowledge (ISN anchors) ·
CONNECTION STATE (`CLOSED / LISTEN / SYN-SENT / SYN-RECEIVED / ESTABLISHED`).

Reuse this pattern for: networking, event loops, distributed systems,
databases, transactions, concurrency, memory, queues, state machines.

Rule: interaction must explain causality. Do not animate systems for spectacle.

---

## 15. Mutation language

When a value changes between steps, the learner must identify the change
immediately. FIG. 03's validated treatment:

- subtle background wash + outline on the changed cell;
- dotted underline on the changed value;
- weight change;
- textual delta ("WHAT CHANGED" line);
- screen-reader announcement (`aria-label` includes the change; sr-only
  *"changed by this segment"* marker);
- `data-mutated` attribute on changed cells for styling/testing hooks.

Pilot subtlety worth copying: the step-3 ACK consumes a sequence number, so a
naive design would animate the ISN counters. The pilot instead treats ISNs as
**stable anchors** (x=42,000,000 / y=99,000,000) and mutates only
`serverState` → ESTABLISHED — the honest delta. Show the real change, not
motion for its own sake.

Do not flash aggressively. Respect `prefers-reduced-motion` (transitions off,
state still fully readable — the repo lints for this:
`site/src/lint/rules/reduced-motion.ts`).

Mutation emphasis answers one question: *"What changed because this event
occurred?"*

---

## 16. Intuition → abstraction → implementation

Validated by `MetaphorMappingFig`. Many Skein explanations should transition:

```text
INTUITION → ABSTRACTION → IMPLEMENTATION
```

Pilot: *"Can you hear me?"* → conceptual acknowledgement contract → `SYN /
ACK` fields with exact sequence math (`42,000,000` → `42,000,001`).

Rules:

- Do not leave metaphors disconnected from the real mechanism.
- The learner must see where the metaphor **stops being exact**.
- Each SYN consumes exactly one sequence number — the table shows why `ack =
  peer + 1`, grounding the intuition in arithmetic, not vibes.

---

## 17. Machine-state presentation

When state matters, show it structured — never buried in paragraphs.
FIG. 03 endpoint panels:

```text
CLIENT — state: SYN-SENT · my_seq: 42,000,000 · peer_seq: unknown
```

Use `MachineValue` (`name=` + value, mono, tabular numerals) and `StateBadge`
where appropriate. Prefer structured state inspection over embedding state in
prose.

## 18. Reusable primitives

Only components that survived the pilot. All in
`site/src/components/schematic/` unless noted. Skein is not building a
replacement for SVG, Mermaid, or D3 — these encode recurring Skein semantics.

### SkeinFigure

- PURPOSE: canonical editorial figure container; emits semantic
  `<figure data-lesson-visual data-span>` satisfying the lesson visual lint contract.
- WHEN TO USE: Tier A figures (and Tier B when a plate is warranted).
- WHEN NOT TO USE: Tier C integrated schematics — a plain
  `<figure data-lesson-visual>` with thesis + caption is enough.
- SEMANTIC ROLE: editorial plate — `FIG. NN / CATEGORY` mono meta, serif title,
  hairline rule, canvas/grid body, thesis + clarification caption.
- A11Y: `aria-label` (real explanation, not the title) on the figure;
  `role="img"` + `aria-label` on the body slot. Props: `num, title, category,
  label*, thesis?, caption?, span?, hue?, variant?` (`span` defaults to `canvas`
  — pass `learning` explicitly for supporting figures).

### MachineValue

- PURPOSE: mono machine values — protocol fields, counters, addresses.
- WHEN TO USE: any wire/kernel value (`seq`, `ack`, ports, ISNs).
- WHEN NOT TO USE: prose, labels, titles.
- SEMANTIC ROLE: "this came off the wire" — `name=` key in muted + value,
  tabular numerals, `chip | pill | plain` variants, semantic tones.
- A11Y: `<code>` element; keep values locale-formatted (see section 21).

### StateBadge

- PURPOSE: protocol connection state with fixed semantic tones.
- WHEN TO USE: any named state (`ESTABLISHED`, `SYN-SENT`, …).
- WHEN NOT TO USE: freeform labels, non-state metadata.
- SEMANTIC ROLE: the state-color authority — `getTone()` maps names to
  ok/warn/neutral/danger. Do not hand-color states elsewhere.
- A11Y: text label always present (dot is `aria-hidden`); color never the only cue.

### TechnicalLabel

- PURPOSE: sans tracked labels for actors, headers, protocol roles.
- WHEN TO USE: `CLIENT`/`SERVER`, column headers, kicker lines.
- WHEN NOT TO USE: machine values (mono), editorial statements (serif).
- SEMANTIC ROLE: the "human/scaffolding" voice of diagrams.
- A11Y: real text, uppercase via CSS (screen readers get the source case).

### FigureCaption

- PURPOSE: standalone editorial caption (mono `FIG. NN` + serif-italic body;
  `<strong>`/`<code>` inside reset to sans/mono).
- WHEN TO USE: figures that need a caption but not the full `SkeinFigure` plate.
- WHEN NOT TO USE: inside `SkeinFigure` (use `thesis`/`caption` props instead).
- A11Y: `<figcaption>` semantics.

### VisualCanvas (`site/src/components/lesson/VisualCanvas.astro`)

- PURPOSE: pre-existing wide canvas wrapper (grid surface, mono kicker, caption).
- WHEN TO USE: legacy/general wide diagrams outside the schematic system.
- WHEN NOT TO USE: new Tier A/B figures — prefer `SkeinFigure`, which carries
  the numbering/thesis/caption contract. Do not nest one canvas inside another.
- NOTE: predates the schematic language; documented here so authors pick the
  right wrapper.

---

## 19. Progressive enhancement

Architectural rule: **static understanding comes first.** A schematic must
remain meaningful with zero client-side JavaScript.

Enhancement may add: stepping, reveal, prediction, state mutation, reset,
keyboard navigation. But JS must never be required merely to view the concept.

Pilot: FIG. 03 renders all four steps as a stacked no-JS reading experience;
the inline `<script>` only adds stepper behavior (show/hide panels, dots,
keyboard) on top. Island-free: Astro + semantic HTML + SVG + one minimal
progressive-enhancement script. Do not introduce framework islands for what
`hidden` attributes and buttons already do.

---

## 20. Interaction accessibility

Interactive figures must support:

- semantic `<button>`s (prev/next/dots — never divs);
- keyboard navigation: `ArrowLeft` / `ArrowRight` / `Home` / `End` for
  sequential steppers (with `tabindex="0"` + `role="group"` on the stepper);
- visible focus (`:focus-visible` outline in the figure hue);
- `aria-current` (or equivalent) marking the active step/dot;
- readable no-JS fallback (stacked content, controls `hidden` until JS activates);
- `prefers-reduced-motion` (transitions off, meaning preserved);
- non-color state cues (see section 15);
- useful accessible descriptions (`aria-label` = what the figure demonstrates).

Do not invent surprising custom keyboard behavior — arrows/Home/End for linear
sequences is the settled pattern; copy FIG. 03's script shape.

---

## 21. Bilingual design

English is not the canonical layout. Russian is not a patched layout. Both are
first-class (`lang` prop → per-locale `copy` object in every pilot component).

Design for: longer labels, different wrapping, different number formatting,
different word lengths, different caption lengths.

- Do NOT solve localization by shrinking typography.
- Layouts must be resilient to copy length (flex/grid wrap, `min-width: 0`,
  no fixed-height text boxes).
- Locale-aware numbers: `42,000,000` (EN) vs `42 000 000` (RU);
  `~0.5 ms` vs `~0,5 мс`. Protocol tokens (`SYN`, `ACK`, `seq=x`) stay invariant.
- Localized markers too: the pilot's unconfirmed-state marker is translated,
  not left in English.

Check both locales visually before shipping — RU wrapping breaks layouts EN
never will.

## 22. Technical precision

Visual simplicity must never create technical falsehood. Pilot corrections:

Bad: *"Routers use 0 bytes per connection."*
Better: *"Standard IP forwarding does not maintain per-TCP-connection state."*
(plus a middlebox note: NATs/firewalls may track flow tuples — the absolute
claim was false without the qualification.)

Bad: *"TCP always waits another RTT before data can flow."*
Better: *"The client may send application data with the final ACK."*
(the payload-zone annotation + `+ First Data` label exist to prevent this myth.)

When a diagram simplifies reality, label the model: *simplified model*,
*illustrative values* (FIG. 01's RTT scenarios are explicitly illustrative, not
measured), *standard forwarding model*, *conceptual view*.

De-sensationalize: the pilot removed dramatic framing in favor of qualified
mechanics. Never introduce a technical claim just to make a visualization dramatic.

---

## 23. Anti-patterns

Do not:

- produce Mermaid-looking final visuals;
- build diagrams from arbitrary colored boxes;
- assign random colors to components (colors are semantic, see section 9);
- use gradients for decoration (the grid + hairline gradients are surface, not hue);
- use drop shadows as hierarchy;
- wrap every grouping in a card (typography + whitespace first, see section 12);
- overuse rounded rectangles (geometry means something, see section 11);
- make every schematic interactive (most of the pilot is static);
- animate unchanged values (mutate only the honest delta, see section 15);
- use canvas width by default (one canvas per lesson, see section 5);
- number every visual (Tier C needs no FIG plate, see section 4);
- make every diagram a formal editorial plate;
- overuse Fraunces (serif = thesis/titles only, see section 7);
- hide important meaning behind hover;
- require JavaScript for basic comprehension (see section 19);
- introduce technical claims merely to make a visualization dramatic (see section 22).

---

## 24. TCP reference examples

Concrete evidence. Paths: `site/src/components/schematic/*.astro`.

**HandshakeLatencyFig** — supporting latency explanation. Width: `learning`.
Lesson: concrete RTT numbers must be labeled illustrative; the third packet
carrying payload is part of the timeline, not a footnote. (Refinement history:
label/arrow collisions fixed by offsetting labels off-stroke + paper halo, see section 7.)

**MetaphorMappingFig** — intuition → abstraction → wire mapping. Tier: C,
integrated micro-schematic, no FIG plate. Lesson: not every visual needs FIG
bureaucracy; column hairlines beat cards.

**InteractiveHandshakeFig** — causal protocol state. Tier: A major reference.
Width: `canvas` (the lesson's only one). Pattern: Message → State → Delta.
Lesson: show mutation, not mere animation — ISNs are stable anchors, only the
honest delta (server → ESTABLISHED at step 3) is emphasized.

**TwoVsThreeFig** — incomplete vs complete synchronization. Tier: B supporting
comparison. Width: `learning`. Lesson: the visual argument must expose the
missing acknowledgement directly (unconfirmed-`y` marker + delayed-duplicate
risk on the 2-step side, RST resolution on the 3-step side).

**StatefulEndpointFig** — stateless core vs stateful edges (TCB). Tier: B
supporting architecture. Width: `learning`. Lesson: technical simplicity must
not create inaccurate absolutes — qualify IP statelessness, note middleboxes.

---

## 25. Checklist for new figures

Before implementing a visualization, answer:

1. What exact question does this visual answer?
2. Is a visual actually better than prose here?
3. Which tier is it (A / B / C)?
4. Does it really require learning or canvas width?
5. Is it showing information, state, flow, comparison, or causality?
6. Are existing Skein primitives sufficient?
7. Are colors semantic?
8. Are line styles semantic?
9. Can unnecessary containers be removed?
10. Does the diagram still work without decoration?
11. Does interaction improve understanding?
12. Does the static fallback still teach the concept?
13. Is technical simplification explicitly bounded?
14. Does it work in EN and RU?
15. Can a keyboard-only user operate it?
16. Does reduced-motion mode preserve understanding?
17. Does it look like Skein rather than generic diagram software?
18. Is this visual important enough to be formally numbered?
19. Is the amount of visual ceremony proportional to its importance?
20. What will the learner understand after seeing it that they did not understand before?

If these questions do not have good answers, reconsider the visualization.
