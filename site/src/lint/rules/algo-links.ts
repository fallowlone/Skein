import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { MIN_SHARED } from "../../../scripts/path/algo-links-core.mjs";

const ALGO_PREFIX = "algorithms/";

/**
 * Curated `algo-links.curated.json` entries must point at real algo units
 * (unit-concepts.json) and real lessons (EN frontmatter track/unit/slug),
 * and use a known kind. A silently dangling pin would either never render
 * or, worse, make the committed index look editorially reviewed when it is not.
 */
async function walkMdx(dir: string): Promise<string[]> {
  let items;
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

function extractFrontmatter(body: string): string {
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
}

function scalar(fm: string, field: string): string {
  const m = fm.match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, "m"));
  return m ? m[1].replace(/^['"]|['"]$/g, "") : "";
}

/** Concepts list in inline `[a, b]` or block `- a` form (corpus uses block form). */
function conceptList(fm: string): string[] {
  const inline = fm.match(/^concepts:\s*\[([^\]]*)\]/m);
  if (inline) return [...inline[1].matchAll(/["']?([\w-]+)["']?/g)].map((m) => m[1]);
  const lines = fm.split("\n");
  const at = lines.findIndex((l) => /^concepts:\s*$/.test(l));
  if (at < 0) return [];
  const out: string[] = [];
  for (const line of lines.slice(at + 1)) {
    const m = line.match(/^\s*-\s*["']?([\w-]+)["']?\s*$/);
    if (!m) break;
    out.push(m[1]);
  }
  return out;
}

export async function checkAlgoLinks(siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let unitConcepts: Record<string, { teaches?: string[] }>;
  try {
    unitConcepts = JSON.parse(await readFile(join(siteSrc, "content/path/unit-concepts.json"), "utf8"));
  } catch {
    return { errors: ["algo-links: content/path/unit-concepts.json unreadable"], warnings };
  }
  let curated: unknown;
  try {
    curated = JSON.parse(await readFile(join(siteSrc, "content/path/algo-links.curated.json"), "utf8"));
  } catch {
    return { errors: ["algo-links: content/path/algo-links.curated.json unreadable"], warnings };
  }
  if (!Array.isArray(curated)) {
    return { errors: ["algo-links: algo-links.curated.json must be a JSON array"], warnings };
  }

  const lessons = new Map<string, string[]>();
  for (const f of await walkMdx(join(siteSrc, "content/lessons/en"))) {
    const fm = extractFrontmatter(await readFile(f, "utf8"));
    const track = scalar(fm, "track");
    const unit = scalar(fm, "unit");
    const slug = scalar(fm, "slug");
    if (!track || !unit || !slug) continue;
    lessons.set(`${track}/${unit}/${slug}`, conceptList(fm));
  }

  const algoUnits = Object.keys(unitConcepts).filter((k) => k.startsWith(ALGO_PREFIX)).sort();
  const alwaysPinned = new Set<string>();
  curated.forEach((entry: unknown, i: number) => {
    const where = `algo-links: curated[${i}]`;
    if (!entry || typeof entry !== "object") {
      errors.push(`${where}: entry must be an object`);
      return;
    }
    const { algo, lesson, kind } = entry as { algo?: unknown; lesson?: unknown; kind?: unknown };
    if (kind !== "always" && kind !== "never") {
      errors.push(`${where}: unknown kind ${JSON.stringify(kind)} (want "always" | "never")`);
      return;
    }
    if (typeof algo !== "string" || !algoUnits.includes(algo)) {
      errors.push(`${where}: unknown algo unit ${JSON.stringify(algo)}`);
      return;
    }
    if (typeof lesson !== "string" || !lessons.has(lesson)) {
      errors.push(`${where}: unknown lesson ${JSON.stringify(lesson)}`);
      return;
    }
    if (kind === "always") alwaysPinned.add(`${algo} <- ${lesson}`);
  });

  for (const unit of algoUnits) {
    const teaches = unitConcepts[unit]?.teaches ?? [];
    const linked = [...lessons.values()].some(
      (concepts) => concepts.filter((c) => teaches.includes(c)).length >= MIN_SHARED,
    );
    const pinned = [...alwaysPinned].some((p) => p.startsWith(`${unit} <-`));
    if (!linked && !pinned) warnings.push(`algo-links: zero-link algo unit "${unit}"`);
  }

  return { errors, warnings };
}
