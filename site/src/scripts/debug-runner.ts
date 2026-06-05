// site/src/scripts/debug-runner.ts
// Pure, headless-testable verification runner for the `debug` practice type.
// Assembles `setup + learnerCode + verify` and runs it in the SAME QuickJS engine
// JsSandbox uses, then applies the ExecCheck. The hidden `verify` assertion runs
// after the learner's edited code and decides pass/fail.
//
// MVP: synchronous logic only — QuickJS does not drain the Promise job queue, so
// await/setTimeout/microtasks never resolve. Debug tasks must be sync bugs.
import { applyExecCheck, type ExecCheck, type ExecResult } from "./practice-grade";

export type DebugRunResult =
  | { status: "pass" }
  | { status: "fail"; stdout: string }
  | { status: "error"; message: string };

export async function runDebug(args: {
  setup?: string;
  learnerCode: string;
  verify: string;
  check: ExecCheck;
}): Promise<DebugRunResult> {
  const { setup, learnerCode, verify, check } = args;
  let out = "";
  try {
    const { getQuickJS } = await import("quickjs-emscripten"); // code-split WASM
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();

    const logFn = vm.newFunction("log", (...vmArgs) => {
      out += vmArgs.map((a) => vm.dump(a)).join(" ") + "\n";
    });
    const consoleObj = vm.newObject();
    vm.setProp(consoleObj, "log", logFn);
    vm.setProp(vm.global, "console", consoleObj);
    consoleObj.dispose();
    logFn.dispose();

    const program = (setup ? setup + "\n" : "") + learnerCode + "\n" + verify;
    const result = vm.evalCode(program);
    if (result.error) {
      const msg = vm.dump(result.error);
      result.error.dispose();
      vm.dispose();
      return { status: "error", message: typeof msg === "string" ? msg : JSON.stringify(msg) };
    }
    result.value.dispose();
    vm.dispose();

    const r: ExecResult = { stdout: out };
    return applyExecCheck(check, r) ? { status: "pass" } : { status: "fail", stdout: out };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
