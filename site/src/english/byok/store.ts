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
        sessionKey = key;
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
        await decryptString(key, rec.ciphertext, rec.iv);
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
