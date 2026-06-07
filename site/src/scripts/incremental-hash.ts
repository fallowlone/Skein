import { createHash } from "node:crypto";

/** Split an MDX/MD file into its YAML frontmatter block and the body after it. */
export function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
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
