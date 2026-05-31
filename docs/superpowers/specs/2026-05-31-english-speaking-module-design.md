# English Speaking Module — Design

**Date:** 2026-05-31
**Status:** Approved (brainstorm), pending implementation plan
**Branch:** `english-speaking-module` (off `main`)
**Layer:** English-for-Engineers (`src/english/*`, `src/components/english/*`)

## Goal

Add **speaking practice** to the English layer, which today covers reading,
vocabulary, grammar/collocations, and written output. Listening is explicitly
out of scope for this iteration (speaking only).

Target quality bar: **intelligibility + AI feedback** — "were you understood,
and how do you improve" — not phoneme-level pronunciation scoring (that would
require forced alignment or a paid Azure-style service and is deliberately
excluded). The design uses only the browser and the existing BYOK→Anthropic
channel; no new backend service, no new third-party data origin.

## Constraints (from the existing architecture)

- **Static site** (Astro 5 + Preact islands), deployed on Cloudflare Pages.
- **BYOK** reaches **only** `api.anthropic.com`; CSP `connect-src` is locked to
  `'self' https://api.anthropic.com`. Anthropic has no audio (TTS/STT) APIs.
- The site's security story (see `KeyEntry.tsx` disclosure) leans on the strict
  CSP. Any CSP change must be scoped and must **not** widen the exfiltration
  channel (`connect-src`).
- Reuse the existing, already-clean BYOK client (`src/english/byok/anthropic.ts`):
  deps-injected + testable, prompt caching (`cache_control: ephemeral`) already
  in place, Haiku/Sonnet model toggle, input cap, transient `withKey`.

## Decisions (locked during brainstorm)

| # | Decision |
|---|----------|
| Scope | Speaking only (listening deferred). |
| Quality target | Intelligibility (A) + Claude feedback (B). No phoneme scoring (C rejected). |
| Modes | All three: **Shadow**, **Speak** (open prompt), **Talk** (conversation). |
| STT engines | `SpeechRecognizer` abstraction. Default Web Speech; optional on-device Whisper. |
| On-device engine | `whisper-tiny.en` via `@xenova/transformers` (WebGPU→CPU), opt-in download. |
| Model hosting | **Cloudflare R2** (free: 10 GB + zero egress), served **same-origin** → no `connect-src` change. |
| Cost model | Haiku 4.5 default + prompt caching + turn caps + short replies; Sonnet only for Talk end-review. |
| In-browser LLM | Deferred as a future opt-in ("download offline tutor"), same R2 pattern. |

## Architecture & placement

Speaking is its **own page** at `/[lang]/english/speaking/` (linked as a
tab/card from the English hub). A dedicated route — rather than a tab inside the
existing English single-page island — so the WASM-related CSP additions are
**scoped to this route only**; the rest of the site keeps the strict CSP.

One Preact island `SpeakingModule.tsx` hosts a segmented switch over three
sub-modes (Shadow / Speak / Talk), an engine selector + privacy badge, a
mic-permission gate, and the "Download offline voice engine" control.

Shared infrastructure:

- **STT** via `SpeechRecognizer` (`src/english/speech/recognizer.ts`).
- **TTS** via `SpeechSynthesis` wrapper (`src/english/speech/tts.ts`).
- **BYOK** via existing `src/english/byok/*`, extended with speech grading and
  conversation calls.
- **Progress tracking** via the existing English progression engine
  (`src/scripts/progression`). Speaking-specific **achievements are deferred** —
  v1 records activity/progress only; gamified achievements come in a later pass.

## STT engine abstraction

```ts
interface RecognitionResult {
  transcript: string;
  words: { text: string; confidence?: number }[];
  confidence: number;
}

interface SpeechRecognizer {
  id: "webspeech" | "whisper";
  available(): boolean;                 // webspeech: feature-detect; whisper: model cached?
  start(): Promise<void>;               // request mic permission, begin capture
  stop(): Promise<RecognitionResult>;   // end capture, return transcript
}
```

**WebSpeechRecognizer (default).** Wraps `webkitSpeechRecognition`. Free,
available in Chrome/Edge/Safari. Audio is sent to the browser's cloud STT
(Google/Apple) — surfaced honestly via a "cloud" privacy badge. Firefox →
`available() === false`.

**WhisperRecognizer (opt-in; private, offline, Firefox-capable).**
- Runtime `@xenova/transformers` (onnxruntime-web, WebGPU with CPU fallback)
  bundled from npm under `'self'`.
- Weights (`whisper-tiny.en`, ~40 MB) live in **R2**, served same-origin (via a
  Pages binding / custom domain) so `env.remoteHost` points at our own domain
  and `connect-src` is untouched.
- Capture via `MediaRecorder` → blob → local Whisper decode. **Audio never
  leaves the device.**
- Download is an explicit "Download offline voice engine (~40 MB)" control with
  progress; cached in Cache Storage / IndexedDB after first use → instant
  thereafter.

**Selection.** Auto-select (Whisper if downloaded, else Web Speech) plus a manual
toggle in module settings. If neither is available (Firefox without a downloaded
model), modes degrade softly behind a banner ("enable Whisper or open in
Chrome/Safari").

## Exercise modes

### Shadow — pronunciation / intelligibility (no BYOK, fully local)

```
target sentence → [TTS reads the model] → user records → speaks
→ STT transcript → token-level diff (word Levenshtein, normalize case/punct)
→ score = matched / total; highlight ✓ correct / ✗ unrecognized / ~ substituted
→ repeat or next
```

Local and fast, no key required. Labeled clearly as "were you understood" —
intelligibility, not phoneme accuracy. Implemented by `diff.ts`.

### Speak — open prompt monologue (BYOK)

```
prompt → user records monologue → STT transcript → show transcript (hand-editable
to fix STT slips) → "Get feedback" → Claude grades: band (A2–C1), grammar,
vocabulary, coherence, 1–2 "notice next time" → optional modelAnswer (+ TTS).
```

Reuses the `OutputModule` feedback UI and `GradingResult` shape. Routed through a
new `gradeSpeech` with a speech-tuned system prompt ("this is **spoken** English;
assess fluency/coherence/vocabulary; **ignore** punctuation and recognition
artifacts").

### Talk — conversation partner (BYOK)

```
scenario (role + goal) → Claude opens (text + TTS) → user records → STT transcript
→ append to messages[] → Claude replies (text + TTS) → loop
→ "End & review" → Claude final summary: what went well, 3 errors, level, what to
  practice.
```

Conversation state is a `messages[]` array carried through the BYOK channel
(multi-turn). Turn cap (6–10) + optional timer bound spend. Replies instructed to
be ≤2 sentences. Transcript of the session is saved to progress.

**Scoring summary:** Shadow = local diff; Speak/Talk = Claude.

## BYOK extension (same conventions as `anthropic.ts`)

New focused modules under `src/english/byok/`, all deps-injected and testable,
all using the shared transient `withKey`, the existing API constants, and
`cache_control: ephemeral` on cached system blocks.

- **`speech.ts` → `gradeSpeech(task, transcript, deps)`** — clone of
  `gradeWithClient` with a cached `SPEECH_SYSTEM`. Returns the existing
  `GradingResult` (band + corrections + noticingHints) so UI/progress reuse 1:1.
- **`converse.ts` → `converse(messages, scenario, deps)`** — `system` = scenario
  role+goal with `cache_control: ephemeral` (cuts per-turn input ~90%);
  `messages` = growing array; `max_tokens ≈ 300`; "≤2 sentences" instruction;
  default **Haiku**. Returns assistant reply text.
- **`converse.ts` → `endReview(messages, deps)`** — single call, default
  **Sonnet**: structured final review (JSON parsed alongside `parseGrading`).
- **`postMessages(body, deps)`** — shared helper factoring fetch + `withKey` +
  headers (DRY with `anthropic.ts`).

Turn caps and input-length caps live in the UI/service layer.

### Cost model

- **Shadow** — 0 tokens (local diff).
- **Speak** — one grade call (~600–800 in / ~300 out) per attempt; pennies on
  Haiku.
- **Talk** — the only meaningful cost. Controlled by: Haiku turns + prompt
  caching (~90% input reduction per turn) + turn cap + short replies; Sonnet used
  only once for the end review. Estimated ≈ 1–3¢ per Talk session on the user's
  own key.

## Content sources

- **Shadow** → example sentences from `src/english/data/vocab-a2|b1|b2.ts` (each
  `VocabWord` has an example) + sentences from reading `Passage`s, filtered by the
  learner's band. No new authoring.
- **Speak** → existing `OutputTask` bank (prompt + rubric + modelAnswer), used
  as-is; only the grading function differs. No new authoring.
- **Talk** → the one new content file: `src/english/data/scenarios.ts`, ~10–12
  scenarios `{ id, level, role, goal, opening, titleRu }`, engineering-flavored
  (standup update, code-review chat, incident postmortem, sprint planning,
  "explain a bug to a PM", scope negotiation). Scenario content is English (the
  point); RU only for the UI title/instructions.

## Privacy, permissions, degradation, CSP

**Mic permission.** `getUserMedia` prompts on first record. Denied → record modes
softly disabled with a clear message; permission state surfaced in the UI.

**Privacy badges** (tone mirrors the `KeyEntry` disclosure):
- Web Speech → "cloud": audio goes to the browser's cloud STT (Google/Apple).
- Whisper → "on-device": audio never leaves the device.
- BYOK Speak/Talk: only the **text transcript** is sent to `api.anthropic.com`;
  raw audio is never sent to Anthropic.

**CSP.** `connect-src` is **unchanged** (model is same-origin R2; audio is local;
text goes only to Anthropic). The WASM runtime requires two scoped additions on
the Speaking route only:
- `script-src 'wasm-unsafe-eval'` — permits WebAssembly compilation (narrow: WASM
  only, not JS eval).
- `worker-src 'self' blob:` — onnxruntime/transformers.js runs inference in a
  worker.

Key insight: the exfiltration channel is `connect-src`, which does **not**
change, so the BYOK key still has nowhere new to go. `'unsafe-inline'` is already
present in `script-src`, so `'wasm-unsafe-eval'` does not worsen the XSS posture.
`Topic.astro` gains an optional `cspExtra` prop; only the Speaking page passes the
WASM additions.

**Degradation matrix:**

| Environment | Shadow | Speak | Talk |
|---|---|---|---|
| Chrome/Safari, no model | ✓ (cloud STT) | ✓ | ✓ |
| Firefox, no model | ⚠ offer Whisper | ⚠ | ⚠ |
| Any + Whisper downloaded | ✓ offline | ✓ | ✓ |
| No BYOK key | ✓ | self-assess vs modelAnswer | disabled + "add key" |
| No mic permission | record off | off | off |

Shadow is fully offline (with Whisper); Speak/Talk always need network + key
(Anthropic).

## Files & components

**Services — `src/english/speech/`**
- `recognizer.ts` — `SpeechRecognizer` interface + `WebSpeechRecognizer`,
  `WhisperRecognizer`, `pickRecognizer()`.
- `whisper.ts` — transformers.js setup, R2 same-origin weight load,
  download-with-progress, Cache Storage caching, `available()`.
- `tts.ts` — `SpeechSynthesis` wrapper (rate/voice).
- `diff.ts` — token-Levenshtein word diff + score (Shadow).

**BYOK — `src/english/byok/`**
- `speech.ts` — `gradeSpeech` (+ `SPEECH_SYSTEM`).
- `converse.ts` — `converse`, `endReview`, `postMessages`.

**Data**
- `src/english/data/scenarios.ts` — Talk scenario bank (the only new content).

**Types — `src/english/types.ts`**
- Add `RecognitionResult`, `Scenario`, `ConversationTurn`. Grading reuses the
  existing `GradingResult`.

**Components — `src/components/english/`**
- `SpeakingModule.tsx` — shell (segment switch, engine selector, privacy badge,
  mic gate, download control).
- `ShadowExercise.tsx`, `SpeakExercise.tsx` (reuses `OutputModule` feedback UI),
  `TalkSession.tsx`.

**Routing / layout**
- New page `src/pages/[lang]/english/speaking.astro`.
- Link from the English hub (`src/pages/[lang]/english/index.astro`).
- `Topic.astro` — optional `cspExtra` prop for the WASM CSP additions.

**Operator setup (not code)** — documented as a setup step (like github-auth):
create an R2 bucket, upload the `whisper-tiny.en` ONNX files, serve them from the
site domain.

## Testing

- **Unit (vitest):** `diff` scoring; `pickRecognizer` selection (mock feature
  detection); `gradeSpeech` / `converse` / `endReview` with an injected fake
  `fetch` (mirrors `anthropic.test.ts`); `scenarios` schema; `tts` (mock
  `speechSynthesis`); Whisper `available()` / cache / progress (mock Cache
  Storage) — no real WASM in unit tests.
- **E2E (Playwright, repo recipe):** stub `getUserMedia` + `SpeechRecognition`
  with a canned transcript → Shadow diff renders; Speak grade flow (mock Anthropic
  fetch); Talk turn loop; denied-mic path. Light + dark, mobile 390px.
- **Build gate:** stays green (the new route adds en/ru pages → page count rises;
  lint clean).
- **Manual:** real mic + real Whisper download on Chrome and Firefox; real BYOK
  key smoke for Speak/Talk.

## Out of scope (deferred)

- Listening/aural comprehension (separate iteration).
- Speaking achievements / gamification (v1 tracks progress only; achievements later).
- Phoneme-level pronunciation scoring (Azure / forced alignment).
- In-browser LLM for fully-free Speak/Talk (future opt-in, same R2 pattern).
- Vosk engine (the `SpeechRecognizer` abstraction leaves room to add it later).
