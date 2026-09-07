// Sandboxed JS execution for learner code. Extracted from JsSandbox so the inline
// sandbox and the full-screen code drawer run identical semantics — a learner must
// never see one verdict in the panel and another in the drawer.
//
// QuickJS (WASM) rather than eval/Function: learner code cannot touch the DOM, the
// network, or site state, and an infinite loop is interrupted instead of freezing the tab.

export type RunOutcome = { stdout: string; value?: unknown; error?: string };
export type RunOptions = { hardenedSetup?: boolean };

const DEFAULT_TIMEOUT_MS = 1000;
const MAX_MEMORY_BYTES = 32 * 1024 * 1024;
const MAX_STACK_BYTES = 512 * 1024;
const MAX_STDOUT_CHARS = 64 * 1024;
const TRUNCATED_STDOUT = "\n[output truncated]\n";

export async function runJs(
  code: string,
  setup?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  options: RunOptions = {},
): Promise<RunOutcome> {
  let out = "";
  let stdoutTruncated = false;
  try {
    const { getQuickJS, shouldInterruptAfterDeadline } = await import("quickjs-emscripten"); // code-split WASM
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();
    vm.runtime.setMemoryLimit(MAX_MEMORY_BYTES);
    vm.runtime.setMaxStackSize(MAX_STACK_BYTES);
    vm.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeoutMs));

    const logFn = vm.newFunction("log", (...args) => {
      if (stdoutTruncated) return;
      const line = args.map((a) => vm.dump(a)).join(" ") + "\n";
      const remaining = MAX_STDOUT_CHARS - out.length;
      if (line.length <= remaining) {
        out += line;
        return;
      }
      out += line.slice(0, Math.max(0, remaining));
      stdoutTruncated = true;
    });
    const consoleObj = vm.newObject();
    vm.setProp(consoleObj, "log", logFn);
    vm.setProp(vm.global, "console", consoleObj);
    consoleObj.dispose();
    logFn.dispose();

    if (options.hardenedSetup) {
      const harden = vm.evalCode(`
        (function () {
          Object.freeze(JSON);
          Object.freeze(Array);
          Object.freeze(Array.prototype);
          Object.freeze(Function);
          Object.freeze(Function.prototype);
          Object.freeze(Object);
          Object.freeze(Object.prototype);
          Object.defineProperties(globalThis, {
            JSON: { value: JSON, writable: false, configurable: false },
            Array: { value: Array, writable: false, configurable: false },
            Function: { value: Function, writable: false, configurable: false },
            Object: { value: Object, writable: false, configurable: false }
          });
        })();
      `);
      if (harden.error) {
        const msg = vm.dump(harden.error);
        harden.error.dispose();
        vm.dispose();
        return { stdout: stdoutTruncated ? out + TRUNCATED_STDOUT : out, error: typeof msg === "string" ? msg : JSON.stringify(msg) };
      }
      harden.value.dispose();

      if (setup) {
        const setupResult = vm.evalCode(setup);
        if (setupResult.error) {
          const msg = vm.dump(setupResult.error);
          setupResult.error.dispose();
          vm.dispose();
          return { stdout: stdoutTruncated ? out + TRUNCATED_STDOUT : out, error: typeof msg === "string" ? msg : JSON.stringify(msg) };
        }
        setupResult.value.dispose();
      }
    }

    const program = options.hardenedSetup ? code : (setup ? setup + "\n" : "") + code;
    const result = vm.evalCode(program);
    if (result.error) {
      const msg = vm.dump(result.error);
      result.error.dispose();
      vm.dispose();
      return { stdout: stdoutTruncated ? out + TRUNCATED_STDOUT : out, error: typeof msg === "string" ? msg : JSON.stringify(msg) };
    }
    const value = vm.dump(result.value);
    result.value.dispose();
    vm.dispose();
    return { stdout: stdoutTruncated ? out + TRUNCATED_STDOUT : out, value };
  } catch (e) {
    return { stdout: stdoutTruncated ? out + TRUNCATED_STDOUT : out, error: e instanceof Error ? e.message : String(e) };
  }
}
