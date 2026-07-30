import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Generated AntV infographic SVGs carry whatever canvas the template asked for,
 * and `renderToString` ignores a `width` hint. Trees especially run 1000–4300px
 * wide, which used to be scaled into the 680px article column — shrinking 14px
 * labels to a few pixels.
 *
 * Infographic.astro now renders anything past ~800px at natural size inside a
 * horizontal scroller, so wide art is readable. But a canvas several times the
 * column still reads badly: the reader pans a long way and loses the shape.
 * Past HARD_MAX the DSL itself should change (fewer siblings per level, a
 * different template, or split into two figures).
 */
const WARN_ABOVE = 2000;
const HARD_MAX = 3000;

async function walk(dir: string): Promise<string[]> {
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walk(p)));
    else if (i.isFile() && i.name.endsWith(".svg") && dir.endsWith("infographics")) out.push(p);
  }
  return out;
}

function svgWidth(body: string): number {
  const m = body.match(/<svg[^>]*\bwidth="(\d+(?:\.\d+)?)"/);
  return m ? Number(m[1]) : 0;
}

export async function checkInfographicWidth(
  siteSrc: string,
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = await walk(join(siteSrc, "content", "lessons"));

  for (const f of files) {
    const width = svgWidth(await readFile(f, "utf8"));
    if (width === 0) continue;
    const rel = f.slice(f.indexOf("content/lessons"));
    if (width > HARD_MAX) {
      errors.push(
        `${rel}: infographic canvas ${width}px exceeds ${HARD_MAX}px — restructure the DSL (fewer nodes per level, another template, or split the figure)`,
      );
    } else if (width > WARN_ABOVE) {
      warnings.push(`${rel}: infographic canvas ${width}px is wide (>${WARN_ABOVE}px); reader must pan a long way`);
    }
  }

  return { errors, warnings };
}
