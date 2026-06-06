// Shared, cheap derivations for the hub section components. ALL_IDS is the full vocab-bank id list
// (module-level constant — built once, not per render) used for due-card and coverage reads. The
// recommended reading unit mirrors Today.tsx's selection so the hub and the /review route agree.
import { vocabA2 } from "~/english/data/vocab-a2";
import { vocabB1 } from "~/english/data/vocab-b1";
import { vocabB2 } from "~/english/data/vocab-b2";
import { readingUnits } from "~/english/data/reading";
import { getPlacement, isUnitRead } from "~/english/state";
import type { Band } from "~/english/types";
import type { ReadingUnit } from "~/english/types";

export const ALL_IDS: string[] = [...vocabA2, ...vocabB1, ...vocabB2].map((e) => e.id);

const BAND_ORDER: Band[] = ["A2", "B1", "B2"];

/** First not-yet-read unit at or below the learner's band, engineering stream preferred. */
export function recommendedUnit(): ReadingUnit | null {
  const maxIdx = BAND_ORDER.indexOf((getPlacement()?.band ?? "A2") as Band);
  const eligible = readingUnits.filter(
    (u) => BAND_ORDER.indexOf(u.level as Band) <= maxIdx && !isUnitRead(u.id),
  );
  return eligible.find((u) => u.stream === "engineering") ?? eligible[0] ?? null;
}
