// site/src/english/sync.ts
// Mirrors a compact English summary into userState.progression so it syncs and
// feeds achievements/dashboard. The ONLY English→userState writer. A reactive
// effect avoids a state↔stats import cycle (stats stays pure).
import { effect } from "@preact/signals";
import { englishState } from "./state";
import { englishSummary } from "./stats";
import { userState } from "~/scripts/user-state";
import type { EnglishSummary } from "~/english/types";

/** True if any non-timestamp field differs (updatedAt is ignored). */
export function summaryChanged(prev: EnglishSummary | undefined, next: EnglishSummary): boolean {
  if (!prev) return true;
  return (
    prev.knownTotal !== next.knownTotal ||
    prev.band !== next.band ||
    prev.readUnits !== next.readUnits ||
    prev.grammarDone !== next.grammarDone ||
    prev.collocationDone !== next.collocationDone ||
    prev.graded !== next.graded ||
    prev.knownByBand.A2 !== next.knownByBand.A2 ||
    prev.knownByBand.B1 !== next.knownByBand.B1 ||
    prev.knownByBand.B2 !== next.knownByBand.B2
  );
}

/**
 * Register the mirror. Returns the effect disposer. `now` is injectable for
 * tests. Reads userState via `.peek()` so writing it does not re-trigger the
 * effect (the effect only subscribes to englishState).
 */
export function startEnglishSync(now: () => number = () => Date.now()) {
  return effect(() => {
    englishState.value; // subscribe to English changes only
    const prev = userState.peek().progression.englishSummary;
    const next = englishSummary(now());
    if (!summaryChanged(prev, next)) return;
    const us = userState.peek();
    userState.value = { ...us, progression: { ...us.progression, englishSummary: next } };
  });
}
