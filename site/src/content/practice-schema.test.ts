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
const PracticeTask = z.discriminatedUnion("type", [PredictTask, IncidentTask, DiagnoseTask]);
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
