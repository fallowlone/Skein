// site/src/english/data/reading/index.ts
import type { Band, ReadingUnit } from "~/english/types";
import { a2General } from "./a2-general";
import { a2Engineering } from "./a2-engineering";
import { b1General } from "./b1-general";
import { b1Engineering } from "./b1-engineering";

export const readingUnits: ReadingUnit[] = [
  ...a2Engineering, ...a2General, ...b1General, ...b1Engineering,
];

export function unitById(id: string): ReadingUnit | undefined {
  return readingUnits.find((u) => u.id === id);
}

export function unitsByBandStream(band: Band, stream: "general" | "engineering"): ReadingUnit[] {
  return readingUnits.filter((u) => u.level === band && u.stream === stream);
}
