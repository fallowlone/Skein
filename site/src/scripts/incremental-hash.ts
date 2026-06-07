import { createHash } from "node:crypto";

/** Split an MDX/MD file into its YAML frontmatter block and the body after it. */
export function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!m) return { frontmatter: "", body: raw };
  return { frontmatter: m[1], body: m[2] };
}

/** Read a single-line scalar field out of a frontmatter block (quotes stripped). */
export function frontmatterField(fm: string, name: string): string | null {
  const re = new RegExp(`^${name}:[ \\t]*["']?([^"'\\n]+?)["']?[ \\t]*$`, "m");
  const m = fm.match(re);
  return m ? m[1].trim() : null;
}

/** SHA-256 over an ordered list of parts, NUL-separated so boundaries are unambiguous. */
export function hashParts(parts: string[]): string {
  const h = createHash("sha256");
  for (const p of parts) {
    h.update(p);
    h.update("\0");
  }
  return h.digest("hex");
}

/** Per-page hash: the only inputs rendered solely on a lesson's own page. */
export function pageHash(bodyRaw: string, practiceRaw: string): string {
  return hashParts([bodyRaw, practiceRaw]);
}

/** The page identity the lesson route's getStaticPaths keys on. */
export function pageKeyOf(p: { lang: string; track: string; unit: string; slug: string }): string {
  return `${p.lang}/${p.track}/${p.unit}/${p.slug}`;
}

export interface Manifest {
  globalHash: string;
  pages: Record<string, string>;
  pageCount?: number;
  builtAt?: string;
}

export interface BuildDecision {
  mode: "full" | "incremental";
  changedPages: string[];
}

/**
 * Decide full vs incremental. FULL whenever anything shared could affect other
 * pages (no cache, global hash changed, or forced). Otherwise INCREMENTAL with
 * the exact set of pages whose body/practice hash moved.
 *
 * Note: a lesson added or removed changes the frontmatter projection inside the
 * global hash, so such structural changes always land in the FULL branch — the
 * incremental branch only ever sees the same key set with some hashes changed.
 */
export function decideBuild(
  prev: Manifest | null,
  current: { globalHash: string; pages: Record<string, string> },
  forceFull = false,
): BuildDecision {
  if (forceFull || !prev || prev.globalHash !== current.globalHash) {
    return { mode: "full", changedPages: [] };
  }
  // Defense in depth: the global hash already moves when a lesson is added or
  // removed (its frontmatter projection changes), so the key sets should be
  // identical here. If they ever diverge, fall back to full rather than risk a
  // stale or missing page.
  const changedPages: string[] = [];
  for (const [key, h] of Object.entries(current.pages)) {
    if (!(key in prev.pages)) {
      return { mode: "full", changedPages: [] }; // new page → structural change
    }
    if (prev.pages[key] !== h) changedPages.push(key);
  }
  if (Object.keys(prev.pages).length !== Object.keys(current.pages).length) {
    return { mode: "full", changedPages: [] }; // a prev page vanished
  }
  return { mode: "incremental", changedPages };
}
