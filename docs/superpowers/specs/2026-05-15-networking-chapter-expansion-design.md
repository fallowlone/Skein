# Networking chapter expansion — design spec

Date: 2026-05-15
Status: approved (brainstorming complete)
Scope: curriculum site, pillar 01 (networking)

## Goal

Grow the networking chapter from 8 to 12 content pieces and revise the
existing pieces. Two distinct bodies of work:

1. **Deepen** the 7 existing content pieces (01-07): 2026 fact actualization
   plus additional practice widgets.
2. **Expand** the chapter with 4 new senior-depth bilingual pieces, renumber
   the capstone, and rework the capstone to weave all 12 layers.

## Current state

Networking pillar is 8/8 pieces, all `status: ready`, EN+RU:

```
01-physical-link        02-ip-packet         03-tcp-handshake
04-dns-resolution       05-tls-handshake     06-http-versions
07-cdn-edge             08-putting-it-together (capstone)
```

All 8 pieces are uniform: 7-10k words, three tiers (junior/middle/senior),
identical widget density (6 Quiz, 3 TraceScenario, 1 DebugLog, 1 TradeoffMatrix,
1 DesignPrompt, 1 RFCQuiz, ~4 RetrievalDrawer each). Lint report is clean.

The slug `08-putting-it-together` is reused as the capstone slug in all 16
chapters. Renumbering networking's capstone affects only networking
directories; the new slug `12-putting-it-together` is unique to networking.

## Approach

Chosen approach: **structural spec + `/infographic` pipeline.**

This single spec fixes the structural decisions (renumbering, ordering, the
precise scope of "deepen", and outlines for the 4 new pieces). Execution then
runs the existing `/infographic` command per new piece — that command already
codifies the per-piece research → EN → RU → lint pipeline, so re-specifying
each piece in brainstorming would duplicate it. The deepen phase runs as one
plan; the capstone rework as a final pass.

Rejected alternatives:
- One mega-spec with a single ~13-piece plan — unmanageable, checkpoints lost.
- Six independent sub-projects each with its own spec — duplicates the
  `/infographic` per-piece pipeline.

## Execution order

```
Step 0  Renumber capstone 08 -> 12 (mechanical, before everything else)
Step 1  Deepen 01-07 (7 pieces): 2026 actualization + more practice
Step 2  New pieces 08-11 via /infographic
          08 websocket-realtime
          09 proxy-load-balancing
          10 quic-internals
          11 network-security
Step 3  Deepen + expand capstone-12 (single pass: revision + 12-layer weave)
```

The capstone is touched exactly once — in Step 3. It is NOT deepened
separately in Step 1. Renumbering runs first so all later work references
final piece numbers.

## Step 0 — Capstone renumbering (mechanical)

- Rename directory `08-putting-it-together` -> `12-putting-it-together`,
  both `book/en/networking/` and `book/ru/networking/`.
- Frontmatter in both language files: `slug` `08-putting-it-together` ->
  `12-putting-it-together`; `order` `8` -> `12`.
- `src/content/chapters.json` line 8 (networking `pieces` array): replace
  `"07-cdn-edge","08-putting-it-together"` with
  `"07-cdn-edge","08-websocket-realtime","09-proxy-load-balancing",`
  `"10-quic-internals","11-network-security","12-putting-it-together"`.
- `07-cdn-edge` "What's next" link: retarget to `08-websocket-realtime`.
- Audit all internal links inside networking pieces that point to the
  capstone; retarget to `/[lang]/networking/12-putting-it-together/`.

Page routes are derived from slug via `[lang]/[pillar]/[piece].astro`, so
the route changes automatically once the directory and slug change.

## Step 1 — Deepen 01-07

Two kinds of edit per piece.

### 2026 actualization

Pointed fact updates. Every updated number must have a source; if the source
is new, add it to the piece `sources` frontmatter. Numbers must be researched
(WebSearch / Context7), never invented.

| Piece            | Updates |
|------------------|---------|
| 01-physical-link | 800G Ethernet, Wi-Fi 7 (MLO), 5G-Advanced status, fresh RTT/throughput numbers |
| 02-ip-packet     | IPv6 adoption % (2026), SRv6 segment routing status, ECN/L4S deployment |
| 03-tcp-handshake | BBRv3 as Google default, RACK-TLP status, fresh TFO numbers |
| 04-dns-resolution| DoH/DoT/DoQ adoption, Encrypted ClientHello (ECH) GA, DNSSEC status |
| 05-tls-handshake | Post-quantum TLS (ML-KEM / X25519MLKEM768 in browsers), TLS 1.3 share, ECH |
| 06-http-versions | HTTP/3 adoption % (2026), QUIC share, HTTP/2 priorities deprecation status |
| 07-cdn-edge      | Edge compute (Workers/Functions 2026), 103 Early Hints status, fresh POP numbers |

### More practice

Add to each of the 7 pieces: +1 TraceScenario and +1 DebugLog (bringing each
to 4 TraceScenario / 2 DebugLog). DesignPrompt and TradeoffMatrix stay at 1.

`TraceScenario` and `DebugLog` are `.astro` components, not hydrated islands,
so adding them does not affect the 5-island hydration cap. Confirmed:
03-tcp-handshake already ships 3 TraceScenario + 1 DebugLog with a clean lint
report.

### Per-piece verification

After each piece: `bun run build` in `site/`; `dist/lint-report.json` must be
`{"errors":[],"warnings":[]}`; tier word budgets must not be breached.

## Step 2 — Four new pieces

Each piece: bilingual EN+RU, three tiers, senior depth, full widget set
matching 03-tcp-handshake. Authored via `/infographic`. Prerequisite chains
reference only pieces 01-07, so all four can be authored in any order after
Step 1, though the listed order is recommended.

### 08 — websocket-realtime

- prereqs: `03-tcp-handshake`, `05-tls-handshake`, `06-http-versions`
- spiral: `statefulness`, `latency`
- Mechanism: HTTP Upgrade handshake (`Sec-WebSocket-Key` / `Accept`), frame
  protocol (opcode, masking, fragmentation), ping/pong keepalive.
- Tradeoff: WebSocket vs SSE vs long-polling vs WebTransport-over-HTTP/3.
- Failure mode: backpressure with a slow client, no built-in reconnect,
  head-of-line blocking when sharing one TCP connection.
- Numbers: frame overhead, max connections per server, latency vs polling.

### 09 — proxy-load-balancing

- prereqs: `03-tcp-handshake`, `06-http-versions`, `07-cdn-edge`
- spiral: `latency`, `statefulness`
- Mechanism: forward vs reverse proxy, L4 (transport) vs L7 (application)
  balancing, health checks, connection draining.
- Tradeoff: algorithms — round-robin / least-connections / EWMA /
  power-of-two-choices; consistent hashing; sticky sessions.
- Failure mode: thundering herd on restart, retry storm, anycast flap.
- Numbers: proxy hop latency, connection reuse ratio.

### 10 — quic-internals

- prereqs: `03-tcp-handshake`, `05-tls-handshake`, `06-http-versions`
- spiral: `latency`, `statefulness`
- Mechanism: QUIC over UDP, streams (no head-of-line blocking), integrated
  TLS 1.3 handshake, connection ID + migration.
- Tradeoff: QUIC vs TCP+TLS, 0-RTT (and replay risk), user-space congestion
  control.
- Failure mode: UDP blocking/throttling by networks, amplification, 0-RTT
  replay.
- Numbers: handshake RTT (1-RTT / 0-RTT), CPU cost of user-space vs kernel TCP.

QUIC is piece 10 (not adjacent to HTTP/3 = piece 06) because piece 07 is not
renumbered — appending avoids renumbering churn on the existing pieces.

### 11 — network-security

- prereqs: `02-ip-packet`, `03-tcp-handshake`, `04-dns-resolution`,
  `05-tls-handshake`
- spiral: `statefulness`, `latency`
- Mechanism: DDoS taxonomy (volumetric / protocol / application-layer), rate
  limiting (token bucket, sliding window), mTLS, WAF.
- Tradeoff: where to terminate defense (edge vs origin), false-positive rate
  vs coverage.
- Failure mode: BGP hijacking, DNS spoofing / cache poisoning, amplification
  vectors, TLS stripping.
- Numbers: typical 2026 attack sizes, mitigation latency.

## Step 3 — Capstone expansion

Single pass combining content renumbering, the 12-layer weave, and the
Step 1 deepen treatment (2026 actualization + extra practice widget).

- `prereqs` -> all of `01-11`.
- Keep the "one HTTPS request, end to end" spine. Add the proxy/LB hop and
  security checkpoints (rate limit, WAF, mTLS) as inline gates in the trace.
- Add alternate-path traces: a WebSocket-upgrade path and a QUIC/HTTP-3 path,
  contrasting each with the TCP+TLS+HTTP/2 baseline.
- Failure mode: a cascade across all 12 layers, including a proxy retry storm
  and a DDoS scenario.

## Verification

- `bun run build` in `site/` after every piece. Expected page count rises as
  new pieces land; `dist/lint-report.json` must stay
  `{"errors":[],"warnings":[]}`.
- i18n parity: EN and RU exist for every piece; glossary terms locked.
- Tier word budgets respected (junior / middle / senior floors and caps).
- Hydration cap: 5 islands per piece page.
- Sources present for every piece; new 2026 numbers cite a source.

## Out of scope

- Other 15 pillars.
- Restructuring or renumbering pieces 01-07.
- Visual/component changes to the pedagogy widgets themselves.
