import { signal, effect } from "@preact/signals";
import type { Tier, Lang } from "../types";

const KEY = "awesome.user-state.v1";

export type UserState = {
  tier: Tier;
  lang: Lang;
  motion: "on" | "off" | "auto";
  pretest: { takenAt: number; score: number; answers: number[] } | null;
  history: Record<string, {
    firstAt: number;
    lastAt: number;
    tiersOpened: Tier[];
    faded?: Record<string, true>;
  }>;
  retrieval: Record<string, { attempted: boolean; lastAt: number; attempts: number }>;
  dismissedRevisit: Record<string, number>;
  manualTierFlips: number;
};

const defaults: UserState = {
  tier: "middle",
  lang: "en",
  motion: "auto",
  pretest: null,
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
    return { ...defaults, ...JSON.parse(raw) };
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

export function setPretest(score: number, answers: number[]) {
  userState.value = {
    ...userState.value,
    pretest: { takenAt: Date.now(), score, answers },
  };
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

export function dismissRevisit(slug: string) {
  userState.value = {
    ...userState.value,
    dismissedRevisit: {
      ...userState.value.dismissedRevisit,
      [slug]: Date.now(),
    },
  };
}

export function resetAll() {
  userState.value = defaults;
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
