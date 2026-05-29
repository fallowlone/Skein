import type { UserState } from "./user-state";
import type { PretestResult, Progression } from "./progression/types";
import { rankToTier } from "./progression/rank-tier";

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
 * History entries are NOT replaced whole (that would drop the other device's
 * opened tiers / faded examples). Deep-merge per slug: union tiersOpened, merge
 * faded, keep the earliest firstAt and latest lastAt.
 */
function mergeHistory(
  a: UserState["history"] = {}, b: UserState["history"] = {},
): UserState["history"] {
  const out: UserState["history"] = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    if (!cur) { out[k] = v; continue; }
    out[k] = {
      firstAt: Math.min(cur.firstAt, v.firstAt),
      lastAt: Math.max(cur.lastAt, v.lastAt),
      tiersOpened: Array.from(new Set([...(cur.tiersOpened ?? []), ...(v.tiersOpened ?? [])])),
      faded: (cur.faded || v.faded) ? { ...(v.faded ?? {}), ...(cur.faded ?? {}) } : undefined,
    };
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
  const pretest = pickBetterPretest(local.pretest, server.pretest);
  return {
    ...server,
    ...local, // local UI prefs (lang, motion) win
    pretest,
    // tier follows the merged placement result (source of truth) when present,
    // so a fresh device that synced a senior result isn't shown middle-tier content.
    tier: pretest ? rankToTier(pretest.rank) : local.tier,
    progression: mergeProgression(local.progression, server.progression),
    manualTierFlips: Math.max(local.manualTierFlips ?? 0, server.manualTierFlips ?? 0),
    history: mergeHistory(server.history, local.history),
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

function pickBetterPretest(a?: PretestResult | null, b?: PretestResult | null): PretestResult | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a.rating >= b.rating ? a : b;
}

function mergeProgression(a?: Progression, b?: Progression): Progression {
  const base: Progression = a ?? { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] };
  if (!b) return base;
  return {
    xp: Math.max(a?.xp ?? 0, b.xp ?? 0),
    level: Math.max(a?.level ?? 1, b.level ?? 1),
    achievements: { ...b.achievements, ...(a?.achievements ?? {}) },
    streak: {
      lastActiveDay: (a?.streak.lastActiveDay ?? "") >= (b.streak.lastActiveDay ?? "") ? (a?.streak.lastActiveDay ?? "") : b.streak.lastActiveDay,
      count: (a?.streak.lastActiveDay ?? "") >= (b.streak.lastActiveDay ?? "") ? (a?.streak.count ?? 0) : b.streak.count,
      best: Math.max(a?.streak.best ?? 0, b.streak.best ?? 0),
    },
    titles: Array.from(new Set([...(a?.titles ?? []), ...b.titles])),
  };
}
