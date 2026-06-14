// site/src/scripts/path/do-now.test.ts
import { describe, it, expect } from "vitest";
import { buildDoNow, type DoNowInput, type DoNowItem } from "./do-now";

const task = (id: string, difficulty: string) => ({ id, difficulty });

// A small synthetic world: 2 lead units, each with 2 lessons, plus a couple of due reviews.
function baseInput(over: Partial<DoNowInput> = {}): DoNowInput {
  const unitLessons = new Map<string, string[]>([
    ["go/01-basics", ["go/01-basics/01-intro", "go/01-basics/02-vars"]],
    ["docker/01-images", ["docker/01-images/01-what", "docker/01-images/02-layers"]],
  ]);
  const tasksByLesson = new Map<string, { id: string; difficulty: string }[]>([
    ["go/01-basics/01-intro", [task("r1", "recall"), task("a1", "apply")]],
    ["go/01-basics/02-vars", [task("r2", "recall")]],
    ["docker/01-images/01-what", [task("r3", "recall"), task("s3", "stretch")]],
    ["docker/01-images/02-layers", [task("r4", "recall")]],
  ]);
  return {
    leadUnits: ["go/01-basics", "docker/01-images"],
    unitLessons,
    lessonStatus: () => ({}),
    mastery: () => 0.4, // apply tier under threshold 0.6
    threshold: 0.6,
    dueReviewKeys: [],
    tasksByLesson: (lessonKey) => tasksByLesson.get(lessonKey) ?? [],
    maxUnits: 3,
    ...over,
  };
}

describe("buildDoNow", () => {
  it("emits all due reviews first, in the given order", () => {
    const items = buildDoNow(baseInput({
      dueReviewKeys: [
        { cardKey: "go/01-basics/01-intro::practice::r1", lessonKey: "go/01-basics/01-intro" },
        { cardKey: "docker/01-images/02-layers::practice::r4", lessonKey: "docker/01-images/02-layers" },
      ],
    }));
    const reviews = items.filter((i) => i.kind === "review");
    expect(reviews).toHaveLength(2);
    expect(items.slice(0, 2).every((i) => i.kind === "review")).toBe(true);
    expect(reviews[0].taskId).toBe("r1");                 // derived from cardKey
    expect(reviews[0].unit).toBe("go/01-basics");
    expect(reviews[0].lesson).toBe("go/01-basics/01-intro");
  });

  it("for each lead unit picks the first lesson with an unfinished task, at the adaptive tier", () => {
    const items = buildDoNow(baseInput());
    const tasks = items.filter((i) => i.kind === "task");
    expect(tasks).toHaveLength(2); // one per lead unit
    expect(tasks[0]).toMatchObject({ unit: "go/01-basics", lesson: "go/01-basics/01-intro", taskId: "a1", difficulty: "apply" });
    expect(tasks[1]).toMatchObject({ unit: "docker/01-images", lesson: "docker/01-images/01-what" });
  });

  it("skips lessons whose tasks are all done and advances to the next lesson in the unit", () => {
    const items = buildDoNow(baseInput({
      lessonStatus: (k): Record<string, string> => (k === "go/01-basics/01-intro" ? { r1: "done", a1: "done" } : {}),
    }));
    const goTask = items.find((i) => i.kind === "task" && i.unit === "go/01-basics");
    expect(goTask?.lesson).toBe("go/01-basics/02-vars"); // first lesson fully done → next
    expect(goTask?.taskId).toBe("r2");
  });

  it("emits no task for a unit whose lessons are all complete", () => {
    const items = buildDoNow(baseInput({
      leadUnits: ["go/01-basics"],
      lessonStatus: () => ({ r1: "done", a1: "done", r2: "done" }),
    }));
    expect(items.filter((i) => i.kind === "task")).toHaveLength(0);
  });

  it("limits lesson/task scanning to the first maxUnits lead units", () => {
    const items = buildDoNow(baseInput({ maxUnits: 1 }));
    const tasks = items.filter((i) => i.kind === "task");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].unit).toBe("go/01-basics");
  });

  it("is deterministic and side-effect free (same input → identical output)", () => {
    const input = baseInput();
    expect(buildDoNow(input)).toEqual(buildDoNow(input));
  });

  it("accepts PathStep-shaped lead units (reads their .unit field)", () => {
    const items = buildDoNow(baseInput({
      leadUnits: [{ unit: "go/01-basics" } as any, { unit: "docker/01-images" } as any],
    }));
    expect(items.filter((i) => i.kind === "task").map((i) => i.unit)).toEqual(["go/01-basics", "docker/01-images"]);
  });

  it("every item carries a non-empty reason", () => {
    const items = buildDoNow(baseInput({
      dueReviewKeys: [{ cardKey: "go/01-basics/01-intro::practice::r1", lessonKey: "go/01-basics/01-intro" }],
    }));
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i: DoNowItem) => typeof i.reason === "string" && i.reason.length > 0)).toBe(true);
  });
});
