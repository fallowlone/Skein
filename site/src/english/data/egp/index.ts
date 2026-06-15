// Barrel over per-band EGP inventory modules (a1.ts…c2.ts). Vite import.meta.glob
// (eager) so new band files are picked up without editing this file. Excludes
// index/types and any .test. file. NOTE: throws under plain bun — bun scripts must
// load band modules by path instead (see scripts/coverage-audit/audit.ts).
import type { EgpEntry } from "./types";
import { cefrIndex } from "~/english/grammar-types";

// Exclude *.test.ts at the glob level: an eager glob IMPORTS every match (the
// runtime filter below only drops them from the array), and importing a test file
// pulls in `vitest`, which crashes the Astro prerender build.
const mods = import.meta.glob<{ entries: EgpEntry[] }>(["./*.ts", "!./*.test.ts"], { eager: true });

export const EGP_INVENTORY: EgpEntry[] = Object.entries(mods)
  .filter(([p]) => !/\/(index|types)\.ts$/.test(p) && !p.includes(".test."))
  .flatMap(([, m]) => m.entries ?? [])
  .sort((a, b) => cefrIndex(a.cefr) - cefrIndex(b.cefr) || a.id.localeCompare(b.id));

export const egpById: Map<string, EgpEntry> = new Map(EGP_INVENTORY.map((e) => [e.id, e]));
