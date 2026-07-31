import { describe, expect, test } from "vitest";
import { buildAssessIndex, facetOf, kindOf } from "./build-assess-items.mjs";

const unitConcepts = { "backend/01-promises": { teaches: ["promises", "event-loop"], requires: [], estMin: 5 } };
const bandOf = () => "surface";

const file = (lessonKey, tasks) => JSON.stringify({ lessonKey, tasks });

describe("facet mapping", () => {
  test("diagnose+blanks measures recognition", () => {
    expect(facetOf({ type: "diagnose", grading: { mode: "blanks" } })).toBe("recognition");
  });
  test("sandbox measures production", () => {
    expect(facetOf({ type: "sandbox" })).toBe("production");
  });
  test("debug is a mechanism probe, not two items", () => {
    expect(facetOf({ type: "debug" })).toBe("mechanism");
    expect(kindOf({ type: "debug" })).toBe("debug");
  });
  test("design is an explain item", () => {
    expect(kindOf({ type: "design" })).toBe("explain");
  });
});

describe("buildAssessIndex", () => {
  const files = ["a.json"];
  const read = () => file("backend/01-promises", [
    { id: "t1", type: "sandbox", difficulty: "apply", estMin: 6 },
    { id: "t2", type: "predict", difficulty: "recall", estMin: 3 },
  ]);

  test("emits one item per task, keyed lessonKey#taskId", () => {
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, read);
    expect(Object.keys(items).sort()).toEqual(["backend/01-promises#t1", "backend/01-promises#t2"]);
  });

  test("attributes a task to every concept its unit teaches, at 1/n weight", () => {
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, read);
    const it = items["backend/01-promises#t1"];
    expect(it.concepts).toEqual(["promises", "event-loop"]);
    expect(it.weight).toBeCloseTo(0.5);
  });

  test("an explicit concepts field on the task wins and keeps full weight", () => {
    const withExplicit = () => file("backend/01-promises", [
      { id: "t1", type: "sandbox", difficulty: "apply", estMin: 6, concepts: ["promises"] },
    ]);
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, withExplicit);
    expect(items["backend/01-promises#t1"].concepts).toEqual(["promises"]);
    expect(items["backend/01-promises#t1"].weight).toBe(1);
  });

  test("coverage counts items per concept per facet", () => {
    const { coverage } = buildAssessIndex(files, unitConcepts, bandOf, read);
    expect(coverage["promises"]).toEqual({ recognition: 0, mechanism: 1, production: 1 });
  });

  test("a lesson whose unit is unknown is skipped rather than guessed", () => {
    const orphan = () => file("ghost/99-nope", [{ id: "t1", type: "sandbox", difficulty: "apply", estMin: 4 }]);
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, orphan);
    expect(Object.keys(items)).toHaveLength(0);
  });

  test("an unknown task type is skipped per-task, not per-file", () => {
    const mixed = () => file("backend/01-promises", [
      { id: "t1", type: "speedrun", difficulty: "apply", estMin: 4 },
      { id: "t2", type: "predict", difficulty: "recall", estMin: 3 },
    ]);
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, mixed);
    expect(Object.keys(items)).toEqual(["backend/01-promises#t2"]);
  });
});
