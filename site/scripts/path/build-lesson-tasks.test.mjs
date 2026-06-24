import { describe, it, expect } from "vitest";
import { buildIndex } from "./build-lesson-tasks.mjs";

// buildIndex(files, read) — `read` is injected so the test supplies file contents without disk I/O.
const fixture = {
  "a.json": JSON.stringify({
    lessonKey: "db/01-unit/02-lesson",
    tasks: [
      { id: "r1", difficulty: "recall", title: { en: "x" } },
      { id: "a1", difficulty: "apply" },
    ],
  }),
  "b.json": JSON.stringify({ lessonKey: "db/01-unit/01-lesson", tasks: [{ id: "s1", difficulty: "stretch" }] }),
  "empty.json": JSON.stringify({ lessonKey: "db/01-unit/03-lesson", tasks: [] }),
  "bad.json": "{ not json",
  "notpractice.json": JSON.stringify({ foo: 1 }),
};
const read = (p) => fixture[p];

describe("build-lesson-tasks buildIndex", () => {
  const idx = buildIndex(Object.keys(fixture), read);

  it("keeps only id + difficulty per task", () => {
    expect(idx["db/01-unit/02-lesson"]).toEqual([
      { id: "r1", difficulty: "recall" },
      { id: "a1", difficulty: "apply" },
    ]);
  });

  it("drops lessons with no tasks", () => {
    expect(idx["db/01-unit/03-lesson"]).toBeUndefined();
  });

  it("skips malformed and non-practice files without throwing", () => {
    expect(Object.keys(idx)).not.toContain("bad.json");
    expect(idx.foo).toBeUndefined();
  });

  it("orders keys deterministically (sorted)", () => {
    expect(Object.keys(idx)).toEqual(["db/01-unit/01-lesson", "db/01-unit/02-lesson"]);
  });
});
