import type { Track } from "~/types";

export const BANDS = ["advanced", "middle", "surface", "foundations"] as const;
export type Band = (typeof BANDS)[number];

// Source of truth for "which altitude does each track live at on the home page".
// Order within a band is incidental; the home page renders tracks in band groups
// (DOM order = senior at top, zero at bottom per the direction law).
export const TRACK_BAND: Record<Track, Band> = {
  // foundations — the underground
  "math":               "foundations",
  "base-cs":            "foundations",
  "algorithms":         "foundations",
  // surface — day-to-day fullstack
  "networking":         "surface",
  "browser":            "surface",
  "frontend":           "surface",
  "backend":            "surface",
  "apis":               "surface",
  "databases":          "surface",
  "caching":            "surface",
  "queues":             "surface",
  // middle — systems concerns
  "distributed":        "middle",
  "observability":      "middle",
  "security":           "middle",
  // advanced — the orbit
  "ai-llm":             "advanced",
  "data-engineering":   "advanced",
  "deployment":         "advanced",
  "performance":        "advanced",
  "engineering-practice": "advanced",
};

export function bandOf(slug: Track): Band {
  return TRACK_BAND[slug];
}
