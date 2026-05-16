import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Catches model-translation leaks: CJK ideographs, kana, and fullwidth forms
// that slip into EN/RU content when a translation pass degrades.
const CJK = /[぀-ヿ㐀-䶿一-鿿＀-￯]/;

async function walk(dir: string): Promise<string[]> {
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return []; // directory may not exist (e.g. no lessons/)
  }
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walk(p)));
    else if (i.name === "index.mdx" || i.name === "index.md") out.push(p);
  }
  return out;
}

export async function checkCjkLeak(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const dirs = [join(siteSrc, "content/book"), join(siteSrc, "content/lessons")];
  for (const dir of dirs) {
    for (const f of await walk(dir)) {
      const lines = (await readFile(f, "utf8")).split("\n");
      lines.forEach((line, idx) => {
        if (CJK.test(line)) {
          const snippet = line.trim().slice(0, 80);
          errs.push(`cjk-leak: ${f}:${idx + 1} contains CJK/fullwidth characters — "${snippet}"`);
        }
      });
    }
  }
  return errs;
}
