export type DrillStatus = "unattempted" | "attempted" | "solved";
export interface DrillEntry { status: DrillStatus; at: number; }

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

export function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
export function saveEntry(id: string, status: DrillStatus, now: number): void {
  if (typeof window === "undefined") return;
  const store = loadStore();
  store[id] = { status, at: now };
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
}
