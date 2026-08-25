// Runs a learner's solution against a problem's real test cases inside the same
// QuickJS (WASM) sandbox the rest of the site uses for code execution — no native
// eval, so a broken or hostile solution can only ever produce a wrong answer or
// time out, never touch the page. See ~/scripts/run-js.ts for the sandbox itself.
import { runJs } from "~/scripts/run-js";
import type { TestRunResult, WorkspaceProblem, WorkspaceTest } from "./types";

const RESULT_PREFIX = "WSR";
const RUN_TIMEOUT_MS = 2500;

type RawResult = { i: number; actual: string; pass: boolean };

function canonSnippet(): string {
  return `
    function __wsCanon(v, mode) {
      if (mode === "unordered-triplets" && Array.isArray(v)) {
        var rows = v.map(function (row) {
          return Array.isArray(row) ? row.slice().sort(function (a, b) { return a - b; }) : row;
        });
        rows.sort(function (a, b) {
          var ak = JSON.stringify(a), bk = JSON.stringify(b);
          return ak < bk ? -1 : ak > bk ? 1 : 0;
        });
        return rows;
      }
      return v;
    }
  `;
}

function buildHarness(problem: WorkspaceProblem): string {
  const cases = problem.tests.map((t, i) => ({ i, args: t.args, expected: t.expected, compare: t.compare }));
  return `
${canonSnippet()}
(function () {
  var __wsCases = ${JSON.stringify(cases)};
  for (var __i = 0; __i < __wsCases.length; __i++) {
    var c = __wsCases[__i];
    var out = { i: c.i, pass: false, actual: "" };
    try {
      var args = JSON.parse(c.args);
      var raw = ${problem.functionName}.apply(null, args);
      var got = __wsCanon(raw, c.compare);
      var want = __wsCanon(c.expected, c.compare);
      out.actual = raw === undefined ? "undefined" : JSON.stringify(raw);
      out.pass = JSON.stringify(got) === JSON.stringify(want);
    } catch (e) {
      out.actual = "threw: " + (e && e.message ? e.message : String(e));
      out.pass = false;
    }
    console.log(${JSON.stringify(RESULT_PREFIX)} + JSON.stringify(out));
  }
})();
`;
}

export type RunOutcome =
  | { ok: true; results: TestRunResult[]; totalMs: number }
  | { ok: false; error: string };

/** Runs `userCode` (expected to define `problem.functionName`) against every test case. */
export async function runProblemTests(problem: WorkspaceProblem, userCode: string): Promise<RunOutcome> {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  // `runJs(code, setup)` evaluates `setup` first, then `code` — so the learner's
  // solution (setup) is defined before the harness (code) calls into it.
  const outcome = await runJs(buildHarness(problem), userCode, RUN_TIMEOUT_MS);
  const totalMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;

  if (outcome.error) return { ok: false, error: outcome.error };

  const raw = new Map<number, RawResult>();
  for (const line of outcome.stdout.split("\n")) {
    if (!line.startsWith(RESULT_PREFIX)) continue;
    try {
      const parsed = JSON.parse(line.slice(RESULT_PREFIX.length)) as RawResult;
      raw.set(parsed.i, parsed);
    } catch {
      // malformed result line — treated as a missing case below
    }
  }

  const results: TestRunResult[] = problem.tests.map((test, i) => {
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
