// getStaticPaths gates for the incremental build. Mirrors build-shard.ts:
// ZERO node imports so this is safe to import from .astro route files. The
// plan (mode + changed page set) arrives as a JSON string in INCREMENTAL_PLAN.
// Any missing/malformed plan defaults to a FULL render — wasteful, never wrong.

export interface IncrementalConfig {
  mode: "full" | "incremental";
  changed: Set<string>;
}

export function incrementalConfig(env: NodeJS.ProcessEnv = process.env): IncrementalConfig {
  const raw = env.INCREMENTAL_PLAN;
  if (!raw) return { mode: "full", changed: new Set() };
  try {
    const plan = JSON.parse(raw) as { mode?: string; changedPages?: string[] };
    if (plan.mode === "incremental") {
      return { mode: "incremental", changed: new Set(plan.changedPages ?? []) };
    }
  } catch {
    /* malformed → fall through to full (safe default) */
  }
  return { mode: "full", changed: new Set() };
}

/** Lesson-route gate: full → all paths; incremental → only changed page keys. */
export function selectLessons<T>(
  paths: T[],
  keyOf: (p: T) => string,
  cfg: IncrementalConfig = incrementalConfig(),
): T[] {
  if (cfg.mode === "full") return paths;
  return paths.filter((p) => cfg.changed.has(keyOf(p)));
}

/** Non-lesson-route gate: full → all paths; incremental → none (served from cache). */
export function selectOther<T>(paths: T[], cfg: IncrementalConfig = incrementalConfig()): T[] {
  if (cfg.mode === "full") return paths;
  return [];
}
