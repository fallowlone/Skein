import type { UserState } from "./user-state";

type Stamped = { lastAt: number };
function mergeStampedMap<T extends Stamped>(
  a: Record<string, T> = {}, b: Record<string, T> = {},
): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    if (!cur || v.lastAt > cur.lastAt) out[k] = v;
  }
  return out;
}

/**
 * Merge two UserStates. Timestamped maps (history, retrieval) merge per-key by
 * max(lastAt). UI preferences (tier, lang, motion) prefer `local` — the device
 * the user is actively on. Earned/accumulated data is coalesced so a fresh
 * device's empty local state can never erase server data and push the loss back:
 * `pretest` keeps whichever side has a record, and `manualTierFlips` takes the max.
 */
export function mergeProgress(local: UserState, server: UserState): UserState {
  return {
    ...server,
    ...local, // local UI prefs (tier, lang, motion) win
    pretest: local.pretest ?? server.pretest,
    manualTierFlips: Math.max(local.manualTierFlips ?? 0, server.manualTierFlips ?? 0),
    history: mergeStampedMap(server.history, local.history),
    retrieval: mergeStampedMap(server.retrieval, local.retrieval),
    dismissedRevisit: { ...server.dismissedRevisit, ...local.dismissedRevisit },
  };
}

// --- client API wrappers (network) ---

export async function fetchMe(): Promise<{
  login: string; nickname: string; avatarUrl: string | null;
  createdAt: number; termsAccepted: boolean; termsVersion: string;
} | null> {
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function fetchServerProgress(): Promise<UserState | null> {
  try {
    const r = await fetch("/api/progress", { credentials: "same-origin" });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.data as UserState) ?? null;
  } catch { return null; }
}

export async function pushProgress(state: UserState): Promise<boolean> {
  try {
    const r = await fetch("/api/progress", {
      method: "PUT", credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    return r.ok;
  } catch { return false; }
}
