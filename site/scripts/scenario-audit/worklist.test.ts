import { describe, it, expect } from "vitest";
import { candidatesFor, type LessonMeta } from "./worklist";

const base = { taskCount: 4, atCap: false };

describe("candidatesFor incident", () => {
  it("targets middle/senior/null-level teaching spine lessons lacking incident", () => {
    const lessons: LessonMeta[] = [
      { lessonKey: "backend/01/01", track: "backend", level: "senior", lessonType: "topic", types: new Set(["diagnose"]), ...base },
      { lessonKey: "backend/01/02", track: "backend", level: "junior", lessonType: "topic", types: new Set(["diagnose"]), ...base },
      { lessonKey: "backend/01/03", track: "backend", level: "senior", lessonType: "topic", types: new Set(["incident"]), ...base },
      { lessonKey: "math/01/01", track: "math", level: "senior", lessonType: "topic", types: new Set([]), ...base },
    ];
    const got = candidatesFor("incident", lessons).map((l) => l.lessonKey);
    expect(got).toEqual(["backend/01/01"]);
  });
});

describe("candidatesFor debug", () => {
  it("targets coding lessons OR lessons with a js/sql sandbox/fix, lacking debug", () => {
    const lessons: LessonMeta[] = [
      { lessonKey: "js-engine/01/01", track: "js-engine", level: "middle", lessonType: "coding", types: new Set(["predict"]), ...base },
      { lessonKey: "frontend/01/01", track: "frontend", level: "middle", lessonType: "topic", types: new Set(["sandbox-js"]), ...base },
      { lessonKey: "apis/01/01", track: "apis", level: "middle", lessonType: "topic", types: new Set(["design"]), ...base },
      { lessonKey: "js-engine/01/02", track: "js-engine", level: "middle", lessonType: "coding", types: new Set(["debug"]), ...base },
    ];
    const got = candidatesFor("debug", lessons).map((l) => l.lessonKey);
    expect(got).toEqual(["js-engine/01/01", "frontend/01/01"]);
  });
});

describe("candidatesFor never exceeds cap", () => {
  it("skips at-cap lessons", () => {
    const lessons: LessonMeta[] = [
      { lessonKey: "backend/01/01", track: "backend", level: "senior", lessonType: "topic", types: new Set(["diagnose"]), taskCount: 8, atCap: true },
    ];
    expect(candidatesFor("incident", lessons)).toEqual([]);
  });
});
