// site/src/english/byok/crypto.test.ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateDeviceKey, derivePassphraseKey, encryptString, decryptString, randomSalt } from "./crypto";

describe("byok crypto", () => {
  it("device key round-trips and is non-extractable", async () => {
    const key = await generateDeviceKey();
    expect(key.extractable).toBe(false);
    const { ciphertext, iv } = await encryptString(key, "sk-ant-secret");
    await expect(decryptString(key, ciphertext, iv)).resolves.toBe("sk-ant-secret");
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
