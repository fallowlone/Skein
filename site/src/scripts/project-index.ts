// Build-time reverse indexes from guided-project data:
//   • lesson key "<track>/<unit>/<slug>" → projects whose milestones feed from it
//   • track slug → projects related to that track (via feedsFrom or `tracks`)
// Pure functions over the minimal project shape so they're unit-testable without
// astro:content. `feedsFrom` lives on each guided milestone, not the project root.

export type ProjectLite = {
  slug: string;
  tracks: readonly string[];
  /** Flattened union of every milestone's feedsFrom (full "track/unit/slug" refs). */
  feedsFrom: readonly string[];
};

/** Localised project surface for a card link. */
export type ProjectRef = {
  slug: string;
  title: string;
  pitch: string;
};

type MilestoneLite = { feedsFrom?: readonly string[] };
type ProjectSource = {
  slug: string;
  tracks: readonly string[];
  milestones: readonly unknown[];
};

/** Collapse a project's per-milestone feedsFrom into one flat, de-duped list. */
export function projectFeedsFrom(p: ProjectSource): string[] {
  const out = new Set<string>();
  for (const m of p.milestones) {
    const refs = (m as MilestoneLite)?.feedsFrom;
    if (!Array.isArray(refs)) continue;
    for (const r of refs) if (typeof r === "string" && r) out.add(r);
  }
  return [...out];
}

/**
 * Reverse index: lesson key → ordered list of project slugs whose feedsFrom
 * covers that exact lesson. Insertion order follows the project list, so the
 * caller can cap deterministically (e.g. first 2).
 */
export function buildLessonProjectIndex(
  projects: readonly ProjectLite[],
): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const p of projects) {
    for (const ref of p.feedsFrom) {
      const list = idx.get(ref) ?? [];
      if (!list.includes(p.slug)) list.push(p.slug);
      idx.set(ref, list);
    }
  }
  return idx;
}

/**
 * Projects related to a track: any project that either lists the track in its
 * `tracks` array or whose feedsFrom references a lesson in that track
 * ("<track>/..."). De-duped, project-list order preserved.
 */
export function projectsForTrack(
  projects: readonly ProjectLite[],
  track: string,
): string[] {
  const out: string[] = [];
  const prefix = `${track}/`;
  for (const p of projects) {
    const hit =
      p.tracks.includes(track) ||
      p.feedsFrom.some((ref) => ref.startsWith(prefix));
    if (hit && !out.includes(p.slug)) out.push(p.slug);
  }
  return out;
}
