# English Speaking Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a speaking-practice module (Shadow / Speak / Talk) to the English layer, using browser STT/TTS plus the existing BYOK→Anthropic channel, with an optional on-device Whisper engine.

**Architecture:** Pure-logic services (`src/english/speech/*`) behind a `SpeechRecognizer` interface; BYOK extensions (`src/english/byok/{speech,converse}.ts`) mirroring the existing deps-injected `anthropic.ts`; three Preact islands on a dedicated `/[lang]/english/speaking/` route whose WASM CSP additions are scoped via a `cspExtra` prop on `Topic.astro`; Whisper weights served same-origin through a Pages Function proxy over R2.

**Tech Stack:** Astro 5, Preact, TypeScript, vitest (unit), Playwright (E2E), `@xenova/transformers` (Whisper WASM), Web Speech API, Cloudflare Pages Functions + R2.

**Spec:** `docs/superpowers/specs/2026-05-31-english-speaking-module-design.md`

**Conventions to follow:**
- Tests live beside source as `*.test.ts`; run `bun run test` (vitest) from `site/`.
- BYOK modules take an injected `deps` object (fetch + withKey + model) — see `src/english/byok/anthropic.test.ts`.
- Import alias `~/` → `site/src/`. No `..` chains in component imports.
- After any content/component change run `bun run build` in `site/`; lint must stay clean.
- Commit after each task. End messages with the Co-Authored-By trailer.

---

## File Structure

**Create:**
- `src/english/speech/diff.ts` — token-Levenshtein word diff + intelligibility score (Shadow).
- `src/english/speech/tts.ts` — `SpeechSynthesis` wrapper.
- `src/english/speech/recognizer.ts` — `SpeechRecognizer` interface, `WebSpeechRecognizer`, `pickRecognizer`.
- `src/english/speech/whisper.ts` — Whisper engine: load/cache/available/download-progress + `WhisperRecognizer`.
- `src/english/speech/shadow-source.ts` — pick shadow sentences from vocab/reading by band.
- `src/english/byok/speech.ts` — `gradeSpeech` (+ `SPEECH_SYSTEM`).
- `src/english/byok/converse.ts` — `postMessages`, `converse`, `endReview` (+ `parseReview`).
- `src/english/data/scenarios.ts` — Talk scenario bank.
- `src/components/english/SpeakingModule.tsx` — shell.
- `src/components/english/ShadowExercise.tsx`, `SpeakExercise.tsx`, `TalkSession.tsx`.
- `src/pages/[lang]/english/speaking.astro` — route.
- `functions/models/[[path]].ts` — R2 proxy for Whisper weights.
- `src/lib/csp.ts` — CSP string builder (shared by Topic.astro).
- Matching `*.test.ts` files.

**Modify:**
- `src/english/types.ts` — add `RecognitionResult`, `Scenario`, `ConversationTurn`, `SpeechReview`.
- `src/layouts/Topic.astro` — add optional `cspExtra` prop; build CSP via `src/lib/csp.ts`.
- `src/pages/[lang]/english/index.astro` — add a Speaking entry/link.
- `wrangler.toml` — add R2 binding `MODELS`.
- `package.json` — add `@xenova/transformers` dependency.

---

## Phase A — Speech services

### Task 1: Word-diff + intelligibility score (`diff.ts`)

**Files:**
- Create: `src/english/speech/diff.ts`
- Test: `src/english/speech/diff.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/english/speech/diff.test.ts
import { describe, it, expect } from "vitest";
import { normalizeWords, scoreShadow } from "./diff";

describe("normalizeWords", () => {
  it("lowercases, strips punctuation, splits on whitespace", () => {
    expect(normalizeWords("The DOM, and CSSOM!")).toEqual(["the", "dom", "and", "cssom"]);
  });
});

describe("scoreShadow", () => {
  it("perfect match scores 1 and marks every word ok", () => {
    const r = scoreShadow("preload the scanner", "Preload the scanner.");
    expect(r.score).toBe(1);
    expect(r.tokens.map((t) => t.status)).toEqual(["ok", "ok", "ok"]);
  });

  it("missing word marks it and lowers the score", () => {
    const r = scoreShadow("the quick brown fox", "the brown fox");
    expect(r.tokens.find((t) => t.target === "quick")?.status).toBe("missing");
    expect(r.score).toBeCloseTo(0.75, 5);
  });

  it("substituted word is flagged as sub", () => {
    const r = scoreShadow("commit the change", "commit the chance");
    expect(r.tokens.find((t) => t.target === "change")?.status).toBe("sub");
    expect(r.score).toBeCloseTo(2 / 3, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/speech/diff.test.ts`
Expected: FAIL — "Cannot find module './diff'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/english/speech/diff.ts
export type ShadowToken = {
  target: string;
  status: "ok" | "missing" | "sub";
  heard?: string;
};
export type ShadowResult = { score: number; tokens: ShadowToken[] };

export function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .split(/\s+/)
    .filter(Boolean);
}

/** Word-level Levenshtein alignment of `said` against `target`. */
export function scoreShadow(said: string, target: string): ShadowResult {
  const a = normalizeWords(target); // reference
  const b = normalizeWords(said);   // heard
  const n = a.length, m = b.length;
  // DP edit-distance table with backpointers.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  // Backtrace to label each reference word.
  const tokens: ShadowToken[] = [];
  let i = n, j = m, matched = 0;
  while (i > 0) {
    if (j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] === b[j - 1]) { tokens.push({ target: a[i - 1], status: "ok", heard: b[j - 1] }); matched++; }
      else tokens.push({ target: a[i - 1], status: "sub", heard: b[j - 1] });
      i--; j--;
    } else if (dp[i][j] === dp[i - 1][j] + 1) {
      tokens.push({ target: a[i - 1], status: "missing" });
      i--;
    } else {
      j--; // extra heard word; ignore for reference labeling
    }
  }
  tokens.reverse();
  const score = n === 0 ? 0 : matched / n;
  return { score, tokens };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/speech/diff.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/speech/diff.ts site/src/english/speech/diff.test.ts
git commit -m "feat(speaking): word-diff intelligibility score for Shadow"
```

---

### Task 2: TTS wrapper (`tts.ts`)

**Files:**
- Create: `src/english/speech/tts.ts`
- Test: `src/english/speech/tts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/english/speech/tts.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { speak, ttsAvailable } from "./tts";

describe("tts", () => {
  beforeEach(() => {
    (globalThis as any).speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => [{ lang: "en-US", name: "Test", default: true }],
    };
    (globalThis as any).SpeechSynthesisUtterance = class {
      text = ""; lang = ""; rate = 1; voice: any = null;
      constructor(t: string) { this.text = t; }
    };
  });

  it("ttsAvailable true when speechSynthesis exists", () => {
    expect(ttsAvailable()).toBe(true);
  });

  it("speak cancels prior and queues an English utterance at the given rate", () => {
    speak("hello", { rate: 0.85 });
    expect((globalThis as any).speechSynthesis.cancel).toHaveBeenCalled();
    const u = (globalThis as any).speechSynthesis.speak.mock.calls[0][0];
    expect(u.text).toBe("hello");
    expect(u.rate).toBe(0.85);
    expect(u.lang).toBe("en-US");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/speech/tts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/english/speech/tts.ts
export function ttsAvailable(): boolean {
  return typeof globalThis !== "undefined" && "speechSynthesis" in globalThis;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (!ttsAvailable()) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang.startsWith("en") && v.default)
    ?? voices.find((v) => v.lang.startsWith("en"))
    ?? null;
}

export function speak(text: string, opts: { rate?: number } = {}): void {
  if (!ttsAvailable()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickEnglishVoice();
  u.lang = voice?.lang ?? "en-US";
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 1;
  speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (ttsAvailable()) speechSynthesis.cancel();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/speech/tts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/speech/tts.ts site/src/english/speech/tts.test.ts
git commit -m "feat(speaking): SpeechSynthesis TTS wrapper"
```

---

### Task 3: Speaking types

**Files:**
- Modify: `src/english/types.ts` (append at end of file)

- [ ] **Step 1: Add the types (no test; consumed by typed tasks below)**

```ts
// append to src/english/types.ts

/** Normalized STT output, engine-agnostic. */
export type RecognitionResult = {
  transcript: string;
  words: { text: string; confidence?: number }[];
  confidence: number;
};

/** One Talk scenario. Content is English; titleRu is for the UI only. */
export type Scenario = {
  id: string;
  level: "A2" | "B1" | "B2";
  role: string;     // who Claude plays, e.g. "a senior engineer doing your code review"
  goal: string;     // what the learner is trying to do
  opening: string;  // Claude's first line (English)
  titleRu: string;  // UI label (Russian)
};

/** One turn of a Talk conversation. */
export type ConversationTurn = { role: "assistant" | "user"; text: string };

/** End-of-Talk structured review. */
export type SpeechReview = {
  wentWell: string[];
  errors: { said: string; better: string; why: string }[];
  scoreBand: "A2" | "B1" | "B2" | "C1";
  practiceNext: string[];
};
```

- [ ] **Step 2: Typecheck**

Run: `cd site && bunx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add site/src/english/types.ts
git commit -m "feat(speaking): add speech/scenario/review types"
```

---

### Task 4: Recognizer interface + Web Speech engine + selection

**Files:**
- Create: `src/english/speech/recognizer.ts`
- Test: `src/english/speech/recognizer.test.ts`

- [ ] **Step 1: Write the failing test (selection logic + web-speech feature detect)**

```ts
// src/english/speech/recognizer.test.ts
import { describe, it, expect, vi } from "vitest";
import { pickRecognizer, webSpeechAvailable } from "./recognizer";

describe("webSpeechAvailable", () => {
  it("false when neither SpeechRecognition global exists", () => {
    const g = globalThis as any;
    delete g.SpeechRecognition; delete g.webkitSpeechRecognition;
    expect(webSpeechAvailable()).toBe(false);
  });
  it("true when webkitSpeechRecognition exists", () => {
    (globalThis as any).webkitSpeechRecognition = class {};
    expect(webSpeechAvailable()).toBe(true);
    delete (globalThis as any).webkitSpeechRecognition;
  });
});

describe("pickRecognizer", () => {
  it("prefers whisper when its recognizer is available", () => {
    const whisper = { id: "whisper", available: () => true } as any;
    const web = { id: "webspeech", available: () => true } as any;
    expect(pickRecognizer({ whisper, web, prefer: "auto" }).id).toBe("whisper");
  });
  it("falls back to web speech when whisper not downloaded", () => {
    const whisper = { id: "whisper", available: () => false } as any;
    const web = { id: "webspeech", available: () => true } as any;
    expect(pickRecognizer({ whisper, web, prefer: "auto" }).id).toBe("webspeech");
  });
  it("returns null when nothing is available", () => {
    const whisper = { id: "whisper", available: () => false } as any;
    const web = { id: "webspeech", available: () => false } as any;
    expect(pickRecognizer({ whisper, web, prefer: "auto" })).toBeNull();
  });
  it("honors an explicit preference", () => {
    const whisper = { id: "whisper", available: () => true } as any;
    const web = { id: "webspeech", available: () => true } as any;
    expect(pickRecognizer({ whisper, web, prefer: "webspeech" }).id).toBe("webspeech");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/speech/recognizer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/english/speech/recognizer.ts
import type { RecognitionResult } from "~/english/types";

export interface SpeechRecognizer {
  id: "webspeech" | "whisper";
  available(): boolean;
  start(): Promise<void>;
  stop(): Promise<RecognitionResult>;
}

export function webSpeechAvailable(): boolean {
  const g = globalThis as any;
  return typeof g !== "undefined" && !!(g.SpeechRecognition || g.webkitSpeechRecognition);
}

/** Web Speech engine. Audio goes to the browser's cloud STT (not private). */
export class WebSpeechRecognizer implements SpeechRecognizer {
  id = "webspeech" as const;
  private rec: any = null;
  private finalText = "";

  available(): boolean { return webSpeechAvailable(); }

  start(): Promise<void> {
    const g = globalThis as any;
    const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
    this.rec = new SR();
    this.rec.lang = "en-US";
    this.rec.interimResults = false;
    this.rec.continuous = true;
    this.finalText = "";
    this.rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) this.finalText += e.results[i][0].transcript + " ";
      }
    };
    return new Promise((resolve, reject) => {
      this.rec.onstart = () => resolve();
      this.rec.onerror = (e: any) => reject(new Error(e.error || "speech error"));
      this.rec.start();
    });
  }

  stop(): Promise<RecognitionResult> {
    return new Promise((resolve) => {
      if (!this.rec) return resolve({ transcript: "", words: [], confidence: 0 });
      this.rec.onend = () => {
        const transcript = this.finalText.trim();
        resolve({
          transcript,
          words: transcript.split(/\s+/).filter(Boolean).map((text) => ({ text })),
          confidence: transcript ? 1 : 0,
        });
      };
      this.rec.stop();
    });
  }
}

export type PickArgs = {
  whisper: SpeechRecognizer;
  web: SpeechRecognizer;
  prefer: "auto" | "webspeech" | "whisper";
};

export function pickRecognizer({ whisper, web, prefer }: PickArgs): SpeechRecognizer | null {
  if (prefer === "whisper") return whisper.available() ? whisper : null;
  if (prefer === "webspeech") return web.available() ? web : null;
  if (whisper.available()) return whisper;
  if (web.available()) return web;
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/speech/recognizer.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/speech/recognizer.ts site/src/english/speech/recognizer.test.ts
git commit -m "feat(speaking): SpeechRecognizer interface + Web Speech engine + selection"
```

---

### Task 5: Whisper engine (load / cache / progress / capture)

**Files:**
- Modify: `package.json` (root) — add dependency
- Create: `src/english/speech/whisper.ts`
- Test: `src/english/speech/whisper.test.ts`

- [ ] **Step 1: Add the dependency**

Run: `bun add @xenova/transformers` (from repo root).
Expected: `@xenova/transformers` appears in `package.json` dependencies.

- [ ] **Step 2: Write the failing test (pure logic only — cache flag + progress reducer)**

```ts
// src/english/speech/whisper.test.ts
import { describe, it, expect } from "vitest";
import { progressReducer, type DownloadState } from "./whisper";

describe("progressReducer", () => {
  const init: DownloadState = { status: "idle", pct: 0 };

  it("moves to downloading and tracks max pct across files", () => {
    let s = progressReducer(init, { status: "progress", file: "a", progress: 20 });
    expect(s.status).toBe("downloading");
    s = progressReducer(s, { status: "progress", file: "a", progress: 55 });
    expect(s.pct).toBe(55);
  });

  it("done event marks ready at 100", () => {
    const s = progressReducer({ status: "downloading", pct: 90 }, { status: "done", file: "a" });
    expect(s).toEqual({ status: "ready", pct: 100 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd site && bun run test src/english/speech/whisper.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

```ts
// src/english/speech/whisper.ts
import type { RecognitionResult } from "~/english/types";
import type { SpeechRecognizer } from "./recognizer";

const MODEL_ID = "whisper-tiny.en";
const CACHE_FLAG = "awesome.whisper.ready";

export type DownloadState = { status: "idle" | "downloading" | "ready" | "error"; pct: number };
type ProgressEvent = { status: "progress" | "done" | "initiate" | "ready"; file: string; progress?: number };

/** Pure reducer so download UX is unit-testable without the WASM runtime. */
export function progressReducer(s: DownloadState, e: ProgressEvent): DownloadState {
  if (e.status === "progress") return { status: "downloading", pct: Math.max(s.pct, Math.round(e.progress ?? 0)) };
  if (e.status === "done") return { status: "ready", pct: 100 };
  return s;
}

export function whisperReady(): boolean {
  try { return localStorage.getItem(CACHE_FLAG) === "1"; } catch { return false; }
}

let transcriberPromise: Promise<any> | null = null;

/**
 * Lazily import transformers.js and build the ASR pipeline. Weights are served
 * same-origin from /models/<repo>/... (R2 proxy), so connect-src stays 'self'.
 */
async function loadTranscriber(onState: (s: DownloadState) => void): Promise<any> {
  if (transcriberPromise) return transcriberPromise;
  transcriberPromise = (async () => {
    const { pipeline, env } = await import("@xenova/transformers");
    env.allowLocalModels = false;
    env.remoteHost = `${location.origin}/models/`;
    env.remotePathTemplate = "{model}/";
    let st: DownloadState = { status: "downloading", pct: 0 };
    const t = await pipeline("automatic-speech-recognition", MODEL_ID, {
      quantized: true,
      progress_callback: (e: ProgressEvent) => { st = progressReducer(st, e); onState(st); },
    });
    try { localStorage.setItem(CACHE_FLAG, "1"); } catch { /* ignore */ }
    onState({ status: "ready", pct: 100 });
    return t;
  })();
  return transcriberPromise;
}

/** Decode a recorded blob to 16 kHz mono Float32 for Whisper. */
async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const Ctx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  const ac = new Ctx({ sampleRate: 16000 });
  const decoded = await ac.decodeAudioData(buf);
  const data = decoded.getChannelData(0);
  await ac.close();
  return data;
}

/** On-device Whisper recognizer. Audio never leaves the device. */
export class WhisperRecognizer implements SpeechRecognizer {
  id = "whisper" as const;
  private chunks: Blob[] = [];
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  constructor(private onState: (s: DownloadState) => void = () => {}) {}

  available(): boolean { return whisperReady(); }

  /** Explicit user-triggered download; resolves when weights are cached. */
  async download(): Promise<void> { await loadTranscriber(this.onState); }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(this.stream);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start();
  }

  async stop(): Promise<RecognitionResult> {
    const blob: Blob = await new Promise((resolve) => {
      if (!this.recorder) return resolve(new Blob());
      this.recorder.onstop = () => resolve(new Blob(this.chunks, { type: "audio/webm" }));
      this.recorder.stop();
    });
    this.stream?.getTracks().forEach((t) => t.stop());
    const audio = await blobToMono16k(blob);
    const transcriber = await loadTranscriber(this.onState);
    const out = await transcriber(audio);
    const transcript = (out?.text ?? "").trim();
    return {
      transcript,
      words: transcript.split(/\s+/).filter(Boolean).map((text: string) => ({ text })),
      confidence: transcript ? 1 : 0,
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd site && bun run test src/english/speech/whisper.test.ts`
Expected: PASS (2 tests). (Pipeline/audio paths are exercised manually + E2E with a stubbed transcriber.)

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock site/src/english/speech/whisper.ts site/src/english/speech/whisper.test.ts
git commit -m "feat(speaking): on-device Whisper engine + download progress reducer"
```

---

## Phase B — BYOK extension

### Task 6: `gradeSpeech` (Speak grading)

**Files:**
- Create: `src/english/byok/speech.ts`
- Test: `src/english/byok/speech.test.ts`

- [ ] **Step 1: Write the failing test (mirror anthropic.test.ts)**

```ts
// src/english/byok/speech.test.ts
import { describe, it, expect, vi } from "vitest";
import { gradeSpeechWithClient, type SpeechGradeDeps } from "./speech";
import type { OutputTask } from "~/english/types";

const task: OutputTask = {
  id: "s1", band: "B1", type: "standup",
  prompt: { en: "Give a spoken standup update.", ru: "..." },
  rubric: ["clear sequence", "correct tense"],
};
const valid = { corrections: [], betterVersion: "Yesterday I fixed the flaky test.", scoreBand: "B1", noticingHints: [] };

function depsWith(fetchImpl: any): SpeechGradeDeps {
  return { fetch: fetchImpl, withKey: async (fn: any) => fn("sk-ant-test"), model: "claude-haiku-4-5", now: () => 1 };
}

describe("gradeSpeechWithClient", () => {
  it("sends a speech-tuned system prompt and parses the result", async () => {
    let body: any = {};
    const fetchImpl = vi.fn(async (_u: string, init: any) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(valid) }] }) };
    });
    const r = await gradeSpeechWithClient(task, "yesterday i fix the flaky test", depsWith(fetchImpl));
    expect(r.scoreBand).toBe("B1");
    expect(body.system[0].text.toLowerCase()).toContain("spoken");
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws on empty transcript", async () => {
    await expect(gradeSpeechWithClient(task, "  ", depsWith(vi.fn()))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/byok/speech.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/english/byok/speech.ts
import type { GradingResult, OutputTask } from "~/english/types";
import { parseGrading } from "./grading";
import { withKey as defaultWithKey } from "./index";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
export const MAX_INPUT_CHARS = 4000;

export type GradeModel = "claude-haiku-4-5" | "claude-sonnet-4-6";
export type SpeechGradeDeps = {
  fetch: typeof fetch;
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  model: GradeModel;
  now: () => number;
};

const SPEECH_SYSTEM = `You are a precise English speaking coach for software engineers (CEFR A2–C1).
The learner's text is a TRANSCRIPT of SPOKEN English produced by speech recognition.
Assess fluency, coherence, grammar and vocabulary. IGNORE punctuation, casing and obvious
recognition artifacts (homophones, dropped articles that are likely mis-hears).
Reply with ONLY a JSON object:
{"corrections":[{"before":"...","after":"...","why":"..."}],"betterVersion":"...","scoreBand":"A2|B1|B2|C1","noticingHints":["..."]}
Be specific and kind. Keep betterVersion natural and at or slightly above the learner's level.`;

function userBlock(task: OutputTask, transcript: string): string {
  return `TASK: ${task.prompt.en}\nRUBRIC: ${task.rubric.join("; ")}\n\nSPOKEN TRANSCRIPT:\n${transcript}`;
}

export async function gradeSpeechWithClient(task: OutputTask, transcript: string, deps: SpeechGradeDeps): Promise<GradingResult> {
  if (transcript.trim().length === 0) throw new Error("empty transcript");
  if (transcript.length > MAX_INPUT_CHARS) throw new Error(`Transcript too long (max ${MAX_INPUT_CHARS}).`);
  const res = await deps.withKey(async (key) =>
    deps.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: deps.model,
        max_tokens: 1024,
        system: [{ type: "text", text: SPEECH_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userBlock(task, transcript) }],
      }),
    }),
  );
  if (!res.ok) throw new Error(`grading failed (HTTP ${res.status})`);
  const data = await res.json();
  const parsed = parseGrading(data?.content?.[0]?.text ?? "");
  if (!parsed) throw new Error("grading failed: could not parse model output");
  return parsed;
}

export function gradeSpeech(task: OutputTask, transcript: string, model: GradeModel): Promise<GradingResult> {
  return gradeSpeechWithClient(task, transcript, { fetch: fetch.bind(globalThis), withKey: defaultWithKey, model, now: () => Date.now() });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/byok/speech.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/byok/speech.ts site/src/english/byok/speech.test.ts
git commit -m "feat(speaking): gradeSpeech BYOK call (speech-tuned rubric)"
```

---

### Task 7: `converse` (Talk turns)

**Files:**
- Create: `src/english/byok/converse.ts`
- Test: `src/english/byok/converse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/english/byok/converse.test.ts
import { describe, it, expect, vi } from "vitest";
import { converseWithClient, type ConverseDeps } from "./converse";
import type { Scenario, ConversationTurn } from "~/english/types";

const scenario: Scenario = {
  id: "code-review", level: "B1", role: "a senior engineer reviewing your PR",
  goal: "defend your design choices", opening: "Thanks for the PR. Why a queue here?", titleRu: "Код-ревью",
};
function deps(fetchImpl: any): ConverseDeps {
  return { fetch: fetchImpl, withKey: async (fn: any) => fn("sk-ant-test"), model: "claude-haiku-4-5" };
}

describe("converseWithClient", () => {
  it("caches the scenario system block and returns the assistant reply", async () => {
    let body: any = {};
    const fetchImpl = vi.fn(async (_u: string, init: any) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: "Because spikes would drop requests." }] }) };
    });
    const history: ConversationTurn[] = [
      { role: "assistant", text: scenario.opening },
      { role: "user", text: "To absorb load spikes." },
    ];
    const reply = await converseWithClient(history, scenario, deps(fetchImpl));
    expect(reply).toContain("spikes");
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(body.system[0].text).toContain(scenario.role);
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "To absorb load spikes." });
    expect(body.max_tokens).toBeLessThanOrEqual(320);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/byok/converse.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation (converse + shared postMessages)**

```ts
// src/english/byok/converse.ts
import type { Scenario, ConversationTurn, SpeechReview } from "~/english/types";
import { withKey as defaultWithKey } from "./index";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
export const MAX_TURNS = 10;

export type GradeModel = "claude-haiku-4-5" | "claude-sonnet-4-6";
export type ConverseDeps = {
  fetch: typeof fetch;
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  model: GradeModel;
};

/** Shared POST to /v1/messages. system blocks should carry cache_control. */
export async function postMessages(body: object, deps: ConverseDeps): Promise<any> {
  const res = await deps.withKey(async (key) =>
    deps.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    }),
  );
  if (!res.ok) throw new Error(`request failed (HTTP ${res.status})`);
  return res.json();
}

function systemFor(s: Scenario): string {
  return `You are role-playing ${s.role} in a spoken English practice conversation with a software engineer learning English (level ${s.level}).
The learner's goal: ${s.goal}. Stay in character. Keep EVERY reply to at most 2 short sentences.
Speak natural, current professional English. Do not correct the learner mid-conversation; just converse.`;
}

export async function converseWithClient(history: ConversationTurn[], scenario: Scenario, deps: ConverseDeps): Promise<string> {
  const messages = history.map((t) => ({ role: t.role, content: t.text }));
  const data = await postMessages({
    model: deps.model,
    max_tokens: 300,
    system: [{ type: "text", text: systemFor(scenario), cache_control: { type: "ephemeral" } }],
    messages,
  }, deps);
  return (data?.content?.[0]?.text ?? "").trim();
}

export function converse(history: ConversationTurn[], scenario: Scenario, model: GradeModel = "claude-haiku-4-5"): Promise<string> {
  return converseWithClient(history, scenario, { fetch: fetch.bind(globalThis), withKey: defaultWithKey, model });
}

// endReview + parseReview are added in Task 8.
export function parseReview(_text: string): SpeechReview | null { return null; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/byok/converse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/byok/converse.ts site/src/english/byok/converse.test.ts
git commit -m "feat(speaking): Talk conversation turns (cached scenario, capped replies)"
```

---

### Task 8: `endReview` + `parseReview`

**Files:**
- Modify: `src/english/byok/converse.ts`
- Test: `src/english/byok/converse.test.ts` (add cases)

- [ ] **Step 1: Add failing tests**

```ts
// add to src/english/byok/converse.test.ts
import { endReviewWithClient, parseReview } from "./converse";

describe("parseReview", () => {
  it("parses a fenced JSON review", () => {
    const txt = '```json\n{"wentWell":["clear"],"errors":[{"said":"i go","better":"I went","why":"past tense"}],"scoreBand":"B1","practiceNext":["past simple"]}\n```';
    const r = parseReview(txt)!;
    expect(r.scoreBand).toBe("B1");
    expect(r.errors[0].better).toBe("I went");
  });
  it("returns null on garbage", () => {
    expect(parseReview("no json here")).toBeNull();
  });
});

describe("endReviewWithClient", () => {
  it("defaults to Sonnet and parses the review", async () => {
    let body: any = {};
    const fetchImpl = vi.fn(async (_u: string, init: any) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: '{"wentWell":[],"errors":[],"scoreBand":"B2","practiceNext":[]}' }] }) };
    });
    const r = await endReviewWithClient(
      [{ role: "assistant", text: "hi" }, { role: "user", text: "hello" }],
      { fetch: fetchImpl, withKey: async (fn: any) => fn("k"), model: "claude-sonnet-4-6" },
    );
    expect(r.scoreBand).toBe("B2");
    expect(body.model).toBe("claude-sonnet-4-6");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd site && bun run test src/english/byok/converse.test.ts`
Expected: FAIL — `endReviewWithClient` not exported; `parseReview` returns null for valid JSON.

- [ ] **Step 3: Replace the placeholder with real implementations**

```ts
// in src/english/byok/converse.ts — replace the placeholder parseReview and add endReview

const REVIEW_SYSTEM = `You are an English speaking examiner. Given a practice dialogue transcript,
return ONLY a JSON object reviewing the LEARNER's (user) turns:
{"wentWell":["..."],"errors":[{"said":"...","better":"...","why":"..."}],"scoreBand":"A2|B1|B2|C1","practiceNext":["..."]}
List at most 3 errors. Be specific and encouraging.`;

export function parseReview(text: string): SpeechReview | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    if (!o || typeof o !== "object") return null;
    if (!["A2", "B1", "B2", "C1"].includes(o.scoreBand)) return null;
    return {
      wentWell: Array.isArray(o.wentWell) ? o.wentWell : [],
      errors: Array.isArray(o.errors) ? o.errors : [],
      scoreBand: o.scoreBand,
      practiceNext: Array.isArray(o.practiceNext) ? o.practiceNext : [],
    };
  } catch { return null; }
}

export async function endReviewWithClient(history: ConversationTurn[], deps: ConverseDeps): Promise<SpeechReview> {
  const transcript = history.map((t) => `${t.role === "user" ? "LEARNER" : "PARTNER"}: ${t.text}`).join("\n");
  const data = await postMessages({
    model: deps.model,
    max_tokens: 1024,
    system: [{ type: "text", text: REVIEW_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: transcript }],
  }, deps);
  const parsed = parseReview(data?.content?.[0]?.text ?? "");
  if (!parsed) throw new Error("review failed: could not parse output");
  return parsed;
}

export function endReview(history: ConversationTurn[], model: GradeModel = "claude-sonnet-4-6"): Promise<SpeechReview> {
  return endReviewWithClient(history, { fetch: fetch.bind(globalThis), withKey: defaultWithKey, model });
}
```

Also delete the placeholder `parseReview` stub at the bottom of Task 7's file.

- [ ] **Step 4: Run to verify pass**

Run: `cd site && bun run test src/english/byok/converse.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/byok/converse.ts site/src/english/byok/converse.test.ts
git commit -m "feat(speaking): Talk end-of-session review (Sonnet, JSON parsed)"
```

---

## Phase C — Content

### Task 9: Talk scenarios bank

**Files:**
- Create: `src/english/data/scenarios.ts`
- Test: `src/english/data/scenarios.test.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
// src/english/data/scenarios.test.ts
import { describe, it, expect } from "vitest";
import { scenarios } from "./scenarios";

describe("scenarios", () => {
  it("has at least 10 well-formed scenarios with unique ids", () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(scenarios.map((s) => s.id));
    expect(ids.size).toBe(scenarios.length);
    for (const s of scenarios) {
      expect(["A2", "B1", "B2"]).toContain(s.level);
      expect(s.role.length).toBeGreaterThan(3);
      expect(s.goal.length).toBeGreaterThan(3);
      expect(s.opening.length).toBeGreaterThan(3);
      expect(s.titleRu.length).toBeGreaterThan(1);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd site && bun run test src/english/data/scenarios.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Author the scenarios**

```ts
// src/english/data/scenarios.ts
import type { Scenario } from "~/english/types";

export const scenarios: Scenario[] = [
  { id: "standup", level: "A2", role: "your scrum master running daily standup", goal: "give yesterday/today/blockers clearly", opening: "Morning! Can you give us your standup update?", titleRu: "Дейли-стендап" },
  { id: "code-review", level: "B1", role: "a senior engineer reviewing your pull request", goal: "explain and defend your design choices", opening: "Thanks for the PR. Why did you put a queue in front of the worker?", titleRu: "Код-ревью" },
  { id: "incident", level: "B2", role: "an incident commander on a sev-2 call", goal: "report status and next actions under pressure", opening: "We're paging. What's the current impact and your next step?", titleRu: "Инцидент-колл" },
  { id: "sprint-planning", level: "B1", role: "a product manager in sprint planning", goal: "estimate work and push back on scope", opening: "Can we ship the search rewrite this sprint?", titleRu: "Планирование спринта" },
  { id: "explain-bug", level: "A2", role: "a non-technical manager", goal: "explain a bug in plain language", opening: "Customers say checkout is broken. What happened?", titleRu: "Объяснить баг менеджеру" },
  { id: "design-interview", level: "B2", role: "a system-design interviewer", goal: "walk through a design out loud", opening: "Design a URL shortener. Where do you start?", titleRu: "Систем-дизайн интервью" },
  { id: "onboarding", level: "A2", role: "a new teammate you are onboarding", goal: "explain how the service is deployed", opening: "How do we ship code to production here?", titleRu: "Онбординг новичка" },
  { id: "scope-negotiation", level: "B2", role: "a stakeholder who wants more features", goal: "negotiate scope and timeline", opening: "Can we also add real-time notifications by Friday?", titleRu: "Переговоры по скоупу" },
  { id: "retro", level: "B1", role: "a facilitator in a sprint retrospective", goal: "give honest, constructive feedback", opening: "What went well, and what should we change?", titleRu: "Ретроспектива" },
  { id: "oncall-handoff", level: "B1", role: "the engineer taking over on-call from you", goal: "hand off open issues clearly", opening: "Anything I should watch tonight?", titleRu: "Передача дежурства" },
  { id: "tech-talk-q", level: "B2", role: "an audience member after your tech talk", goal: "answer questions about your approach", opening: "Nice talk. Why not just use a managed database?", titleRu: "Вопросы после доклада" },
  { id: "vendor-call", level: "B2", role: "a cloud vendor solutions engineer", goal: "ask precise questions about limits and pricing", opening: "Happy to help — what are you trying to build on our platform?", titleRu: "Звонок с вендором" },
];
```

- [ ] **Step 4: Run to verify pass**

Run: `cd site && bun run test src/english/data/scenarios.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/data/scenarios.ts site/src/english/data/scenarios.test.ts
git commit -m "content(speaking): 12 engineering Talk scenarios"
```

---

### Task 10: Shadow sentence source

**Files:**
- Create: `src/english/speech/shadow-source.ts`
- Test: `src/english/speech/shadow-source.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/english/speech/shadow-source.test.ts
import { describe, it, expect } from "vitest";
import { pickShadowSentences } from "./shadow-source";
import type { VocabEntry } from "~/english/types";

const entries: VocabEntry[] = [
  { id: "a", lemma: "deploy", rank: 1, band: "A2", pos: "verb", ru: "развернуть", gloss: "release code", examples: ["We deploy on Fridays."] },
  { id: "b", lemma: "latency", rank: 2, band: "B2", pos: "noun", ru: "задержка", gloss: "delay", examples: ["Latency spiked at noon.", "Tail latency matters."] },
  { id: "c", lemma: "noexample", rank: 3, band: "A2", pos: "noun", ru: "x", gloss: "x", examples: [] },
];

describe("pickShadowSentences", () => {
  it("returns example sentences up to band, skipping entries with none", () => {
    const out = pickShadowSentences(entries, "B1", 10);
    expect(out).toContain("We deploy on Fridays.");
    expect(out).not.toContain("Latency spiked at noon."); // B2 > B1
    expect(out.every((s) => s.length > 0)).toBe(true);
  });
  it("respects the limit", () => {
    expect(pickShadowSentences(entries, "B2", 1).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd site && bun run test src/english/speech/shadow-source.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/english/speech/shadow-source.ts
import type { VocabEntry, Band } from "~/english/types";

const ORDER: Band[] = ["A2", "B1", "B2"];

/** Flatten example sentences from vocab entries at or below the learner's band. */
export function pickShadowSentences(entries: VocabEntry[], band: Band, limit: number): string[] {
  const maxIdx = ORDER.indexOf(band);
  const out: string[] = [];
  for (const e of entries) {
    if (ORDER.indexOf(e.band) > maxIdx) continue;
    for (const ex of e.examples) {
      if (ex && ex.trim()) out.push(ex.trim());
      if (out.length >= limit) return out;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd site && bun run test src/english/speech/shadow-source.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/speech/shadow-source.ts site/src/english/speech/shadow-source.test.ts
git commit -m "feat(speaking): shadow sentence source from vocab by band"
```

---

## Phase D — Components (Preact islands)

> UI is verified by Playwright E2E (Task 18) and manual smoke; unit tests cover the
> pure logic already built. Each component task is a single implement+build+commit.

### Task 11: SpeakingModule shell

**Files:**
- Create: `src/components/english/SpeakingModule.tsx`

- [ ] **Step 1: Implement the shell**

```tsx
// src/components/english/SpeakingModule.tsx
import { useState } from "preact/hooks";
import { WebSpeechRecognizer, webSpeechAvailable, type SpeechRecognizer } from "~/english/speech/recognizer";
import { WhisperRecognizer, whisperReady, type DownloadState } from "~/english/speech/whisper";
import ShadowExercise from "./ShadowExercise";
import SpeakExercise from "./SpeakExercise";
import TalkSession from "./TalkSession";
import type { Locale } from "~/i18n";

type Mode = "shadow" | "speak" | "talk";
type Prefer = "auto" | "webspeech" | "whisper";

const COPY = {
  en: { shadow: "Shadow", speak: "Speak", talk: "Talk", engine: "Voice engine",
    auto: "Auto", web: "Browser (cloud)", whisper: "On-device (Whisper)",
    download: "Download offline voice engine (~40 MB)", downloading: "Downloading…", ready: "On-device ready",
    cloudNote: "Browser STT sends audio to your browser's cloud service.",
    deviceNote: "On-device: audio never leaves this device.",
    noEngine: "Speaking needs speech recognition. Open in Chrome/Safari, or download the on-device engine." },
  ru: { shadow: "Произношение", speak: "Монолог", talk: "Диалог", engine: "Движок речи",
    auto: "Авто", web: "Браузер (облако)", whisper: "На устройстве (Whisper)",
    download: "Скачать офлайн-движок (~40 МБ)", downloading: "Загрузка…", ready: "На устройстве готов",
    cloudNote: "Браузерный STT отправляет аудио в облако браузера.",
    deviceNote: "На устройстве: аудио не покидает устройство.",
    noEngine: "Нужно распознавание речи. Открой в Chrome/Safari или скачай офлайн-движок." },
};

export default function SpeakingModule({ lang }: { lang: Locale }) {
  const L = COPY[lang];
  const [mode, setMode] = useState<Mode>("shadow");
  const [prefer, setPrefer] = useState<Prefer>("auto");
  const [dl, setDl] = useState<DownloadState>({ status: whisperReady() ? "ready" : "idle", pct: whisperReady() ? 100 : 0 });

  const web = new WebSpeechRecognizer();
  const whisper = new WhisperRecognizer(setDl);
  const resolved: SpeechRecognizer | null =
    prefer === "whisper" ? (whisper.available() ? whisper : null)
    : prefer === "webspeech" ? (web.available() ? web : null)
    : whisper.available() ? whisper : web.available() ? web : null;

  const onDownload = async () => { setDl({ status: "downloading", pct: 0 }); try { await whisper.download(); } catch { setDl({ status: "error", pct: 0 }); } };

  const privacyNote = resolved?.id === "whisper" ? L.deviceNote : resolved?.id === "webspeech" ? L.cloudNote : "";

  return (
    <div data-speaking class="max-w-[680px] mx-auto">
      <div class="seg mb-4" role="tablist">
        {(["shadow", "speak", "talk"] as Mode[]).map((m) => (
          <button role="tab" aria-pressed={mode === m} onClick={() => setMode(m)}>{L[m]}</button>
        ))}
      </div>

      <div class="flex items-center gap-3 mb-2 text-[12px]">
        <span class="meta">{L.engine}</span>
        <select class="oa-btn oa-btn-secondary oa-btn-sm" value={prefer} onChange={(e) => setPrefer((e.target as HTMLSelectElement).value as Prefer)}>
          <option value="auto">{L.auto}</option>
          <option value="webspeech" disabled={!webSpeechAvailable()}>{L.web}</option>
          <option value="whisper" disabled={dl.status !== "ready"}>{L.whisper}</option>
        </select>
        {dl.status === "ready"
          ? <span class="badge ok">{L.ready}</span>
          : <button class="oa-btn oa-btn-ghost oa-btn-sm" onClick={onDownload} disabled={dl.status === "downloading"}>
              {dl.status === "downloading" ? `${L.downloading} ${dl.pct}%` : L.download}
            </button>}
      </div>
      {privacyNote ? <p class="meta-lc mb-4">{privacyNote}</p> : null}

      {!resolved ? <p class="ex-note">{L.noEngine}</p> : (
        <>
          {mode === "shadow" && <ShadowExercise lang={lang} recognizer={resolved} />}
          {mode === "speak" && <SpeakExercise lang={lang} recognizer={resolved} />}
          {mode === "talk" && <TalkSession lang={lang} recognizer={resolved} />}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build (it will fail until child components exist — that's expected; create stubs)**

Create temporary one-line stubs so the build compiles; they are filled in Tasks 12–14:

```tsx
// src/components/english/ShadowExercise.tsx (stub)
import type { Locale } from "~/i18n";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
export default function ShadowExercise(_: { lang: Locale; recognizer: SpeechRecognizer }) { return <div data-shadow />; }
```

Repeat identical stubs for `SpeakExercise.tsx` (`data-speak`) and `TalkSession.tsx` (`data-talk`).

- [ ] **Step 3: Build**

Run: `cd site && bun run build`
Expected: success, lint clean.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/english/SpeakingModule.tsx site/src/components/english/ShadowExercise.tsx site/src/components/english/SpeakExercise.tsx site/src/components/english/TalkSession.tsx
git commit -m "feat(speaking): SpeakingModule shell + engine selector + download control"
```

---

### Task 12: ShadowExercise

**Files:**
- Modify: `src/components/english/ShadowExercise.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/english/ShadowExercise.tsx
import { useMemo, useState } from "preact/hooks";
import { speak } from "~/english/speech/tts";
import { scoreShadow, type ShadowResult } from "~/english/speech/diff";
import { pickShadowSentences } from "~/english/speech/shadow-source";
import { vocabA2 } from "~/english/data/vocab-a2";
import { vocabB1 } from "~/english/data/vocab-b1";
import { vocabB2 } from "~/english/data/vocab-b2";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
import type { Locale } from "~/i18n";

const COPY = {
  en: { play: "Hear it", rec: "Record", stop: "Stop", next: "Next", score: "Intelligibility" },
  ru: { play: "Послушать", rec: "Запись", stop: "Стоп", next: "Дальше", score: "Понятность" },
};

export default function ShadowExercise({ lang, recognizer }: { lang: Locale; recognizer: SpeechRecognizer }) {
  const L = COPY[lang];
  const sentences = useMemo(
    () => pickShadowSentences([...vocabA2, ...vocabB1, ...vocabB2], "B2", 40),
    [],
  );
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShadowResult | null>(null);
  const target = sentences[i] ?? "";

  const record = async () => {
    setResult(null); setBusy(true);
    try {
      await recognizer.start();
      // Stop is triggered by the user via the same button toggling busy state.
    } catch { setBusy(false); }
  };
  const finish = async () => {
    const r = await recognizer.stop();
    // scoreShadow(reference, heard): first arg is the reference to label/score
    // against (the target sentence), second is what was heard (the transcript).
    setResult(scoreShadow(target, r.transcript));
    setBusy(false);
  };

  return (
    <div data-shadow class="quiz">
      <p class="q">{target}</p>
      <div class="flex gap-2 mb-3">
        <button class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => speak(target, { rate: 0.9 })}>{L.play}</button>
        {!busy
          ? <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={record}>{L.rec}</button>
          : <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={finish}>{L.stop}</button>}
        <button class="oa-btn oa-btn-ghost oa-btn-sm" onClick={() => { setResult(null); setI((n) => (n + 1) % sentences.length); }}>{L.next}</button>
      </div>
      {result && (
        <div>
          <div class="meta mb-1">{L.score}: {Math.round(result.score * 100)}%</div>
          <p class="leading-relaxed">
            {result.tokens.map((t) => (
              <span style={`color: var(${t.status === "ok" ? "--ok" : t.status === "sub" ? "--warn" : "--danger"}); margin-right:4px;`}>{t.target}</span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
```

(Import names `vocabA2/B1/B2` must match the actual exports of `src/english/data/vocab-*.ts`; if they differ, adjust the import to the real export name — verify with `grep "export const" src/english/data/vocab-a2.ts`.)

- [ ] **Step 2: Verify export names then build**

Run: `cd site && grep -h "export const" src/english/data/vocab-a2.ts src/english/data/vocab-b1.ts src/english/data/vocab-b2.ts`
Adjust imports to match. Then: `cd site && bun run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/english/ShadowExercise.tsx
git commit -m "feat(speaking): Shadow exercise (TTS model + record + diff render)"
```

---

### Task 13: SpeakExercise

**Files:**
- Modify: `src/components/english/SpeakExercise.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/english/SpeakExercise.tsx
import { useState } from "preact/hooks";
import { gradeSpeech } from "~/english/byok/speech";
import { hasKey } from "~/english/byok";
import { speak } from "~/english/speech/tts";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
import type { GradingResult, OutputTask } from "~/english/types";
import type { Locale } from "~/i18n";

// A small spoken-prompt set; reuse OutputTask shape so gradeSpeech accepts it.
const TASKS: OutputTask[] = [
  { id: "sp-standup", band: "B1", type: "standup", prompt: { en: "Give a 30-second spoken standup: what you did yesterday, today, and any blocker.", ru: "" }, rubric: ["clear sequence", "correct tense", "concise"] },
  { id: "sp-bug", band: "B1", type: "bug-report", prompt: { en: "Describe a recent bug out loud: symptom, cause, fix.", ru: "" }, rubric: ["cause/effect", "past tense", "specific"] },
  { id: "sp-design", band: "B2", type: "design-rationale", prompt: { en: "Explain out loud why you would pick a queue over direct calls between two services.", ru: "" }, rubric: ["tradeoffs", "linking words", "precise vocabulary"] },
];

const COPY = {
  en: { rec: "Record", stop: "Stop & transcribe", grade: "Get feedback", grading: "Grading…", next: "Next prompt", needKey: "Add an API key (Output tab) for AI feedback.", transcript: "Transcript (edit if needed)", band: "Level" },
  ru: { rec: "Запись", stop: "Стоп и расшифровать", grade: "Получить разбор", grading: "Оцениваю…", next: "Следующий", needKey: "Добавь API-ключ (вкладка Письмо) для разбора.", transcript: "Транскрипт (поправь при необходимости)", band: "Уровень" },
};

export default function SpeakExercise({ lang, recognizer }: { lang: Locale; recognizer: SpeechRecognizer }) {
  const L = COPY[lang];
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const task = TASKS[i];

  const start = async () => { setResult(null); setText(""); setBusy(true); try { await recognizer.start(); } catch { setBusy(false); } };
  const stop = async () => { const r = await recognizer.stop(); setText(r.transcript); setBusy(false); };
  const grade = async () => {
    setGrading(true);
    try { setResult(await gradeSpeech(task, text, "claude-haiku-4-5")); } finally { setGrading(false); }
  };

  return (
    <div data-speak class="quiz">
      <p class="q">{task.prompt.en}</p>
      <div class="flex gap-2 mb-3">
        {!busy
          ? <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={start}>{L.rec}</button>
          : <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={stop}>{L.stop}</button>}
        <button class="oa-btn oa-btn-ghost oa-btn-sm" onClick={() => { setI((n) => (n + 1) % TASKS.length); setText(""); setResult(null); }}>{L.next}</button>
      </div>
      {text && (
        <>
          <div class="meta mb-1">{L.transcript}</div>
          <textarea class="w-full border border-rule rounded p-2 text-[14px] mb-2" rows={3} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
          {hasKey()
            ? <button class="oa-btn oa-btn-primary oa-btn-sm" disabled={grading || !text.trim()} onClick={grade}>{grading ? L.grading : L.grade}</button>
            : <p class="ex-note">{L.needKey}</p>}
        </>
      )}
      {result && (
        <div class="mt-3">
          <div class="meta mb-1">{L.band}: {result.scoreBand}</div>
          {result.corrections.map((c) => (
            <p class="text-[13px] m-0"><s class="text-danger">{c.before}</s> → <b>{c.after}</b> <span class="text-muted">({c.why})</span></p>
          ))}
          {result.betterVersion && (
            <button class="oa-btn oa-btn-ghost oa-btn-sm mt-2" onClick={() => speak(result.betterVersion, { rate: 0.95 })}>▶ {result.betterVersion}</button>
          )}
        </div>
      )}
    </div>
  );
}
```

(Verify `hasKey` is exported from `~/english/byok` — `grep "hasKey" src/english/byok/index.ts`. It is.)

- [ ] **Step 2: Build**

Run: `cd site && bun run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/english/SpeakExercise.tsx
git commit -m "feat(speaking): Speak exercise (record -> transcript -> Claude grade)"
```

---

### Task 14: TalkSession

**Files:**
- Modify: `src/components/english/TalkSession.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/english/TalkSession.tsx
import { useState } from "preact/hooks";
import { converse, endReview, MAX_TURNS } from "~/english/byok/converse";
import { hasKey } from "~/english/byok";
import { speak } from "~/english/speech/tts";
import { scenarios } from "~/english/data/scenarios";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
import type { ConversationTurn, Scenario, SpeechReview } from "~/english/types";
import type { Locale } from "~/i18n";

const COPY = {
  en: { pick: "Pick a scenario", start: "Start", rec: "Speak", stop: "Stop", end: "End & review", thinking: "…", needKey: "Add an API key (Output tab) to use Talk.", you: "You", partner: "Partner", review: "Review", well: "Went well", errs: "Fix these", nextp: "Practice next" },
  ru: { pick: "Выбери сценарий", start: "Начать", rec: "Говорить", stop: "Стоп", end: "Завершить и разбор", thinking: "…", needKey: "Добавь API-ключ (вкладка Письмо) для диалога.", you: "Ты", partner: "Собеседник", review: "Разбор", well: "Хорошо", errs: "Исправить", nextp: "Потренируй" },
};

export default function TalkSession({ lang, recognizer }: { lang: Locale; recognizer: SpeechRecognizer }) {
  const L = COPY[lang];
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [review, setReview] = useState<SpeechReview | null>(null);

  if (!hasKey()) return <p class="ex-note">{L.needKey}</p>;

  const begin = (s: Scenario) => { setScenario(s); setReview(null); setTurns([{ role: "assistant", text: s.opening }]); speak(s.opening, { rate: 0.95 }); };
  const record = async () => { setBusy(true); try { await recognizer.start(); } catch { setBusy(false); } };
  const stop = async () => {
    const r = await recognizer.stop(); setBusy(false);
    if (!r.transcript || !scenario) return;
    const next = [...turns, { role: "user" as const, text: r.transcript }];
    setTurns(next); setThinking(true);
    try {
      const reply = await converse(next, scenario, "claude-haiku-4-5");
      setTurns([...next, { role: "assistant", text: reply }]); speak(reply, { rate: 0.95 });
    } finally { setThinking(false); }
  };
  const finish = async () => { setThinking(true); try { setReview(await endReview(turns, "claude-sonnet-4-6")); } finally { setThinking(false); } };

  const userTurns = turns.filter((t) => t.role === "user").length;

  if (!scenario) {
    return (
      <div data-talk>
        <div class="meta mb-3">{L.pick}</div>
        <div class="flex flex-col gap-2">
          {scenarios.map((s) => (
            <button class="track-card text-left" style="--d: var(--accent);" onClick={() => begin(s)}>
              <div class="tc-meta"><span class="domain-tag"><span class="sq"></span>{s.level}</span></div>
              <h4>{lang === "ru" ? s.titleRu : s.role}</h4>
              <p class="tc-blurb">{s.goal}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-talk class="quiz">
      <div class="flex flex-col gap-2 mb-3">
        {turns.map((t) => (
          <div class={t.role === "user" ? "self-end text-right" : "self-start"}>
            <span class="meta">{t.role === "user" ? L.you : L.partner}</span>
            <p class="m-0 text-[14px]">{t.text}</p>
          </div>
        ))}
        {thinking && <p class="meta self-start">{L.thinking}</p>}
      </div>
      {!review && (
        <div class="flex gap-2">
          {!busy
            ? <button class="oa-btn oa-btn-primary oa-btn-sm" disabled={thinking || userTurns >= MAX_TURNS} onClick={record}>{L.rec}</button>
            : <button class="oa-btn oa-btn-primary oa-btn-sm" onClick={stop}>{L.stop}</button>}
          <button class="oa-btn oa-btn-secondary oa-btn-sm" disabled={thinking || userTurns === 0} onClick={finish}>{L.end}</button>
        </div>
      )}
      {review && (
        <div class="mt-2">
          <div class="meta mb-1">{L.review}: {review.scoreBand}</div>
          {review.errors.map((e) => (
            <p class="text-[13px] m-0"><s class="text-danger">{e.said}</s> → <b>{e.better}</b> <span class="text-muted">({e.why})</span></p>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd site && bun run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/english/TalkSession.tsx
git commit -m "feat(speaking): Talk session (turn loop + TTS + end review)"
```

---

## Phase E — Route, CSP, R2 proxy

### Task 15: CSP builder + `cspExtra` prop on Topic

**Files:**
- Create: `src/lib/csp.ts`
- Test: `src/lib/csp.test.ts`
- Modify: `src/layouts/Topic.astro`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/csp.test.ts
import { describe, it, expect } from "vitest";
import { buildCsp } from "./csp";

describe("buildCsp", () => {
  it("produces the strict baseline", () => {
    const csp = buildCsp();
    expect(csp).toContain("connect-src 'self' https://api.anthropic.com");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  });
  it("adds wasm + worker directives when extra=wasm, without touching connect-src", () => {
    const csp = buildCsp("wasm");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("connect-src 'self' https://api.anthropic.com"); // unchanged
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd site && bun run test src/lib/csp.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/csp.ts
export type CspExtra = "wasm" | undefined;

/** Single source of truth for the page CSP. `wasm` adds only execution
 *  directives (WASM compile + workers); connect-src (the exfiltration channel)
 *  is never widened. */
export function buildCsp(extra?: CspExtra): string {
  const scriptSrc = extra === "wasm"
    ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  const parts = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (extra === "wasm") parts.push("worker-src 'self' blob:");
  return parts.join("; ");
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd site && bun run test src/lib/csp.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire Topic.astro to use it**

In `src/layouts/Topic.astro`: add `cspExtra` to `Props`, import `buildCsp`, and replace the hardcoded CSP `content` with the builder.

```astro
---
// add to imports
import { buildCsp, type CspExtra } from "~/lib/csp";
// extend Props
type Props = { title: string; lang: Locale; pillars?: string[]; sources?: string[]; depth?: Depth; cspExtra?: CspExtra };
const { title, lang, sources = [], depth, cspExtra } = Astro.props;
---
<!-- replace the existing CSP meta content attribute with: -->
<meta http-equiv="Content-Security-Policy" content={buildCsp(cspExtra)} />
```

- [ ] **Step 6: Build to confirm the baseline CSP string is byte-identical for non-wasm pages**

Run: `cd site && bun run build`
Expected: success; spot-check `dist/en/settings/index.html` still has the original CSP (connect-src unchanged).

- [ ] **Step 7: Commit**

```bash
git add site/src/lib/csp.ts site/src/lib/csp.test.ts site/src/layouts/Topic.astro
git commit -m "feat(speaking): CSP builder + scoped cspExtra prop on Topic"
```

---

### Task 16: Speaking route + hub link

**Files:**
- Create: `src/pages/[lang]/english/speaking.astro`
- Modify: `src/pages/[lang]/english/index.astro`

- [ ] **Step 1: Create the route (passes cspExtra="wasm")**

```astro
---
// src/pages/[lang]/english/speaking.astro
import Topic from "../../../layouts/Topic.astro";
import SpeakingModule from "../../../components/english/SpeakingModule.tsx";
import { type Locale, isLocale, t } from "../../../i18n";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
const heading = lang === "ru" ? "Разговор" : "Speaking";
---
<Topic title={`${heading} — ${t("nav.english", lang)}`} lang={lang} cspExtra="wasm">
  <div class="max-w-[760px] mx-auto mb-8">
    <div class="meta mb-2">{t("nav.english", lang)}</div>
    <h1 class="font-display text-[32px] font-bold tracking-[-0.015em] m-0 text-ink">{heading}</h1>
  </div>
  <SpeakingModule client:only="preact" lang={lang} />
</Topic>
```

- [ ] **Step 2: Add a link from the English hub**

In `src/pages/[lang]/english/index.astro`, add a section linking to the speaking page (place after the Output section):

```astro
  <section class="border-t border-rule pt-10 mt-14 text-center">
    <a class="oa-btn oa-btn-primary oa-btn-sm" href={`/${lang}/english/speaking/`}>
      {lang === "ru" ? "Тренировать речь →" : "Practice speaking →"}
    </a>
  </section>
```

- [ ] **Step 3: Build**

Run: `cd site && bun run build`
Expected: success; `dist/en/english/speaking/index.html` and `dist/ru/english/speaking/index.html` exist. Confirm their CSP meta contains `'wasm-unsafe-eval'` while other pages do not.

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/[lang]/english/speaking.astro site/src/pages/[lang]/english/index.astro
git commit -m "feat(speaking): /english/speaking route + hub link (wasm CSP scoped here)"
```

---

### Task 17: R2 proxy for Whisper weights

**Files:**
- Modify: `wrangler.toml` (add R2 binding)
- Create: `functions/models/[[path]].ts`

- [ ] **Step 1: Add the R2 binding to wrangler.toml**

```toml
# append to wrangler.toml
[[r2_buckets]]
binding = "MODELS"
bucket_name = "awesome-models"
```

- [ ] **Step 2: Create the proxy function**

```ts
// functions/models/[[path]].ts
// Serves Whisper model files same-origin from R2 so the page CSP stays
// connect-src 'self'. Read-only; long-cache immutable; 404 on miss.
interface Env { MODELS: R2Bucket; }

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path ?? "");
  if (!key) return new Response("Not found", { status: 404 });
  const obj = await env.MODELS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
};
```

- [ ] **Step 3: Sanity build**

Run: `cd site && bun run build`
Expected: success (functions are not part of the Astro build, but ensure nothing else broke).

- [ ] **Step 4: Commit**

```bash
git add wrangler.toml functions/models/[[path]].ts
git commit -m "feat(speaking): R2 proxy serving Whisper weights same-origin"
```

- [ ] **Step 5: Operator note (manual, not code)**

The bucket `awesome-models` and the uploaded `whisper-tiny.en/*` files must exist
(see the R2 instructions). `env.remoteHost` in `whisper.ts` points at
`${origin}/models/`, so requests resolve to `/models/whisper-tiny.en/...` → this
function → R2. No action in this task beyond the upload already documented.

---

## Phase F — E2E + gate

### Task 18: Playwright E2E for the three modes

**Files:**
- Create: `tests/e2e/speaking.spec.ts` (match the repo's existing e2e dir; if tests live elsewhere, mirror that path)

- [ ] **Step 1: Confirm the e2e layout**

Run: `cd site && cat playwright.config.ts && ls tests 2>/dev/null || ls e2e 2>/dev/null`
Note the `testDir` and place the spec accordingly.

- [ ] **Step 2: Write the E2E spec (stub Web Speech + mock Anthropic)**

```ts
// tests/e2e/speaking.spec.ts  (adjust dir to playwright.config testDir)
import { test, expect } from "@playwright/test";

// Inject a deterministic fake SpeechRecognition + a mock Anthropic before load.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSR {
      lang = ""; interimResults = false; continuous = false;
      onstart: any; onend: any; onerror: any; onresult: any;
      start() { this.onstart?.(); }
      stop() {
        this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "yesterday i fixed the flaky test" }, length: 1 }] });
        this.onend?.();
      }
    }
    (window as any).webkitSpeechRecognition = FakeSR;
    // Mark a fake BYOK key as present is out of scope here; Speak/Talk grading
    // is covered by unit tests. This E2E asserts Shadow (no key needed).
  });
});

test("shadow mode records and renders an intelligibility score", async ({ page }) => {
  await page.goto("/en/english/speaking/");
  await page.getByRole("tab", { name: "Shadow" }).click();
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText(/Intelligibility/)).toBeVisible();
});

test("speaking page ships the wasm CSP, others do not", async ({ page }) => {
  const res = await page.goto("/en/english/speaking/");
  const html = await res!.text();
  expect(html).toContain("wasm-unsafe-eval");
  const other = await page.goto("/en/settings/");
  const otherHtml = await other!.text();
  expect(otherHtml).not.toContain("wasm-unsafe-eval");
});
```

- [ ] **Step 3: Run E2E against a built preview**

Run: `cd site && bun run build && (cd dist && python3 -m http.server 8799 &) && sleep 2 && PW_BASE_URL=http://localhost:8799 bun run e2e tests/e2e/speaking.spec.ts; pkill -f "http.server 8799"`
Expected: both tests PASS. (If `playwright.config.ts` already sets a webServer/baseURL, use that instead of the manual server.)

- [ ] **Step 4: Commit**

```bash
git add site/tests/e2e/speaking.spec.ts
git commit -m "test(speaking): e2e shadow flow + scoped-CSP assertion"
```

---

### Task 19: Build gate + manual smoke checklist

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `cd site && bun run test`
Expected: all green, including the new speech/byok/data/csp tests.

- [ ] **Step 2: Build gate**

Run: `cd site && bun run build`
Expected: 0 errors, lint clean; page count = previous + 2 (en/ru speaking).

- [ ] **Step 3: Manual smoke (document results in the PR description)**

- Chrome: open `/en/english/speaking/`, Shadow → record a sentence → score renders.
- Chrome: Download offline engine → progress reaches 100 → engine selector shows "On-device ready"; switch to Whisper, Shadow works offline (disable network, retry).
- Firefox: Web Speech absent → "no engine" banner → after Whisper download, Shadow works.
- With a real BYOK key: Speak → record → transcript → "Get feedback" → band + corrections; Talk → pick scenario → 2–3 turns with TTS playback → End & review renders.
- Mobile 390px (light + dark): segment switch, scenario cards, transcript box reflow without overflow.

- [ ] **Step 4: Commit (if any fixups were needed)**

```bash
git add -A && git commit -m "chore(speaking): build gate + smoke fixups"
```

---

## Self-Review notes (addressed)

- **Spec coverage:** Shadow/Speak/Talk (Tasks 12–14), SpeechRecognizer + Web Speech + Whisper (Tasks 4–5), R2 same-origin + no connect-src change (Tasks 15–17), Haiku default + caching + caps + Sonnet review (Tasks 6–8), content reuse + scenarios (Tasks 9–10), privacy/degradation (Task 11 shell), CSP scoping (Tasks 15–16), tests (Tasks 1–10 unit, 18 e2e, 19 gate). Achievements deferred per spec (no task) — correct.
- **Type consistency:** `RecognitionResult`, `Scenario`, `ConversationTurn`, `SpeechReview` defined in Task 3 and used unchanged in Tasks 4–14. `DownloadState`/`progressReducer` defined in Task 5 and consumed in Task 11. `GradeModel` union identical across `speech.ts`/`converse.ts`.
- **Known integration risks to verify during execution (not placeholders):** real export names of `vocab-*.ts` (Task 12 Step 2 verifies), Playwright `testDir` (Task 18 Step 1 verifies), transformers.js `env.remoteHost`/`remotePathTemplate` path shape against the uploaded R2 layout (Task 17 Step 5 + manual smoke).
