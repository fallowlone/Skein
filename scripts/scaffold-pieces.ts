#!/usr/bin/env bun
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { join } from "node:path";

type Chapter = {
  slug: string;
  pillar: string;
  order: number;
  title: { en: string; ru: string };
  crux: { en: string; ru: string };
  pieces: string[];
};

const ROOT = new URL("..", import.meta.url).pathname;
const CHAPTERS_PATH = join(ROOT, "site/src/content/chapters.json");
const BOOK_BASE = join(ROOT, "site/src/content/book");

async function exists(p: string) {
  try { await access(p); return true; } catch { return false; }
}

function pieceTitle(slug: string): string {
  return slug.replace(/^\d{2}-/, "").replace(/-/g, " ");
}

function stubFrontmatter(lang: "en" | "ru", piece: string, chapter: Chapter, order: number) {
  const title = pieceTitle(piece);
  const titleCased = title.charAt(0).toUpperCase() + title.slice(1);
  const summary = lang === "en" ? `Coming soon — ${chapter.title.en}` : `Скоро — ${chapter.title.ru}`;
  const crux = chapter.crux[lang];
  const body = lang === "en"
    ? "_This piece is on the roadmap. Outline is in the chapter index._"
    : "_Этот фрагмент в плане. Содержание см. в оглавлении главы._";

  return `---
slug: ${piece}
lang: ${lang}
pillar: ${chapter.pillar}
chapter: ${chapter.slug}
order: ${order}
title: "${titleCased}"
summary: "${summary}"
readingMin: 12
status: stub
prereqs: []
spiral: []
personas: []
depth:
  mechanism: tbd-mechanism
  tradeoff: tbd-tradeoff
  failure_mode: tbd-failure
  numbers: tbd-numbers
sources:
  - https://example.com/placeholder
---

import Crux from "../../../../../components/prose/Crux.astro";

<Crux>${crux}</Crux>

${body}
`;
}

async function main() {
  const chapters: Chapter[] = JSON.parse(await readFile(CHAPTERS_PATH, "utf8"));
  let created = 0, skipped = 0;
  for (const ch of chapters) {
    for (const lang of ["en", "ru"] as const) {
      for (let i = 0; i < ch.pieces.length; i++) {
        const piece = ch.pieces[i];
        const dir = join(BOOK_BASE, lang, ch.pillar, piece);
        const file = join(dir, "index.mdx");
        if (await exists(file)) { skipped++; continue; }
        await mkdir(dir, { recursive: true });
        await writeFile(file, stubFrontmatter(lang, piece, ch, i + 1), "utf8");
        created++;
      }
    }
  }
  console.log(`stub scaffold: created=${created} skipped=${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
