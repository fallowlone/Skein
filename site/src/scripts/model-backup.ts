/** Minimal Storage subset so the logic is unit-testable with a fake. */
import { validateLearningStorageEntry } from "~/scripts/path/state-io";

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const BACKUP_VERSION = 2;
const LEGACY_VERSION = 1;

const SAFE_EXACT_KEYS = new Set([
  "skein.user-state.v1",
  "skein.path-knowledge.v1",
  "skein.path-config.v1",
  "skein.path-overrides.v1",
  "skein.english.v2",
  "skein.english.register.v1",
  "skein.drill.v1",
  "skein.theme",
  "skein.density",
  "skein.motion",
  "skein.equipped-title",
  "atlas.review.v1",
  "atlas.assess.v1",
]);

const SAFE_PREFIXES = [
  "skein.algo-workspace.",
  "skein.capstone.",
  "atlas.practice.",
  "atlas.practice-attempts.",
  "atlas.practice-responses.",
  "atlas.practice-selfgrade.",
  "atlas.last.",
];

function isBackupKey(k: string): boolean {
  return SAFE_EXACT_KEYS.has(k) || SAFE_PREFIXES.some((p) => k.startsWith(p));
}

export interface BackupBlob { version: number; exportedAt?: number; data: Record<string, string> }

/** Snapshot learning state and preferences, excluding credentials and cache/telemetry identifiers. */
export function exportModel(store: StorageLike, now = Date.now()): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (!k || !isBackupKey(k)) continue;
    const v = store.getItem(k);
    if (v !== null) data[k] = v;
  }
  const blob: BackupBlob = { version: BACKUP_VERSION, exportedAt: now, data };
  return JSON.stringify(blob);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateEntries(data: Record<string, unknown>): [string, string][] {
  const entries = Object.entries(data);
  for (const [key, value] of entries) {
    if (!isBackupKey(key)) throw new Error(`Invalid backup key: ${key}`);
    if (typeof value !== "string") throw new Error(`Invalid backup value for key: ${key}`);
    const invalid = validateLearningStorageEntry(key, value);
    if (invalid) throw new Error(invalid);
  }
  return entries as [string, string][];
}

/** Restore a prevalidated snapshot atomically; valid v1 backups remain importable. */
export function importModel(store: StorageLike, json: string): { restored: number } {
  let blob: unknown;
  try {
    blob = JSON.parse(json);
  } catch {
    throw new Error("Invalid backup file: not valid JSON");
  }
  if (!isPlainObject(blob)) {
    throw new Error("Invalid backup file: unexpected shape");
  }
  const b = blob as Partial<BackupBlob>;
  if ((b.version !== BACKUP_VERSION && b.version !== LEGACY_VERSION) || !isPlainObject(b.data) ||
      (b.exportedAt !== undefined && (!Number.isFinite(b.exportedAt) || b.exportedAt < 0))) {
    throw new Error("Invalid backup file: unexpected shape");
  }

  const entries = validateEntries(b.data);
  const before = new Map(entries.map(([key]) => [key, store.getItem(key)]));
  const written: string[] = [];
  try {
    for (const [key, value] of entries) {
      store.setItem(key, value);
      written.push(key);
    }
  } catch (error) {
    try {
      for (const key of written.reverse()) {
        const previous = before.get(key);
        if (previous === null) store.removeItem(key);
        else store.setItem(key, previous!);
      }
    } catch {
      throw new Error("Backup restore failed and rollback was incomplete", { cause: error });
    }
    if (error instanceof Error) throw error;
    throw new Error("Backup restore failed", { cause: error });
  }
  return { restored: entries.length };
}
