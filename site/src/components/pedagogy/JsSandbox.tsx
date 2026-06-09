import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { applyExecCheck, type ExecCheck, type ExecResult } from "~/scripts/practice-grade";

type Props = {
  lang: Locale;
  setup?: string;
  initialCode?: string;
  check?: ExecCheck;
  onResult?: (passed: boolean) => void;
};

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export default function JsSandbox({ lang, setup, initialCode, check, onResult }: Props) {
  const [code, setCode] = useState(initialCode ?? "");
  const [stdout, setStdout] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  const run = async () => {
    setBusy(true); setError(null); setStdout(null); setVerdict(null);
    let out = "";
    try {
      const { getQuickJS, shouldInterruptAfterDeadline } = await import("quickjs-emscripten"); // code-split WASM
      const QuickJS = await getQuickJS();
      const vm = QuickJS.newContext();
      // Hard 1s budget so a learner's infinite loop (`while (true) {}`) is interrupted instead of
      // freezing the browser tab.
      vm.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + 1000));
      // expose console.log → capture
      const logFn = vm.newFunction("log", (...args) => {
        out += args.map((a) => vm.dump(a)).join(" ") + "\n";
      });
      const consoleObj = vm.newObject();
      vm.setProp(consoleObj, "log", logFn);
      vm.setProp(vm.global, "console", consoleObj);
      consoleObj.dispose(); logFn.dispose();

      const program = (setup ? setup + "\n" : "") + code;
      const result = vm.evalCode(program);
      if (result.error) {
        const msg = vm.dump(result.error);
        result.error.dispose();
        vm.dispose();
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      result.value.dispose();
      vm.dispose();
      setStdout(out);
      if (check) {
        const r: ExecResult = { stdout: out };
        const ok = applyExecCheck(check, r);
        setVerdict(ok); onResult?.(ok);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (check) {
        const ok = applyExecCheck(check, { error: msg });
        setVerdict(ok); onResult?.(ok);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="rounded-[var(--r-md)] border border-rule bg-card-2 p-3">
      <textarea class="font-mono w-full text-xs p-2 rounded-[var(--r-sm)] border border-hairline-2 bg-[var(--code-bg)] text-[var(--code-ink)] min-h-[96px]"
        value={code} onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)} />
      <button type="button" disabled={busy}
        class="mt-2 oa-btn oa-btn-primary oa-btn-sm disabled:opacity-50"
        onClick={run}>
        {busy ? tt(lang, "Running…", "Выполняю…") : tt(lang, "Run", "Запустить")}
      </button>
      {error && <pre class="text-xs text-danger mt-2 whitespace-pre-wrap">{error}</pre>}
      {stdout && <pre class="text-xs mt-2 overflow-x-auto bg-card p-2 rounded-[var(--r-sm)]">{stdout}</pre>}
      {verdict !== null && (
        <div class={`text-sm mt-2 font-semibold ${verdict ? "text-ok" : "text-danger"}`}>
          {verdict ? tt(lang, "✓ passed", "✓ пройдено") : tt(lang, "✗ not yet", "✗ пока нет")}
        </div>
      )}
    </div>
  );
}
