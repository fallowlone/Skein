import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function findCss(dir: string): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await findCss(p)));
    else if (i.name.endsWith(".css")) out.push(p);
  }
  return out;
}

export async function checkReducedMotion(distDir: string): Promise<string[]> {
  const files = await findCss(distDir);
  for (const f of files) {
    const body = await readFile(f, "utf8");
    if (/prefers-reduced-motion\s*:\s*reduce/.test(body)) return []; // any file qualifies
  }
  return [`reduced-motion: no @media (prefers-reduced-motion: reduce) rule found in any built CSS`];
}
