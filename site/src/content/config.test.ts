import { describe, expect, test } from "vitest";
import { z } from "astro/zod";
import { TRACKS } from "../types";

// Mirror the actual schemas from config.ts
const Track = z.enum(TRACKS as [string, ...string[]]);
const Bi = z.object({ en: z.string().min(1), ru: z.string().min(1) });

const tracksSchema = z.object({
  slug: Track,
  order: z.number().int().positive(),
  title: Bi,
  blurb: Bi,
  color: z.enum(["lilac", "mint", "peach", "sky", "rose"]),
});

const unitsSchema = z.object({
  slug: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
  track: Track,
  order: z.number().int().positive(),
  title: Bi,
  crux: Bi,
  lessons: z.array(z.string().regex(/^\d{2}-[a-z0-9-]+$/)),
});

describe("content collections", () => {
  test("tracks schema accepts a valid track entry", () => {
    const valid = {
      slug: "math",
      order: 1,
      title: { en: "Mathematics", ru: "Математика" },
      blurb: { en: "...", ru: "..." },
      color: "lilac",
    };
    expect(() => tracksSchema.parse(valid)).not.toThrow();
  });

  test("tracks schema rejects unknown slug", () => {
    expect(() => tracksSchema.parse({
      slug: "garbage",
      order: 1,
      title: { en: "x", ru: "x" },
      blurb: { en: "x", ru: "x" },
      color: "lilac",
    })).toThrow();
  });

  test("units schema accepts a valid unit entry", () => {
    expect(() => unitsSchema.parse({
      slug: "01-numbers",
      track: "math",
      order: 1,
      title: { en: "Numbers", ru: "Числа" },
      crux: { en: "?", ru: "?" },
      lessons: ["01-counting", "02-zero"],
    })).not.toThrow();
  });
});
