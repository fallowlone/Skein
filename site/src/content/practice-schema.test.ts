import { describe, expect, test } from "vitest";
import { z } from "astro/zod";

// Mirror of the practice schema in content.config.ts
const BiText = z.object({ en: z.string().min(1), ru: z.string().min(1) });
const Difficulty = z.enum(["recall", "apply", "stretch"]);
const Blank = z.object({ id: z.string(), accept: z.array(z.string()).min(1), hint: BiText.optional() });
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
const PredictTask = TaskBase.extend({ type: z.literal("predict"), scenario: BiText, reveal: BiText });
const IncidentTask = TaskBase.extend({
  type: z.literal("incident"),
  steps: z.array(z.object({ label: BiText, prompt: BiText, reveal: BiText })).min(3).max(6),
});
const DiagnoseTask = TaskBase.extend({
  type: z.literal("diagnose"),
  evidence: BiText.optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("blanks"), blanks: z.array(Blank).min(1) }),
    z.object({ mode: z.literal("self"), model: BiText, rubric: z.array(BiText).min(1) }),
  ]),
});
const Finding = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: BiText,
  severity: z.enum(["bug", "missing-test", "tradeoff", "simplification"]),
  explanation: BiText,
  planted: z.literal(true),
});
const Decoy = z.object({ id: z.string().regex(/^[a-z0-9-]+$/), label: BiText, explanation: BiText });
const ReviewTask = TaskBase.extend({
  type: z.literal("review"),
  diff: z.object({ lang: z.string().min(1), code: z.string().min(1) }),
  findings: z.array(Finding).min(1),
  decoys: z.array(Decoy).optional(),
});
const DebugTask = TaskBase.extend({
  type: z.literal("debug"),
  starter: z.string().min(1),
  setup: z.string().optional(),
  verify: z.string().min(1),
  check: ExecCheck,
  evidence: BiText,
  hints: z.array(BiText).min(1).max(4),
  reveal: BiText,
});
const PracticeTask = z.discriminatedUnion("type", [PredictTask, IncidentTask, DiagnoseTask, ReviewTask, DebugTask]);
const fileSchema = z.object({
  lessonKey: z.string(),
  track: z.string(),
  tasks: z.array(PracticeTask).min(1).max(8),
});

const validPredict = {
  id: "predict-plan", type: "predict", difficulty: "recall", estMin: 3,
  title: { en: "Predict", ru: "Предскажи" },
  prompt: { en: "What plan?", ru: "Какой план?" },
  scenario: { en: "EXPLAIN ...", ru: "EXPLAIN ..." },
  reveal: { en: "Nested loop", ru: "Nested loop" },
};

describe("practice schema", () => {
  test("accepts a valid predict task file", () => {
    expect(() => fileSchema.parse({ lessonKey: "databases/03-execution-plans/03-join-algorithms", track: "databases", tasks: [validPredict] })).not.toThrow();
  });
  test("rejects an empty task list", () => {
    expect(() => fileSchema.parse({ lessonKey: "x/y/z", track: "databases", tasks: [] })).toThrow();
  });
  test("rejects a task id with uppercase", () => {
    expect(() => fileSchema.parse({ lessonKey: "x/y/z", track: "databases", tasks: [{ ...validPredict, id: "Bad_Id" }] })).toThrow();
  });
  test("rejects an incident with fewer than 3 steps", () => {
    const oneStep = { en: "a", ru: "а" };
    const incident = { id: "inc", type: "incident", difficulty: "apply", estMin: 10,
      title: { en: "t", ru: "т" }, prompt: { en: "p", ru: "п" },
      steps: [{ label: oneStep, prompt: oneStep, reveal: oneStep }] };
    expect(() => fileSchema.parse({ lessonKey: "x/y/z", track: "databases", tasks: [incident] })).toThrow();
  });
  test("rejects a BiText missing ru", () => {
    const bad = { ...validPredict, title: { en: "only en" } };
    expect(() => fileSchema.parse({ lessonKey: "x/y/z", track: "databases", tasks: [bad] })).toThrow();
  });
});

const validReview = {
  id: "review-async", type: "review", difficulty: "apply", estMin: 7,
  title: { en: "Review the diff", ru: "Отревьюй дифф" },
  prompt: { en: "What is wrong or missing?", ru: "Что не так или упущено?" },
  diff: { lang: "js", code: "function f(cb){ if (e) cb(e); cb(null, d); }" },
  findings: [
    { id: "missing-return", label: { en: "Callback fires twice", ru: "Колбэк дважды" }, severity: "bug", explanation: { en: "no return on cb(e)", ru: "нет return у cb(e)" }, planted: true },
  ],
};

describe("review task schema", () => {
  test("accepts a valid review task", () => {
    expect(() => fileSchema.parse({ lessonKey: "node/06-testing/01-unit-testing", track: "node", tasks: [validReview] })).not.toThrow();
  });
  test("rejects a review task with zero findings", () => {
    expect(() => fileSchema.parse({ lessonKey: "a/b/c", track: "node", tasks: [{ ...validReview, findings: [] }] })).toThrow();
  });
  test("rejects a finding missing ru label", () => {
    const bad = { ...validReview, findings: [{ ...validReview.findings[0], label: { en: "x" } }] };
    expect(() => fileSchema.parse({ lessonKey: "a/b/c", track: "node", tasks: [bad] })).toThrow();
  });
  test("rejects a finding with an unknown severity", () => {
    const bad = { ...validReview, findings: [{ ...validReview.findings[0], severity: "nit" }] };
    expect(() => fileSchema.parse({ lessonKey: "a/b/c", track: "node", tasks: [bad] })).toThrow();
  });
  test("rejects planted !== true", () => {
    const bad = { ...validReview, findings: [{ ...validReview.findings[0], planted: false }] };
    expect(() => fileSchema.parse({ lessonKey: "a/b/c", track: "node", tasks: [bad] })).toThrow();
  });
  test("accepts an optional decoy", () => {
    const withDecoy = { ...validReview, decoys: [{ id: "style", label: { en: "rename d?", ru: "переименовать d?" }, explanation: { en: "style only", ru: "только стиль" } }] };
    expect(() => fileSchema.parse({ lessonKey: "node/06-testing/01-unit-testing", track: "node", tasks: [withDecoy] })).not.toThrow();
  });
});

const validDebug = {
  id: "debug-closure", type: "debug", difficulty: "apply", estMin: 8,
  title: { en: "Fix the closure", ru: "Почини замыкание" },
  prompt: { en: "Make the loop capture per-iteration values", ru: "Заставь цикл захватывать значения по итерации" },
  starter: "const arr = []; for (var i = 0; i < 3; i++) { arr.push(() => i); }",
  verify: "if (JSON.stringify(arr.map(f=>f())) !== '[0,1,2]') throw new Error('x'); console.log('__PASS__');",
  check: { kind: "stdout-contains", value: "__PASS__" },
  evidence: { en: "[3,3,3]", ru: "[3,3,3]" },
  hints: [{ en: "var is function-scoped", ru: "var имеет функциональную область" }],
  reveal: { en: "Use let for block scope", ru: "Используй let для блочной области" },
};

describe("debug task schema", () => {
  test("accepts a valid debug task", () => {
    expect(() => fileSchema.parse({ lessonKey: "node/06-testing/01-unit-testing", track: "node", tasks: [validDebug] })).not.toThrow();
  });
  test("rejects a debug task missing verify", () => {
    const { verify, ...bad } = validDebug;
    expect(() => fileSchema.parse({ lessonKey: "a/b/c", track: "node", tasks: [bad] })).toThrow();
  });
  test("rejects a debug task with an empty starter", () => {
    expect(() => fileSchema.parse({ lessonKey: "a/b/c", track: "node", tasks: [{ ...validDebug, starter: "" }] })).toThrow();
  });
  test("rejects a debug task with zero hints", () => {
    expect(() => fileSchema.parse({ lessonKey: "a/b/c", track: "node", tasks: [{ ...validDebug, hints: [] }] })).toThrow();
  });
  test("rejects a debug task with more than four hints", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ en: `h${i}`, ru: `п${i}` }));
    expect(() => fileSchema.parse({ lessonKey: "a/b/c", track: "node", tasks: [{ ...validDebug, hints: five }] })).toThrow();
  });
});
