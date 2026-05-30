# English → B2 — P3 Output Tasks + BYOK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Tasks 1–3 handle key material — run superpowers:security-review on the BYOK core before the phase merges.**

**Goal:** Add production-writing output tasks with AI grading on the user's own Anthropic key (encrypted at rest, device + passphrase modes), graceful no-key self-assessment, and a site-wide CSP — additive over P0–P2, build staying green.

**Architecture:** A UI-free `english/byok/` module owns all key material: `crypto.ts` (Web Crypto AES-GCM + PBKDF2), an injectable `Persistence` (IndexedDB in browser, in-memory for tests/SSR), a `store.ts` keystore exposing only `hasKey/keyStatus/setKey/unlock/clearKey/withKey` (never returns plaintext), a raw-`fetch` Anthropic client, and a pure grading parser. Output tasks are committed data; islands grade-or-self-assess. A CSP `<meta>` pins `connect-src` to self + Anthropic.

**Tech Stack:** TypeScript, Preact + @preact/signals, Web Crypto, IndexedDB, Vitest (node env for crypto), Astro 5. No Anthropic SDK (raw fetch).

**Spec:** `docs/superpowers/specs/2026-05-30-english-to-b2-p3-output-byok-design.md`.

**Conventions:** Commands run from `site/`. Tests co-located `*.test.ts`; crypto/store tests use `// @vitest-environment node` for full Web Crypto. `~` maps to `site/src`. Baseline build: **0 errors, ≤1271 warnings**.

**Branch:** `english-p3-output-byok` (already checked out).

**Security invariants (must hold across all tasks):** plaintext key never persisted, never logged, never in `englishState`, never in the DOM, never returned by `withKey`. The byok IndexedDB store is separate from user-state and excluded from sync.

---

## File map

- `site/src/english/byok/crypto.ts` — Web Crypto primitives (pure).
- `site/src/english/byok/crypto.test.ts` — round-trip + non-extractable.
- `site/src/english/byok/persistence.ts` — `Persistence` interface + `memoryPersistence()` + `indexedDbPersistence()`.
- `site/src/english/byok/store.ts` — `createKeyStore(persistence)` keystore.
- `site/src/english/byok/store.test.ts` — keystore round-trip, modes, exclusion invariants.
- `site/src/english/byok/index.ts` — singleton public API.
- `site/src/english/byok/grading.ts` — `parseGrading` (pure).
- `site/src/english/byok/grading.test.ts` — contract.
- `site/src/english/byok/anthropic.ts` — direct-browser grading client.
- `site/src/english/byok/anthropic.test.ts` — mocked fetch.
- `site/src/english/data/output/tasks.ts` — `OutputTask[]` (~20).
- `site/src/english/data/output/output.test.ts` — validity gate.
- `site/src/english/types.ts` — `OutputTask`, `GradingResult` types.
- `site/src/english/state.ts` + `state.test.ts` — `gradingModel`, `outputAttempts`.
- `site/src/components/english/KeyEntry.tsx` — key entry island.
- `site/src/components/english/OutputModule.tsx` — output island.
- `site/src/components/english/Today.tsx` — output slot.
- `site/src/layouts/Topic.astro` — CSP meta.
- `site/src/pages/[lang]/english/index.astro` — hub Output section.

---

### Task 1: BYOK crypto + persistence + keystore

**Files:**
- Create: `site/src/english/byok/crypto.ts`, `crypto.test.ts`, `persistence.ts`, `store.ts`, `store.test.ts`, `index.ts`

- [ ] **Step 1: Write the crypto round-trip test (node env)**

```typescript
// site/src/english/byok/crypto.test.ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateDeviceKey, derivePassphraseKey, encryptString, decryptString, randomSalt } from "./crypto";

describe("byok crypto", () => {
  it("device key round-trips and is non-extractable", async () => {
    const key = await generateDeviceKey();
    expect(key.extractable).toBe(false);
    const { ciphertext, iv } = await encryptString(key, "sk-ant-secret");
    expect(decryptString(key, ciphertext, iv)).resolves.toBe("sk-ant-secret");
  });

  it("passphrase key round-trips with the same salt+passphrase", async () => {
    const salt = randomSalt();
    const k1 = await derivePassphraseKey("hunter2", salt);
    const { ciphertext, iv } = await encryptString(k1, "sk-ant-xyz");
    const k2 = await derivePassphraseKey("hunter2", salt);
    await expect(decryptString(k2, ciphertext, iv)).resolves.toBe("sk-ant-xyz");
  });

  it("a wrong passphrase fails to decrypt", async () => {
    const salt = randomSalt();
    const good = await derivePassphraseKey("right", salt);
    const { ciphertext, iv } = await encryptString(good, "sk-ant-xyz");
    const bad = await derivePassphraseKey("wrong", salt);
    await expect(decryptString(bad, ciphertext, iv)).rejects.toBeDefined();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bunx vitest run src/english/byok/crypto.test.ts`
Expected: FAIL — `Failed to resolve import "./crypto"`.

- [ ] **Step 3: Implement crypto**

```typescript
// site/src/english/byok/crypto.ts
// Web Crypto primitives for BYOK. No persistence, no UI. AES-GCM-256 at rest,
// PBKDF2 (600k iters) for passphrase mode. Keys are non-extractable.

const enc = new TextEncoder();
const dec = new TextDecoder();
const PBKDF2_ITERATIONS = 600_000;

export async function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function derivePassphraseKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptString(key: CryptoKey, plaintext: string): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return { ciphertext, iv };
}

export async function decryptString(key: CryptoKey, ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return dec.decode(buf);
}

export function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
```

- [ ] **Step 4: Run crypto tests**

Run: `bunx vitest run src/english/byok/crypto.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement persistence (interface + memory + IndexedDB)**

```typescript
// site/src/english/byok/persistence.ts
// Storage backend for the encrypted key record. Injectable so the keystore is
// testable without a browser. Browser uses IndexedDB; tests/SSR use memory.

export type KeyRecord = {
  mode: "device" | "passphrase";
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt?: Uint8Array;     // passphrase mode only
  cryptoKey?: CryptoKey; // device mode only (non-extractable handle)
};

export interface Persistence {
  load(): Promise<KeyRecord | null>;
  save(rec: KeyRecord): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory backend for tests and SSR (no persistence across reloads). */
export function memoryPersistence(): Persistence {
  let rec: KeyRecord | null = null;
  return {
    async load() { return rec; },
    async save(r) { rec = r; },
    async clear() { rec = null; },
  };
}

const DB_NAME = "awesome.english.byok"; // separate DB; never part of user-state sync
const STORE = "key";
const RECORD_ID = "current";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Browser IndexedDB backend. Structured-clone persists the non-extractable CryptoKey handle. */
export function indexedDbPersistence(): Persistence {
  async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await idb();
    return new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }
  return {
    load: () => tx<KeyRecord | null>("readonly", (s) => s.get(RECORD_ID)).then((r) => r ?? null),
    save: (rec) => tx("readwrite", (s) => s.put(rec, RECORD_ID)).then(() => undefined),
    clear: () => tx("readwrite", (s) => s.delete(RECORD_ID)).then(() => undefined),
  };
}
```

- [ ] **Step 6: Write the keystore test (node env)**

```typescript
// site/src/english/byok/store.test.ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createKeyStore } from "./store";
import { memoryPersistence, type Persistence } from "./persistence";

function freshStore() {
  const p: Persistence = memoryPersistence();
  return { store: createKeyStore(p), p };
}

describe("byok keystore", () => {
  it("device mode: set, status, withKey returns the key to fn only", async () => {
    const { store } = freshStore();
    expect(await store.keyStatus()).toBe("none");
    await store.setKey("sk-ant-aaa", { mode: "device" });
    expect(await store.hasKey()).toBe(true);
    expect(await store.keyStatus()).toBe("device");
    const seen = await store.withKey(async (k) => k);
    expect(seen).toBe("sk-ant-aaa");
  });

  it("never persists plaintext", async () => {
    const { store, p } = freshStore();
    await store.setKey("sk-ant-secret", { mode: "device" });
    const rec = await p.load();
    const blob = JSON.stringify({ mode: rec!.mode, iv: Array.from(rec!.iv), salt: rec!.salt ? Array.from(rec!.salt) : null });
    expect(blob.includes("sk-ant-secret")).toBe(false);
    expect((rec as any).plaintext).toBeUndefined();
  });

  it("passphrase mode: locked until unlocked, wrong passphrase rejected", async () => {
    const { store, p } = freshStore();
    await store.setKey("sk-ant-bbb", { mode: "passphrase", passphrase: "pw" });
    // simulate a fresh session: a new store over the same persistence has no in-memory key
    const reopened = createKeyStore(p);
    expect(await reopened.keyStatus()).toBe("locked");
    expect(await reopened.unlock("nope")).toBe(false);
    expect(await reopened.unlock("pw")).toBe(true);
    expect(await reopened.keyStatus()).toBe("unlocked");
    expect(await reopened.withKey(async (k) => k)).toBe("sk-ant-bbb");
  });

  it("clearKey wipes the store", async () => {
    const { store } = freshStore();
    await store.setKey("sk-ant-ccc", { mode: "device" });
    await store.clearKey();
    expect(await store.hasKey()).toBe(false);
    expect(await store.keyStatus()).toBe("none");
  });
});
```

- [ ] **Step 7: Run it to confirm it fails**

Run: `bunx vitest run src/english/byok/store.test.ts`
Expected: FAIL — `Failed to resolve import "./store"`.

- [ ] **Step 8: Implement the keystore**

```typescript
// site/src/english/byok/store.ts
// The keystore: composes crypto + persistence. Exposes only safe operations.
// The plaintext key is decrypted transiently inside withKey and never returned
// to anyone but the caller's fn. No logging, no signals, no DOM.

import { generateDeviceKey, derivePassphraseKey, encryptString, decryptString, randomSalt } from "./crypto";
import type { Persistence } from "./persistence";

export type KeyStatus = "none" | "device" | "locked" | "unlocked";

export type KeyStore = {
  hasKey(): Promise<boolean>;
  keyStatus(): Promise<KeyStatus>;
  setKey(apiKey: string, opts: { mode: "device" | "passphrase"; passphrase?: string }): Promise<void>;
  unlock(passphrase: string): Promise<boolean>;
  clearKey(): Promise<void>;
  withKey<T>(fn: (key: string) => Promise<T>): Promise<T>;
};

export function createKeyStore(persistence: Persistence): KeyStore {
  // In-memory derived key for passphrase mode this session. Never persisted.
  let sessionKey: CryptoKey | null = null;

  async function keyStatus(): Promise<KeyStatus> {
    const rec = await persistence.load();
    if (!rec) return "none";
    if (rec.mode === "device") return "device";
    return sessionKey ? "unlocked" : "locked";
  }

  return {
    keyStatus,
    async hasKey() {
      return (await persistence.load()) !== null;
    },
    async setKey(apiKey, opts) {
      if (opts.mode === "passphrase") {
        if (!opts.passphrase) throw new Error("passphrase required");
        const salt = randomSalt();
        const key = await derivePassphraseKey(opts.passphrase, salt);
        const { ciphertext, iv } = await encryptString(key, apiKey);
        await persistence.save({ mode: "passphrase", ciphertext, iv, salt });
        sessionKey = key; // unlocked for this session
      } else {
        const key = await generateDeviceKey();
        const { ciphertext, iv } = await encryptString(key, apiKey);
        await persistence.save({ mode: "device", cryptoKey: key, ciphertext, iv });
        sessionKey = null;
      }
    },
    async unlock(passphrase) {
      const rec = await persistence.load();
      if (!rec || rec.mode !== "passphrase" || !rec.salt) return false;
      const key = await derivePassphraseKey(passphrase, rec.salt);
      try {
        await decryptString(key, rec.ciphertext, rec.iv); // verifies the passphrase
        sessionKey = key;
        return true;
      } catch {
        return false;
      }
    },
    async clearKey() {
      sessionKey = null;
      await persistence.clear();
    },
    async withKey(fn) {
      const rec = await persistence.load();
      if (!rec) throw new Error("no key");
      const key = rec.mode === "device" ? rec.cryptoKey! : sessionKey;
      if (!key) throw new Error("locked");
      const plaintext = await decryptString(key, rec.ciphertext, rec.iv);
      try {
        return await fn(plaintext);
      } finally {
        // plaintext goes out of scope here; do not retain it anywhere
      }
    },
  };
}
```

- [ ] **Step 9: Implement the singleton public API**

```typescript
// site/src/english/byok/index.ts
// Public BYOK API — a singleton keystore over IndexedDB in the browser, memory on the server.
import { createKeyStore, type KeyStore } from "./store";
import { indexedDbPersistence, memoryPersistence } from "./persistence";

const keyStore: KeyStore = createKeyStore(
  typeof indexedDB !== "undefined" ? indexedDbPersistence() : memoryPersistence(),
);

export const hasKey = () => keyStore.hasKey();
export const keyStatus = () => keyStore.keyStatus();
export const setKey = keyStore.setKey;
export const unlock = keyStore.unlock;
export const clearKey = keyStore.clearKey;
export const withKey = keyStore.withKey;
export type { KeyStatus, KeyStore } from "./store";
```

- [ ] **Step 10: Run keystore tests + commit**

Run: `bunx vitest run src/english/byok/crypto.test.ts src/english/byok/store.test.ts`
Expected: PASS (3 + 4 = 7).
```bash
git add site/src/english/byok/crypto.ts site/src/english/byok/crypto.test.ts site/src/english/byok/persistence.ts site/src/english/byok/store.ts site/src/english/byok/store.test.ts site/src/english/byok/index.ts
git commit -m "feat(english): BYOK encrypted key store (AES-GCM device + PBKDF2 passphrase)"
```

---

### Task 2: Grading contract parser

**Files:**
- Modify: `site/src/english/types.ts` (add `GradingResult`)
- Create: `site/src/english/byok/grading.ts`, `grading.test.ts`

- [ ] **Step 1: Add the type**

Append to `site/src/english/types.ts`:
```typescript
export type GradingResult = {
  corrections: { before: string; after: string; why: string }[];
  betterVersion: string;
  scoreBand: "A2" | "B1" | "B2" | "C1";
  noticingHints: string[];
};
```

- [ ] **Step 2: Write the failing test**

```typescript
// site/src/english/byok/grading.test.ts
import { describe, it, expect } from "vitest";
import { parseGrading } from "./grading";

const valid = {
  corrections: [{ before: "I has", after: "I have", why: "subject-verb agreement" }],
  betterVersion: "I have finished the task.",
  scoreBand: "B1",
  noticingHints: ["Watch present-tense agreement."],
};

describe("parseGrading", () => {
  it("parses clean JSON", () => {
    expect(parseGrading(JSON.stringify(valid))).toEqual(valid);
  });
  it("parses JSON inside code fences + prose", () => {
    const wrapped = "Here is your feedback:\n```json\n" + JSON.stringify(valid) + "\n```\nGreat job!";
    expect(parseGrading(wrapped)).toEqual(valid);
  });
  it("returns null on malformed / wrong-shape input", () => {
    expect(parseGrading("not json")).toBeNull();
    expect(parseGrading(JSON.stringify({ betterVersion: "x" }))).toBeNull();
    expect(parseGrading(JSON.stringify({ ...valid, scoreBand: "Z9" }))).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `bunx vitest run src/english/byok/grading.test.ts`
Expected: FAIL — `Failed to resolve import "./grading"`.

- [ ] **Step 4: Implement the parser**

```typescript
// site/src/english/byok/grading.ts
// Defensive parser for the grading JSON contract. Tolerates code-fences / prose
// around the JSON; returns null on any shape mismatch.
import type { GradingResult } from "~/english/types";

const BANDS = ["A2", "B1", "B2", "C1"];

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try { return JSON.parse(candidate); } catch { return null; }
}

export function parseGrading(text: string): GradingResult | null {
  const o = extractJson(text) as any;
  if (!o || typeof o !== "object") return null;
  if (!Array.isArray(o.corrections)) return null;
  const correctionsOk = o.corrections.every(
    (c: any) => c && typeof c.before === "string" && typeof c.after === "string" && typeof c.why === "string",
  );
  if (!correctionsOk) return null;
  if (typeof o.betterVersion !== "string") return null;
  if (!BANDS.includes(o.scoreBand)) return null;
  if (!Array.isArray(o.noticingHints) || !o.noticingHints.every((h: any) => typeof h === "string")) return null;
  return {
    corrections: o.corrections.map((c: any) => ({ before: c.before, after: c.after, why: c.why })),
    betterVersion: o.betterVersion,
    scoreBand: o.scoreBand,
    noticingHints: o.noticingHints,
  };
}
```

- [ ] **Step 5: Run tests + commit**

Run: `bunx vitest run src/english/byok/grading.test.ts`
Expected: PASS (3 tests).
```bash
git add site/src/english/types.ts site/src/english/byok/grading.ts site/src/english/byok/grading.test.ts
git commit -m "feat(english): grading contract + defensive parser"
```

---

### Task 3: Anthropic direct-browser grading client

**Files:**
- Create: `site/src/english/byok/anthropic.ts`, `anthropic.test.ts`

- [ ] **Step 1: Write the failing test (mocked fetch)**

```typescript
// site/src/english/byok/anthropic.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { gradeWithClient, type GradeDeps } from "./anthropic";
import type { OutputTask } from "~/english/types";

const task: OutputTask = {
  id: "t1", band: "B1", type: "standup",
  prompt: { en: "Write a standup update.", ru: "..." },
  rubric: ["clarity", "correct tense"],
};

const valid = {
  corrections: [], betterVersion: "Yesterday I fixed the bug.", scoreBand: "B1", noticingHints: [],
};

function depsWith(fetchImpl: any): GradeDeps {
  return {
    fetch: fetchImpl,
    withKey: async (fn: (k: string) => Promise<any>) => fn("sk-ant-test"),
    model: "claude-haiku-4-5",
    now: () => 1_000_000,
  };
}

describe("gradeWithClient", () => {
  it("sends the key in x-api-key and returns a parsed result", async () => {
    let sentHeaders: any = {};
    const fetchImpl = vi.fn(async (_url: string, init: any) => {
      sentHeaders = init.headers;
      return { ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(valid) }] }) };
    });
    const res = await gradeWithClient(task, "Yesterday I fix the bug.", depsWith(fetchImpl));
    expect(sentHeaders["x-api-key"]).toBe("sk-ant-test");
    expect(sentHeaders["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(res.scoreBand).toBe("B1");
  });

  it("rejects over-long input before calling the API", async () => {
    const fetchImpl = vi.fn();
    await expect(
      gradeWithClient(task, "x".repeat(10_000), depsWith(fetchImpl)),
    ).rejects.toThrow(/too long/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws a typed error on HTTP failure without leaking the key", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: { message: "bad key" } }) }));
    await expect(gradeWithClient(task, "short answer", depsWith(fetchImpl))).rejects.toThrow(/grading failed/i);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bunx vitest run src/english/byok/anthropic.test.ts`
Expected: FAIL — `Failed to resolve import "./anthropic"`.

- [ ] **Step 3: Implement the client**

```typescript
// site/src/english/byok/anthropic.ts
// Direct browser -> Anthropic grading. Raw fetch, no SDK. The key is obtained
// transiently via withKey and sent as x-api-key for a single request. The strict
// rubric system prompt is prompt-cached. Input length cap bounds spend.
import type { GradingResult, OutputTask } from "~/english/types";
import { parseGrading } from "./grading";
import { withKey as defaultWithKey } from "./index";

export const MAX_INPUT_CHARS = 4000;
const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export type GradeModel = "claude-haiku-4-5" | "claude-sonnet-4-6";

export type GradeDeps = {
  fetch: typeof fetch;
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  model: GradeModel;
  now: () => number;
};

const SYSTEM = `You are a precise English writing coach for software engineers (CEFR A2–C1).
Grade the learner's response to the task against the rubric. Reply with ONLY a JSON object:
{"corrections":[{"before":"...","after":"...","why":"..."}],"betterVersion":"...","scoreBand":"A2|B1|B2|C1","noticingHints":["..."]}
Be specific and kind. Keep betterVersion natural and at or slightly above the learner's level.`;

function userBlock(task: OutputTask, text: string): string {
  return `TASK: ${task.prompt.en}\nRUBRIC: ${task.rubric.join("; ")}\n\nLEARNER RESPONSE:\n${text}`;
}

/** Testable core: deps injected. */
export async function gradeWithClient(task: OutputTask, text: string, deps: GradeDeps): Promise<GradingResult> {
  if (text.trim().length === 0) throw new Error("empty response");
  if (text.length > MAX_INPUT_CHARS) throw new Error(`Response too long (max ${MAX_INPUT_CHARS} characters).`);

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
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userBlock(task, text) }],
      }),
    }),
  );

  if (!res.ok) throw new Error(`grading failed (HTTP ${res.status})`);
  const data = await res.json();
  const out = data?.content?.[0]?.text ?? "";
  const parsed = parseGrading(out);
  if (!parsed) throw new Error("grading failed: could not parse model output");
  return parsed;
}

/** Production entry: uses the real fetch + the singleton withKey. */
export function gradeOutput(task: OutputTask, text: string, model: GradeModel): Promise<GradingResult> {
  return gradeWithClient(task, text, { fetch: fetch.bind(globalThis), withKey: defaultWithKey, model, now: () => Date.now() });
}
```

- [ ] **Step 4: Run tests + commit**

Run: `bunx vitest run src/english/byok/anthropic.test.ts`
Expected: PASS (3 tests).
```bash
git add site/src/english/byok/anthropic.ts site/src/english/byok/anthropic.test.ts
git commit -m "feat(english): direct-browser Anthropic grading client (raw fetch)"
```

> **After Task 3:** run superpowers:security-review on `site/src/english/byok/` before continuing past UI wiring. Confirm: no plaintext persistence/logging, `withKey` containment, key absent from `englishState`, separate IndexedDB store.

---

### Task 4: Output tasks data (~20)

**Files:**
- Modify: `site/src/english/types.ts` (add `OutputTask`)
- Create: `site/src/english/data/output/tasks.ts`, `output.test.ts`

- [ ] **Step 1: Add the type**

Append to `site/src/english/types.ts`:
```typescript
export type OutputTask = {
  id: string;
  band: "A2" | "B1" | "B2";
  type: "pr-comment" | "standup" | "design-rationale" | "bug-report"
      | "incident-summary" | "commit-message" | "rfc-summary" | "review-reply";
  prompt: Bi;          // the writing instruction
  rubric: string[];    // grading criteria (English)
  modelAnswer?: Bi;    // strong sample for no-key self-assessment
  hint?: Bi;
};
```

- [ ] **Step 2: Write the validity gate**

```typescript
// site/src/english/data/output/output.test.ts
import { describe, it, expect } from "vitest";
import { outputTasks } from "./tasks";

const BANDS = ["A2", "B1", "B2"];
const TYPES = ["pr-comment", "standup", "design-rationale", "bug-report", "incident-summary", "commit-message", "rfc-summary", "review-reply"];
const bi = (b: any) => b && typeof b.en === "string" && b.en.length > 0 && typeof b.ru === "string" && b.ru.length > 0;

describe("output tasks", () => {
  it("has ~20 tasks with unique ids", () => {
    expect(outputTasks.length).toBeGreaterThanOrEqual(18);
    const ids = outputTasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every task is well-formed and bilingual", () => {
    for (const t of outputTasks) {
      expect(BANDS).toContain(t.band);
      expect(TYPES).toContain(t.type);
      expect(bi(t.prompt)).toBe(true);
      expect(t.rubric.length).toBeGreaterThanOrEqual(2);
      expect(t.rubric.every((r) => typeof r === "string" && r.length > 0)).toBe(true);
      if (t.modelAnswer) expect(bi(t.modelAnswer)).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `bunx vitest run src/english/data/output/output.test.ts`
Expected: FAIL — `Failed to resolve import "./tasks"`.

- [ ] **Step 4: Author the tasks**

Create `site/src/english/data/output/tasks.ts` exporting `outputTasks: OutputTask[]` (~20). Authoring spec per task: `id` kebab-case unique; `band` A2 or B1; `type` from the union; `prompt` bilingual instruction (e.g. "A teammate's PR adds a function with no tests. Write a kind PR comment asking for tests."); `rubric` 2–4 English criteria; `modelAnswer` a strong bilingual sample; optional `hint`. Cover the 8 types across A2/B1, engineering-leaning. Recommended mechanism: a subagent fan-out (2-concurrent waves per the P2 ops lesson), each authoring a few tasks into a JSON batch, assembled into `tasks.ts`; validate against `output.test.ts`; spot-check 3.

```typescript
// site/src/english/data/output/tasks.ts
// Production-writing tasks. Bilingual prompts; English rubric for the grader;
// modelAnswer powers no-key self-assessment.
import type { OutputTask } from "~/english/types";

export const outputTasks: OutputTask[] = [
  // … ~20 tasks …
];
```

- [ ] **Step 5: Run the gate + commit**

Run: `bunx vitest run src/english/data/output/output.test.ts`
Expected: PASS (2 tests).
```bash
git add site/src/english/types.ts site/src/english/data/output/tasks.ts site/src/english/data/output/output.test.ts
git commit -m "content(english): ~20 production-writing output tasks"
```

---

### Task 5: State — grading model + output attempts

**Files:**
- Modify: `site/src/english/state.ts`, `state.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `site/src/english/state.test.ts`:
```typescript
import { getGradingModel, setGradingModel, recordOutputAttempt, outputAttemptOf } from "./state";

const T3 = 1_700_000_000_000;

describe("english state — P3 output", () => {
  beforeEach(() => resetEnglish());

  it("defaults grading model to haiku and lets it change", () => {
    expect(getGradingModel()).toBe("claude-haiku-4-5");
    setGradingModel("claude-sonnet-4-6");
    expect(getGradingModel()).toBe("claude-sonnet-4-6");
  });

  it("records and reads an output attempt", () => {
    expect(outputAttemptOf("t1")).toBeUndefined();
    recordOutputAttempt("t1", "B1", T3);
    expect(outputAttemptOf("t1")?.scoreBand).toBe("B1");
  });

  it("resetEnglish clears output attempts", () => {
    recordOutputAttempt("t1", "B1", T3);
    resetEnglish();
    expect(outputAttemptOf("t1")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bunx vitest run src/english/state.test.ts`
Expected: FAIL — the new exports do not exist.

- [ ] **Step 3: Edit `state.ts`**

(a) Add a model type + extend `settings` and the state shape. Add near the top types:
```typescript
export type GradingModel = "claude-haiku-4-5" | "claude-sonnet-4-6";
```
Extend `EnglishState`:
```typescript
  settings: { newWordsPerDay: number; gradingModel: GradingModel };
  outputAttempts: Record<string, { at: number; scoreBand?: string }>;
```
(b) Extend `defaults`:
```typescript
const defaults: EnglishState = {
  words: {}, revealed: {}, known: {},
  settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY, gradingModel: "claude-haiku-4-5" },
  readUnits: {}, outputAttempts: {},
};
```
(c) In `load()` success return, set:
```typescript
      settings: {
        newWordsPerDay: parsed.settings?.newWordsPerDay ?? DEFAULT_NEW_PER_DAY,
        gradingModel: parsed.settings?.gradingModel ?? "claude-haiku-4-5",
      },
      outputAttempts: parsed.outputAttempts ?? {},
```
(d) In `resetEnglish()`, reset to:
```typescript
  englishState.value = {
    words: {}, revealed: {}, known: {},
    settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY, gradingModel: "claude-haiku-4-5" },
    readUnits: {}, outputAttempts: {},
  };
```
(e) Append the API:
```typescript
export function getGradingModel(): GradingModel {
  return englishState.value.settings.gradingModel;
}

export function setGradingModel(model: GradingModel) {
  englishState.value = {
    ...englishState.value,
    settings: { ...englishState.value.settings, gradingModel: model },
  };
}

export function recordOutputAttempt(id: string, scoreBand: string | undefined, now: number) {
  englishState.value = {
    ...englishState.value,
    outputAttempts: { ...englishState.value.outputAttempts, [id]: { at: now, scoreBand } },
  };
}

export function outputAttemptOf(id: string): { at: number; scoreBand?: string } | undefined {
  return englishState.value.outputAttempts[id];
}
```
(Update the `readUnits`-era `load()`/`resetEnglish()` carefully — keep `readUnits` handling from P2.)

- [ ] **Step 4: Run tests**

Run: `bunx vitest run src/english/state.test.ts`
Expected: PASS — P0+P1+P2+P3 (4+4+3+3 = 14).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/state.ts site/src/english/state.test.ts
git commit -m "feat(english): grading-model setting + output-attempt log"
```

---

### Task 6: KeyEntry island

**Files:**
- Create: `site/src/components/english/KeyEntry.tsx`

- [ ] **Step 1: Write the component**

```tsx
// site/src/components/english/KeyEntry.tsx
import { useState, useEffect } from "preact/hooks";
import { hasKey, keyStatus, setKey, unlock, clearKey, type KeyStatus } from "~/english/byok";
import { getGradingModel, setGradingModel, type GradingModel } from "~/english/state";
import { type Locale } from "~/i18n";

type Props = { lang: Locale; onChange?: () => void };

export default function KeyEntry({ lang, onChange }: Props) {
  const [status, setStatus] = useState<KeyStatus>("none");
  const [apiKey, setApiKey] = useState("");
  const [mode, setMode] = useState<"device" | "passphrase">("device");
  const [pass, setPass] = useState("");
  const [unlockPass, setUnlockPass] = useState("");
  const [model, setModel] = useState<GradingModel>("claude-haiku-4-5");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() { setStatus(await keyStatus()); setModel(getGradingModel()); }
  useEffect(() => { refresh(); }, []);

  const L = lang === "en" ? {
    title: "AI grading key (optional)",
    disclosure: "Your Anthropic API key is encrypted on this device and sent only to api.anthropic.com when you ask for grading. It is never synced or logged. Direct browser calls mean a successful XSS could in principle read the key while a call runs — the key is your own, encrypted at rest, and a strict Content-Security-Policy limits where requests can go.",
    keyPh: "sk-ant-…", save: "Save key", remove: "Remove key", device: "This device", passphrase: "Passphrase",
    passPh: "passphrase", model: "Grading model", unlock: "Unlock", locked: "Key is locked — enter your passphrase.",
    saved: "Key saved.", noKey: "No key set — output tasks fall back to self-assessment.",
  } : {
    title: "Ключ для AI-оценки (опционально)",
    disclosure: "Твой Anthropic API-ключ шифруется на этом устройстве и отправляется только на api.anthropic.com при запросе оценки. Никогда не синхронизируется и не логируется. Прямые вызовы из браузера означают, что успешный XSS теоретически может прочитать ключ во время запроса — ключ твой собственный, зашифрован, а строгий CSP ограничивает, куда уходят запросы.",
    keyPh: "sk-ant-…", save: "Сохранить", remove: "Удалить ключ", device: "Это устройство", passphrase: "Парольная фраза",
    passPh: "парольная фраза", model: "Модель оценки", unlock: "Разблокировать", locked: "Ключ заблокирован — введи парольную фразу.",
    saved: "Ключ сохранён.", noKey: "Ключ не задан — задания на письмо работают в режиме самопроверки.",
  };

  async function save() {
    setBusy(true); setErr(null);
    try {
      await setKey(apiKey.trim(), { mode, passphrase: mode === "passphrase" ? pass : undefined });
      setApiKey(""); setPass(""); await refresh(); onChange?.();
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  }
  async function doUnlock() {
    setBusy(true); setErr(null);
    const ok = await unlock(unlockPass);
    if (!ok) setErr(lang === "en" ? "Wrong passphrase." : "Неверная парольная фраза.");
    setUnlockPass(""); await refresh(); onChange?.(); setBusy(false);
  }
  async function remove() { await clearKey(); await refresh(); onChange?.(); }
  function pickModel(m: GradingModel) { setGradingModel(m); setModel(m); }

  return (
    <aside class="my-6 max-w-[620px] mx-auto bg-card border border-rule-strong rounded-[2px] p-5">
      <div class="meta mb-2">{L.title}</div>
      <p class="text-[12px] text-muted leading-relaxed mb-4">{L.disclosure}</p>

      {status === "locked" ? (
        <div class="flex flex-col gap-2 mb-4">
          <div class="text-[13px] text-ink">{L.locked}</div>
          <div class="flex gap-2">
            <input type="password" value={unlockPass} placeholder={L.passPh} onInput={(e) => setUnlockPass((e.target as HTMLInputElement).value)}
              class="flex-1 bg-paper border border-rule-strong rounded-[2px] px-3 py-2 text-[14px] text-ink" />
            <button type="button" class="btn" disabled={busy} onClick={doUnlock}>{L.unlock}</button>
          </div>
        </div>
      ) : status === "none" ? (
        <div class="flex flex-col gap-3 mb-4">
          <input type="password" autocomplete="off" value={apiKey} placeholder={L.keyPh} onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
            class="bg-paper border border-rule-strong rounded-[2px] px-3 py-2 text-[14px] text-ink font-mono" />
          <div class="flex gap-2">
            {(["device", "passphrase"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                class={`font-mono text-[11px] uppercase px-3 py-1.5 border rounded-[2px] cursor-pointer ${mode === m ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule"}`}>
                {m === "device" ? L.device : L.passphrase}
              </button>
            ))}
          </div>
          {mode === "passphrase" ? (
            <input type="password" value={pass} placeholder={L.passPh} onInput={(e) => setPass((e.target as HTMLInputElement).value)}
              class="bg-paper border border-rule-strong rounded-[2px] px-3 py-2 text-[14px] text-ink" />
          ) : null}
          <button type="button" class="btn self-start" disabled={busy || apiKey.trim().length === 0 || (mode === "passphrase" && pass.length === 0)} onClick={save}>{L.save}</button>
        </div>
      ) : (
        <div class="flex items-center gap-3 mb-4">
          <span class="text-[13px] text-ink">✓ {L.saved}</span>
          <button type="button" class="btn ghost text-[12px]" onClick={remove}>{L.remove}</button>
        </div>
      )}

      <div class="border-t border-rule pt-3">
        <div class="text-[12px] text-muted mb-2">{L.model}</div>
        <div class="flex gap-2">
          {(["claude-haiku-4-5", "claude-sonnet-4-6"] as const).map((m) => (
            <button key={m} type="button" onClick={() => pickModel(m)}
              class={`font-mono text-[11px] px-3 py-1.5 border rounded-[2px] cursor-pointer ${model === m ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule"}`}>
              {m === "claude-haiku-4-5" ? "Haiku" : "Sonnet"}
            </button>
          ))}
        </div>
      </div>
      {err ? <div class="text-[12px] text-red-600 mt-3">{err}</div> : null}
      {status === "none" ? <div class="text-[12px] text-muted mt-3">{L.noKey}</div> : null}
    </aside>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bunx astro check 2>&1 | grep -E "KeyEntry" || echo "no KeyEntry errors"`
Expected: `no KeyEntry errors`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/english/KeyEntry.tsx
git commit -m "feat(english): KeyEntry island (modes, model picker, security disclosure)"
```

---

### Task 7: OutputModule island

**Files:**
- Create: `site/src/components/english/OutputModule.tsx`

- [ ] **Step 1: Write the component**

```tsx
// site/src/components/english/OutputModule.tsx
import { useMemo, useState } from "preact/hooks";
import { outputTasks } from "~/english/data/output/tasks";
import type { OutputTask, GradingResult, Band } from "~/english/types";
import { englishState, getPlacement, getGradingModel, recordOutputAttempt } from "~/english/state";
import { hasKey, keyStatus } from "~/english/byok";
import { gradeOutput } from "~/english/byok/anthropic";
import { type Locale } from "~/i18n";
import KeyEntry from "./KeyEntry";

type Props = { lang: Locale };
const now = () => Date.now();

function bandsUpTo(band: Band): Band[] {
  const order: Band[] = ["A2", "B1", "B2"];
  return order.slice(0, order.indexOf(band) + 1);
}

export default function OutputModule({ lang }: Props) {
  englishState.value; // subscribe
  const band = getPlacement()?.band ?? "A2";
  const allowed = bandsUpTo(band);
  const tasks = useMemo<OutputTask[]>(() => outputTasks.filter((t) => allowed.includes(t.band)), [band]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [selfAssess, setSelfAssess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const task = openId ? outputTasks.find((t) => t.id === openId) ?? null : null;

  const L = lang === "en" ? {
    title: "Output", write: "Write your response", submit: "Get AI feedback", selfAssessBtn: "Show model answer",
    back: "← All tasks", rubric: "You'll be graded on", corrections: "Corrections", better: "A stronger version",
    band: "Estimated level", notice: "Notice next time", model: "Model answer", grading: "Grading…",
    needKey: "Add an API key for AI feedback, or self-assess against the model answer.",
  } : {
    title: "Письмо", write: "Напиши ответ", submit: "Получить AI-фидбек", selfAssessBtn: "Показать образец",
    back: "← Все задания", rubric: "Оценивается по", corrections: "Исправления", better: "Сильнее версия",
    band: "Оценка уровня", notice: "Обрати внимание", model: "Образец ответа", grading: "Оцениваю…",
    needKey: "Добавь API-ключ для AI-фидбека или сверься с образцом.",
  };

  function openTask(id: string) { setOpenId(id); setText(""); setResult(null); setSelfAssess(false); setErr(null); }

  async function submit() {
    if (!task) return;
    setBusy(true); setErr(null);
    try {
      const st = await keyStatus();
      if (st === "device" || st === "unlocked") {
        const r = await gradeOutput(task, text, getGradingModel());
        setResult(r);
        recordOutputAttempt(task.id, r.scoreBand, now());
      } else {
        setSelfAssess(true); // no usable key -> degrade
      }
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  }

  if (task) {
    return (
      <div class="max-w-[620px] mx-auto">
        <button type="button" class="btn link text-[12px] text-muted mb-4" onClick={() => setOpenId(null)}>{L.back}</button>
        <p class="text-[15px] text-ink mb-1">{task.prompt[lang]}</p>
        <p class="text-[12px] text-muted mb-4">{L.rubric}: {task.rubric.join(" · ")}</p>
        <textarea value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} rows={6}
          class="w-full bg-paper border border-rule-strong rounded-[2px] px-3 py-2 text-[14px] text-ink mb-3" placeholder={L.write} />
        <div class="flex gap-2">
          <button type="button" class="btn" disabled={busy || text.trim().length === 0} onClick={submit}>{busy ? L.grading : L.submit}</button>
          {task.modelAnswer ? <button type="button" class="btn ghost text-[12px]" onClick={() => setSelfAssess((v) => !v)}>{L.selfAssessBtn}</button> : null}
        </div>
        {err ? <div class="text-[12px] text-red-600 mt-3">{err}</div> : null}

        {result ? (
          <div class="mt-5 flex flex-col gap-4">
            <div class="text-[13px] text-muted">{L.band}: <span class="text-ink font-semibold">{result.scoreBand}</span></div>
            {result.corrections.length ? (
              <div><div class="meta mb-2">{L.corrections}</div>
                <ul class="flex flex-col gap-1 m-0 p-0 list-none">
                  {result.corrections.map((c, i) => (
                    <li key={i} class="text-[13px]"><span class="line-through text-muted">{c.before}</span> → <span class="text-ink">{c.after}</span> <span class="text-muted">— {c.why}</span></li>
                  ))}
                </ul></div>
            ) : null}
            <div><div class="meta mb-1">{L.better}</div><p class="text-[14px] text-ink m-0">{result.betterVersion}</p></div>
            {result.noticingHints.length ? (
              <div><div class="meta mb-1">{L.notice}</div>
                <ul class="text-[13px] text-ink">{result.noticingHints.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
            ) : null}
          </div>
        ) : null}

        {selfAssess && task.modelAnswer ? (
          <div class="mt-5">
            <div class="meta mb-1">{L.model}</div>
            <p class="text-[14px] text-ink m-0">{task.modelAnswer[lang]}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div class="max-w-[620px] mx-auto">
      <KeyEntry lang={lang} />
      <ul class="flex flex-col gap-2 m-0 p-0 list-none mt-2">
        {tasks.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => openTask(t.id)}
              class="w-full text-left bg-card border border-rule rounded-[2px] px-4 py-3 cursor-pointer hover:border-rule-strong transition-colors">
              <span class="block text-[14px] text-ink font-semibold">{t.prompt[lang]}</span>
              <span class="block text-[12px] text-muted">{t.type} · {t.band}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bunx astro check 2>&1 | grep -E "OutputModule" || echo "no OutputModule errors"`
Expected: `no OutputModule errors`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/english/OutputModule.tsx
git commit -m "feat(english): OutputModule island (AI grade + no-key self-assessment)"
```

---

### Task 8: CSP audit + meta policy

**Files:**
- Modify: `site/src/layouts/Topic.astro`

This is the risky task. **Audit first, then craft, then verify.** Do NOT guess the policy.

- [ ] **Step 1: Build + audit the current output**

Run: `bun run build 2>&1 | tail -3`
Then inspect a representative built page for inline scripts/styles + external origins:
```bash
grep -oE '<(script|link|style)[^>]*>' dist/en/english/index.html | sort -u | head -40
grep -oE 'https://[a-z.]+' dist/en/english/index.html | sort -u
```
Record: do Astro islands emit inline `<script>` (need a hash or `'unsafe-inline'`) or only `<script type="module" src=…>` (same-origin, `'self'` suffices)? Which external origins appear (expect `fonts.googleapis.com`, `fonts.gstatic.com`)?

- [ ] **Step 2: Add the CSP meta to `Topic.astro`**

In `site/src/layouts/Topic.astro`, inside `<head>` (after the charset/viewport metas), add a CSP meta. Start from this policy and **adjust `script-src` per the Step 1 audit** (if inline island scripts exist, add their sha256 hashes or, as a documented fallback, `'unsafe-inline'`):
```astro
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.anthropic.com; base-uri 'self'; form-action 'self'"
    />
```

- [ ] **Step 3: Rebuild + verify in a browser**

Run: `bun run build 2>&1 | tail -3` (expect `Complete!`, 0 errors).
Run: `bunx vitest run src/english` (still green).
Then serve `dist/` and open `/en/english/` in a browser. Confirm in DevTools console:
- No `Content-Security-Policy` violation errors.
- Fonts load (text renders in the brand font).
- An island hydrates (e.g. the placement test or reading feed is interactive).

```bash
cd dist && python3 -m http.server 4321 &   # then open http://localhost:4321/en/english/ ; stop the server after
```

If a violation breaks hydration or fonts: refine the directive (add the needed hash/origin). If a **safe** `script-src` cannot be made to work with Astro hydration after a genuine attempt, fall back to the minimal working policy that still pins `connect-src 'self' https://api.anthropic.com` (the BYOK-relevant control), and add an HTML comment in `Topic.astro` documenting the limitation. Do not ship a visibly broken site.

- [ ] **Step 4: Commit**

```bash
git add site/src/layouts/Topic.astro
git commit -m "feat(security): site-wide CSP — pin connect-src to self + Anthropic"
```

---

### Task 9: Today output slot + hub Output section

**Files:**
- Modify: `site/src/components/english/Today.tsx`
- Modify: `site/src/pages/[lang]/english/index.astro`

- [ ] **Step 1: Add an output slot to Today**

In `site/src/components/english/Today.tsx`, import the tasks + attempt log and surface one occasional output task. Add imports:
```typescript
import { outputTasks } from "~/english/data/output/tasks";
import { outputAttemptOf } from "~/english/state";
```
After the `nextText` memo, add a pick of an output task the learner hasn't attempted (at band), shown ~every few days — gate by a simple day-parity rule so it is not daily:
```typescript
  const outputTask = useMemo(() => {
    const order = ["A2", "B1", "B2"];
    const maxIdx = order.indexOf(placement?.band ?? "A2");
    const showToday = Math.floor(now() / 86_400_000) % 3 === 0; // ~every 3rd day
    if (!showToday) return null;
    return outputTasks.find((t) => order.indexOf(t.band) <= maxIdx && !outputAttemptOf(t.id)) ?? null;
  }, [englishState.value, placement]);
```
Extend the `L` map:
```typescript
    output: lang === "en" ? "Today's writing" : "Письмо на сегодня",
    outputCta: lang === "en" ? "Open in Output below ↓" : "Открой в разделе «Письмо» ниже ↓",
```
Add a block to the JSX after the reading block:
```tsx
      {outputTask ? (
        <div>
          <div class="meta mb-2">{L.output}</div>
          <div class="text-[14px] text-ink"><span class="font-semibold">{outputTask.prompt[lang]}</span><span class="text-muted"> — {L.outputCta}</span></div>
        </div>
      ) : null}
```

- [ ] **Step 2: Add the Output section to the hub**

In `site/src/pages/[lang]/english/index.astro`, import `OutputModule` and add a section after Reading. Add to frontmatter imports:
```astro
import OutputModule from "../../../components/english/OutputModule.tsx";
```
Extend the `L` map: `{ today: …, reading: …, output: lang === "en" ? "Output" : "Письмо" }` (add `output` to both locales).
Add after the Reading `<section>`:
```astro
  <section class="border-t border-rule pt-10 mt-14">
    <div class="meta mb-4 max-w-[620px] mx-auto">{L.output}</div>
    <OutputModule client:visible lang={lang} />
  </section>
```

- [ ] **Step 3: Type-check + commit**

Run: `bunx astro check 2>&1 | grep -E "Today\.tsx|english/index" || echo "no Today/hub errors"`
Expected: `no Today/hub errors`.
```bash
git add site/src/components/english/Today.tsx "site/src/pages/[lang]/english/index.astro"
git commit -m "feat(english): Today writing slot + hub Output section"
```

---

### Task 10: Full build green

**Files:** none (verification + drift).

- [ ] **Step 1: English test suite**

Run: `bunx vitest run src/english`
Expected: PASS — byok (crypto, store, grading, anthropic), output data, state (P0–P3), plus all prior.

- [ ] **Step 2: Full build**

Run: `bun run build 2>&1 | tail -6`
Expected: `Complete!`, **0 errors**; warnings ≤ baseline 1271; CSP meta present in built HTML (`grep -c "Content-Security-Policy" dist/en/english/index.html` ≥ 1).

- [ ] **Step 3: Confirm 0 errors**

Run: `node -e "const r=require('./dist/lint-report.json'); console.log('errors:', (r.errors??r.errorCount), 'warnings:', (r.warnings??r.warningCount))"`
Expected: `errors: 0`.

- [ ] **Step 4: i18n parity (only if new `t()` keys added)**

Islands use inline `L` maps, so no new `t()` keys are required. If any were added, mirror them in `en` + `ru` of `site/src/i18n/ui.json`.

- [ ] **Step 5: Commit any drift**

```bash
git add -A site
git commit -m "chore(english): P3 output+BYOK green — build + tests verified" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage (addendum §1–§12):**
- §2 BYOK key store (crypto, persistence, modes, exclusion) → Task 1. ✓
- §3 Anthropic client (raw fetch, headers, prompt-cache, caps) → Task 3. ✓
- §4 Grading contract + parser → Task 2. ✓
- §5 Output tasks data → Task 4. ✓
- §6 State (gradingModel, outputAttempts, key not in state) → Task 5. ✓
- §7 UI (KeyEntry, OutputModule, degradation) → Tasks 6, 7. ✓
- §8 CSP (audit + meta + verify + fallback) → Task 8. ✓
- §9 Today + hub → Task 9. ✓
- §10 Testing (crypto round-trip/non-extractable/no-plaintext, grading contract, output validity, state, build, CSP present) → Tasks 1,2,3,4,5,8,10. ✓
- §13 build order → Tasks 1–10. ✓

**Placeholder scan:** Task 4 (data) and Task 8 (CSP) are gated/audited steps, not placeholders — Task 4 specifies type + authoring spec + a failing validity gate; Task 8 specifies an explicit audit→craft→verify→fallback procedure with a starting policy. All code tasks show complete code. ✓

**Type consistency:** `KeyStatus`/`KeyStore`/`withKey` defined Task 1, consumed Tasks 3,6,7. `GradingResult` Task 2, consumed Tasks 3,7. `GradeDeps`/`gradeWithClient`/`gradeOutput`/`GradeModel`/`MAX_INPUT_CHARS` Task 3, consumed Task 7. `OutputTask` Task 4, consumed Tasks 3,7,9. `GradingModel`/`getGradingModel`/`setGradingModel`/`recordOutputAttempt`/`outputAttemptOf` Task 5, consumed Tasks 6,7,9. ✓

**Security review gate:** flagged after Task 3 and again before merge (header + Task 3 note). Invariants restated in the plan header.

**Known intentional gaps (per spec):** no account-sync graduation; B2 output sparse; CSP may fall back to a documented minimal policy if Astro hydration forbids a strict `script-src`.
