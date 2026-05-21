import { readFile, readdir, access } from "node:fs/promises";
import { join, basename } from "node:path";
import glossary from "../../i18n/glossary.json";

async function walk(dir: string): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walk(p)));
    else if (i.name === "index.mdx" || i.name === "index.md") out.push(p);
  }
  return out;
}

export async function checkI18nParity(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const bookDir = join(siteSrc, "content/book");
  try { await access(bookDir); } catch { return errs; }
  const files = await walk(bookDir);
  const enReady = new Set<string>();
  const ruReady = new Set<string>();

  for (const f of files) {
    if (f.includes("/_archive/")) continue;
    const body = await readFile(f, "utf8");
    const lang = body.match(/^lang:\s*(en|ru)/m)?.[1];
    const status = body.match(/^status:\s*(stub|draft|ready)/m)?.[1];
    if (!lang || status !== "ready") continue;
    // Extract slug from path: .../book/<lang>/<pillar>/<slug>/index.mdx (legacy — book/ dir now empty)
    const parts = f.split("/");
    const idx = parts.findIndex((p) => p === "book");
    const slug = parts[idx + 3]; // pillar dir is parts[idx+2], piece slug is parts[idx+3]
    const key = `${parts[idx + 2]}/${slug}`;
    if (lang === "en") enReady.add(key);
    else ruReady.add(key);
  }
  for (const k of enReady) if (!ruReady.has(k)) errs.push(`i18n-parity: EN ready piece "${k}" missing RU twin`);
  for (const k of ruReady) if (!enReady.has(k)) errs.push(`i18n-parity: RU ready piece "${k}" missing EN twin`);

  return errs;
}
