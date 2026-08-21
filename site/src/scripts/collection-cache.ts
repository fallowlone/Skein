// Build-time memoization for astro:content's getCollection().
//
// Lesson.astro calls getCollection("lessons") — 4,528 entries — once per
// lesson PAGE (4,528 pages), plus getCollection("units") twice, "tracks" once,
// "projects" once. That is ~20.5M entry deserializations across a full build,
// and CI profiling of a real build showed lesson-page render time sitting at
// a near-constant ~1.0-1.1s per page regardless of that lesson's own size —
// the signature of a fixed per-page cost, not a content-driven one. This is
// the exact bug connections-cache.ts already fixed one layer up (see its own
// comment): recomputing a build-wide constant on every page dominates the
// build. That fix memoized derived structures FROM allLessons; this memoizes
// the getCollection() call itself, which nothing downstream mutates (content
// collection entries are read-only here — mapped/filtered into new objects,
// never assigned into).
//
// Safe to share the same entry objects across sequential page renders:
// build.concurrency: 1 (astro.config.mjs) renders pages one at a time in a
// single process, so there is no concurrent-mutation hazard.
import { getCollection, type CollectionEntry, type CollectionKey } from "astro:content";

const cache = new Map<CollectionKey, unknown[]>();

/** Memoized getCollection(): identical entry array on every call within one build process. */
export async function getCachedCollection<C extends CollectionKey>(
  collection: C,
): Promise<CollectionEntry<C>[]> {
  const hit = cache.get(collection);
  if (hit) return hit as CollectionEntry<C>[];
  const entries = await getCollection(collection);
  cache.set(collection, entries);
  return entries;
}
