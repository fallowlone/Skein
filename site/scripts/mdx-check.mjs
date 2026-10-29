// Fast MDX-body compile check (EN+RU). Catches unclosed tags and
// JSX-attribute breaks that `astro sync` + lint:src miss but `astro build`
// would fail on — without paying the full build.
//   bun scripts/mdx-check.mjs track <trackSlug> [pathFilter]
//   bun scripts/mdx-check.mjs sd [pathFilter]   (system-design + cases)
//   bun scripts/mdx-check.mjs <trackSlug> [pathFilter]   (legacy form)
// e.g. bun scripts/mdx-check.mjs track architecture-patterns 01-coupling
import { compile } from "@mdx-js/mdx";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const LESSONS = "src/content/lessons";
const SD_ROOTS = ["en/system-design", "ru/system-design", "en/system-design-cases", "ru/system-design-cases"]
  .map((r) => `${LESSONS}/${r}`);

export function usage() {
  return "usage: bun scripts/mdx-check.mjs track <trackSlug> [pathFilter] | sd [pathFilter]";
}

/** Parse argv (minus node/script) into roots + optional path filter. Throws usage on empty. */
export function resolveRoots(args) {
  const [cmd, rest, filter] = [args[0], args[1], args[2]];
  if (cmd === "sd") return { roots: SD_ROOTS, filter: rest };
  if (cmd === "track") {
    if (!rest) throw new Error(usage());
    return { roots: [`${LESSONS}/en/${rest}`, `${LESSONS}/ru/${rest}`], filter };
  }
  if (!cmd) throw new Error(usage());
  // Legacy bare-slug form.
  return { roots: [`${LESSONS}/en/${cmd}`, `${LESSONS}/ru/${cmd}`], filter: rest };
}

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

/** Compile every index.mdx under roots; returns {ok, bad}. Prints failures unless quiet. */
export async function checkRoots(roots, filter, opts = {}) {
  let bad = 0, ok = 0;
  for (const root of roots) {
    for (const f of await walk(root)) {
      if (filter && !f.includes(filter)) continue;
      const src = await readFile(f, "utf8");
      const body = src.replace(/^---\n[\s\S]*?\n---\n/, ""); // strip frontmatter YAML
      try { await compile(body, {}); ok++; }
      catch (e) { bad++; if (!opts.quiet) console.log("✗", f.replace(`${LESSONS}/`, ""), "\n   ", String(e.message).split("\n")[0]); }
    }
  }
  if (!opts.quiet) console.log(`\n${ok} ok, ${bad} parse failures`);
  return { ok, bad };
}

if (import.meta.main) {
  let parsed;
  try {
    parsed = resolveRoots(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  const { ok, bad } = await checkRoots(parsed.roots, parsed.filter).catch((e) => {
    console.error(e.message);
    process.exit(2);
  });
  void ok;
  process.exit(bad ? 1 : 0);
}
