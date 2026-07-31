import { describe, expect, test } from "vitest";
import { buildPool, itemsFor } from "./item-pool";

const index = {
  "backend/01-promises/01-intro#t1": {
    lessonKey: "backend/01-promises/01-intro", taskId: "t1", kind: "exec", facet: "production",
    band: "surface", concepts: ["promises"], weight: 1, estMin: 5,
  },
  "backend/01-promises/01-intro#t2": {
    lessonKey: "backend/01-promises/01-intro", taskId: "t2", kind: "mcq", facet: "recognition",
    band: "surface", concepts: ["promises"], weight: 1, estMin: 3,
  },
} as const;

describe("buildPool", () => {
  test("an unseen task keeps full weight", () => {
    const pool = buildPool(index, () => ({}));
    expect(pool.find((i) => i.taskId === "t1")!.weight).toBe(1);
  });

  test("a task already DONE in the lesson is burned — it measures memory, not knowledge", () => {
    const pool = buildPool(index, () => ({ t1: "done" }));
    expect(pool.some((i) => i.taskId === "t1")).toBe(false);
    expect(pool.some((i) => i.taskId === "t2")).toBe(true);
  });

  test("a merely attempted task stays but at half weight", () => {
    const pool = buildPool(index, () => ({ t1: "attempted" }));
    expect(pool.find((i) => i.taskId === "t1")!.weight).toBeCloseTo(0.5);
  });

  test("itemsFor filters by concept and facet", () => {
    const pool = buildPool(index, () => ({}));
    expect(itemsFor(pool, "promises", "recognition").map((i) => i.taskId)).toEqual(["t2"]);
    expect(itemsFor(pool, "promises", "mechanism")).toEqual([]);
  });

  test("multi-concept attribution weight survives the burn discount", () => {
    const multi = { ...index, "x#t3": { ...index["backend/01-promises/01-intro#t1"], lessonKey: "x", taskId: "t3", weight: 0.5 } };
    const pool = buildPool(multi as typeof index, () => ({ t3: "attempted" }));
    expect(pool.find((i) => i.taskId === "t3")!.weight).toBeCloseTo(0.25);
  });
});
