// Fast local pre-build validator for system-design lessons.
// Catches the common schema/budget failures instantly so we don't burn an
// ~8-minute full build to discover a 1-char overflow.
//
// Usage:
//   node scripts/check-sd-lesson.mjs                 # all system-design* lessons
//   node scripts/check-sd-lesson.mjs <path-or-substr> # only matching files
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "src/content/lessons";
const BUDGETS = { Crux: 140, KeyTakeaway: 220 };
const INSET_KINDS = new Set(["why", "practice", "mistake", "edgecase"]);
const filter = process.argv[2];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name === "index.mdx") out.push(p);
  }
  return out;
}

function tagText(src, tag) {
  const m = src.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : null;
}

let problems = 0;
for (const lang of ["en", "ru"]) {
  for (const track of ["system-design", "system-design-cases"]) {
    let files = [];
    try { files = await walk(join(ROOT, lang, track)); } catch { continue; }
    for (const f of files) {
      if (filter && !f.includes(filter)) continue;
      const src = await readFile(f, "utf8");
      if (!/^status:\s*ready/m.test(src)) continue; // only gate ready lessons
      const errs = [];

      const summary = src.match(/^summary:\s*"([\s\S]*?)"\s*$/m)?.[1];
      if (!summary) errs.push("missing summary");
      else if (summary.length > 280) errs.push(`summary ${summary.length}>280`);

      for (const [tag, bud] of Object.entries(BUDGETS)) {
        const t = tagText(src, tag);
        if (t == null) errs.push(`missing <${tag}>`);
        else if (t.length > bud) errs.push(`${tag} ${t.length}>${bud}`);
      }

      const sources = src.match(/^sources:\s*\n((?:\s*-\s*\S+\n?)+)/m);
      if (!sources || !/https?:\/\//.test(sources[1])) errs.push("no external source URL");

      for (const m of src.matchAll(/<Inset\s+kind="([a-z]+)"/g)) {
        if (!INSET_KINDS.has(m[1])) errs.push(`bad Inset kind="${m[1]}"`);
      }

      for (const sec of ["<Hook>", "<Crux>", "<Explanation>", "<KeyTakeaway>", "<Recap"]) {
        if (!src.includes(sec)) errs.push(`missing section ${sec}`);
      }
      if (!/RetrievalDrawer/.test(src)) errs.push("no RetrievalDrawer");

      if (errs.length) {
        problems += errs.length;
        console.log(`✗ ${f.replace(ROOT + "/", "")}`);
        for (const e of errs) console.log(`    - ${e}`);
      }
    }
  }
}
console.log(problems ? `\n${problems} problem(s)` : "✓ all ready system-design lessons pass local checks");
process.exit(problems ? 1 : 0);
