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
