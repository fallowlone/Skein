export type Pillar =
  | "networking" | "browser" | "frontend" | "backend"
  | "apis" | "databases" | "caching" | "queues"
  | "distributed" | "security" | "observability" | "deployment"
  | "performance" | "data-engineering" | "ai-llm" | "engineering-practice";

export const PILLARS: Pillar[] = [
  "networking", "browser", "frontend", "backend",
  "apis", "databases", "caching", "queues",
  "distributed", "security", "observability", "deployment",
  "performance", "data-engineering", "ai-llm", "engineering-practice",
];

export type Tier = "junior" | "middle" | "senior";
export type Lang = "en" | "ru";
export type SpiralThread = "encapsulation" | "multiplexing" | "statefulness" | "latency";
export type Status = "stub" | "draft" | "ready";

export type Bilingual = { en: string; ru: string };

export type Track =
  | "math" | "base-cs" | "algorithms"
  | "networking" | "browser" | "frontend" | "backend"
  | "apis" | "databases" | "caching" | "queues"
  | "distributed" | "security" | "observability" | "deployment"
  | "performance" | "data-engineering" | "ai-llm" | "engineering-practice"
  | "sql-postgres" | "js-engine" | "typescript"
  | "system-design" | "system-design-cases"
  | "aws" | "python" | "ci-cd";

export const TRACKS: Track[] = [
  "math", "base-cs", "algorithms",
  "networking", "browser", "frontend", "backend",
  "apis", "databases", "caching", "queues",
  "distributed", "security", "observability", "deployment",
  "performance", "data-engineering", "ai-llm", "engineering-practice",
  "sql-postgres", "js-engine", "typescript",
  "system-design", "system-design-cases",
  "aws", "python", "ci-cd",
];

export type LessonStatus = "stub" | "draft" | "ready";
