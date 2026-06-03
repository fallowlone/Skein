// One-shot scaffold for 2 new tracks: node, nest.
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
const SPEC = [
  { slug: "node", order: 28, color: "sky",
    title: { en: "Node.js, zero to senior", ru: "Node.js с нуля до senior" },
    blurb: { en: "The runtime behind your backend — event loop, modules, async and streams — built up to senior depth.", ru: "Рантайм твоего бэкенда — event loop, модули, async и потоки — до senior-глубины." },
    src: "https://nodejs.org/docs/latest/api/",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "What Node is: V8 + libuv, one event loop, non-blocking I/O.", ru: "Что такое Node: V8 + libuv, один event loop, неблокирующий I/O." },
        lessons: [["01-what-node-is","What Node.js actually is"]] },
      { slug: "01-modules-and-runtime", order: 1, title: { en: "Modules & runtime", ru: "Модули и рантайм" },
        crux: { en: "CommonJS vs ESM, and how npm resolves and locks dependencies.", ru: "CommonJS против ESM и как npm резолвит и фиксирует зависимости." },
        lessons: [["01-cjs-vs-esm","CommonJS vs ESM"],["02-packages-and-npm","package.json, npm, semver and lockfiles"]] },
      { slug: "02-async-and-streams", order: 2, title: { en: "Async & streams", ru: "Async и потоки" },
        crux: { en: "Callbacks → promises → async/await, and streams with backpressure.", ru: "Колбэки → промисы → async/await и потоки с backpressure." },
        lessons: [["01-async-patterns","Async patterns and error handling"],["02-streams-and-backpressure","Streams, pipes and backpressure"]] },
    ] },
  { slug: "nest", order: 29, color: "rose",
    title: { en: "NestJS, zero to senior", ru: "NestJS с нуля до senior" },
    blurb: { en: "A structured Node framework — DI, modules, controllers, validation — for production TypeScript backends.", ru: "Структурный Node-фреймворк — DI, модули, контроллеры, валидация — для production-бэкендов на TypeScript." },
    src: "https://docs.nestjs.com/",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "Why Nest exists and the dependency-injection mental model.", ru: "Зачем нужен Nest и ментальная модель dependency injection." },
        lessons: [["01-why-nest","Why NestJS, and the DI mental model"]] },
      { slug: "01-building-blocks", order: 1, title: { en: "Building blocks", ru: "Строительные блоки" },
        crux: { en: "Modules wire providers into controllers via the DI container.", ru: "Модули связывают провайдеры с контроллерами через DI-контейнер." },
        lessons: [["01-modules-controllers-providers","Modules, controllers, providers"],["02-dependency-injection","Dependency injection, scopes, custom providers"]] },
      { slug: "02-validation-and-pipes", order: 2, title: { en: "Validation & pipes", ru: "Валидация и pipes" },
        crux: { en: "Validate at the edge with DTOs and pipes; gate with guards.", ru: "Валидируй на границе через DTO и pipes; защищай через guards." },
        lessons: [["01-dto-validation","DTOs, class-validator and pipes"],["02-guards-interceptors","Guards, interceptors and exception filters"]] },
    ] },
];

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
