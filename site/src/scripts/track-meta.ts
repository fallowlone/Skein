import type { Track } from "~/types";

/** 3-letter coordinate code per track. */
export const TRACK_ABBR: Record<Track, string> = {
  "math": "MTH", "base-cs": "CS", "algorithms": "ALG",
  "networking": "NET", "browser": "WEB", "frontend": "FE", "backend": "BE",
  "apis": "API", "databases": "DB", "caching": "CACHE", "queues": "QUE",
  "distributed": "DIST", "security": "SEC", "observability": "OBS",
  "deployment": "DEP", "performance": "PERF", "data-engineering": "DATA",
  "ai-llm": "AI", "engineering-practice": "ENG",
  "sql-postgres": "SQL", "js-engine": "JSE", "typescript": "TS",
  "system-design": "SD", "system-design-cases": "SDC",
  "aws": "AWS", "python": "PY",
  "ci-cd": "CICD",
  "node": "NODE", "nest": "NEST",
  "logic": "LOGIC", "react": "RCT", "nextjs": "NEXT", "go": "GO",
  "docker": "DOCK",
  "security-foundations": "SECF", "security-offensive": "RED",
  "security-defensive": "BLUE", "security-cloud": "CLOUD",
  "cli": "CLI",
  "linux": "LIN",
  "code-patterns": "CP",
  "react-patterns": "RXP",
  "architecture-patterns": "ARCH",
  "git": "GIT",
};

export type TrackColor = "lilac" | "mint" | "peach" | "sky" | "rose";

/** Track palette color → extensible domain hue var (matches home/learn cards). */
export const DOMAIN_HUE: Record<TrackColor, string> = {
  lilac: "var(--d-network)", mint: "var(--d-data)", peach: "var(--d-frontend)",
  sky: "var(--d-backend)", rose: "var(--d-ai)",
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "NET · 03 · 02". Falls back to "ABBR · NN" when unitOrder is absent. */
export function coord(abbr: string, unitOrder: number | undefined, lessonOrder: number): string {
  if (unitOrder == null || Number.isNaN(unitOrder)) return `${abbr} · ${pad2(lessonOrder)}`;
  return `${abbr} · ${pad2(unitOrder)} · ${pad2(lessonOrder)}`;
}
