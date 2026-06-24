#!/usr/bin/env node
// gen-infographics.mjs — render committed AntV Infographic DSL (.infographic) to
// committed, self-contained static SVG (.svg) at authoring time. The SVGs are the
// shipped artifact: the Astro build never imports @antv/infographic (a build-time
// devDependency only), so infographics add ZERO client JS and consume ZERO of the
// 5-island hydration budget — they inline as plain SVG via Infographic.astro.
//
// Why pre-generate instead of render in the Astro build: the lib's SSR render pulls
// icons from a third-party CDN and the site build already renders ~4k pages near the
// memory ceiling. Generating once, committing the SVG, keeps the build cheap and the
// output offline-safe forever.
//
// Usage:
//   bun scripts/gen-infographics.mjs            # regen .svg where missing/stale
//   bun scripts/gen-infographics.mjs --force    # regen all
//   bun scripts/gen-infographics.mjs --only s3  # only paths containing "s3"
//   bun scripts/gen-infographics.mjs --check    # CI: assert every .infographic has a valid sibling .svg (no render)
import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LESSONS = join(ROOT, "src", "content", "lessons");

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const CHECK = argv.includes("--check");
const ALLOW_FAIL = argv.includes("--allow-fail");
const onlyIdx = argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
const CONCURRENCY = 6;

/** Recursively collect every `*.infographic` source under the lessons tree. */
function collect(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) collect(p, out);
    else if (e.isFile() && e.name.endsWith(".infographic")) out.push(p);
  }
  return out;
}

/** A hex is a neutral (text) color when its chroma is near zero — AntV's default
 *  title/label grays (#262626, #595959, …). Saturated palette colors are left alone. */
function isNeutral(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) <= 22;
}

/** Make the rendered SVG self-contained and theme-adaptive:
 *  1. drop the leading <?xml?>/<?xml-stylesheet?> prolog (external AntV font refs —
 *     a view-time network dependency that is invalid inside inlined HTML anyway);
 *  2. drop hard-coded font-family so the site font cascades in;
 *  3. remap neutral TEXT colors (only on <text>/<tspan> fills and foreignObject
 *     `color:` styles) to currentColor — Infographic.astro sets color:var(--ink),
 *     so titles/labels follow the light/dark theme. Shape fills (palette data
 *     colors, transparent backgrounds) are untouched. */
function postProcess(svg) {
  const start = svg.indexOf("<svg");
  if (start > 0) svg = svg.slice(start);
  svg = svg.replace(/\s+font-family="[^"]*"/g, "");
  const remapTextFill = (tag) =>
    tag.replace(/fill="(#[0-9a-fA-F]{3,8})"/g, (m, hex) => (isNeutral(hex) ? 'fill="currentColor"' : m));
  svg = svg.replace(/<text\b[^>]*>/g, remapTextFill);
  svg = svg.replace(/<tspan\b[^>]*>/g, remapTextFill);
  svg = svg.replace(/color:(#[0-9a-fA-F]{3,8})/g, (m, hex) => (isNeutral(hex) ? "color:currentColor" : m));
  return svg.trim() + "\n";
}

const svgPathFor = (src) => src.replace(/\.infographic$/, ".svg");
const isStale = (src, svg) => !existsSync(svg) || statSync(src).mtimeMs > statSync(svg).mtimeMs;

async function main() {
  let sources = collect(LESSONS, []);
  if (ONLY) sources = sources.filter((p) => p.includes(ONLY));
  sources.sort();

  if (CHECK) {
    const missing = [];
    for (const src of sources) {
      const svg = svgPathFor(src);
      if (!existsSync(svg)) { missing.push(`${rel(svg)} — missing (run: bun scripts/gen-infographics.mjs)`); continue; }
      const body = readFileSync(svg, "utf8");
      if (!body.includes("<svg") || body.length < 200) missing.push(`${rel(svg)} — empty/invalid`);
    }
    if (missing.length) {
      console.error(`✗ ${missing.length} infographic(s) need (re)generation:`);
      for (const m of missing) console.error("  " + m);
      process.exit(1);
    }
    console.log(`✓ ${sources.length} infographic SVG(s) present and valid`);
    return;
  }

  const { renderToString } = await import("@antv/infographic/ssr");
  const todo = FORCE ? sources : sources.filter((src) => isStale(src, svgPathFor(src)));
  if (!todo.length) {
    console.log(sources.length ? `✓ ${sources.length} infographic(s) up to date` : "no .infographic sources found");
    return;
  }
  console.log(`Rendering ${todo.length}/${sources.length} infographic(s)…`);

  const failures = [];
  let done = 0;
  const queue = [...todo];
  async function worker() {
    for (let src = queue.shift(); src; src = queue.shift()) {
      try {
        const dsl = readFileSync(src, "utf8");
        const svg = postProcess(await renderToString(dsl));
        if (!svg.includes("<svg")) throw new Error("no <svg> in output");
        writeFileSync(svgPathFor(src), svg);
        console.log(`  ✓ ${rel(src)}  (${(svg.length / 1024).toFixed(1)}kb)`);
      } catch (e) {
        failures.push(`${rel(src)} — ${e.message}`);
        console.error(`  ✗ ${rel(src)} — ${e.message}`);
      }
      done++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

  console.log(`\n${done - failures.length}/${done} rendered.`);
  if (failures.length) {
    console.error(`${failures.length} failed (icon CDN unreachable? prefer icon-free templates):`);
    for (const f of failures) console.error("  " + f);
    if (!ALLOW_FAIL) process.exit(1);
  }
}

const rel = (p) => p.replace(ROOT + "/", "");
main().catch((e) => { console.error(e); process.exit(1); });
