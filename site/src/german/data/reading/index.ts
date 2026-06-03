// site/src/german/data/reading/index.ts
// Aggregates the German reading units and exposes the same lookup helpers as
// the English layer (unitById / unitsByBandStream), keyed by GerBand.
import type { GerBand, ReadingUnit } from "~/german/types";
import { a1General } from "./a1-general";
import { a1Engineering } from "./a1-engineering";
import { a2General } from "./a2-general";
import { a2Engineering } from "./a2-engineering";
import { b1General } from "./b1-general";
import { b1Engineering } from "./b1-engineering";

export const readingUnits: ReadingUnit[] = [
  a1General, a1Engineering, a2General, a2Engineering, b1General, b1Engineering,
];

export function unitById(id: string): ReadingUnit | undefined {
  return readingUnits.find((u) => u.id === id);
}

export function unitsByBandStream(band: GerBand, stream: "general" | "engineering"): ReadingUnit[] {
  return readingUnits.filter((u) => u.level === band && u.stream === stream);
}
