#!/usr/bin/env bun
// Requires the `zip` binary on PATH (present on the ubuntu/Cloudflare build images).
// build:starters — zip each workbench scaffold into public/project-starters/<slug>.zip
// (the learner's download). The detail page reads the scaffold file tree directly from
// the filesystem at render time, so no generated index is needed here — only the zips.
import { readdirSync, statSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const WB = new URL("../projects-workbench/", import.meta.url).pathname;
// Output dir: argv[2] when given (CI writes straight into the built dist, since the sharded
// deploy runs `astro build` directly and never the `bun run build` script), else public/ for
// local builds (astro copies public/ → dist/).
const outArg = process.argv[2];
const PUB = outArg
  ? (outArg.startsWith("/") ? outArg : join(process.cwd(), outArg))
  : new URL("../public/project-starters/", import.meta.url).pathname;

if (!existsSync(WB)) { console.log("build:starters: no workbench dir, nothing to do"); process.exit(0); }
rmSync(PUB, { recursive: true, force: true });
mkdirSync(PUB, { recursive: true });

let n = 0;
for (const slug of readdirSync(WB)) {
  const base = join(WB, slug);
  if (!statSync(base).isDirectory() || !existsSync(join(base, "manifest.json"))) continue;
  const scaffold = join(base, "scaffold");
  if (!existsSync(scaffold)) continue;
  const zipPath = join(PUB, `${slug}.zip`);
  const r = spawnSync("zip", ["-rq", zipPath, "."], { cwd: scaffold });
  if (r.status !== 0) { console.error(`build:starters: zip failed for ${slug} (is 'zip' installed?)`); process.exit(1); }
  n++;
}
console.log(`build:starters wrote ${n} starter zip(s)`);
