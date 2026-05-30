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
