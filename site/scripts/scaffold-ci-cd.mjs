// One-shot scaffold for 3 new deep tracks: sql-postgres, js-engine, typescript.
// Registers tracks in tracks.json + units.json and writes EN+RU stub lessons
// (frontmatter only, status: stub). Shared TS files (types/index.ts,
// track-meta.ts) are patched manually. Idempotent: skips entries that exist.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = join(ROOT, "src/content");

// [slug, enTitle]  — order is index+1, RU stub title reuses EN (agent rewrites).
const SPEC = [{
  slug: "ci-cd", order: 27, color: "mint",
  title: { en: "CI/CD pipelines", ru: "CI/CD-пайплайны" },
  blurb: { en: "Ship safely on every push — pipelines, caching, and tests that gate a merge, with GitHub Actions.", ru: "Безопасно катить на каждый push — пайплайны, кэш и тесты-гейты на мерж, на GitHub Actions." },
  src: "https://docs.github.com/en/actions",
  units: [
    { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
      crux: { en: "What CI and CD are, and the pipeline mental model.", ru: "Что такое CI и CD и ментальная модель пайплайна." },
      lessons: [["01-what-cicd-is","What CI/CD actually is"]] },
    { slug: "01-pipelines", order: 1, title: { en: "Pipelines", ru: "Пайплайны" },
      crux: { en: "A workflow is jobs of steps, triggered by events, cached and parallelized.", ru: "Workflow — это джобы из шагов по событиям, с кэшем и параллелизмом." },
      lessons: [["01-github-actions-basics","GitHub Actions: workflows, jobs, steps"],["02-caching-and-matrix","Caching, matrix builds and artifacts"],["03-secrets-and-environments","Secrets, environments and OIDC"]] },
    { slug: "02-testing-in-ci", order: 2, title: { en: "Testing in CI", ru: "Тесты в CI" },
      crux: { en: "Balance the test pyramid and make the right checks block a merge.", ru: "Балансируй тест-пирамиду и делай нужные проверки блокирующими мерж." },
      lessons: [["01-test-pyramid-and-gates","The test pyramid and required checks"],["02-vitest-jest-playwright","Vitest/Jest unit + Playwright e2e in CI"],["03-contract-and-flaky","Contract testing and taming flaky tests"]] },
  ],
}];

function yaml(s) { return JSON.stringify(s); } // double-quoted, escapes safely

function stub(lang, track, unit, slug, order, title, src) {
  return `---
slug: ${yaml(slug)}
lang: ${lang}
track: ${yaml(track)}
unit: ${yaml(unit)}
order: ${order}
title: ${yaml(title)}
summary: ${yaml(title + " — stub; author to ready.")}
estMin: 12
status: stub
sources:
  - ${src}
---
`;
}

const tracksPath = join(C, "tracks.json");
const unitsPath = join(C, "units.json");
const tracks = JSON.parse(await readFile(tracksPath, "utf8"));
const units = JSON.parse(await readFile(unitsPath, "utf8"));
const trackSlugs = new Set(tracks.map((t) => t.slug));
const unitIds = new Set(units.map((u) => u.id));

let lessonsWritten = 0, lessonsSkipped = 0;

for (const t of SPEC) {
  if (!trackSlugs.has(t.slug)) {
    tracks.push({ slug: t.slug, order: t.order, color: t.color, title: t.title, blurb: t.blurb });
  }
  for (const u of t.units) {
    const id = `${t.slug}/${u.slug}`;
    if (!unitIds.has(id)) {
      units.push({
        id, slug: u.slug, track: t.slug, order: u.order,
        title: u.title, crux: u.crux,
        lessons: u.lessons.map((l) => l[0]),
        status: "stub",
      });
    }
    let i = 0;
    for (const [lslug, ltitle] of u.lessons) {
      i++;
      for (const lang of ["en", "ru"]) {
        const dir = join(C, "lessons", lang, t.slug, u.slug, lslug);
        const file = join(dir, "index.mdx");
        if (existsSync(file)) { lessonsSkipped++; continue; }
        await mkdir(dir, { recursive: true });
        await writeFile(file, stub(lang, t.slug, u.slug, lslug, i, ltitle, t.src));
        lessonsWritten++;
      }
    }
  }
}

await writeFile(tracksPath, JSON.stringify(tracks, null, 2) + "\n");
await writeFile(unitsPath, JSON.stringify(units, null, 2) + "\n");

const lessonCount = SPEC.reduce((a, t) => a + t.units.reduce((b, u) => b + u.lessons.length, 0), 0);
console.log(`tracks: +${SPEC.length}, units: +${SPEC.reduce((a, t) => a + t.units.length, 0)}, lessons defined: ${lessonCount} (×2 langs)`);
console.log(`stub files written: ${lessonsWritten}, skipped (exist): ${lessonsSkipped}`);
