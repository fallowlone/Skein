import type { UserState } from "./user-state";
import type { PretestResult, Progression, EnglishSummary } from "./progression/types";
import { rankToTier } from "./progression/rank-tier";
import { mergeCapstones } from "./sync-extras";

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
    // milestone done anywhere stays done — a fresh device's empty mirror must
    // not clobber the server's record (local would otherwise win the spread)
    capstones: (local.capstones || server.capstones)
      ? mergeCapstones(server.capstones ?? {}, local.capstones ?? {})
      : undefined,
  };
}

// --- client API wrappers (network) ---

export async function fetchMe(): Promise<{
  login: string; nickname: string; avatarUrl: string | null;
  createdAt: number; termsAccepted: boolean; termsVersion: string;
} | null> {
  // Anonymous visitors (the common public-page case, and every Lighthouse run)
  // carry no session, so /api/me would only ever answer {authenticated:false}.
  // Skip the request entirely unless the readable hint cookie set at login is
  // present — keeps /api/me off the page's initial network path for guests.
  if (typeof document !== "undefined" && !/(?:^|;\s*)skein.auth=1(?:;|$)/.test(document.cookie)) {
    return null;
  }
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    if (!r.ok) return null;
    const data = await r.json();
    // /api/me answers 200 {authenticated:false} for anonymous visitors (it no
    // longer 401s, which used to log a console error). Treat that as signed-out.
    if (!data || data.authenticated === false || !data.login) return null;
    return data;
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

export async function pushProgress(state: UserState & { extras?: unknown }): Promise<boolean> {
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

function mergeEnglishSummary(a?: EnglishSummary, b?: EnglishSummary): EnglishSummary | undefined {
  if (!a) return b;
  if (!b) return a;
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return {
    knownTotal: Math.max(a.knownTotal, b.knownTotal),
    knownByBand: {
      A2: Math.max(a.knownByBand.A2, b.knownByBand.A2),
      B1: Math.max(a.knownByBand.B1, b.knownByBand.B1),
      B2: Math.max(a.knownByBand.B2, b.knownByBand.B2),
    },
    band: newer.band,
    readUnits: Math.max(a.readUnits, b.readUnits),
    grammarDone: Math.max(a.grammarDone, b.grammarDone),
    collocationDone: Math.max(a.collocationDone, b.collocationDone),
    graded: a.graded || b.graded,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

// Undefined-preserving max: keep the field absent when neither side has it, so optional progression
// fields (peakRating, interviewReadiness, …) are never forced to a meaningful 0 that consumers would
// read as a real value (e.g. peakRating:0 → rank for rating 0).
function maxOpt(x?: number, y?: number): number | undefined {
  if (x == null && y == null) return undefined;
  return Math.max(x ?? 0, y ?? 0);
}

function mergeProgression(a?: Progression, b?: Progression): Progression {
  const base: Progression = a ?? { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] };
  if (!b) return base;
  const aNewer = (a?.streak.lastActiveDay ?? "") >= (b.streak.lastActiveDay ?? "");
  // studyEma is an EMA snapshot, not monotonic — carry the one from the most recent recompute.
  const studyEma = (a?.studyRatingAt ?? 0) >= (b.studyRatingAt ?? 0) ? a?.studyEma : b.studyEma;
  return {
    xp: Math.max(a?.xp ?? 0, b.xp ?? 0),
    level: Math.max(a?.level ?? 1, b.level ?? 1),
    achievements: { ...b.achievements, ...(a?.achievements ?? {}) },
    streak: {
      lastActiveDay: aNewer ? (a?.streak.lastActiveDay ?? "") : b.streak.lastActiveDay,
      count: aNewer ? (a?.streak.count ?? 0) : b.streak.count,
      best: Math.max(a?.streak.best ?? 0, b.streak.best ?? 0),
      freezes: maxOpt(a?.streak.freezes, b.streak.freezes),
    },
    titles: Array.from(new Set([...(a?.titles ?? []), ...b.titles])),
    englishSummary: mergeEnglishSummary(a?.englishSummary, b?.englishSummary),
    // P1 living-rank + P4 interview + Phase C/D — preserve across sync (high-water / most-recent),
    // never silently reset to undefined on a merge.
    peakRating: maxOpt(a?.peakRating, b.peakRating),
    studyEma,
    studyRatingAt: maxOpt(a?.studyRatingAt, b.studyRatingAt),
    interviewReadiness: maxOpt(a?.interviewReadiness, b.interviewReadiness),
    interviewCompletedAt: maxOpt(a?.interviewCompletedAt, b.interviewCompletedAt),
    interviewRounds: maxOpt(a?.interviewRounds, b.interviewRounds),
  };
}
