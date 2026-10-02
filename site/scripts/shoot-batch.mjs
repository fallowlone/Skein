// Batch visual QA: full-page screenshots of the js-engine track.
// Usage: node scripts/shoot-batch.mjs [tag] [width ...]
// Lesson list derives from units.json (all js-engine lessons, EN+RU
// via SKEIN_LOCALE). Pass SKEIN_FILTER=<unit-slug> to narrow to one unit.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.SKEIN_BASE ?? "http://localhost:4322";
const LOCALE = process.env.SKEIN_LOCALE ?? "en"; // en | ru
const FILTER = process.env.SKEIN_FILTER ?? null; // unit-slug substring
const tag = process.argv[2] ?? "current";
const widths = process.argv.slice(3).map(Number);
const SIZES = widths.length ? widths : [1440, 1280, 390];

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const units = JSON.parse(readFileSync(join(root, "src/content/units.json"), "utf8"));
const LESSONS = units
  .filter((u) => u.track === "js-engine" && (!FILTER || u.slug.includes(FILTER)))
  .sort((a, b) => a.order - b.order)
  .flatMap((u) => (u.lessons ?? []).map((l) => `${u.slug}/${typeof l === "string" ? l : l.slug}`));

if (!LESSONS.length) {
  console.error(`no lessons matched (FILTER=${FILTER ?? "none"})`);
  process.exit(2);
}

const out = `screenshots/batch-${tag}`;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const width of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  for (const lesson of LESSONS) {
    const url = `${BASE}/${LOCALE}/learn/js-engine/${lesson}/`;
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    if (!res || res.status() >= 400) {
      console.log(`FAIL ${res?.status()} ${url}`);
      continue;
    }
    await page.waitForTimeout(600);
    const suffix = LOCALE === "en" ? "" : `-${LOCALE}`;
    const name = `${lesson.split("/").pop()}-${width}${suffix}`;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    console.log(`ok ${name} (${res.status()})`);
  }
  await ctx.close();
}
await browser.close();
