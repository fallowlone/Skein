import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * `<Term slug="…">` must name a key that exists in `src/i18n/glossary.json`.
 *
 * This went unchecked for a long time because the component was broken: it read
 * a `k` prop while content writes `slug`, so `entry` was always undefined and
 * no definition ever reached the page. With the tooltip working again, a key
 * with no glossary entry renders as a plain highlighted word — degraded, not
 * broken, hence a warning rather than an error. The backlog it reports is real
 * content work (write the definition, EN + RU).
 */
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
    else if (i.isFile() && (i.name.endsWith(".mdx") || i.name.endsWith(".md"))) out.push(p);
  }
  return out;
}

export async function checkTermKeys(
  siteSrc: string,
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let glossary: Record<string, unknown>;
  try {
    glossary = JSON.parse(await readFile(join(siteSrc, "i18n", "glossary.json"), "utf8"));
  } catch {
    return { errors: ["i18n/glossary.json: unreadable"], warnings };
  }

  const missing = new Map<string, number>();
  for (const file of await walk(join(siteSrc, "content", "lessons"))) {
    const body = await readFile(file, "utf8");
    for (const m of body.matchAll(/<Term\s+(?:slug|k)="([^"]+)"/g)) {
      const key = m[1];
      if (!(key in glossary)) missing.set(key, (missing.get(key) ?? 0) + 1);
    }
  }

  if (missing.size) {
    const top = [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    warnings.push(
      `Term: ${missing.size} glossary key(s) referenced but undefined ` +
        `(${[...missing.values()].reduce((a, b) => a + b, 0)} usages) — ` +
        `most used: ${top.map(([k, n]) => `${k}×${n}`).join(", ")}`,
    );
  }

  return { errors, warnings };
}
