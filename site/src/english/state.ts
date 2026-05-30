// English-for-Engineers — per-user vocabulary state.
//
// Kept in its own localStorage key, separate from `awesome.user-state.v1`, so it
// does not touch the account-synced progress schema. When the layer graduates,
// this can be folded into user-state + account-sync. For now: local only.
//
// SRS model: 5-box Leitner. A correct recall promotes a word up a box (longer
// interval); a miss drops it to box 1. `due` is computed from box + lastAt by
// the review UI, so the schedule lives in code, not in storage.

import { signal, effect } from "@preact/signals";

const KEY = "awesome.english.v1";

export type WordStatus = "new" | "learning" | "known";

export type WordRecord = {
  status: WordStatus;
  /** Leitner box 1..5. Higher = longer interval. */
  box: number;
  /** Times the word has been surfaced/reviewed. */
  seen: number;
  /** Last interaction, epoch ms. */
  lastAt: number;
};

export type EnglishState = {
  words: Record<string, WordRecord>;
  /** unitId -> count of passages whose translation was revealed. */
  revealed: Record<string, number>;
};

const defaults: EnglishState = { words: {}, revealed: {} };

/** Leitner intervals per box, in days. Box 1 = review same day. */
export const BOX_DAYS = [0, 0, 1, 3, 7, 16];
const DAY = 86_400_000;

function load(): EnglishState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) } as EnglishState;
  } catch {
    return defaults;
  }
}

function save(s: EnglishState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const englishState = signal<EnglishState>(load());

if (typeof window !== "undefined") {
  effect(() => save(englishState.value));
}

function rec(id: string): WordRecord {
  return (
    englishState.value.words[id] ?? { status: "new", box: 1, seen: 0, lastAt: 0 }
  );
}

function put(id: string, r: WordRecord) {
  englishState.value = {
    ...englishState.value,
    words: { ...englishState.value.words, [id]: r },
  };
}

/** Mark a word as "still learning" — resets it to the shortest interval. */
export function markLearning(id: string) {
  const r = rec(id);
  put(id, { ...r, status: "learning", box: 1, seen: r.seen + 1, lastAt: Date.now() });
}

/** Promote a word: correct recall moves it up a box; box 5 marks it known. */
export function markKnown(id: string) {
  const r = rec(id);
  const box = Math.min(5, r.box + 1);
  put(id, {
    ...r,
    box,
    status: box >= 5 ? "known" : "learning",
    seen: r.seen + 1,
    lastAt: Date.now(),
  });
}

/** A word just shown in reading — count exposure without changing status. */
export function bumpSeen(id: string) {
  const r = rec(id);
  if (r.seen === 0 && r.status === "new") {
    put(id, { ...r, seen: 1, lastAt: Date.now() });
  }
}

export function statusOf(id: string): WordStatus {
  return englishState.value.words[id]?.status ?? "new";
}

/** Is a learning word due for review now, by its Leitner box? */
export function isDue(id: string): boolean {
  const r = englishState.value.words[id];
  if (!r || r.status === "known") return false;
  if (r.status === "new") return false;
  const wait = (BOX_DAYS[r.box] ?? 0) * DAY;
  return Date.now() - r.lastAt >= wait;
}

export function recordReveal(unitId: string, passageCount: number) {
  const cur = englishState.value.revealed[unitId] ?? 0;
  if (passageCount <= cur) return;
  englishState.value = {
    ...englishState.value,
    revealed: { ...englishState.value.revealed, [unitId]: passageCount },
  };
}
