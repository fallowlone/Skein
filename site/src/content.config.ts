import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";
import { TRACKS } from "./types";

const Lang = z.enum(["en", "ru"]);
const Status = z.enum(["stub", "draft", "ready"]);
const Bi = z.object({ en: z.string().min(1), ru: z.string().min(1) });

const Track = z.enum(TRACKS as [string, ...string[]]);
const SlugRe = /^(?:\d{2}-[a-z0-9-]+|quiz-[a-z]+|project(?:-[a-z]+)?|drill)$/;

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

// ── Practice layer ──────────────────────────────────────────────────────────
const BiText = Bi; // { en: min1, ru: min1 } — markdown allowed
const Difficulty = z.enum(["recall", "apply", "stretch"]);

const Blank = z.object({
  id: z.string(),
  accept: z.array(z.string()).min(1),
  hint: BiText.optional(),
});
const ExecCheck = z.object({
  kind: z.enum(["stdout-equals", "stdout-contains", "rows-equal", "no-error"]),
  value: z.string().optional(),
});

const TaskBase = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  difficulty: Difficulty,
  estMin: z.number().int().positive(),
  title: BiText,
  prompt: BiText,
});

const DiagnoseTask = TaskBase.extend({
  type: z.literal("diagnose"),
  evidence: BiText.optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("blanks"), blanks: z.array(Blank).min(1) }),
    z.object({ mode: z.literal("self"), model: BiText, rubric: z.array(BiText).min(1) }),
  ]),
});
const FixTask = TaskBase.extend({
  type: z.literal("fix"),
  starter: z.string().optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("self"), model: BiText, rubric: z.array(BiText).min(1) }),
    z.object({ mode: z.literal("exec"), runtime: z.enum(["sql", "js"]), setup: z.string().optional(), check: ExecCheck }),
  ]),
});
const SandboxTask = TaskBase.extend({
  type: z.literal("sandbox"),
  runtime: z.enum(["sql", "js", "parametric"]),
  setup: z.string().optional(),
  expected: ExecCheck.optional(),
  parametric: z.object({ component: z.string() }).optional(),
});
const IncidentTask = TaskBase.extend({
  type: z.literal("incident"),
  steps: z.array(z.object({
    label: BiText,
    prompt: BiText,
    reveal: BiText,
  })).min(3).max(6),
});
const DesignTask = TaskBase.extend({
  type: z.literal("design"),
  constraints: BiText,
  rubric: z.array(BiText).min(2),
  model: BiText,
});
const PredictTask = TaskBase.extend({
  type: z.literal("predict"),
  scenario: BiText,
  reveal: BiText,
});

const PracticeTask = z.discriminatedUnion("type", [
  DiagnoseTask, FixTask, SandboxTask, IncidentTask, DesignTask, PredictTask,
]);

const practice = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/practice" }),
  schema: z.object({
    lessonKey: z.string(),
    track: Track,
    tasks: z.array(PracticeTask).min(1).max(8),
  }),
});

export type PracticeTaskData = z.infer<typeof PracticeTask>;

// ── Drill ───────────────────────────────────────────────────────────────────
const Difficulty3 = z.enum(["easy", "medium", "hard"]);
const NeetPattern = z.enum([
  "arrays-hashing", "two-pointers", "sliding-window", "stack",
  "binary-search", "linked-list", "trees", "tries", "heap-priority-queue",
  "backtracking", "graphs", "advanced-graphs", "1d-dp", "2d-dp",
  "greedy", "intervals", "math-geometry", "bit-manipulation",
]);

const DrillProblem = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  leetcodeId: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  difficulty: Difficulty3,
  pattern: NeetPattern,
  neetcode150: z.boolean().default(true),
  targetMinutes: z.number().int().positive(),
  appliesToLesson: z.string().regex(SlugRe).optional(),
  hints: z.array(Bi).min(2).max(4),
  followUp: Bi.optional(),
  companies: z.array(z.string()).default([]),
}).strict();

const drill = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/drill" }),
  schema: z.object({
    track: Track,
    unit: z.string().regex(SlugRe),
    patterns: z.array(NeetPattern).min(1),
    intro: Bi,
    problems: z.array(DrillProblem).min(3).max(12),
  }),
});

export type DrillData = z.infer<typeof drill.schema>;

// ── Projects ────────────────────────────────────────────────────────────────
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

const projects = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/projects" }),
  schema: ProjectSchema,
});

export type ProjectData = z.infer<typeof ProjectSchema>;

export const collections = { tracks, units, lessons, practice, projects, drill };
