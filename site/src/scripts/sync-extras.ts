// site/src/scripts/sync-extras.ts
// Cross-device sync for the stores that live OUTSIDE the UserState blob:
// practice task status, algorithm drills, spaced-repetition cards, capstone
// milestones. Collected at push time, merged per-entry at pull time, written
// back to their own localStorage keys. Rides inside the same /api/progress
// blob as an `extras` sidecar — the server stays an opaque JSON store.
import type { TaskStatus } from "./practice-state";
import type { DrillStore } from "~/components/algo/drill-state";
import type { Card } from "./review-state";
import { REVIEW_KEY } from "./review-state";

const PRACTICE_PREFIX = "atlas.practice.";
const CAPSTONE_PREFIX = "skein.capstone.";
const DRILL_KEY = "skein.drill.v1";

// A push must never be rejected wholesale (server caps the blob at 256 KB).
// Review cards carry full front/back text and dominate the size — when the
// sidecar gets too big, drop review from THIS push rather than losing the push.
const EXTRAS_BYTE_BUDGET = 160 * 1024;

export interface SyncedExtras {
  practice: Record<string, Record<string, TaskStatus>>;
  drill: DrillStore;
  review: Record<string, Card>;
  capstones: Record<string, Record<string, boolean>>;
}

const STATUS_RANK: Record<TaskStatus, number> = { seen: 0, attempted: 1, done: 2 };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function scanPrefix<T>(prefix: string): Record<string, T> {
  const out: Record<string, T> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const v = readJson<T | null>(k, null);
      if (v) out[k.slice(prefix.length)] = v;
    }
  } catch { /* private mode — sync nothing */ }
  return out;
}

export function collectExtras(): SyncedExtras {
  const extras: SyncedExtras = {
    practice: scanPrefix<Record<string, TaskStatus>>(PRACTICE_PREFIX),
    drill: readJson<DrillStore>(DRILL_KEY, {}),
    review: readJson<Record<string, Card>>(REVIEW_KEY, {}),
    capstones: scanPrefix<Record<string, boolean>>(CAPSTONE_PREFIX),
  };
  try {
    if (JSON.stringify(extras).length > EXTRAS_BYTE_BUDGET) extras.review = {};
  } catch { extras.review = {}; }
  return extras;
}

/** Practice: per task, the furthest status wins (seen < attempted < done). */
export function mergePractice(
  a: SyncedExtras["practice"], b: SyncedExtras["practice"],
): SyncedExtras["practice"] {
  const out: SyncedExtras["practice"] = JSON.parse(JSON.stringify(a));
  for (const [lesson, tasks] of Object.entries(b)) {
    const cur = (out[lesson] ??= {});
    for (const [task, status] of Object.entries(tasks)) {
      if (!cur[task] || STATUS_RANK[status] > STATUS_RANK[cur[task]]) cur[task] = status;
    }
  }
  return out;
}

/** Drill: per problem, the later attempt wins; on a timestamp tie keep `a`. */
export function mergeDrill(a: DrillStore, b: DrillStore): DrillStore {
  const out: DrillStore = { ...a };
  for (const [id, e] of Object.entries(b)) {
    const cur = out[id];
    if (!cur || e.at > cur.at) out[id] = e;
  }
  return out;
}

/** Review: per card, the side that reviewed it more recently owns the schedule;
 *  a never-reviewed copy loses to a reviewed one. */
export function mergeReview(
  a: Record<string, Card>, b: Record<string, Card>,
): Record<string, Card> {
  const out: Record<string, Card> = { ...a };
  for (const [key, card] of Object.entries(b)) {
    const cur = out[key];
    if (!cur) { out[key] = card; continue; }
    const curAt = cur.lastReviewedAt ?? 0;
    const newAt = card.lastReviewedAt ?? 0;
    if (newAt > curAt) out[key] = card;
  }
  return out;
}

/** Capstones: a milestone done anywhere is done everywhere (boolean OR). */
export function mergeCapstones(
  a: SyncedExtras["capstones"], b: SyncedExtras["capstones"],
): SyncedExtras["capstones"] {
  const out: SyncedExtras["capstones"] = JSON.parse(JSON.stringify(a));
  for (const [slug, ms] of Object.entries(b)) {
    const cur = (out[slug] ??= {});
    for (const [id, done] of Object.entries(ms)) cur[id] = cur[id] || done;
  }
  return out;
}

export function mergeExtras(local: SyncedExtras, server: Partial<SyncedExtras> | undefined): SyncedExtras {
  if (!server) return local;
  return {
    practice: mergePractice(local.practice, server.practice ?? {}),
    drill: mergeDrill(local.drill, server.drill ?? {}),
    review: mergeReview(local.review, server.review ?? {}),
    capstones: mergeCapstones(local.capstones, server.capstones ?? {}),
  };
}

/** Write the merged result back to every backing localStorage key. */
export function applyExtras(extras: SyncedExtras): void {
  try {
    for (const [lesson, tasks] of Object.entries(extras.practice)) {
      localStorage.setItem(PRACTICE_PREFIX + lesson, JSON.stringify(tasks));
    }
    if (Object.keys(extras.drill).length > 0) {
      localStorage.setItem(DRILL_KEY, JSON.stringify(extras.drill));
    }
    if (Object.keys(extras.review).length > 0) {
      localStorage.setItem(REVIEW_KEY, JSON.stringify(extras.review));
    }
    for (const [slug, ms] of Object.entries(extras.capstones)) {
      localStorage.setItem(CAPSTONE_PREFIX + slug, JSON.stringify(ms));
    }
  } catch { /* private mode / quota — non-fatal */ }
}
