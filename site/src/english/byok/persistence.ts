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
