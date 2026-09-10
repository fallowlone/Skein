#!/usr/bin/env bun
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseFrontmatter } from "../supabase/corpus.ts";
import { scanKeys } from "../../src/scripts/glossary-index.ts";

const SITE_ROOT = resolve(process.cwd());
const OUT = resolve(SITE_ROOT, "src/content/path/lesson-index.json");

export type LessonIndexEntry = {
  lang: "en" | "ru";
  track: string;
  unit: string;
  slug: string;
  status: string;
  order: number;
  title: string;
  summary: string;
  estMin: number;
  prereqs: string[];
  terms: string[];
};

async function lessonFiles(dir: string, root: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await lessonFiles(path, root, out);
    else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
      out.push(path.slice(root.length + 1));
    }
  }
  return out;
}

export async function buildLessonIndex(siteRoot = SITE_ROOT): Promise<Record<string, LessonIndexEntry>> {
  const files = (await lessonFiles(resolve(siteRoot, "src/content/lessons"), siteRoot)).sort();
  const out: Record<string, LessonIndexEntry> = {};

  for (const rel of files) {
    const { data, body } = parseFrontmatter(await readFile(resolve(siteRoot, rel), "utf8"));
    const lang = data.lang;
    const track = data.track;
    const unit = data.unit;
    const slug = data.slug;
    if ((lang !== "en" && lang !== "ru") || typeof track !== "string" || typeof unit !== "string" || typeof slug !== "string") {
      throw new Error(`${rel}: lesson missing lang/track/unit/slug`);
    }
    const key = `${lang}/${track}/${unit}/${slug}`;
    if (out[key]) throw new Error(`${rel}: duplicate localized lesson key ${key}`);
    out[key] = {
      lang,
      track,
      unit,
      slug,
      status: typeof data.status === "string" ? data.status : "",
      order: typeof data.order === "number" ? data.order : 0,
      title: typeof data.title === "string" ? data.title : slug,
      summary: typeof data.summary === "string" ? data.summary : "",
      estMin: typeof data.estMin === "number" ? data.estMin : 0,
      prereqs: Array.isArray(data.prereqs) ? data.prereqs.filter((v): v is string => typeof v === "string") : [],
      terms: [...scanKeys(body)].sort(),
    };
  }
  return out;
}

if (import.meta.main) {
  // Corpus-stripped environments (CI without the lesson mirrors): keep the
  // tracked artifact instead of crashing, but require it to exist.
  if (!existsSync(resolve(SITE_ROOT, "src/content/lessons"))) {
    if (existsSync(OUT)) {
      console.log(`lesson-index: corpus external; keeping tracked artifact`);
    } else {
      console.error(`lesson-index: corpus external and artifact missing; cannot build`);
      process.exitCode = 1;
    }
  } else {
  const index = await buildLessonIndex();
  await writeFile(OUT, `${JSON.stringify(index)}\n`);
  console.log(`lesson-index.json: ${Object.keys(index).length} localized lessons → ${OUT}`);
  }
}
