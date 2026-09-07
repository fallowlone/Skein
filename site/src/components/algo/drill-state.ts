export type DrillStatus = "unattempted" | "attempted" | "solved";
export interface DrillEntry { status: DrillStatus; at: number; noHint?: boolean; unit?: string; }

const ORDER: DrillStatus[] = ["unattempted", "attempted", "solved"];
export function nextStatus(s: DrillStatus): DrillStatus {
  return ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];
}

const REVISIT_DAYS = 5;
export function needsRevisit(e: DrillEntry, now: number): boolean {
  if (e.status !== "solved") return false;
  return now - e.at >= REVISIT_DAYS * 86_400_000;
}

const KEY = "skein.drill.v1";
type Store = Record<string, DrillEntry>;

export type DrillStore = Store;

function isDrillEntry(value: unknown): value is DrillEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (entry.status === "unattempted" || entry.status === "attempted" || entry.status === "solved")
    && typeof entry.at === "number"
    && Number.isFinite(entry.at)
    && (entry.noHint === undefined || typeof entry.noHint === "boolean")
    && (entry.unit === undefined || typeof entry.unit === "string");
}

export function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    // guard against valid-JSON-wrong-shape (legacy/corrupted/hand-edited values)
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const store: Store = {};
    for (const [id, entry] of Object.entries(v)) {
      if (isDrillEntry(entry)) store[id] = entry;
    }
    return store;
  } catch {
    return {};
  }
}
export function saveEntry(id: string, status: DrillStatus, now: number, noHint?: boolean, unit?: string): boolean {
  if (typeof window === "undefined") return false;
  const store = loadStore();
  store[id] = { status, at: now, noHint: noHint ?? store[id]?.noHint, unit: unit ?? store[id]?.unit };
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}
