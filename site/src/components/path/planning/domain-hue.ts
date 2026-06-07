// src/components/path/planning/domain-hue.ts
// Maps a track to its domain-family hue token (--d-*), so a unit row's left
// border + domain tag share the exact color of the concept-mastery map family.
// Reuses the single DOMAIN_FAMILIES source of truth — no second mapping to drift.
import type { Track } from "~/scripts/path/types";
import { DOMAIN_FAMILIES } from "~/scripts/path/mastery-field";

const HUE_OF: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const f of DOMAIN_FAMILIES) for (const tr of f.tracks) m.set(tr, f.hue);
  return m;
})();

export function hueForTrack(track: Track): string {
  return HUE_OF.get(track) ?? "--muted";
}
