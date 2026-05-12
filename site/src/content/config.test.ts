import { describe, expect, test } from "vitest";
import { z } from "astro/zod";
import { PILLARS } from "../types";

// Mirror the actual schemas from config.ts
const Pillar = z.enum(PILLARS as [string, ...string[]]);
const Bi = z.object({ en: z.string().min(1), ru: z.string().min(1) });

const pillarsSchema = z.object({
  slug: Pillar,
  order: z.number().int().positive(),
  title: Bi,
  blurb: Bi,
  color: z.enum(["lilac", "mint", "peach", "sky", "rose"]),
  prereqs: z.array(Pillar).default([]),
});

const chaptersSchema = z.object({
  slug: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
  pillar: Pillar,
  order: z.number().int().positive(),
  title: Bi,
  crux: Bi,
  pieces: z.array(z.string().regex(/^\d{2}-[a-z0-9-]+$/)),
});

describe("content collections", () => {
  test("pillars schema accepts a valid pillar entry", () => {
    const valid = {
      slug: "networking",
      order: 1,
      title: { en: "Networking & Protocols", ru: "Сети и протоколы" },
      blurb: { en: "...", ru: "..." },
      color: "lilac",
      prereqs: [],
    };
    expect(() => pillarsSchema.parse(valid)).not.toThrow();
  });

  test("pillars schema rejects unknown slug", () => {
    expect(() => pillarsSchema.parse({
      slug: "garbage",
      order: 1,
      title: { en: "x", ru: "x" },
      blurb: { en: "x", ru: "x" },
      color: "lilac",
      prereqs: [],
    })).toThrow();
  });

  test("chapters schema accepts a valid chapter entry", () => {
    expect(() => chaptersSchema.parse({
      slug: "01-networking",
      pillar: "networking",
      order: 1,
      title: { en: "How the internet works", ru: "Как работает интернет" },
      crux: { en: "?", ru: "?" },
      pieces: ["01-physical-link", "02-ip-packet"],
    })).not.toThrow();
  });
});
