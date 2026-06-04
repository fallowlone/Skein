# Author node unit `10-networking-deep` (encyclopedia round)

Branch: `expand-node-net`. **First read** `docs/superpowers/parallel-prompts/PROTOCOL.md` (build/commit/safety + all practice-JSON gotchas) and plan Task 5 in `docs/superpowers/plans/2026-06-04-node-encyclopedia-mastery-lab.md`. Exemplar to mirror for MDX shape/frontmatter/diagram/practice: `site/src/content/lessons/en/deployment/01-image-layers/01-overview/index.mdx` + its practice JSON. Commit to `expand-node-net` only; **do NOT merge/push**.

## Append this unit object to `site/src/content/units.json` (order 10)
```json
{ "id": "node/10-networking-deep", "slug": "10-networking-deep", "track": "node", "order": 10,
  "title": { "en": "Networking, deep", "ru": "Сеть, глубже" },
  "crux": { "en": "Below HTTP: raw TCP and UDP sockets, and the production traps.", "ru": "Ниже HTTP: сырые TCP- и UDP-сокеты и продакшн-ловушки." },
  "lessons": ["01-tcp-and-net", "02-udp-and-dgram", "03-sockets-in-production"] }
```

## Lessons (EN+RU each, status:ready, ≥1 structural diagram, per-lesson practice ~6 tasks)
Paths: `site/src/content/lessons/{en,ru}/node/10-networking-deep/<lesson>/index.mdx` + practice `site/src/content/practice/node/10-networking-deep/<lesson>.json`.

1. **`01-tcp-and-net`** (middle) — `net` module, `net.createServer`/`net.Socket`, connection lifecycle, `data`/`end`/`error`/`close`, half-open (`allowHalfOpen`), Nagle + `socket.setNoDelay`, `socket.setKeepAlive`, the write() boolean return = socket-level backpressure, `ref`/`unref`.
2. **`02-udp-and-dgram`** (middle) — `dgram`, datagrams vs streams, `send`/`message`, no delivery/order guarantees, message size/MTU, broadcast + multicast, when UDP wins (metrics, discovery, games, DNS).
3. **`03-sockets-in-production`** (senior) — timeouts (`setTimeout`), idle/keep-alive tuning, socket backpressure under load, `ECONNRESET`/`EPIPE` handling, `server.maxConnections`, graceful close, file-descriptor exhaustion failure mode.

`prereqs` may reference `05-http-and-frameworks/01-http-module`. Sources from nodejs.org `net`/`dgram` API docs + a real production write-up. Depth = middle/senior (mechanism + tradeoff + real failure mode), no shallow doc-restating.

## Verify
- Zod-pre-validate every practice JSON against `PracticeTask` BEFORE building (PROTOCOL.md).
- `cd site && bun run build 2>&1 | tail -10` → `Complete!`, lint errors `0`.
- READ-ONLY correctness review over the new lessons (TCP/UDP semantics, RU accuracy); fix confirmed errors.
- Commit `content(node): unit 10-networking-deep EN+RU ready`. Report branch + final SHA + lesson/practice counts.
