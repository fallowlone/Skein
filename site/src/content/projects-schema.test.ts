import { describe, expect, test } from "vitest";
import { z } from "astro/zod";
import { TRACKS } from "~/types";

// Mirror of the projects schema in content.config.ts
const BiText = z.object({ en: z.string().min(1), ru: z.string().min(1) });
const Track = z.enum(TRACKS as [string, ...string[]]);
const ProjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: BiText,
  pitch: BiText,
  deliverable: BiText,
  tracks: z.array(Track).min(1),
  difficulty: z.enum(["starter", "intermediate", "advanced"]),
  estDays: z.number().int().positive(),
  skills: z.array(z.string()).min(1),
  milestones: z.array(BiText).min(2),
  seniorStretch: z.array(BiText).min(1),
});

const bi = { en: "x", ru: "х" };
const valid = {
  slug: "query-plan-visualizer",
  title: bi, pitch: bi, deliverable: bi,
  tracks: ["databases"],
  difficulty: "intermediate",
  estDays: 4,
  skills: ["explain", "indexes"],
  milestones: [bi, bi],
  seniorStretch: [bi],
};

describe("projects schema", () => {
  test("accepts a valid project", () => {
    expect(() => ProjectSchema.parse(valid)).not.toThrow();
  });
  test("rejects fewer than 2 milestones", () => {
    expect(() => ProjectSchema.parse({ ...valid, milestones: [bi] })).toThrow();
  });
  test("rejects an empty seniorStretch", () => {
    expect(() => ProjectSchema.parse({ ...valid, seniorStretch: [] })).toThrow();
  });
  test("rejects an empty tracks list", () => {
    expect(() => ProjectSchema.parse({ ...valid, tracks: [] })).toThrow();
  });
  test("rejects an unknown track", () => {
    expect(() => ProjectSchema.parse({ ...valid, tracks: ["astrology"] })).toThrow();
  });
  test("rejects a slug with uppercase", () => {
    expect(() => ProjectSchema.parse({ ...valid, slug: "Bad-Slug" })).toThrow();
  });
  test("rejects a BiText missing ru", () => {
    expect(() => ProjectSchema.parse({ ...valid, title: { en: "only en" } })).toThrow();
  });
});
