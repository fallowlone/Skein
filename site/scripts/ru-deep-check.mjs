// Task 7: RU deep-check — EN/RU parity + title fit at 390px for the
// 5 reference-batch lessons. Usage: node scripts/ru-deep-check.mjs [base]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:4321";
const LESSONS = [
  "01-how-js-runs/01-source-to-ast",
  "03-hidden-classes/01-shapes-and-maps",
  "03-hidden-classes/04-inline-caches",
  "04-the-jit/05-deoptimization",
  "07-async-deep/01-event-loop-recap",
];

const front = (p) => {
  const src = readFileSync(p, "utf8");
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
};
const field = (fm, key) =>
  (fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?`, "m")) || [])[1] ?? "";

console.log("── frontmatter parity (EN vs RU) ──");
for (const lesson of LESSONS) {
  const en = front(`src/content/lessons/en/js-engine/${lesson}/index.mdx`);
  const ru = front(`src/content/lessons/ru/js-engine/${lesson}/index.mdx`);
  const enT = field(en, "title");
  const ruT = field(ru, "title");
  const enC = (en.match(/concepts:/) || []).length;
  const ruC = (ru.match(/concepts:/) || []).length;
  const enS = (en.match(/status:\s*(\w+)/) || [])[1];
  const ruS = (ru.match(/status:\s*(\w+)/) || [])[1];
  const flag = enS !== ruS ? "  ⚠ STATUS MISMATCH" : "";
  console.log(
    `${lesson.split("/").pop().padEnd(24)} EN title ${enT.length}ch | RU ${ruT.length}ch | concepts ${enC}/${ruC} | status ${enS}/${ruS}${flag}`
  );
}

console.log("\n── title fit at 390px (rendered) ──");
const browser = await chromium.launch();
for (const locale of ["en", "ru"]) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  for (const lesson of LESSONS) {
    const url = `${BASE}/${locale}/learn/js-engine/${lesson}/`;
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    if (!res || res.status() >= 400) {
      console.log(`FAIL ${res?.status()} ${url}`);
      continue;
    }
    const fit = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      if (!h1) return { err: "no h1" };
      const r = h1.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        docOverflow: document.documentElement.scrollWidth > 390,
        lines: Math.round(r.height / parseFloat(getComputedStyle(h1).lineHeight)),
      };
    });
    console.log(
      `${locale} ${lesson.split("/").pop().padEnd(24)} w=${fit.w}px lines=${fit.lines} overflow=${fit.docOverflow}${fit.err ?? ""}`
    );
  }
  await ctx.close();
}
await browser.close();
