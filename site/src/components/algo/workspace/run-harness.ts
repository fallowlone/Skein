// Runs a learner's solution against a problem's real test cases inside the same
// QuickJS (WASM) sandbox the rest of the site uses for code execution — no native
// eval, so a broken or hostile solution can only ever produce a wrong answer or
// time out, never touch the page. See ~/scripts/run-js.ts for the sandbox itself.
import { runJs } from "~/scripts/run-js";
import type { TestRunResult, WorkspaceProblem, WorkspaceTest } from "./types";

const RUN_TIMEOUT_MS = 2500;

type RawResult = { i: number; actual: string; pass: boolean };

function buildHarness(problem: WorkspaceProblem, tests: WorkspaceTest[]): string {
  const cases = tests.map((t, i) => ({ i, args: t.args, expected: t.expected, compare: t.compare }));
  return `
(function () {
  function __wsCanon(v, mode) {
    if (mode !== "unordered-triplets") return v;
    if (!Array.isArray(v)) return { __wsInvalid: true };
    var rows = [];
    for (var r = 0; r < v.length; r++) {
      var row = v[r];
      if (!Array.isArray(row)) return { __wsInvalid: true };
      var copy = row.slice();
      copy.sort(function (a, b) { return a - b; });
      rows.push(copy);
    }
    rows.sort(function (a, b) {
      var ak = JSON.stringify(a), bk = JSON.stringify(b);
      return ak < bk ? -1 : ak > bk ? 1 : 0;
    });
    return rows;
  }
  var __wsCases = ${JSON.stringify(cases)};
  var __wsResults = [];
  for (var __i = 0; __i < __wsCases.length; __i++) {
    var c = __wsCases[__i];
    var out = { i: c.i, pass: false, actual: "" };
    try {
      var args = JSON.parse(c.args);
      var raw = Function.prototype.apply.call(${problem.functionName}, null, args);
      var got = __wsCanon(raw, c.compare);
      var want = __wsCanon(c.expected, c.compare);
      out.actual = raw === undefined ? "undefined" : JSON.stringify(raw);
      out.pass = JSON.stringify(got) === JSON.stringify(want);
    } catch (e) {
      out.actual = "threw: " + (e && e.message ? e.message : "error");
      out.pass = false;
    }
    __wsResults.push(out);
  }
  return __wsResults;
})();
`;
}

export type RunOutcome =
  | { ok: true; results: TestRunResult[]; totalMs: number }
  | { ok: false; error: string };

/** Runs `userCode` (expected to define `problem.functionName`) against every test case. */
export async function runProblemTests(
  problem: WorkspaceProblem,
  userCode: string,
  scope: "visible" | "all" = "all",
): Promise<RunOutcome> {
  const tests = scope === "visible" ? problem.tests.filter((test) => test.visible) : problem.tests;
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const outcome = await runJs(buildHarness(problem, tests), userCode, RUN_TIMEOUT_MS, { hardenedSetup: true });
  const totalMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;

  if (outcome.error) return { ok: false, error: outcome.error };

  const raw = new Map<number, RawResult>();
  if (Array.isArray(outcome.value)) {
    for (const item of outcome.value) {
      if (!item || typeof item !== "object") continue;
      const parsed = item as Partial<RawResult>;
      if (typeof parsed.i !== "number" || typeof parsed.pass !== "boolean" || typeof parsed.actual !== "string") continue;
      raw.set(parsed.i, { i: parsed.i, pass: parsed.pass, actual: parsed.actual });
    }
  }

  const results: TestRunResult[] = tests.map((test, i) => {
    const found = raw.get(i);
    return {
      test,
      pass: found?.pass ?? false,
      actual: found?.actual ?? "(no result — solution likely threw before this case ran)",
      ms: 0,
    };
  });

  return { ok: true, results, totalMs };
}

export function summarizeResults(results: TestRunResult[]): { passed: number; total: number } {
  return { passed: results.filter((r) => r.pass).length, total: results.length };
}

export function visibleResults(results: TestRunResult[]): TestRunResult[] {
  return results.filter((r) => r.test.visible);
}

export function allPassed(results: TestRunResult[]): boolean {
  return results.length > 0 && results.every((r) => r.pass);
}

export type { WorkspaceTest };
