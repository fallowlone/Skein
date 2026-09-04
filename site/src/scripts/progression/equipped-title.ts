// site/src/scripts/progression/equipped-title.ts
// Isolated, local-only equipped-title choice — NOT part of the synced userState schema.
import { signal } from "@preact/signals";

export const EQUIP_KEY = "skein.equipped-title";

function load(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(EQUIP_KEY); } catch { return null; }
}

export const equippedTitle = signal<string | null>(load());

export function setEquippedTitle(id: string | null): void {
  equippedTitle.value = id;
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(EQUIP_KEY, id);
    else localStorage.removeItem(EQUIP_KEY);
  } catch { /* private mode — non-fatal */ }
}
