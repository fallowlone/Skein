# Networking Chapter Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the networking pillar from 8 to 12 pieces — deepen the 7 existing content pieces with 2026 facts plus practice widgets, add 4 new senior-depth bilingual pieces, and rework the capstone to weave all 12 layers.

**Architecture:** Renumber the capstone first (mechanical, low-risk). Then deepen pieces 01-07 in place. Then author 4 new pieces via the existing `/infographic` pipeline. Finally rework the capstone in a single pass. Every change is verified by `bun run build` (Astro build + content linter) — a clean `dist/lint-report.json` is the pass signal.

**Tech Stack:** Astro 5, Preact, Tailwind, MDX, bun. Content lives in `site/src/content/book/{en,ru}/networking/`. The linter (`site/src/lint/`) enforces tier word budgets, exercise counts, hydration cap, i18n parity, glossary, and sources.

**Spec:** `docs/superpowers/specs/2026-05-15-networking-chapter-expansion-design.md`

---

## Working directory

All paths below are relative to the repo root `/Users/artemmac/dev/awesome-everything`.
The site lives in `site/`. Build command is run from `site/`:

```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build
```

Pass signal after every build: `site/dist/lint-report.json` equals
`{"errors":[],"warnings":[]}`.

## File structure

```
site/src/content/book/en/networking/      EN pieces (one dir per piece)
site/src/content/book/ru/networking/       RU pieces (mirror)
site/src/content/chapters.json             chapter manifest, line 8 = networking pieces array
site/scaffolds/3-tier-piece.mdx            new-piece scaffold
site/src/i18n/glossary.json                locked translations
```

End state — networking directory listing (EN and RU identical):

```
01-physical-link        02-ip-packet            03-tcp-handshake
04-dns-resolution       05-tls-handshake        06-http-versions
07-cdn-edge             08-websocket-realtime   09-proxy-load-balancing
10-quic-internals       11-network-security     12-putting-it-together
```

---

## Task 1: Renumber the capstone 08 → 12

Mechanical rename. Done before everything else so all later work references
final piece numbers.

**Files:**
- Rename: `site/src/content/book/en/networking/08-putting-it-together/` → `12-putting-it-together/`
- Rename: `site/src/content/book/ru/networking/08-putting-it-together/` → `12-putting-it-together/`
- Modify: `site/src/content/book/en/networking/12-putting-it-together/index.mdx` (frontmatter)
- Modify: `site/src/content/book/ru/networking/12-putting-it-together/index.mdx` (frontmatter)
- Modify: `site/src/content/chapters.json:8`
- Modify: `site/src/content/book/en/networking/07-cdn-edge/index.mdx` ("What's next" link)
- Modify: `site/src/content/book/ru/networking/07-cdn-edge/index.mdx` ("What's next" link)

- [ ] **Step 1: Rename the capstone directories**

```bash
cd /Users/artemmac/dev/awesome-everything/site/src/content/book
git mv en/networking/08-putting-it-together en/networking/12-putting-it-together
git mv ru/networking/08-putting-it-together ru/networking/12-putting-it-together
```

- [ ] **Step 2: Update EN capstone frontmatter**

In `site/src/content/book/en/networking/12-putting-it-together/index.mdx`,
change two frontmatter lines:

```yaml
slug: 12-putting-it-together
order: 12
```

(were `08-putting-it-together` and `8`).

- [ ] **Step 3: Update RU capstone frontmatter**

Same two changes in `site/src/content/book/ru/networking/12-putting-it-together/index.mdx`:

```yaml
slug: 12-putting-it-together
order: 12
```

- [ ] **Step 4: Update the chapter manifest**

In `site/src/content/chapters.json` line 8, replace the networking `pieces` array:

```json
    "pieces": ["01-physical-link","02-ip-packet","03-tcp-handshake","04-dns-resolution","05-tls-handshake","06-http-versions","07-cdn-edge","08-websocket-realtime","09-proxy-load-balancing","10-quic-internals","11-network-security","12-putting-it-together"] },
```

- [ ] **Step 5: Find every inbound link to the old capstone slug**

```bash
cd /Users/artemmac/dev/awesome-everything
grep -rn '08-putting-it-together' site/src/content/book/en/networking site/src/content/book/ru/networking
```

Expected hits: at minimum the "What's next" link in `07-cdn-edge` (EN + RU).
For every hit that is a link of the form `/en/networking/08-putting-it-together/`
or `/ru/networking/08-putting-it-together/`, change `08-putting-it-together`
to `12-putting-it-together`. Do NOT touch hits inside the capstone file itself
that are anchor references — only path links.

Note: `08-putting-it-together` is also the capstone slug for the other 15
chapters. The grep above is scoped to `networking` only, so other chapters are
untouched.

- [ ] **Step 6: Retarget the 07-cdn-edge "What's next" link**

The new piece after `07-cdn-edge` is `08-websocket-realtime`. In both
`site/src/content/book/en/networking/07-cdn-edge/index.mdx` and the RU mirror,
the "What's next" section currently links to the capstone. Change it to point
to `08-websocket-realtime`:

EN:
```mdx
### What's next

[**08 — WebSocket and real-time**](/en/networking/08-websocket-realtime/) — HTTP request/response is one-shot; real-time apps need a channel that stays open both ways.
```

RU (mirror, `/ru/` path, translated label).

- [ ] **Step 7: Build and verify**

```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build
```

Expected: build succeeds. `dist/lint-report.json` will report **warnings** for
the 4 not-yet-created pieces (`08-websocket-realtime` … `11-network-security`)
referenced in `chapters.json` but missing on disk. That is expected at this
stage. There must be **no errors** unrelated to the missing pieces, and no
broken-link error for the renamed capstone.

If the linter treats the missing pieces as hard errors (build fails), revert
the `chapters.json` change from Step 4 and instead add the 4 slugs to the array
incrementally — one per new-piece task (Tasks 9-12). Decide based on the actual
build output.

- [ ] **Step 8: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/content/book/en/networking site/src/content/book/ru/networking site/src/content/chapters.json
git commit -m "content(networking): renumber capstone 08 to 12, reserve slots for 4 new pieces"
```

---

## Tasks 2-8: Deepen pieces 01-07

Tasks 2 through 8 share an identical procedure, applied to a different piece
each. The per-piece content differs only in the **2026 actualization** column.

**Shared procedure (applies to each of Tasks 2-8):**

For piece `<NN-piece>` (EN file `site/src/content/book/en/networking/<NN-piece>/index.mdx`,
RU mirror under `book/ru/`):

- [ ] **Step A: Research the 2026 facts**

Use WebSearch (and Context7 for any library/SDK API) to confirm the specific
updates listed in the task. **Every number must come from a source.** Do not
invent figures. Note each source URL.

- [ ] **Step B: Apply the 2026 updates to the EN file**

Edit the relevant tier sections (usually `middle` and `senior` slots) and any
`<NumbersCard>`. Replace stale figures, add new mechanisms. Keep edits pointed —
this is actualization, not a rewrite. If a new source URL was used, add it to
the `sources:` array in frontmatter.

- [ ] **Step C: Add one TraceScenario and one DebugLog to the EN file**

Author a new `<TraceScenario>` (4-6 trace steps, prompt + reveal each) and a
new `<DebugLog>` (realistic log/command output + question + hint + answer).
Place the extra TraceScenario in the `middle` or `senior` slot; place the
DebugLog in the `senior` slot. Give each a unique `id`. Both are `.astro`
components — they do not count against the 5-island hydration cap.

- [ ] **Step D: Mirror every change into the RU file**

Apply the same factual updates and the same two new widgets to
`site/src/content/book/ru/networking/<NN-piece>/index.mdx`, translated.
Use `site/src/i18n/glossary.json` for terms; add new terms alphabetically
(by English term) with `en` and `ru` fields. Latin acronyms stay Latin.

- [ ] **Step E: Build and verify**

```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build
```

Expected: build succeeds; `dist/lint-report.json` has no errors for this piece.
Confirm tier word budgets still pass (junior 200-700, middle 2500-3700,
senior 2500-4000) and exercise counts are at or above floor.

- [ ] **Step F: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/content/book/en/networking/<NN-piece> site/src/content/book/ru/networking/<NN-piece> site/src/i18n/glossary.json
git commit -m "content(networking): deepen <NN-piece> with 2026 facts and practice"
```

---

### Task 2: Deepen 01-physical-link

Run the shared procedure for `01-physical-link`. 2026 actualization targets:

- 800G Ethernet (800GBASE) — current standardization and deployment status.
- Wi-Fi 7 (802.11be) — Multi-Link Operation (MLO), throughput numbers.
- 5G-Advanced (3GPP Release 18+) — status in 2026.
- Fresh RTT and throughput figures in any `<NumbersCard>`.

### Task 3: Deepen 02-ip-packet

Run the shared procedure for `02-ip-packet`. 2026 actualization targets:

- IPv6 adoption percentage (2026 figure, e.g. Google/APNIC stats).
- SRv6 (Segment Routing over IPv6) — deployment status.
- ECN and L4S (Low Latency, Low Loss, Scalable throughput) deployment.

### Task 4: Deepen 03-tcp-handshake

Run the shared procedure for `03-tcp-handshake`. 2026 actualization targets:

- BBRv3 as the default on Google public traffic — confirm current state.
- RACK-TLP — status as the standard Linux loss-detection path.
- TCP Fast Open — fresh adoption figures.

### Task 5: Deepen 04-dns-resolution

Run the shared procedure for `04-dns-resolution`. 2026 actualization targets:

- DoH / DoT / DoQ (DNS over HTTPS/TLS/QUIC) — adoption figures.
- Encrypted ClientHello (ECH) — general-availability status in browsers.
- DNSSEC — deployment status.

### Task 6: Deepen 05-tls-handshake

Run the shared procedure for `05-tls-handshake`. 2026 actualization targets:

- Post-quantum TLS key exchange — ML-KEM and the X25519MLKEM768 hybrid,
  browser/server rollout status.
- TLS 1.3 traffic share (2026 figure).
- Encrypted ClientHello (ECH) integration with TLS.

### Task 7: Deepen 06-http-versions

Run the shared procedure for `06-http-versions`. 2026 actualization targets:

- HTTP/3 adoption percentage (2026 figure).
- QUIC traffic share.
- HTTP/2 priorities — deprecation status, replacement by RFC 9218
  Extensible Prioritization.

### Task 8: Deepen 07-cdn-edge

Run the shared procedure for `07-cdn-edge`. 2026 actualization targets:

- Edge compute — Cloudflare Workers / similar Functions platforms, 2026
  capabilities and limits.
- HTTP 103 Early Hints — adoption status.
- Fresh CDN POP-count and edge-cache figures in any `<NumbersCard>`.

---

## Tasks 9-12: Author the 4 new pieces

Tasks 9 through 12 share an identical procedure. Each authors one new
bilingual senior-depth piece via the `/infographic` pipeline.

**Shared procedure (applies to each of Tasks 9-12):**

For new piece `<NN-piece>` with the outline given in the task:

- [ ] **Step A: Create the EN stub from the scaffold**

```bash
cd /Users/artemmac/dev/awesome-everything/site
mkdir -p src/content/book/en/networking/<NN-piece>
cp scaffolds/3-tier-piece.mdx src/content/book/en/networking/<NN-piece>/index.mdx
```

Then edit the stub frontmatter placeholders with the values from the task
outline: `slug`, `pillar: networking`, `chapter: 01-networking`, `order`,
`title`, `summary`, `readingMin`, `status: stub`, `prereqs`, `spiral`,
`personas`. Leave `depth` and `sources` as scaffold placeholders for now.

- [ ] **Step B: Author the piece via /infographic**

Invoke the `/infographic` command:

```
/infographic networking/01-networking/<NN-piece>
```

The command runs its full pipeline: research (≥3 WebSearch/Context7 queries
at middle+/senior depth) → author the EN MDX three-tier body → translate to RU
using the glossary → set status `ready` → `bun run build` → verify
`dist/lint-report.json` is clean → run `/verify-piece` → commit as
`content(networking): <NN-piece> EN+RU ready`.

Feed the command the outline from the task (mechanism / tradeoff / failure mode
/ numbers) so research is correctly scoped. The piece must hit every linter
floor: 3 tiers, exercise counts (junior 5, middle 8, senior 7), word budgets,
hydration cap ≤ 5 islands, all 4 `depth` frontmatter ids populated, ≥3 sources.

- [ ] **Step C: Confirm the build and commit**

`/infographic` builds and commits itself. Verify afterward:

```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build
cat dist/lint-report.json
git -C /Users/artemmac/dev/awesome-everything log -1 --oneline
```

Expected: `{"errors":[],"warnings":[]}` (the warning for this missing piece
from Task 1 is now resolved) and a commit for the piece. If `/infographic`
reported `DONE_WITH_CONCERNS` or `BLOCKED`, address the concerns before moving
to the next task.

---

### Task 9: New piece 08-websocket-realtime

Run the shared procedure. Outline:

- slug: `08-websocket-realtime`, order: `8`, title: "WebSocket and real-time"
- prereqs: `["03-tcp-handshake","05-tls-handshake","06-http-versions"]`
- spiral: `["statefulness","latency"]`
- Mechanism: HTTP Upgrade handshake (`Sec-WebSocket-Key` / `Sec-WebSocket-Accept`),
  frame protocol (opcode, masking, fragmentation), ping/pong keepalive.
- Tradeoff: WebSocket vs Server-Sent Events vs long-polling vs
  WebTransport-over-HTTP/3.
- Failure mode: backpressure with a slow client, no built-in reconnect,
  head-of-line blocking when many logical streams share one TCP connection.
- Numbers: frame header overhead, max concurrent connections per server,
  latency vs polling.

### Task 10: New piece 09-proxy-load-balancing

Run the shared procedure. Outline:

- slug: `09-proxy-load-balancing`, order: `9`, title: "Proxies and load balancing"
- prereqs: `["03-tcp-handshake","06-http-versions","07-cdn-edge"]`
- spiral: `["latency","statefulness"]`
- Mechanism: forward vs reverse proxy, L4 (transport) vs L7 (application)
  balancing, health checks, connection draining.
- Tradeoff: balancing algorithms — round-robin, least-connections, EWMA,
  power-of-two-choices; consistent hashing; sticky sessions.
- Failure mode: thundering herd on restart, retry storm, anycast flap.
- Numbers: proxy hop latency, connection reuse ratio.

### Task 11: New piece 10-quic-internals

Run the shared procedure. Outline:

- slug: `10-quic-internals`, order: `10`, title: "QUIC internals"
- prereqs: `["03-tcp-handshake","05-tls-handshake","06-http-versions"]`
- spiral: `["latency","statefulness"]`
- Mechanism: QUIC over UDP, independent streams (no head-of-line blocking),
  integrated TLS 1.3 handshake, connection ID and connection migration.
- Tradeoff: QUIC vs TCP+TLS, 0-RTT (and its replay risk), user-space
  congestion control.
- Failure mode: UDP blocking/throttling by networks, amplification attacks,
  0-RTT replay.
- Numbers: handshake RTT (1-RTT vs 0-RTT), CPU cost of user-space QUIC vs
  kernel TCP.

### Task 12: New piece 11-network-security

Run the shared procedure. Outline:

- slug: `11-network-security`, order: `11`, title: "Network security"
- prereqs: `["02-ip-packet","03-tcp-handshake","04-dns-resolution","05-tls-handshake"]`
- spiral: `["statefulness","latency"]`
- Mechanism: DDoS taxonomy (volumetric / protocol / application-layer),
  rate limiting (token bucket, sliding window), mTLS, WAF.
- Tradeoff: where to terminate defense (edge vs origin), false-positive rate
  vs coverage.
- Failure mode: BGP hijacking, DNS spoofing / cache poisoning, amplification
  vectors, TLS stripping.
- Numbers: typical 2026 attack sizes, mitigation latency.

---

## Task 13: Expand the capstone (12-putting-it-together)

Single pass: rework the capstone to weave all 12 layers, plus apply the
deepen treatment (2026 actualization + one extra practice widget).

**Files:**
- Modify: `site/src/content/book/en/networking/12-putting-it-together/index.mdx`
- Modify: `site/src/content/book/ru/networking/12-putting-it-together/index.mdx`
- Modify: `site/src/i18n/glossary.json` (if new terms)

- [ ] **Step 1: Extend the prereqs**

In both EN and RU frontmatter, set:

```yaml
prereqs: ["01-physical-link","02-ip-packet","03-tcp-handshake","04-dns-resolution","05-tls-handshake","06-http-versions","07-cdn-edge","08-websocket-realtime","09-proxy-load-balancing","10-quic-internals","11-network-security"]
```

- [ ] **Step 2: Add the proxy and security stops to the main trace**

The capstone's spine is "one HTTPS request, end to end". In the trace prose
and any `<TraceScenario>`, insert the proxy/load-balancer hop and the security
checkpoints (rate limit, WAF, mTLS) as inline gates the request passes
through. Edit EN first.

- [ ] **Step 3: Add the alternate-path traces**

Add two contrast traces (prose plus a `<TraceScenario>` each): one for a
WebSocket-upgrade session, one for a QUIC / HTTP-3 request. Each contrasts
explicitly with the TCP+TLS+HTTP/2 baseline already in the piece.

- [ ] **Step 4: Add the 12-layer cascade failure mode**

Update or add the failure-mode section to describe a cascade across all 12
layers, including a proxy retry storm and a DDoS scenario.

- [ ] **Step 5: Apply the deepen treatment**

In the same pass, apply the 2026 actualization (refresh any stale figures,
researched from sources — add new source URLs to frontmatter) and add one new
`<TraceScenario>` or `<DebugLog>` for extra practice, consistent with Tasks 2-8.

- [ ] **Step 6: Mirror everything into the RU file**

Apply Steps 1-5 to `site/src/content/book/ru/networking/12-putting-it-together/index.mdx`,
translated. Use the glossary; add new terms alphabetically.

- [ ] **Step 7: Build and verify**

```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build
cat dist/lint-report.json
```

Expected: `{"errors":[],"warnings":[]}`. Tier word budgets and exercise counts
pass. Hydration cap ≤ 5 islands. Run `/verify-piece networking/12-putting-it-together`
and address every `✗`.

- [ ] **Step 8: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/content/book/en/networking/12-putting-it-together site/src/content/book/ru/networking/12-putting-it-together site/src/i18n/glossary.json
git commit -m "content(networking): expand capstone to weave all 12 layers"
```

---

## Final verification

- [ ] **Full build is clean**

```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build
cat dist/lint-report.json
```

Expected: `{"errors":[],"warnings":[]}`. Page count has risen by 8 (4 new
pieces × 2 languages).

- [ ] **Networking chapter has 12 pieces, EN and RU symmetric**

```bash
ls site/src/content/book/en/networking/ && echo "---" && ls site/src/content/book/ru/networking/
```

Expected: both list `01-physical-link` … `12-putting-it-together`, 12 dirs each.

- [ ] **Update the curriculum-progress memory**

Update `/Users/artemmac/.claude/projects/-Users-artemmac-dev-awesome-everything/memory/curriculum_progress.md`:
networking is now 12/12 (expanded chapter), and record the 4 new pieces in the
networking piece breakdown.

---

## Notes for the executor

- This is content work, not code. The "test" is `bun run build` plus a clean
  `dist/lint-report.json`. There is no per-piece unit test.
- Numbers must always be researched, never invented. Every 2026 figure cites
  a source URL added to the piece `sources` frontmatter.
- The linter enforces exercise-count *floors* (junior 5, middle 8, senior 7),
  so adding extra TraceScenario/DebugLog widgets is always safe.
- `TraceScenario` and `DebugLog` are `.astro` components — not hydrated
  islands — so they never affect the 5-island hydration cap.
- Tasks 2-8 are independent of each other and may be done in any order, but
  all must follow Task 1. Tasks 9-12 are independent of each other and of
  Tasks 2-8, but should follow Task 1. Task 13 must be last.
