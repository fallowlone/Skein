import { describe, it, expect } from "vitest";
import { typesByLesson, type LessonCoverage } from "./inventory";

describe("typesByLesson", () => {
  it("maps each practice file's lessonKey to its set of task types", () => {
    const files = [
      { lessonKey: "networking/01-x/01-a", track: "networking", tasks: [{ type: "diagnose" }, { type: "incident" }] },
      { lessonKey: "math/01-x/01-a", track: "math", tasks: [{ type: "diagnose" }] },
    ];
    const got = typesByLesson(files as any);
    expect(got.get("networking/01-x/01-a")?.types).toEqual(new Set(["diagnose", "incident"]));
  });
  it("flags a lesson at the 8-task cap", () => {
    const files = [{ lessonKey: "n/01/01", track: "networking", tasks: Array(8).fill({ type: "fix" }) }];
    const got = typesByLesson(files as any);
    expect(got.get("n/01/01")?.atCap).toBe(true);
  });
});
