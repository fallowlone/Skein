# English → B2 — P3 Design Addendum: Output Tasks + BYOK

> Addendum to the approved parent spec `docs/superpowers/specs/2026-05-30-english-to-b2-design.md` (§3.3 output, §6 BYOK, §8 P3, §10 testing) and the P1/P2 addenda.
> P0–P2 are merged to `main`. This addendum locks the P3-specific decisions made during brainstorming. **This phase handles cryptographic key material and a live Content-Security-Policy; the BYOK core must pass a `security-review` pass before merge.**

## 1. Scope

P3 delivers production-writing **output tasks** with **AI grading on the user's own Anthropic key (BYOK)**, encrypted at rest, with graceful no-key degradation, plus a site-wide **Content-Security-Policy**.

**In scope:**
1. A BYOK key store: AES-GCM encryption at rest, two modes (device / passphrase), excluded from sync + logs.
2. A direct-browser Anthropic grading client (raw `fetch`, no SDK).
3. A grading contract + defensive parser.
4. ~20 bilingual output tasks (data modules).
5. An Output module island (write → grade or self-assess) + a key-entry UI with the security disclosure.
6. A site-wide CSP (`connect-src` includes `api.anthropic.com`), audited so it does not break islands/fonts.
7. Today output slot + hub Output section.

**Out of scope (later phases):** grammar + vocab→B2 + B2 reading (P4); Today polish/dashboards (P5); account-sync graduation of english-state. AI features beyond grading.

## 2. Security model (the core; parent §6)

Threat model: protect the user's own API key on their own device against casual disk/localStorage inspection and accidental leakage (sync, logs, analytics). The adversary is **not** the user. The honest residual risk (XSS exfiltration during a call) is documented to the user and mitigated by CSP + static site + at-rest encryption.

**`english/byok/` — pure of UI/DOM. Public API exposes only:**
- `hasKey(): Promise<boolean>` — a key is stored.
- `keyStatus(): Promise<"none" | "device" | "locked" | "unlocked">` — none = no key; device = stored, usable this session; locked = passphrase mode, needs `unlock`; unlocked = passphrase mode, unlocked this session.
- `setKey(apiKey: string, opts: { mode: "device" | "passphrase"; passphrase?: string }): Promise<void>`
- `unlock(passphrase: string): Promise<boolean>` — passphrase mode, per session.
- `clearKey(): Promise<void>` — wipes the store.
- `withKey<T>(fn: (key: string) => Promise<T>): Promise<T>` — decrypts transiently, calls `fn`, drops plaintext from scope. **Never returns the plaintext key to callers.**

**Crypto (`byok/crypto.ts`):**
- Encryption key: `AES-GCM` 256-bit. **Device mode:** `crypto.subtle.generateKey(..., /* extractable */ false, ["encrypt","decrypt"])` — stored as a `CryptoKey` object in IndexedDB (structured-clone persists the handle; raw bytes never accessible to JS). **Passphrase mode:** the key is derived from the passphrase via `PBKDF2` (≥600 000 iterations, SHA-256, random 16-byte salt); the derived `CryptoKey` is non-extractable and lives only in memory after `unlock`.
- At rest: the API key is AES-GCM encrypted with a fresh random 96-bit IV per encryption; only **ciphertext + IV** (and, for passphrase mode, the salt + a mode marker) are persisted. Plaintext is never written to any persistent store.

**Storage (`byok/store.ts`):** a dedicated IndexedDB database `awesome.english.byok`, holding one record `{ mode, ciphertext, iv, salt? , cryptoKey? }`. The `cryptoKey` (device mode) is the non-extractable handle. **This database is never read into `englishState`, never pushed by account-sync, and never serialized to logs/analytics.** A test asserts the synced user-state payload contains no key field and that the byok store is a separate database.

**No-leak rules:** the plaintext key is decrypted only transiently inside `withKey`, used for a single fetch, and dropped. It is never `console.log`'d, never stored in a signal, never put in the DOM.

## 3. Anthropic grading client (`english/byok/anthropic.ts`)

- **Raw `fetch`** to `https://api.anthropic.com/v1/messages` — no `@anthropic-ai/sdk` dependency (smaller attack surface, simpler CSP, no bundle bloat).
- Headers: `x-api-key` (from `withKey`), `anthropic-version`, `content-type: application/json`, and **`anthropic-dangerous-direct-browser-access: true`** (the documented BYOK browser pattern). Honest tradeoff (parent §6.2) shown at key entry.
- System prompt = the strict grading rubric, sent with `cache_control: { type: "ephemeral" }` so the rubric is **prompt-cached** across attempts.
- Model: chosen from a small allowlist — `claude-haiku-4-5` (default) and `claude-sonnet-4-6` — set in english settings (`gradingModel`).
- Guards: a client-side **rate limit** (e.g. ≥1 call / 5 s, ≤N/day) and an **input length cap** (reject over-long responses before calling) to bound spend.
- `gradeOutput(task, userText): Promise<GradingResult>` — composes the request, calls `withKey`, parses via `grading.ts`. Network/HTTP/parse failures surface as a typed error the UI shows gracefully (never leaks the key).

## 4. Grading contract (`english/byok/grading.ts`, pure)

```
GradingResult {
  corrections: { before: string; after: string; why: string }[]
  betterVersion: string
  scoreBand: "A2" | "B1" | "B2" | "C1"
  noticingHints: string[]
}
```
The rubric instructs the model to return exactly this JSON. `parseGrading(text: string): GradingResult | null` extracts the JSON (tolerating code-fences/prose around it) and validates the shape; returns `null` on any mismatch. Contract-tested against mock model outputs (valid, fenced, malformed) — the Anthropic client is mocked; no network in tests (parent §10).

## 5. Output tasks data (`english/data/output/`)

```
OutputTask {
  id: string
  band: "A2" | "B1" | "B2"
  type: "pr-comment" | "standup" | "design-rationale" | "bug-report"
       | "incident-summary" | "commit-message" | "rfc-summary" | "review-reply"
  prompt: Bi          // the writing instruction
  rubric: string[]    // criteria the grader applies (English)
  modelAnswer?: Bi    // a strong sample, used for no-key self-assessment
  hint?: Bi
}
```
~20 tasks, engineering-leaning, across A2/B1, authored as committed data modules via subagent fan-out (2-concurrent waves per the P2 ops lesson). A validity gate asserts: unique ids; `band`/`type` in range; `prompt` bilingual; `rubric` ≥2 non-empty; `modelAnswer` (if present) bilingual; ~20 total.

## 6. State (`english/state.ts`, additive)

- `settings.gradingModel: "claude-haiku-4-5" | "claude-sonnet-4-6"` (default `claude-haiku-4-5`).
- `outputAttempts: Record<string, { at: number; scoreBand?: string }>` — last attempt per task id.
- API `setGradingModel`, `getGradingModel`, `recordOutputAttempt(id, scoreBand?, now)`, `outputAttemptOf(id)`.
- **The BYOK key is NOT in `englishState`** (separate IndexedDB; out of the synced payload). `load()` defaults the new fields; `resetEnglish()` clears `outputAttempts` (but does **not** touch the byok store — clearing the key is an explicit `clearKey()` action).

## 7. UI

- **`KeyEntry.tsx`** — enter API key; choose mode (device / passphrase + passphrase field); choose grading model; shows the parent §6.2 security tradeoff disclosure (what direct-browser means, the XSS residual risk, that the key is the user's own and encrypted at rest). Calls `setKey`. A "remove key" action calls `clearKey`. For passphrase mode, an `unlock` prompt appears when `keyStatus()==="locked"`.
- **`OutputModule.tsx`** — lists output tasks at the learner's band; pick one → write a response in a textarea → submit. **With a usable key:** calls `gradeOutput`, renders corrections / better version / score band / noticing hints, records the attempt. **No usable key (`none`/`locked`):** reveals `modelAnswer` + rubric for self-assessment (Swain noticing still operates), with an "add key" / "unlock" CTA. Clearly marks which features need a key.

## 8. CSP (audited, site-wide)

The site currently has **no CSP**. P3 adds one via `<meta http-equiv="Content-Security-Policy">` in `Topic.astro`'s `<head>`. Because a wrong policy breaks the live site, the CSP task must **audit the built output first** (`dist/`) for inline scripts/styles and external origins, then craft directives, then **verify with a full build + a browser smoke check** (fonts load, an island hydrates, no CSP violations in console).

Known origins to allow: `connect-src 'self' https://api.anthropic.com`; `font-src https://fonts.gstatic.com`; `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'` (Tailwind/Astro inline styles); `script-src 'self'` plus whatever Astro island hydration requires (module scripts are same-origin files; if Astro emits inline bootstrap scripts, use hashes or, as a documented fallback, `'unsafe-inline'` for `script-src` — decided during the audit based on the actual `dist/` output); `img-src 'self' data:`; `default-src 'self'`. The exact policy is finalized by the audit, not guessed here.

If enforcing a safe `script-src` proves to break Astro hydration in the audit, the task **documents the finding and falls back to the minimal working policy** (still pinning `connect-src` to self + Anthropic, which is the BYOK-relevant control), rather than shipping a broken site.

## 9. Today + hub

- **Today** gains an output slot: surface one output task occasionally (every few days, not daily — parent §4.3 #4) at the learner's band, linking into the Output section.
- **Hub** `/[lang]/english/`: Today + Reading + **Output**. Per-island hydration stays `client:visible`.

## 10. Testing (parent §10)

- **BYOK crypto:** round-trip encrypt→decrypt yields the original key; the stored record contains only ciphertext/iv/salt (no plaintext); the encryption key is non-extractable (`extractable === false`); `withKey` never returns plaintext; the synced user-state payload contains no key field and the byok store is a separate IndexedDB database. (Web Crypto + IndexedDB are mocked/polyfilled in the test env as needed; if a primitive is unavailable under vitest, the test asserts the persistence shape + exclusion invariants that do not require the browser crypto engine, and the full round-trip is covered by a jsdom-compatible path.)
- **Grading contract:** `parseGrading` accepts valid + fenced JSON, rejects malformed → `null`; `gradeOutput` with a mocked fetch returns a parsed `GradingResult` and never logs the key.
- **Output data validity:** shape gate (~20 tasks, bilingual, rubric present).
- **State:** new fields persist + default on load; `resetEnglish` clears `outputAttempts` but not the byok store.
- **Build:** `bun run build` stays green (0 errors; warnings ≤ baseline 1271); CSP present in built HTML; browser smoke check passes.

## 11. Open questions — resolved for P3

- **CSP rollout:** enforced now, via audited `<meta>` policy with a build + browser verification gate; documented fallback if hydration breaks. ✓
- **Grading model:** user-selectable (`claude-haiku-4-5` default, `claude-sonnet-4-6`). ✓
- **Passphrase hardening:** included now (device default + optional PBKDF2 passphrase mode). ✓
- **Output corpus size:** ~20 tasks, engineering-leaning, A2/B1. ✓
- **SDK vs fetch:** raw `fetch`, no SDK. ✓

## 12. Isolation (parent §9)

- `english/byok/crypto.ts` — Web Crypto primitives; no UI, no IndexedDB. `byok/store.ts` — IndexedDB only. `byok/anthropic.ts` — network only (uses `withKey`). `byok/grading.ts` — pure parser. `byok/index.ts` — composes the public API; the only module that wires store+crypto together.
- `english/data/output/*` — pure data.
- `components/english/{KeyEntry,OutputModule}.tsx` — islands; depend on byok + state + data.
- The byok store is the only place key material lives; nothing else imports plaintext.

## 13. Build order within P3

1. BYOK crypto + store + index (key store, two modes) + crypto/exclusion tests. **security-review here.**
2. Grading contract parser + tests.
3. Anthropic direct-browser client (raw fetch, rate-limit, length cap) + mocked-client test.
4. Output tasks data (~20) + validity gate.
5. State additions (gradingModel, outputAttempts) + tests.
6. KeyEntry island (modes, model picker, disclosure).
7. OutputModule island (grade / self-assess degradation).
8. CSP audit + `<meta>` policy + build/browser verification.
9. Today output slot + hub Output section.
10. Full build green; i18n labels.

Each step leaves the build green; the BYOK core (steps 1–3) gets a dedicated security review before the phase merges.
