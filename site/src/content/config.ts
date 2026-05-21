import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";
import { TRACKS } from "../types";

const Lang = z.enum(["en", "ru"]);
const Status = z.enum(["stub", "draft", "ready"]);
const Bi = z.object({ en: z.string().min(1), ru: z.string().min(1) });

const Track = z.enum(TRACKS as [string, ...string[]]);
const SlugRe = /^\d{2}-[a-z0-9-]+$/;

const tracks = defineCollection({
  loader: file("src/content/tracks.json"),
  schema: z.object({
    slug: Track,
    order: z.number().int().positive(),
    title: Bi,
    blurb: Bi,
    color: z.enum(["lilac", "mint", "peach", "sky", "rose"]),
  }),
});

const units = defineCollection({
  loader: file("src/content/units.json"),
  schema: z.object({
    slug: z.string().regex(SlugRe),
    track: Track,
    order: z.number().int().positive(),
    title: Bi,
    crux: Bi,
    lessons: z.array(z.string().regex(SlugRe)),
  }),
});

const lessons = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/lessons",
    generateId: ({ entry }) =>
      entry.replace(/\/index\.(md|mdx)$/, "").replace(/\.(md|mdx)$/, ""),
  }),
  schema: z.object({
    slug: z.string().regex(SlugRe),
    lang: Lang,
    track: Track,
    unit: z.string().regex(SlugRe),
    order: z.number().int().positive(),
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(280),
    estMin: z.number().int().positive(),
    status: Status.default("stub"),
    lessonType: z.enum(["concept", "coding", "topic"]).optional(),
    level: z.enum(["zero", "junior", "middle", "senior"]).optional(),
    deepensInto: z.array(z.string()).default([]),
    spiral: z.array(z.string()).default([]),
    prereqs: z.array(z.string()).default([]),
    mathPrereqs: z.array(z.string()).default([]),
    concepts: z.array(z.string()).default([]),
    sources: z.array(z.string().url()).min(1),
  }),
});

export const collections = { tracks, units, lessons };
