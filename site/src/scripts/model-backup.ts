/** Minimal Storage subset so the logic is unit-testable with a fake. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const APP_PREFIXES = ["awesome.", "atlas."];
const BACKUP_VERSION = 1;

function isAppKey(k: string): boolean {
  return APP_PREFIXES.some((p) => k.startsWith(p));
}

export interface BackupBlob { version: number; exportedAt?: number; data: Record<string, string> }

/** Snapshot every app-prefixed localStorage entry into a versioned JSON string. */
export function exportModel(store: StorageLike): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (!k || !isAppKey(k)) continue;
    const v = store.getItem(k);
    if (v !== null) data[k] = v;
  }
  const blob: BackupBlob = { version: BACKUP_VERSION, data };
  return JSON.stringify(blob);
}

/** Restore app-prefixed entries from a backup blob; ignores non-app keys. Throws on bad input. */
export function importModel(store: StorageLike, json: string): { restored: number } {
  let blob: unknown;
  try {
    blob = JSON.parse(json);
  } catch {
    throw new Error("Invalid backup file: not valid JSON");
  }
  const b = blob as Partial<BackupBlob>;
  if (!b || typeof b !== "object" || b.version !== BACKUP_VERSION || typeof b.data !== "object" || b.data === null) {
    throw new Error("Invalid backup file: unexpected shape");
  }
  let restored = 0;
  for (const [k, v] of Object.entries(b.data)) {
    if (!isAppKey(k) || typeof v !== "string") continue;
    store.setItem(k, v);
    restored++;
  }
  return { restored };
}
