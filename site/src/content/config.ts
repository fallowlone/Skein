import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";
import { PILLARS } from "../types";

const Pillar = z.enum(PILLARS as [string, ...string[]]);
const Lang = z.enum(["en", "ru"]);
const Spiral = z.enum(["encapsulation", "multiplexing", "statefulness", "latency"]);
const Status = z.enum(["stub", "draft", "ready"]);
const Bi = z.object({ en: z.string().min(1), ru: z.string().min(1) });

const pillars = defineCollection({
  loader: file("src/content/pillars.json"),
  schema: z.object({
    slug: Pillar,
    order: z.number().int().positive(),
    title: Bi,
    blurb: Bi,
    color: z.enum(["lilac", "mint", "peach", "sky", "rose"]),
    prereqs: z.array(Pillar).default([]),
  }),
});

const chapters = defineCollection({
  loader: file("src/content/chapters.json"),
  schema: z.object({
    slug: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
    pillar: Pillar,
    order: z.number().int().positive(),
    title: Bi,
    crux: Bi,
    pieces: z.array(z.string().regex(/^\d{2}-[a-z0-9-]+$/)),
  }),
});

const book = defineCollection({
  loader: glob({ pattern: "!(_archive)/**/*.{md,mdx}", base: "./src/content/book" }),
  schema: z.object({
    slug: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
    lang: Lang,
    pillar: Pillar,
    chapter: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
    order: z.number().int().positive(),
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(280),
    readingMin: z.number().int().positive(),
    status: Status.default("stub"),
    prereqs: z.array(z.string()).default([]),
    spiral: z.array(Spiral).default([]),
    personas: z.array(z.string()).default([]),
    depth: z.object({
      mechanism: z.string(),
      tradeoff: z.string(),
      failure_mode: z.string(),
      numbers: z.string(),
    }),
    sources: z.array(z.string().url()).min(1),
    draft: z.boolean().default(false),
  }),
});

export const collections = { pillars, chapters, book };
