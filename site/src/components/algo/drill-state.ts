export type DrillStatus = "unattempted" | "attempted" | "solved";
export interface DrillEntry { status: DrillStatus; at: number; noHint?: boolean; }

const ORDER: DrillStatus[] = ["unattempted", "attempted", "solved"];
export function nextStatus(s: DrillStatus): DrillStatus {
  return ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];
}

const REVISIT_DAYS = 5;
export function needsRevisit(e: DrillEntry, now: number): boolean {
  if (e.status !== "solved") return false;
  return now - e.at >= REVISIT_DAYS * 86_400_000;
}

const KEY = "awesome.drill.v1";
type Store = Record<string, DrillEntry>;

export type DrillStore = Store;

export function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    // guard against valid-JSON-wrong-shape (legacy/corrupted/hand-edited values)
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Store) : {};
  } catch {
    return {};
  }
}
export function saveEntry(id: string, status: DrillStatus, now: number, noHint?: boolean): void {
  if (typeof window === "undefined") return;
  const store = loadStore();
  store[id] = { status, at: now, noHint: noHint ?? store[id]?.noHint };
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
}
