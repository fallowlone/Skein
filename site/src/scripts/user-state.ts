import { signal, effect } from "@preact/signals";
import type { Tier, Lang } from "../types";
import type { PretestResult, Progression } from "./progression/types";
import { ratingToRank } from "./progression/ranks";
import { rankToTier } from "./progression/rank-tier";
import { computeRating, confidenceOf } from "./progression/rating";
import { mergeProgress, fetchMe, fetchServerProgress, pushProgress } from "./account-sync";
import { updateStreak, todayISO } from "./progression/streak";

const KEY = "awesome.user-state.v1";

export type UserState = {
  tier: Tier;
  lang: Lang;
  motion: "on" | "off" | "auto";
  pretest: PretestResult | null;
  progression: Progression;
  history: Record<string, {
    firstAt: number;
    lastAt: number;
    tiersOpened: Tier[];
    faded?: Record<string, true>;
  }>;
  retrieval: Record<string, { attempted: boolean; lastAt: number; attempts: number }>;
  dismissedRevisit: Record<string, number>;
  manualTierFlips: number;
  // Optional: lets the roadmap avoid re-nagging a just-dismissed recommendation.
  // Optional so old persisted payloads stay valid under the load() merge.
  roadmap?: { lastRecommendedTrack?: string; dismissedAt?: number };
  // Per-capstone milestone completion (sync-forward mirror of capstone-state.ts,
  // which owns the live UI source of truth). projectSlug → milestoneId → done.
  capstones?: Record<string, Record<string, boolean>>;
};

const defaults: UserState = {
  tier: "middle",
  lang: "en",
  motion: "auto",
  pretest: null,
  progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] },
  history: {},
  retrieval: {},
  dismissedRevisit: {},
  manualTierFlips: 0,
};

function load(): UserState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const merged = { ...defaults, ...JSON.parse(raw) } as UserState;
    if (!merged.progression) merged.progression = defaultProgression();
    if (merged.pretest && !(merged.pretest as any).stage1) {
      const ans = (merged.pretest as any).answers ?? [];
      merged.pretest = migratePretest(merged.pretest as any, Math.max(1, ans.length * 3));
    }
    return merged;
  } catch {
    return defaults;
  }
}

function save(s: UserState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const userState = signal<UserState>(load());

if (typeof window !== "undefined") {
  effect(() => save(userState.value));
}

export function recordVisit(slug: string, tier: Tier) {
  const h = userState.value.history[slug];
  const now = Date.now();
  userState.value = {
    ...userState.value,
    history: {
      ...userState.value.history,
      [slug]: {
        firstAt: h?.firstAt ?? now,
        lastAt: now,
        tiersOpened: Array.from(new Set([...(h?.tiersOpened ?? []), tier])),
        faded: h?.faded,
      },
    },
  };
}

export function markFaded(slug: string, exampleId: string) {
  const h = userState.value.history[slug];
  if (!h) recordVisit(slug, userState.value.tier);
  const hh = userState.value.history[slug];
  userState.value = {
    ...userState.value,
    history: {
      ...userState.value.history,
      [slug]: { ...hh, faded: { ...(hh.faded ?? {}), [exampleId]: true } },
    },
  };
}

export function setTier(tier: Tier, manual: boolean) {
  userState.value = {
    ...userState.value,
    tier,
    manualTierFlips: manual
      ? userState.value.manualTierFlips + 1
      : userState.value.manualTierFlips,
  };
}

export function setLang(lang: Lang) {
  userState.value = { ...userState.value, lang };
}

export function setMotion(m: UserState["motion"]) {
  userState.value = { ...userState.value, motion: m };
}

export function defaultProgression(): Progression {
  return { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] };
}

/** Upgrade a legacy { takenAt, score, answers } pretest to a PretestResult. Idempotent. */
export function migratePretest(p: any, oldMax: number): PretestResult | null {
  if (!p) return null;
  if (p.stage1) return p as PretestResult;
  const s1 = oldMax > 0 ? p.score / oldMax : 0;
  const rating = computeRating(s1);
  return {
    takenAt: p.takenAt ?? Date.now(),
    stage1: { score: p.score ?? 0, answers: p.answers ?? [] },
    rating,
    rank: ratingToRank(rating).id,
    confidence: confidenceOf([(p.answers ?? []).map(() => 0)]),
  };
}

export function setPretestResult(result: PretestResult) {
  const prev = userState.value.pretest;
  const best = prev && prev.rating >= result.rating ? prev : result; // ranked re-climb keeps best
  userState.value = { ...userState.value, pretest: best, tier: rankToTier(best.rank) };
}

export function setPretest(score: number, answers: number[]) {
  const r = migratePretest({ takenAt: Date.now(), score, answers }, Math.max(1, answers.length * 3));
  if (r) setPretestResult(r);
}

export function recordRetrieval(slug: string) {
  const r = userState.value.retrieval[slug];
  userState.value = {
    ...userState.value,
    retrieval: {
      ...userState.value.retrieval,
      [slug]: {
        attempted: true,
        lastAt: Date.now(),
        attempts: (r?.attempts ?? 0) + 1,
      },
    },
  };
}

export function recordActiveDay() {
  const p = userState.value.progression;
  const streak = updateStreak(p.streak, todayISO());
  if (streak === p.streak) return;
  userState.value = { ...userState.value, progression: { ...p, streak } };
}

export function dismissRevisit(slug: string) {
  userState.value = {
    ...userState.value,
    dismissedRevisit: {
      ...userState.value.dismissedRevisit,
      [slug]: Date.now(),
    },
  };
}

export function setRoadmapDismissal(track: string) {
  userState.value = {
    ...userState.value,
    roadmap: { lastRecommendedTrack: track, dismissedAt: Date.now() },
  };
}

export function resetAll() {
  userState.value = defaults;
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

let syncActive = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Call once on a page with the account UI. If a session exists and terms are
 * accepted, pull server progress, merge into local, push back, and start
 * debounced push-on-change. Safe to call when logged out (no-ops).
 */
export async function activateSyncIfSignedIn(): Promise<void> {
  if (syncActive || typeof window === "undefined") return;
  // Claim synchronously, before any await, so two island mounts (AccountMenu +
  // AccountPanel) calling this in the same tick can't both pass the guard and
  // register two debounce effects. Released again if the user isn't signed in.
  syncActive = true;
  const me = await fetchMe();
  if (!me || !me.termsAccepted) { syncActive = false; return; }

  const server = await fetchServerProgress();
  if (server) {
    userState.value = mergeProgress(userState.value, server);
    save(userState.value);
  }
  await pushProgress(userState.value);

  // debounced push on subsequent local changes
  effect(() => {
    const snapshot = userState.value;
    if (!syncActive) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { void pushProgress(snapshot); }, 3000);
  });
}

export function isSyncActive(): boolean { return syncActive; }

/**
 * Remove only this app's local progress (e.g. after account deletion). Stops
 * the debounce loop and clears the single known key — never `localStorage.clear()`,
 * which would also wipe unrelated prefs like theme/motion.
 */
export function clearLocalProgress(): void {
  syncActive = false;
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
}
