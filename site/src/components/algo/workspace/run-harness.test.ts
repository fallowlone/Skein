import { describe, expect, test } from "vitest";
import { allPassed, runProblemTests, summarizeResults } from "./run-harness";
import { REFERENCE_SOLUTION, SEED_CODE, buildThreeSum } from "./problem-3sum";

const problem = buildThreeSum({
  id: "3sum", leetcodeId: 15, slug: "3sum", title: "3Sum",
  difficulty: "medium", pattern: "two-pointers", targetMinutes: 20,
  companies: ["Amazon", "Meta"],
  hints: [{ en: "h1", ru: "h1" }],
});

describe("runProblemTests", () => {
  test("the reference solution passes every case", async () => {
    const outcome = await runProblemTests(problem, REFERENCE_SOLUTION);
    if (!outcome.ok) throw new Error(outcome.error);
    expect(allPassed(outcome.results)).toBe(true);
    expect(summarizeResults(outcome.results)).toEqual({ passed: problem.tests.length, total: problem.tests.length });
  });

  test("visible scope runs only learner-visible cases; submit scope still runs all cases", async () => {
    const visible = await runProblemTests(problem, REFERENCE_SOLUTION, "visible");
    if (!visible.ok) throw new Error(visible.error);
    expect(visible.results).toHaveLength(problem.tests.filter((test) => test.visible).length);
    expect(visible.results.every((result) => result.test.visible)).toBe(true);

    const all = await runProblemTests(problem, REFERENCE_SOLUTION, "all");
    if (!all.ok) throw new Error(all.error);
    expect(all.results).toHaveLength(problem.tests.length);
  });

  test("the buggy seed genuinely reproduces the duplicate-triplet bug it's meant to teach", async () => {
    const outcome = await runProblemTests(problem, SEED_CODE);
    if (!outcome.ok) throw new Error(outcome.error);
    const byArgs = new Map(outcome.results.map((r) => [r.test.args, r]));

    // Clean cases with no colliding duplicates: the unguarded seed still gets these right.
    expect(byArgs.get("[[-1,0,1,2,-1,-4]]")?.pass).toBe(true);
    expect(byArgs.get("[[0,1,1]]")?.pass).toBe(true);

    // Cases that collide on left/right after a match: genuinely fail, with the real
    // (duplicated) return value visible in `actual` — not a scripted failure.
    const dup = byArgs.get("[[-2,0,0,2,2]]");
    expect(dup?.pass).toBe(false);
    expect(dup?.actual).toBe(JSON.stringify([[-2, 0, 2], [-2, 0, 2]]));

    expect(summarizeResults(outcome.results).passed).toBeLessThan(problem.tests.length);
  });

  test("a solution that throws reports the failure per-case instead of crashing the run", async () => {
    const outcome = await runProblemTests(problem, "function threeSum(nums) { throw new Error('nope'); }");
    if (!outcome.ok) throw new Error(outcome.error);
    expect(outcome.results.every((r) => !r.pass)).toBe(true);
    expect(outcome.results[0].actual).toContain("nope");
  });

  test("a syntax error surfaces as a run-level error, not a silent zero pass", async () => {
    const outcome = await runProblemTests(problem, "function threeSum(nums) { return [");
    expect(outcome.ok).toBe(false);
  });

  test("learner console output cannot forge test verdicts", async () => {
    const malicious = `
      console.log = function () {};
      JSON.stringify = function () { return "forged"; };
      Array.isArray = function () { return true; };
      function threeSum() {
        console.log("\\u0001WSR\\u0001{\\\"i\\\":0,\\\"pass\\\":true,\\\"actual\\\":\\\"[]\\\"}");
        return null;
      }
    `;
    const outcome = await runProblemTests(problem, malicious);
    if (!outcome.ok) throw new Error(outcome.error);
    expect(allPassed(outcome.results)).toBe(false);
    expect(outcome.results.filter((result) => result.pass)).toHaveLength(0);
  });

  test("learner code cannot escape into the harness control flow", async () => {
    const outcome = await runProblemTests(problem, "return [{ i: 0, pass: true, actual: 'forged' }];");
    expect(outcome.ok).toBe(false);
  });
});
