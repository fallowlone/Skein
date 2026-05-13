# Tier text migration Phase B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan piece-by-piece. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the 8 networking pieces from single-tier (~2500-3500w middle only) to full three-tier disclosure (junior 200-500w + middle 2500-3500w + senior 2500-4000w) with ~20 exercises per piece. Outcome: every networking piece is independently consumable at junior, middle, and senior depth.

**Architecture:** No new framework, no new components. Reuse the existing TierAccordion + 10 exercise components shipped in Phase A (A1+A2+A3). Per-piece work is content-only: research → write three tier panels in the same MDX file → wire exercises → translate to RU → verify.

**Tech Stack:** MDX (Astro 5 content collections), TierAccordion.astro (server-rendered + vanilla JS toggle), Preact islands for exercise components, RetrievalDrawer for open recall, glossary.json for RU technical terms.

**Forward compatibility:** This plan also defines the **per-piece checklist** used for every new piece beyond chapter 01. Future chapters (databases, security, etc.) follow the same junior/middle/senior structure via `/infographic` + the per-piece flow below.

---

## Inputs from Phase A (already shipped)

- `TierAccordion.astro` — 3-tier disclosure, server-rendered, vanilla JS toggle via `awesome.user-state.v1` localStorage.
- 10 exercise components in `site/src/components/pedagogy/`: `Quiz`, `DragOrder`, `TraceScenario`, `DebugLog`, `TradeoffMatrix`, `MetaphorComplete`, `RFCQuiz`, `DesignPrompt`, `AnimationStep`, `NumberDrill`.
- Existing components used across all pieces: `FadedExample`, `RetrievalDrawer`, `Sandbox`, `ReactiveDiagram`, `PersonaTag`, `SpiralCue`, `PrereqBadge`, `SpacedRevisitBanner`.
- Linter rules: `tier-word-budgets` (warnings), `exercise-counts` (warnings). Promotion to errors deferred until ≥3 pieces migrated.
- `/verify-piece` slash command + subagent: reads EN+RU MDX, fetches sources, checks facts + completeness + depth + i18n parity + exercise mix + hydration cap.
- Glossary at `site/src/i18n/glossary.json` — RU technical term lock.

---

## File structure (per piece)

| File | Action | Responsibility |
|---|---|---|
| `site/src/content/book/en/<pillar>/<NN-piece>/index.mdx` | Modify | Add junior tier panel + senior tier panel + exercises; keep middle tier intact (expand if below budget) |
| `site/src/content/book/ru/<pillar>/<NN-piece>/index.mdx` | Modify | Same shape mirror, RU translation respecting glossary |
| `site/src/i18n/glossary.json` | Modify (as needed) | Append new technical terms in alphabetical order, EN→RU lock |

No new components, no new layouts, no new routes.

---

## Assumptions

- TierAccordion already renders three panels (junior/middle/senior) with `data-tier-panel="<tier>"` attributes; the Phase A1 refactor shipped this contract.
- Existing 1 TierAccordion + 1 FadedExample + 1 RetrievalDrawer per piece stays inside the middle tier panel. Junior and senior panels add their own components.
- Hydration cap (5 islands per piece, enforced by linter) survives by leaning on Astro-native (`.astro`) exercise wrappers where possible — exercise components that ship as `.astro` (Quiz, DragOrder, MetaphorComplete, RFCQuiz, DesignPrompt, AnimationStep, NumberDrill, TraceScenario, DebugLog, TradeoffMatrix per Phase A2/A3) do NOT count against the island budget. Only `.tsx` islands (FadedExample, RetrievalDrawer, Sandbox, ReactiveDiagram, Sequencer, Pretest, SettingsDrawer, SpacedRevisitBanner) consume budget. New target: ≤5 `.tsx` islands per piece — typically 1 FadedExample + 1 RetrievalDrawer + optional Sandbox/ReactiveDiagram = 3-4.
- Linter remains in warning mode for `tier-word-budgets` and `exercise-counts` during this phase; we promote to errors after pilot piece is verified clean.
- Each piece is committed independently with message `content(net): <NN-piece> 3-tier EN+RU ready` so reverting one piece does not touch others.

---

## Per-piece flow (template — reused for every piece)

```
1. Research (≥3 queries each: middle deep dive, senior internals/RFC, junior metaphors)
   - WebSearch: kernel docs, RFC sections, postmortems, observability conventions
   - Context7: client/server library APIs where applicable
   - Verify facts against primary sources before writing

2. Author MIDDLE tier (only if below 2500w — expand to baseline)
   - Crux ≤140 chars + topic reactivation + mechanism + format + tradeoffs + numbers + failure mode
   - ≥1 FadedExample inside middle panel
   - ≥1 sequence/state diagram
   - PrereqBadge for cross-links
   - ≥2 retrieval prompts inside RetrievalDrawer

3. Author SENIOR tier (2500-4000w, collapsed)
   - 3-5 edge cases
   - Kernel/OS internals + tunables + syscalls + /proc entries (where applicable)
   - Security pitfalls + CVE refs + mitigations
   - Production tradeoffs (cost / ops / debugging)
   - Observability: metrics + traces + log patterns (USE/RED)
   - History: RFC version progression + deprecations
   - Cross-protocol interactions
   - Deployment patterns (CDN/edge/multi-region) where applicable
   - Real-world failure telemetry
   - RFC quotes with section refs

4. Author JUNIOR tier (200-500w, collapsed)
   - Metaphor link (envelope, telephone, mailman, etc.)
   - Persona dialog (2 personas from personas.json)
   - "What does X do" — 1-sentence plain answer
   - "Why care" — 1-sentence motivation
   - 1 concrete scenario link
   - Forbidden: jargon without expansion, RFC numbers, raw measurements

5. Wire per-tier exercises (target ~20 per piece total)
   - Junior (5): 2 Quiz + 1 DragOrder + 1 MetaphorComplete + 1 retrieval prompt
   - Middle (8): 2 Quiz + 2 TraceScenario + 1 DragOrder + 1 FadedExample + 2 retrieval prompts
   - Senior (7): 1 TraceScenario + 1 DebugLog + 1 TradeoffMatrix + 1 RFCQuiz + 1 DesignPrompt + 2 retrieval prompts
   - Universal: 1 SpiralCue + 1 PersonaTag group + 1 KeyTakeaway + sources frontmatter + SpacedRevisitBanner

6. Translate to RU
   - Mirror block structure 1:1 — no reordering, no merging, no splitting
   - Use glossary.json; append new terms alphabetically with EN→RU lock
   - PersonaTag ids match across EN+RU (personas.json swaps display name)

7. /verify-piece <pillar>/<NN-piece>
   - Reads both languages, fetches sources, runs all checks
   - Output: console summary + `site/dist/verify-reports/<slug>.md`
   - Review findings; apply fixes for ✗ (incorrect) and ⚠ (nuance) findings
   - ? (missing) findings: decide per case — add or accept

8. bun run build (in site/) — lint must be clean (no errors)

9. git commit -m "content(net): <NN-piece> 3-tier EN+RU ready"
```

---

## Migration order (8 networking pieces, by ROI)

Order from spec § Migration plan — easiest+highest impact first. The first piece is the showcase + pilot for the workflow itself.

| # | Piece | Current mid words | Mid action | Senior priority topics | Junior anchor |
|---|---|---|---|---|---|
| 1 | `05-tls-handshake` | 2951 | Keep | post-quantum (Kyber/Dilithium), 0-RTT replay defense, session ticket rotation, HKDF internals, ALPN+SNI privacy, ECH | Locked envelope handed via courier |
| 2 | `03-tcp-handshake` | 2450 | +200w to 2500 | BBR vs CUBIC vs Reno, SYN cookies, kernel tunables (`net.ipv4.tcp_*`), TIME_WAIT exhaustion, retransmit timer math, Nagle/delayed ACK | Doorbell + handshake before talking |
| 3 | `04-dns-resolution` | 2558 | Keep | DNSSEC chain of trust, DoH/DoQ tradeoffs, EDNS Client Subnet privacy leak, NXDOMAIN hijacking, anycast routing, glue records | Address book lookup |
| 4 | `06-http-versions` | 3285 | Keep | RFC 9218 priorities, MASQUE, QUIC datagram, HOL blocking comparison, HPACK/QPACK, server push deprecation | Letter formats over centuries |
| 5 | `07-cdn-edge` | 2531 | Keep | edge worker isolates, P95/P99 SLO math, cache stampede, origin shield tiers, Vary header pitfalls, geo-routing | Local post office vs central depot |
| 6 | `08-putting-it-together` | 3739 | Keep | OpenTelemetry trace propagation, error budget calculus, USE/RED method, distributed tracing sampling, retry/circuit breaker interplay | Full journey from typing URL to seeing page |
| 7 | `02-ip-packet` | 1673 | +900w to 2500 | ECN signaling, DSCP markings, IPv6 transition (6to4/Teredo/NAT64), RPF, fragmentation pitfalls, MTU black holes | Postcard with address |
| 8 | `01-physical-link` | 1245 | +1300w to 2500 | PoE, AQM/fq_codel, fiber tap detection, modulation specifics (PAM-4/OFDM), MAC layer security (802.1X/MACsec), jitter buffer math | Wires and signals you can touch |

---

## Task 1: Pilot — `05-tls-handshake`

**Files:**
- Modify: `site/src/content/book/en/networking/05-tls-handshake/index.mdx`
- Modify: `site/src/content/book/ru/networking/05-tls-handshake/index.mdx`
- Modify: `site/src/i18n/glossary.json` (append new terms)

- [ ] **Step 1: Research senior topics**

Run ≥3 deep-dive queries:
- WebSearch: "TLS 1.3 0-RTT replay attack mitigation 2025"
- WebSearch: "TLS hybrid post-quantum X25519Kyber768 deployment"
- WebSearch: "TLS Encrypted Client Hello ECH adoption status"
- WebFetch RFC 8446 (TLS 1.3) — confirm section refs for HKDF + key schedule + replay defense
- WebFetch RFC 9001 (QUIC uses TLS) — cross-link
- Context7: `openssl` + `boringssl` TLS 1.3 API surface

Record verbatim sources in piece frontmatter `sources:` array (≥3 entries).

- [ ] **Step 2: Confirm middle tier needs no expansion**

Middle is 2951w (above the 2500w floor). Lint shows clean. No middle changes unless `/verify-piece` flags ✗ on existing claim.

- [ ] **Step 3: Author senior tier panel inside TierAccordion**

Inside the existing `<TierAccordion id="…">` block, add a `<div data-tier-panel="senior">…</div>` section covering at minimum:
1. **Edge cases (3-5)**: 0-RTT replay window, downgrade attack defense, certificate revocation gap (OCSP must-staple), key compromise impersonation (KCI), middlebox interference.
2. **Kernel/library internals**: `SSL_CTX_set_min_proto_version` defaults, `SSL_SESS_CACHE_*` flags, OpenSSL provider abstraction, BoringSSL diff, Linux `getrandom()` for entropy.
3. **Security pitfalls**: CVE-2023-* TLS issues, padding oracle history (closed in 1.3), forward secrecy guarantees, Heartbleed lesson (memory-safe TLS).
4. **Production tradeoffs**: session ticket rotation cost, 0-RTT operational risk, hardware-accelerated AES-GCM vs ChaCha20-Poly1305 by CPU, OCSP stapling vs CRLite.
5. **Observability**: `ssl_handshake_duration_seconds` histogram, ALPN negotiated protocol label, cipher suite distribution, early data acceptance rate.
6. **History**: TLS 1.0 (1999) → 1.1 (2006) → 1.2 (2008) → 1.3 (2018) → post-quantum hybrid (2024-2025). RFC 8446 supersedes RFC 5246.
7. **Cross-protocol**: TLS underlies HTTPS, IMAPS, SMTPS, QUIC carries TLS in its own framing.
8. **Deployment patterns**: CDN-terminated TLS, edge SNI routing, mutual TLS for service mesh.
9. **Real-world failures**: Cloudflare 2017 cipher suite issue, Let's Encrypt 2022 chain expiry, common Java truststore drift.
10. **RFC quoting**: cite section 2.3 (handshake protocol), section 4.6.1 (NewSessionTicket), section 7.1 (key schedule), appendix E (security considerations).

Word target 2500-4000.

- [ ] **Step 4: Author junior tier panel**

Inside the same TierAccordion, add `<div data-tier-panel="junior">…</div>`:
- **Metaphor**: "Two people who never met want to share a secret in a crowded room. They use a lockbox both can build keys for without telling anyone what's inside."
- **Persona dialog**: 2 personas — e.g. Bea (frontend dev) ↔ Sven (curious learner). Bea explains why "https" matters on a coffee shop wifi. ~120-180 words.
- **What it does**: "TLS makes sure no one between you and the website can read or change what you send."
- **Why care**: "Anyone on the same wifi can read plain HTTP. TLS stops that."
- **Concrete scenario**: link to 03-tcp-handshake (the layer below) + 06-http-versions (the layer above).

Word target 200-500.

- [ ] **Step 5: Wire per-tier exercises**

In junior panel (5 exercises):
- 2× `<Quiz>` with multiple-choice + per-wrong-answer feedback.
- 1× `<DragOrder>` — arrange "client hello, server hello, finished" sequence.
- 1× `<MetaphorComplete>` — fill blank in lockbox analogy.
- 1× retrieval prompt inside `<RetrievalDrawer>` (this drawer can be shared; tag the prompt with tier).

In middle panel (8 exercises):
- 2× `<Quiz>` (mid-difficulty MCQ).
- 2× `<TraceScenario>` — walk through handshake steps with reveal.
- 1× `<DragOrder>` — reorder cipher negotiation steps.
- 1× existing `<FadedExample>` (keep).
- 2× retrieval prompts.

In senior panel (7 exercises):
- 1× `<TraceScenario>` — debug a failed 0-RTT replay.
- 1× `<DebugLog>` — read OpenSSL log + spot misconfig.
- 1× `<TradeoffMatrix>` — choose cipher suite for constraints grid.
- 1× `<RFCQuiz>` — which RFC defines ECH?
- 1× `<DesignPrompt>` — design session ticket rotation policy with reveal.
- 2× retrieval prompts.

Universal (already present, verify): 1 SpiralCue + 1 PersonaTag group + 1 KeyTakeaway + SpacedRevisitBanner.

- [ ] **Step 6: RU translation**

Mirror EN structure 1:1. For each new technical term, append to `glossary.json` in alphabetical order with EN→RU lock (e.g. `"0-RTT": "0-RTT (нулевое RTT)"`, `"ECH": "ECH (зашифрованный ClientHello)"`).

PersonaTag ids stay identical EN→RU.

- [ ] **Step 7: Run /verify-piece networking/05-tls-handshake**

Spawn verify-piece subagent. Review console summary + `site/dist/verify-reports/05-tls-handshake.md`.

Apply fixes for ✗ findings. Apply fixes for ⚠ findings unless source actually agrees with the piece. ? findings: decide per case (add detail or accept).

- [ ] **Step 8: bun build (lint clean)**

```bash
cd site && bun run build
```

Expected: 301 pages, no errors. tier-word-budget warnings should drop to ≤2. exercise-counts warnings should drop to 0 for this piece.

- [ ] **Step 9: Commit**

```bash
git add site/src/content/book/{en,ru}/networking/05-tls-handshake site/src/i18n/glossary.json
git commit -m "content(net): 05-tls-handshake 3-tier EN+RU ready"
```

---

## Task 2-8: Remaining pieces

Each follows the same 9-step flow as Task 1. Senior priority topics + junior anchor per piece are listed in the migration order table above. Specifics that diverge from the template:

- **Task 2 (`03-tcp-handshake`)**: middle expansion +200w (cover SYN cookie default trigger threshold + TIME_WAIT reuse). Senior focuses on congestion control internals.
- **Task 3 (`04-dns-resolution`)**: senior focus on privacy (DoH/DoQ + ECS leak).
- **Task 4 (`06-http-versions`)**: senior covers RFC 9218 (priorities removal), MASQUE, HOL blocking comparison HTTP/1.1 vs /2 vs /3.
- **Task 5 (`07-cdn-edge`)**: senior covers worker isolates + P95/P99 SLO math + cache stampede.
- **Task 6 (`08-putting-it-together`)**: senior covers full distributed tracing path + error budget. This is the synthesis piece — senior tier may exceed 4000w; allow up to 4500w.
- **Task 7 (`02-ip-packet`)**: middle expansion +900w (ECN, DSCP, IPv6 transition, RPF) before senior.
- **Task 8 (`01-physical-link`)**: largest middle expansion +1300w. Senior covers PoE, AQM/fq_codel, MACsec.

After each piece commit, run the full site build to confirm no regression in other pieces.

---

## Task 9: Promote linter rules to errors

Once 3+ pieces are migrated and clean:

- [ ] **Step 1: Flip tier-word-budgets to error**

In `site/src/lint/index.ts`, change severity for `tier-word-budgets` from `warn` to `error`.

- [ ] **Step 2: Flip exercise-counts to error**

Same file, same flip for `exercise-counts`.

- [ ] **Step 3: Run build, fix any newly-failing piece**

Pieces that still have only middle tier will fail. Either complete their migration in this phase or roll them into Phase C.

- [ ] **Step 4: Commit**

```
chore(lint): promote tier-word-budgets + exercise-counts from warning to error
```

---

## Task 10: Save migration template for future chapters

After Phase B is done and shipped:

- [ ] **Step 1: Update `.claude/commands/infographic.md`**

Replace the existing single-tier authoring template with the three-tier pipeline (steps 2-7 of the per-piece flow above). Bake exercise counts and tier word budgets into the command's explicit refusal list (refuse to mark a piece `ready` if any tier is missing).

- [ ] **Step 2: Add a per-piece template MDX**

Optional: scaffold a blank MDX with the three TierAccordion panels + placeholder exercise slots at `site/src/content/book/_template/3-tier-piece.mdx`. New `/infographic` invocations can copy this scaffold before filling content.

- [ ] **Step 3: Commit**

```
chore(authoring): three-tier piece template + updated /infographic
```

---

## Per-piece cost estimate (post-pilot)

| Stage | Days |
|---|---|
| Senior research + write | 2-3 |
| Junior write | 0.5 |
| Exercises (~15 new) | 1-1.5 |
| Middle expansion (only pieces 2, 7, 8) | 0.5-1 |
| RU translation | 1 |
| /verify-piece + fix | 0.5 |
| **Total per piece** | **~6-7 days** |

Total for 8 pieces: **~48-56 days** of focused work. Pilot piece may exceed this by 30-50% as workflow gets shaken out.

---

## Risks + mitigations

- **Authoring fatigue on senior tier**: every piece demands real kernel/RFC research. Mitigation: `/verify-piece` completeness checklist; refuse to merge if senior panel has fewer than 7 of the 10 senior dimensions.
- **RU translation drift**: technical native fluency in both languages is rare. Mitigation: glossary lock; verify-piece i18n parity check; commit EN+RU together never separately.
- **Hydration cap blowout**: each piece now has many exercise components. Mitigation: prefer `.astro` exercises (Phase A2/A3 shipped most as `.astro`); cap `.tsx` islands at 5 — FadedExample + RetrievalDrawer + optional Sandbox/ReactiveDiagram.
- **Pretest discrimination**: 3-question diagnostic may not separate junior/middle/senior cleanly after senior tier deepens. Mitigation: re-tune Pretest questions after Task 4 (06-http-versions) is migrated, using observed user-state distribution.
- **Linter promotion locks future pieces**: flipping rules to error means new pieces must ship full three-tier or fail build. Mitigation: keep Task 9 last; only flip after Task 10 template is in place so `/infographic` produces compliant scaffolds.

---

## Deliverables

- 8 networking pieces in EN + RU with full junior + middle + senior tiers.
- Glossary updated with new technical terms (~20-40 new entries expected).
- Verify-piece reports for each piece in `site/dist/verify-reports/`.
- Linter rules promoted to errors.
- Updated `/infographic` command + three-tier MDX template for future chapters.

After Phase B: chapter 01 is the reference shape. Chapters 02-16 (Phase C in spec) author against the same three-tier shape via the updated `/infographic` pipeline — workflow scales to all 256 piece slots without further plan documents.

---

## References

- `docs/superpowers/specs/2026-05-13-tier-expansion-and-practice-design.md` (parent spec, sections § Tier sizing, § Practice component inventory, § Scope + phasing, § Migration plan).
- `docs/superpowers/plans/2026-05-13-tier-foundation-plan-a1.md` (Phase A1: linter rules + verify-piece subagent).
- `docs/superpowers/plans/2026-05-13-tier-components-plan-a2.md` (Phase A2: 5 MVP exercises).
- `docs/superpowers/plans/2026-05-13-tier-components-plan-a3.md` (Phase A3: 5 remaining exercises).
- `compass_artifact_wf-8aeb4856-eed4-4587-9788-de184882c6bd_text_markdown.md` (pedagogy research basis).
- `curriculum.md` (16 pillars, depth bar).
- `style-guide.md` (visual vocabulary).
- `site/src/content/book/en/networking/05-tls-handshake/index.mdx` (current best-in-class middle-tier template).
