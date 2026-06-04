# Author node unit `11-tls-and-http2` (encyclopedia round)

Branch: `expand-node-tls`. **First read** `docs/superpowers/parallel-prompts/PROTOCOL.md` and plan Task 6 in `docs/superpowers/plans/2026-06-04-node-encyclopedia-mastery-lab.md`. Exemplar: `site/src/content/lessons/en/deployment/01-image-layers/01-overview/index.mdx`. Commit to `expand-node-tls` only; **do NOT merge/push**.

## Append this unit object to `site/src/content/units.json` (order 11)
```json
{ "id": "node/11-tls-and-http2", "slug": "11-tls-and-http2", "track": "node", "order": 11,
  "title": { "en": "TLS and HTTP/2", "ru": "TLS и HTTP/2" },
  "crux": { "en": "Encrypted transport and the multiplexed protocol above it.", "ru": "Шифрованный транспорт и мультиплексируемый протокол над ним." },
  "lessons": ["01-tls-and-https", "02-http2-and-alpn", "03-http-client-deep"] }
```

## Lessons (EN+RU each, status:ready, ≥1 diagram, practice ~6 tasks)
Paths: `site/src/content/lessons/{en,ru}/node/11-tls-and-http2/<lesson>/index.mdx` + practice `site/src/content/practice/node/11-tls-and-http2/<lesson>.json`.

1. **`01-tls-and-https`** (middle) — `tls`/`https.createServer`, certificates + chain (ship the full chain!), the handshake, SNI, session resumption/tickets, `secureContext`, common cert errors.
2. **`02-http2-and-alpn`** (senior) — `http2` core module, streams + multiplexing (HTTP-layer head-of-line blocking solved), ALPN negotiation, why server push was deprecated, h2c vs h2, when HTTP/2 actually helps.
3. **`03-http-client-deep`** (middle) — the client side: `undici` (modern client), keep-alive connection pools, `Agent`/`Pool`, connection reuse vs per-request sockets, timeouts/retries, global `fetch` built on undici.

Sources from nodejs.org `tls`/`http2`, undici docs, the HTTP/2 RFC summary. Depth middle/senior.

## Verify
- Zod-pre-validate practice JSON before building (PROTOCOL.md).
- `cd site && bun run build 2>&1 | tail -10` → `Complete!`, errors `0`.
- READ-ONLY correctness review (TLS/handshake/HTTP2 claims, RU); fix.
- Commit `content(node): unit 11-tls-and-http2 EN+RU ready`. Report branch + SHA + counts.
