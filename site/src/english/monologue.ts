// site/src/english/monologue.ts
// Monthly monologue checkpoint — the methodology's result metric: a ~3-minute recorded monologue
// each month; growth is only audible against a recording ~3 months back. Metadata here; audio
// blobs in IndexedDB (localStorage can't hold audio). Pure helpers exported for tests.
export interface MonologueMeta { id: string; at: number; durationSec: number; note?: string }

const DAY = 86_400_000;
const DUE_DAYS = 28;
const COMPARE_BACK_DAYS = 84;

export function isDue(list: MonologueMeta[], now: number): boolean {
  const latest = Math.max(0, ...list.map((m) => m.at));
  return now - latest >= DUE_DAYS * DAY;
}

// Newest recording that is at least ~3 months older than the most recent one.
export function comparisonTarget(list: MonologueMeta[]): MonologueMeta | null {
  if (list.length < 2) return null;
  const sorted = [...list].sort((a, b) => b.at - a.at);
  const latest = sorted[0];
  return sorted.find((m) => latest.at - m.at >= COMPARE_BACK_DAYS * DAY) ?? null;
}

// ── IndexedDB blob store (browser only) ────────────────────────────────────────
const DB = "awesome-english-monologues", STORE = "recordings";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecording(meta: MonologueMeta, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...meta, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listRecordings(): Promise<MonologueMeta[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as (MonologueMeta & { blob: Blob })[]).map(({ blob: _b, ...m }) => m).sort((a, b) => b.at - a.at));
    req.onerror = () => reject(req.error);
  });
}

export async function getRecordingBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}
