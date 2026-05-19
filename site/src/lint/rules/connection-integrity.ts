import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function walkMdx(dir: string): Promise<string[]> {
  let items: import("node:fs").Dirent[];
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walkMdx(p)));
    else if (i.name === "index.mdx" || i.name === "index.md") out.push(p);
  }
  return out;
}

/**
 * Parse a YAML inline-list field (e.g. `prereqs: ["a", "b"]`) from frontmatter text.
 * Returns the string values found.
 */
function parseYamlListField(fm: string, field: string): string[] {
  // Match: fieldName: ["val1", "val2"] or ['val1', 'val2'] (single-line inline list only)
  const pattern = new RegExp(`^${field}:\\s*\\[([^\\]]*)\\]`, "m");
  const match = fm.match(pattern);
  if (!match) return [];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
}

/** Extract frontmatter block (between --- delimiters) from MDX source. */
function extractFrontmatter(body: string): string {
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
}

/**
 * Source-level: every `prereqs` and `deepensInto` reference in every EN lesson's
 * frontmatter resolves to an existing lesson directory.
 *
 * Ref formats:
 *   - Fully-qualified: `<track>/<unit>/<slug>` — resolved as-is across all lessons.
 *   - Bare slug: `<slug>` — resolved within the same track+unit as the referencing lesson.
 *
 * Only EN files are checked (RU files carry the same refs; checking both would
 * double-report errors without adding coverage).
 */
export async function checkConnectionIntegrity(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const lessonsDir = join(siteSrc, "content/lessons");
  const files = await walkMdx(lessonsDir);

  // Build a set of all known qualified keys: "<track>/<unit>/<slug>"
  const allKeys = new Set<string>();
  for (const f of files) {
    const parts = f.split(/[\\/]/);
    const idx = parts.findIndex((p) => p === "lessons");
    if (idx < 0) continue;
    // parts after "lessons": <lang>/<track>/<unit>/<slug>/index.mdx
    const lang = parts[idx + 1];
    const track = parts[idx + 2];
    const unit = parts[idx + 3];
    const slug = parts[idx + 4];
    if (!lang || !track || !unit || !slug) continue;
    allKeys.add(`${track}/${unit}/${slug}`);
  }

  // Check refs in EN files only
  for (const f of files) {
    const parts = f.split(/[\\/]/);
    const idx = parts.findIndex((p) => p === "lessons");
    if (idx < 0) continue;
    const lang = parts[idx + 1];
    if (lang !== "en") continue;

    const track = parts[idx + 2];
    const unit = parts[idx + 3];
    const slug = parts[idx + 4];
    if (!track || !unit || !slug) continue;

    const body = await readFile(f, "utf8");
    const fm = extractFrontmatter(body);

    const refs: { field: string; ref: string }[] = [];
    for (const r of parseYamlListField(fm, "prereqs")) refs.push({ field: "prereqs", ref: r });
    for (const r of parseYamlListField(fm, "deepensInto")) refs.push({ field: "deepensInto", ref: r });

    for (const { field, ref } of refs) {
      const parts = ref.split("/");
      let qualifiedKey: string;
      if (parts.length === 3) {
        // Fully-qualified: <track>/<unit>/<slug>
        qualifiedKey = ref;
      } else if (parts.length === 2) {
        // Same-track cross-unit: <unit>/<slug>
        qualifiedKey = `${track}/${parts[0]}/${parts[1]}`;
      } else {
        // Bare slug: same track+unit
        qualifiedKey = `${track}/${unit}/${ref}`;
      }
      if (!allKeys.has(qualifiedKey)) {
        errs.push(
          `connection-integrity: "${f}" ${field} references missing lesson "${ref}" (resolved: "${qualifiedKey}")`
        );
      }
    }
  }

  return errs;
}
