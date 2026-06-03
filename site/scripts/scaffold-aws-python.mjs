// One-shot scaffold for 2 new tracks: aws, python.
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
  {
    slug: "aws", order: 25, color: "rose",
    title: { en: "AWS, hands-on", ru: "AWS на практике" },
    blurb: {
      en: "Deploy real systems on AWS — the core model, compute, storage and networking — mapped to the CLF-C02 and SAA-C03 objectives.",
      ru: "Разворачивай реальные системы на AWS — базовая модель, вычисления, хранилище и сеть — с привязкой к целям CLF-C02 и SAA-C03.",
    },
    src: "https://docs.aws.amazon.com/",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "What AWS actually is, and the handful of words the rest of the track assumes.", ru: "Что такое AWS на самом деле и горстка слов, которые остальной трек считает знакомыми." },
        lessons: [["01-what-aws-is","What AWS actually is"]] },
      { slug: "01-core-model", order: 1, title: { en: "The core model", ru: "Базовая модель" },
        crux: { en: "Regions, IAM and billing — the three things every AWS decision touches.", ru: "Регионы, IAM и биллинг — три вещи, которых касается любое решение в AWS." },
        lessons: [["01-regions-and-az","Regions and availability zones"],["02-iam-and-shared-responsibility","IAM and the shared-responsibility model"],["03-billing-and-cost","Billing and cost basics"]] },
      { slug: "02-compute-and-deploy", order: 2, title: { en: "Compute & deploy", ru: "Вычисления и деплой" },
        crux: { en: "EC2 vs containers vs serverless — and shipping a container end to end.", ru: "EC2 против контейнеров против serverless — и доставка контейнера от начала до конца." },
        lessons: [["01-compute-options","Compute options: EC2, ECS/Fargate, Lambda, App Runner"],["02-deploy-a-container","Deploy a container end to end"]] },
    ],
  },
  {
    slug: "python", order: 26, color: "sky",
    title: { en: "Python for JS/TS developers", ru: "Python для JS/TS-разработчиков" },
    blurb: {
      en: "Learn Python coming from JavaScript — language core, scripting and automation, with an eye toward AI tooling.",
      ru: "Освой Python, придя из JavaScript — ядро языка, скриптинг и автоматизация, с прицелом на AI-инструменты.",
    },
    src: "https://docs.python.org/3/",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "Why a JS/TS developer should add Python, and where it differs.", ru: "Зачем JS/TS-разработчику добавлять Python и чем он отличается." },
        lessons: [["01-why-python-for-js-devs","Why Python for JS/TS developers"]] },
      { slug: "01-language-core", order: 1, title: { en: "Language core", ru: "Ядро языка" },
        crux: { en: "Syntax, the built-in data structures, and how typing differs from TS.", ru: "Синтаксис, встроенные структуры данных и чем типизация отличается от TS." },
        lessons: [["01-syntax-and-types","Syntax and types"],["02-data-structures","Lists, dicts, sets, tuples"],["03-comprehensions-and-functions","Comprehensions and functions"]] },
      { slug: "02-scripting-and-io", order: 2, title: { en: "Scripting & I/O", ru: "Скриптинг и ввод-вывод" },
        crux: { en: "Files, HTTP and packaging — enough to write a useful automation script.", ru: "Файлы, HTTP и упаковка — достаточно, чтобы написать полезный скрипт автоматизации." },
        lessons: [["01-files-and-cli","Files and CLI arguments"],["02-http-and-packaging","HTTP requests, venv and packaging"]] },
    ],
  },
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
