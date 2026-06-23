import { describe, it, expect } from "vitest";
import { buildSession, readinessScore, type PracticeEntryLite } from "./interview-session";

const task = (id: string, type: string) => ({ id, type, title: { en: id, ru: id }, prompt: { en: id, ru: id } }) as any;

const entries: PracticeEntryLite[] = [
  { id: "system-design/09-interview-framework/01-requirements", tasks: [task("a", "design"), task("b", "sandbox")] },
  { id: "system-design/09-interview-framework/02-estimation", tasks: [task("c", "incident")] },
  { id: "react/01-hooks/01-intro", tasks: [task("d", "design")] }, // off-prefix → excluded
];

describe("buildSession", () => {
  it("keeps only graded tasks from the interview-framework prefix", () => {
    const s = buildSession(entries);
    expect(s.map((i) => i.task.id)).toEqual(["a", "c"]); // b is sandbox (not graded), d is off-prefix
  });
  it("excludes off-prefix entries and respects a custom prefix", () => {
    const s = buildSession(entries, { includePrefixes: ["react/"] });
    expect(s.map((i) => i.task.id)).toEqual(["d"]);
  });
  it("caps at max", () => {
    expect(buildSession(entries, { max: 1 })).toHaveLength(1);
  });
  it("carries the lessonKey for each item", () => {
    const s = buildSession(entries);
    expect(s[0].lessonKey).toBe("system-design/09-interview-framework/01-requirements");
  });
});

describe("readinessScore", () => {
  it("empty → 0", () => expect(readinessScore([])).toBe(0));
  it("all pass → 100", () => expect(readinessScore(["pass", "pass"])).toBe(100));
  it("partial weights half", () => expect(readinessScore(["pass", "partial", "fail"])).toBeCloseTo((1 + 0.5 + 0) / 3 * 100));
});
