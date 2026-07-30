// Sandboxed JS execution for learner code. Extracted from JsSandbox so the inline
// sandbox and the full-screen code drawer run identical semantics — a learner must
// never see one verdict in the panel and another in the drawer.
//
// QuickJS (WASM) rather than eval/Function: learner code cannot touch the DOM, the
// network, or site state, and an infinite loop is interrupted instead of freezing the tab.

export type RunOutcome = { stdout: string; error?: string };

const DEFAULT_TIMEOUT_MS = 1000;

export async function runJs(
  code: string,
  setup?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<RunOutcome> {
  let out = "";
  try {
    const { getQuickJS, shouldInterruptAfterDeadline } = await import("quickjs-emscripten"); // code-split WASM
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();
    vm.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeoutMs));

    const logFn = vm.newFunction("log", (...args) => {
      out += args.map((a) => vm.dump(a)).join(" ") + "\n";
    });
    const consoleObj = vm.newObject();
    vm.setProp(consoleObj, "log", logFn);
    vm.setProp(vm.global, "console", consoleObj);
    consoleObj.dispose();
    logFn.dispose();

    const program = (setup ? setup + "\n" : "") + code;
    const result = vm.evalCode(program);
    if (result.error) {
      const msg = vm.dump(result.error);
      result.error.dispose();
      vm.dispose();
      return { stdout: out, error: typeof msg === "string" ? msg : JSON.stringify(msg) };
    }
    result.value.dispose();
    vm.dispose();
    return { stdout: out };
  } catch (e) {
    return { stdout: out, error: e instanceof Error ? e.message : String(e) };
  }
}
