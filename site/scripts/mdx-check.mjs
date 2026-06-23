// Fast MDX-body compile check for one track (EN+RU). Catches unclosed tags and
// JSX-attribute breaks that `astro sync` + lint:src miss but `astro build` would
// fail on — without paying the full ~80-min build.
//   bun scripts/mdx-check.mjs <trackSlug> [pathFilter]
// e.g. bun scripts/mdx-check.mjs architecture-patterns 01-coupling-and-cohesion
import { compile } from "@mdx-js/mdx";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function walk(d) {
  const out = [];
  let entries;
  try { entries = await readdir(d, { withFileTypes: true }); }
  catch { return out; } // root may not exist yet for a partial track
  for (const e of entries) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name === "index.mdx") out.push(p);
  }
  return out;
}

const track = process.argv[2];
if (!track) { console.error("usage: bun scripts/mdx-check.mjs <trackSlug> [pathFilter]"); process.exit(2); }
const filter = process.argv[3];

let bad = 0, ok = 0;
for (const root of [`src/content/lessons/en/${track}`, `src/content/lessons/ru/${track}`]) {
  for (const f of await walk(root)) {
    if (filter && !f.includes(filter)) continue;
    const src = await readFile(f, "utf8");
    const body = src.replace(/^---\n[\s\S]*?\n---\n/, ""); // strip frontmatter YAML
    try { await compile(body, {}); ok++; }
    catch (e) { bad++; console.log("✗", f.replace("src/content/lessons/", ""), "\n   ", String(e.message).split("\n")[0]); }
  }
}
console.log(`\n${ok} ok, ${bad} parse failures`);
process.exit(bad ? 1 : 0);
