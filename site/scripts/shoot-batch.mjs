// Batch visual QA: full-page screenshots of the js-engine reference batch.
// Usage: node scripts/shoot-batch.mjs [tag] [width ...]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.SKEIN_BASE ?? "http://localhost:4322";
const LOCALE = process.env.SKEIN_LOCALE ?? "en"; // en | ru
const tag = process.argv[2] ?? "current";
const widths = process.argv.slice(3).map(Number);
const SIZES = widths.length ? widths : [1440, 1280, 390];

const LESSONS = [
  "01-how-js-runs/01-source-to-ast",
  "03-hidden-classes/01-shapes-and-maps",
  "03-hidden-classes/04-inline-caches",
  "04-the-jit/05-deoptimization",
  "07-async-deep/01-event-loop-recap",
];

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
