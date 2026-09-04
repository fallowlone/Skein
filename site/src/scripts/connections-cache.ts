// Build-time singletons for the lesson connection graph.
//
// The EN lesson descriptor set is identical across every page render, and
// resolveConnections() is O(N²) (cross-track spiral overlap). Before this cache
// the full graph was recomputed on every one of ~950 topic-lesson pages, which
// dominated the static build and pushed it past the Cloudflare Pages time limit.
// Computing once per Node build process and reusing collapses that to a single pass.

import {
  resolveConnections,
  type LessonDescriptor,
  type ConnectionMap,
} from "./connections-index";

type LessonEntry = {
  data: {
    lang: string;
    track: string;
    unit: string;
    slug: string;
    order: number;
    level?: LessonDescriptor["level"];
    prereqs?: string[];
    deepensInto?: string[];
    spiral?: string[];
    title: string;
  };
};

let connectionCache: Record<string, ConnectionMap> | null = null;

/** Resolve (and memoize) the full connection map from the EN lesson set. */
export function getConnectionMap(
  allLessons: LessonEntry[],
): Record<string, ConnectionMap> {
  if (connectionCache) return connectionCache;
  const descriptors: LessonDescriptor[] = allLessons
    .filter((e) => e.data.lang === "en")
    .map((e) => ({
      id: `${e.data.track}/${e.data.unit}/${e.data.slug}`,
      track: e.data.track,
      unit: e.data.unit,
      order: e.data.order,
      level: (e.data.level ?? "junior") as LessonDescriptor["level"],
      prereqs: e.data.prereqs ?? [],
      deepensInto: e.data.deepensInto ?? [],
      spiral: e.data.spiral ?? [],
    }));
  connectionCache = resolveConnections(descriptors);
  return connectionCache;
}

const localeIndexCache = new Map<string, Map<string, LessonEntry>>();

/** Per-locale id → lesson entry index, memoized across page renders. */
export function getLocaleIndex(
  allLessons: LessonEntry[],
  lang: string,
): Map<string, LessonEntry> {
  const hit = localeIndexCache.get(lang);
  if (hit) return hit;
  const byKey = new Map<string, LessonEntry>();
  for (const e of allLessons) {
    if (e.data.lang !== lang) continue;
    byKey.set(`${e.data.track}/${e.data.unit}/${e.data.slug}`, e);
  }
  localeIndexCache.set(lang, byKey);
  return byKey;
}
