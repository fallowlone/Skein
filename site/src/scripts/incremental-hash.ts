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
