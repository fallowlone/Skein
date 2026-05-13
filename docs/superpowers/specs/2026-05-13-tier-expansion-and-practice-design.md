# Tier expansion + practice density — design

**Date**: 2026-05-13
**Status**: spec (awaiting user review)
**Supersedes**: nothing (extends `2026-05-12-fullstack-curriculum-site-design.md`)
**Aligns with**: `compass_artifact_wf-8aeb4856-eed4-4587-9788-de184882c6bd_text_markdown.md`

## Context

Networking chapter 01 fully authored (8 pieces × EN+RU, ~2500-3500w each middle tier, 1 TierAccordion + 1 FadedExample + 3 retrieval Qs each). Fact-verified against RFC/web.dev/HPBN (5 ✗ + 15 ⚠ applied 2026-05-13).

User reviewed and requested:
1. **Content completeness** — junior and senior should not need to look elsewhere for theory.
2. **Many varied practical exercises** even small ones, differentiated per tier.
3. **Automated verification agent** runs after each piece is authored.

Research basis: `compass_artifact` (283-line synthesis of pedagogy research). Key drivers:
- Expertise Reversal Effect (Kalyuga, Ayres, Chandler & Sweller 2003) — instructional supports for novices hurt experts; tier disclosure with collapse-by-default is the documented mitigation.
- Faded WOE (Renkl, Atkinson & Große 2004) — better transfer than solved-only or blank-only.
- Spiral curriculum (Bruner 1960) — concept revisited at increasing depth.
- Bloom's revised taxonomy (Anderson & Krathwohl 2001) — each tier needs activity at appropriate cognitive level.
- 4±1 concepts per article (Cowan 2001); 1500-3000w atomic (segmenting, Mayer).
- Retrieval > rereading (Karpicke & Roediger 2008); spaced > massed.

User rejected the earlier proposed "full page-swap" approach after the compass artifact was cross-referenced — compass explicitly endorses single-page collapsed disclosure (TierAccordion), not three-page swap.

## Decisions

1. **Architecture**: keep TierAccordion-based single-page disclosure. NOT page-swap.
2. **Tier sizing** (per piece, within TierAccordion):
   - Junior: 200-500 words, collapsed teaser.
   - Middle: 2500-3500 words, default open.
   - Senior: 2500-4000 words, collapsed deep-dive.
   - Total piece: 5000-7000 words, 20-30 min full read.
3. **Content overlap model**: standalone tiers, different lens on same topic. Conceptual overlap (spaced repetition) is a feature, not a bug. Each tier readable independently.
4. **Practice density**: ~20 exercises per piece across tiers (vs current 5-7).
5. **Verification**: dedicated `/verify-piece <slug>` slash command + subagent runs after authoring; reports findings as ✓/⚠/✗/?.

## Architecture (compass-aligned)

Existing TierAccordion.astro (rewritten 2026-05-13 from broken Preact island) renders all three tiers server-side, toggles visibility via vanilla JS reading `awesome.user-state.v1` localStorage. Stays.

Pretest.tsx (existing, 3-Q Kalyuga rapid diagnostic) sets default tier on first visit. Per-piece tier flip persists via TierAccordion script.

No new layout/router changes required. Tier scope = inside existing TierAccordion only. No `data-tier` paragraph tagging. No 3-file piece split.

## Tier sizing + content shape

### Junior tier (200-500w, collapsed)
- Metaphor link to everyday concept (envelope, telephone, mailman).
- Persona dialog (Bea ↔ Sven walkthrough).
- "What does X do" — 1-sentence plain answer.
- "Why care" — 1-sentence motivation.
- 1 concrete scenario link.
- **Forbidden**: jargon without expansion, RFC numbers, raw measurements.

### Middle tier (2500-3500w, default open) — current baseline shape
- Crux (≤140 chars, 1-sentence question).
- Topic reactivation (1-2 sentences).
- Mechanism (state machine / sequence / protocol detail).
- On-the-wire format (where applicable).
- Tradeoff section ("X vs Y, when to choose").
- NumbersCard (typical values + RFC pointers).
- Failure mode (Misconception block).
- ≥1 FadedExample.
- ≥1 sequence/state diagram.
- Cross-links to prereqs (PrereqBadge).
- ≥2 retrieval questions.

### Senior tier (2500-4000w, collapsed) — NEW deep dive
- Edge cases: 3-5 specific corner scenarios.
- Kernel/OS internals: tunables, syscalls, /proc/net entries.
- Security pitfalls: CVE refs, attack patterns, mitigations.
- Production tradeoffs: cost, ops complexity, debugging cost.
- Observability: metrics, traces, log patterns to watch (USE/RED, Brendan Gregg).
- History: RFC version progression + deprecations.
- Cross-protocol interactions.
- Deployment patterns (CDN/edge/multi-region).
- Real-world failure telemetry.
- RFC quoting with section refs.

### Universal (across all tiers, single instance per piece)
- 4 spiral threads tagged (encapsulation/multiplexing/statefulness/latency via SpiralCue).
- Persona group (3-7 actors from personas.json).
- KeyTakeaway (≤220 chars).
- Sources frontmatter (≥3 entries).
- SpacedRevisitBanner.

## Practice component inventory

### Existing (shipped)
- `Pretest.tsx` — 3-Q tier diagnostic.
- `TierAccordion.astro` — disclosure (3 tiers).
- `FadedExample.tsx` — faded WOE.
- `RetrievalDrawer.tsx` — open-ended Q&A.
- `Sandbox` / `RequestBudgetSandbox.tsx` — parameterized exploration.
- `ReactiveDiagram` — slider-driven diagram.

### New (priority order)

| Component | Bloom | Tier | Pattern | Effort |
|---|---|---|---|---|
| `Quiz` | Remember/Understand | jr+mid | MCQ + per-wrong-answer feedback (Brilliant pattern) | S |
| `DragOrder` | Apply | jr+mid | Arrange items in correct sequence (drag/drop) | M |
| `TraceScenario` | Apply | mid+sr | Walk through scenario step-by-step with reveal | M |
| `DebugLog` | Analyze | sr | Read output + find bug (hint + reveal) | M |
| `TradeoffMatrix` | Evaluate | sr | Constraints × options grid + justify choice | M |
| `MetaphorComplete` | Understand | jr | Complete the analogy | S |
| `RFCQuiz` | Remember | sr | Which RFC defines X (small MCQ) | S |
| `DesignPrompt` | Create | sr | Open-ended design w/ reveal of canonical answer | M |
| `AnimationStep` | Understand | mid | System-paced TCP/DNS play/pause/step (compass § 3.4 d=0.31) | L |
| `NumberDrill` | Apply | mid+sr | Enter computed value (RTT math etc.) | S |

### Mix per tier (target counts)

| Tier | Quiz | TraceScenario | DebugLog | TradeoffMatrix | DragOrder | Metaphor | RFCQuiz | Design | Faded | Retrieval | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Junior | 2 | — | — | — | 1 | 1 | — | — | — | 1 | **5** |
| Middle | 2 | 2 | — | — | 1 | — | — | — | 1 | 2 | **8** |
| Senior | — | 1 | 1 | 1 | — | — | 1 | 1 | — | 2 | **7** |

Total per piece: **~20 exercises**.

MVP build order: Quiz → DragOrder → TraceScenario → DebugLog → TradeoffMatrix → rest.

## Authoring workflow

### Per-piece flow

```
1. /infographic <pillar>/<NN-chapter>/<NN-piece>
   → research (WebSearch + Context7 ≥3 queries, middle+/senior depth)
   → author MIDDLE tier (current baseline shape; 2500-3500w)
   → bun build (lint pass)
2. Author SENIOR tier (collapsed in TierAccordion; 2500-4000w)
   → edge cases + kernel + security + production + observability + RFC history
3. Author JUNIOR tier (collapsed; 200-500w)
   → metaphor + persona dialog
4. Add per-tier exercises per inventory (~20 components)
5. Translate to RU (preserve structure; PersonaTag swaps via personas.json)
6. /verify-piece <slug>           ← new
7. Review findings; fix or accept
8. bun build (lint clean)
9. git commit
```

### Auto-verify agent (`/verify-piece <slug>`)

**Trigger**: manual slash command after authoring (Phase A — later may add git pre-commit hook).

**Inputs**: piece slug (e.g. `networking/03-tcp-handshake`).

**Reads**: EN + RU MDX + `sources:` frontmatter.

**Checks** (output bulleted ✓/⚠/✗/? per finding, max 30):

| Category | What |
|---|---|
| Facts | WebFetch each source, cross-check claims (numbers, RFC behaviors, version specs) |
| Completeness | Junior checklist / Middle checklist / Senior checklist / Universal block presence |
| Depth bar | Each tier words within budget (jr 200-500, mid 2500-3500, sr 2500-4000) |
| i18n parity | EN+RU same blocks, persona ids match, glossary aligned |
| Hydration cap | ≤5 client-island components per piece |
| Cross-links | Prereq slugs exist; source URLs reachable |
| Exercise mix | Per-tier counts match inventory (jr=5, mid=8, sr=7) |

**Output**: `site/dist/verify-reports/<slug>.md` + console summary. User reviews and acts.

**Implementation**: `.claude/agents/verify-piece.md` (subagent template) + `.claude/commands/verify-piece.md` (slash command). Subagent uses WebFetch + Read + Glob + Grep. No write access.

## Scope + phasing

### Phase A — Infrastructure (~1 week)
- Build 10 new exercise components (Quiz, DragOrder, TraceScenario, DebugLog, TradeoffMatrix, MetaphorComplete, RFCQuiz, DesignPrompt, AnimationStep, NumberDrill).
- Build `/verify-piece` subagent + slash command.
- Update `/infographic` command definition to enforce new tier sizing + exercise counts.
- Update linter rules: per-tier word budgets, exercise count per tier.

### Phase B — Migrate networking chapter (8 pieces, ~4-6 weeks)
For each piece:
- Expand middle tier (01, 02 only — +1000w each to reach 2500-3500w baseline).
- Add senior tier 2500-4000w (kernel/RFC/edge/security/observability/history per checklist).
- Add junior tier 200-500w (metaphor/dialog per checklist).
- Add per-tier exercises (~15 new per piece beyond what exists).
- EN + RU translation.
- `/verify-piece` + fix.
- Commit per piece.

### Phase C — Apply to chapters 02-16 (~6 months continuous, ship-as-ready)
Use enhanced `/infographic` pipeline. ~6-7 days per piece × 8 pieces/chapter × 15 remaining chapters ≈ 720-840 days. Realistically ship chapter-by-chapter, not blocking.

### Per-piece cost (post-infrastructure)
| Stage | Days |
|---|---|
| Middle tier (existing baseline) | 1 |
| Senior tier (research + write) | 2-3 |
| Junior tier | 0.5 |
| Exercises (~15 new) | 1-1.5 |
| RU translation | 1 |
| Verify + fix | 0.5 |
| **Total per piece** | **~6-7** |

## Migration plan (networking 8 pieces)

Order by ROI (easiest+highest impact first):

1. **05-tls-handshake** — already 2951w middle, rich persona use. Add senior + junior + exercises. Showcase piece.
2. **03-tcp-handshake** — 2450w middle, FadedExample exists. Senior expansion (BBR/CUBIC/SYN cookies internals/kernel tunables).
3. **04-dns-resolution** — 2558w. Senior expansion (DNSSEC chain, DoH/DoQ, EDNS Client Subnet privacy).
4. **06-http-versions** — 3285w (already largest of mid-tier). Senior expansion (HTTP/2 priorities removal RFC 9218, MASQUE, QUIC datagram).
5. **07-cdn-edge** — 2531w. Senior expansion (CDN cost matrix, edge worker isolates, P95/P99 SLO).
6. **08-putting-it-together** — 3739w (synthesis). Senior expansion (USE/RED methods, OpenTelemetry trace propagation, error budget calculus).
7. **02-ip-packet** — 1673w. Middle expansion to 2500w (ECN, DSCP, IPv6 transition, RPF). Then senior.
8. **01-physical-link** — 1245w. Largest middle expansion needed (+1500w). Then senior (PoE, AQM/fq_codel, fiber tap detection, modulation specifics).

## Open questions

1. **Linter integration**: should per-tier word budgets fail build (errors) or just warn?
2. **Pretest re-tuning**: with deeper senior tier, do current Pretest questions still discriminate well? May need regeneration.
3. **Translation cost**: senior tier RU translation requires technical native fluency in both languages. May need terminology additions to `glossary.json` per piece.
4. **Sandbox per chapter**: compass § Stage 3 suggests one Sandbox per pillar (not per piece). Only 08-putting-it-together currently has one. Should chapter sandbox be reusable across pieces in the same pillar?
5. **Hydration cap conflict**: each piece may exceed 5 islands with new exercise components. Need to mark some as `client:visible` (defer) or batch similar components into one island.

## Risks

- **Authoring fatigue**: senior tier requires deep research per piece. Tempting to skip or thin out. Mitigation: enforce via `/verify-piece` completeness checklist.
- **Translation drift**: RU lags behind EN. Mitigation: i18n parity check in verify-piece.
- **Component proliferation**: 10 new exercise components increases test/maintenance surface. Mitigation: shared internal patterns (reuse hint/reveal/feedback primitives across components).
- **Hydration budget**: more islands per page may slow JS execution on mobile. Mitigation: prefer Astro-native components with vanilla JS (like TierAccordion fix) over Preact islands where state can be DOM-toggled.

## References

- `compass_artifact_wf-8aeb4856-eed4-4587-9788-de184882c6bd_text_markdown.md` (research basis).
- `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` (parent site design).
- `curriculum.md` (depth bar + 16 pillars).
- `style-guide.md` (visual vocabulary).
- `.claude/commands/infographic.md` (current piece-authoring pipeline).
