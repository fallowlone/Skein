import { describe, it, expect } from "vitest";
import { buildSession, readinessScore, selectRound, type PracticeEntryLite, type SessionItem } from "./interview-session";

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

describe("selectRound", () => {
  const pool: SessionItem[] = Array.from({ length: 10 }, (_, i) => ({
    lessonKey: "k",
    task: task(`t${i}`, "design"),
  }));
  const ids = (s: SessionItem[]) => s.map((i) => i.task.id);

  it("returns the pool unchanged when it is not larger than the window", () => {
    const small = pool.slice(0, 3);
    expect(selectRound(small, 8, 5)).toHaveLength(3);
    expect(ids(selectRound(small, 8, 0))).toEqual(ids(small));
  });

  it("round 0 is the first window", () => {
    expect(ids(selectRound(pool, 4, 0))).toEqual(["t0", "t1", "t2", "t3"]);
  });

  it("consecutive rounds advance the window", () => {
    expect(ids(selectRound(pool, 4, 1))).toEqual(["t4", "t5", "t6", "t7"]);
  });

  it("wraps around the end of the pool", () => {
    // round 2 starts at offset 8 → t8, t9, then wraps to t0, t1
    expect(ids(selectRound(pool, 4, 2))).toEqual(["t8", "t9", "t0", "t1"]);
  });

  it("returns distinct items within a window smaller than the pool", () => {
    const got = ids(selectRound(pool, 4, 2));
    expect(new Set(got).size).toBe(4);
  });

  it("is deterministic and handles negative/fractional rounds", () => {
    expect(ids(selectRound(pool, 4, -3))).toEqual(ids(selectRound(pool, 4, 0)));
    expect(ids(selectRound(pool, 4, 1.9))).toEqual(ids(selectRound(pool, 4, 1)));
  });

  it("size 0 → empty", () => expect(selectRound(pool, 0, 0)).toEqual([]));
});
