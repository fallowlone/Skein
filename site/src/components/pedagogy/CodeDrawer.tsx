// A LeetCode-shaped workspace: the lesson stays readable on the left, the editor
// docks to the right third of the viewport. CodeMirror 6 (syntax highlighting,
// autocomplete, bracket matching, multi-cursor, search) is loaded on open only —
// it must never sit in the initial bundle of a lesson page.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { runJs } from "~/scripts/run-js";
import { applyExecCheck, type ExecCheck } from "~/scripts/practice-grade";

type Props = {
  lang: Locale;
  title: string;
  code: string;
  onCodeChange: (code: string) => void;
  onClose: () => void;
  setup?: string;
  check?: ExecCheck;
  onResult?: (passed: boolean) => void;
};

const L = {
  en: {
    run: "Run", running: "Running…", close: "Close", reset: "Reset code",
    output: "Output", empty: "Run the code to see output.",
    passed: "✓ passed", failed: "✗ not yet", hint: "⌘/Ctrl + Enter runs · Esc closes",
    loading: "Loading editor…",
  },
  ru: {
    run: "Запустить", running: "Выполняю…", close: "Закрыть", reset: "Сбросить код",
    output: "Вывод", empty: "Запусти код, чтобы увидеть вывод.",
    passed: "✓ пройдено", failed: "✗ пока нет", hint: "⌘/Ctrl + Enter — запуск · Esc — закрыть",
    loading: "Загружаю редактор…",
  },
} as const;

export default function CodeDrawer(
  { lang, title, code, onCodeChange, onClose, setup, check, onResult }: Props,
) {
  const t = L[lang];
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<{ destroy: () => void; state: { doc: { toString(): string } } } | null>(null);
  const initialCode = useRef(code);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stdout, setStdout] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  // `run` is re-created every render but the editor is mounted once, so the keymap
  // reads the latest implementation through a ref instead of capturing a stale one.
  const runRef = useRef<() => void>(() => {});

  const run = async () => {
    setBusy(true); setError(null); setStdout(null); setVerdict(null);
    const r = await runJs(code, setup);
    setBusy(false);
    setStdout(r.stdout);
    if (r.error) setError(r.error);
    if (check) {
      const ok = applyExecCheck(check, r.error ? { error: r.error } : { stdout: r.stdout });
      setVerdict(ok);
      onResult?.(ok);
    }
  };
  runRef.current = () => { void run(); };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ EditorView, basicSetup }, { javascript }, { oneDark }, { keymap }, { Prec }] =
        await Promise.all([
          import("codemirror"),
          import("@codemirror/lang-javascript"),
          import("@codemirror/theme-one-dark"),
          import("@codemirror/view"),
          import("@codemirror/state"),
        ]);
      if (cancelled || !host.current) return;

      const dark = document.documentElement.dataset.theme === "dark"
        || (!document.documentElement.dataset.theme
          && matchMedia("(prefers-color-scheme: dark)").matches);

      const view = new EditorView({
        doc: initialCode.current,
        parent: host.current,
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          // Prec.highest so the shortcut wins over basicSetup's default bindings.
          Prec.highest(keymap.of([
            { key: "Mod-Enter", run: () => { runRef.current(); return true; } },
          ])),
          EditorView.updateListener.of((u) => { if (u.docChanged) onCodeChange(u.state.doc.toString()); }),
          EditorView.theme({ "&": { height: "100%", fontSize: "13px" }, ".cm-scroller": { fontFamily: "var(--font-mono)" } }),
          ...(dark ? [oneDark] : []),
        ],
      });
      viewRef.current = view as unknown as typeof viewRef.current;
      setReady(true);
    })();
    return () => { cancelled = true; viewRef.current?.destroy(); viewRef.current = null; };
    // Mount-once: the editor owns its document from here, and re-running this would
    // discard the learner's cursor and undo history.
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside class="code-drawer" role="dialog" aria-modal="false" aria-label={title}>
      <header class="cd-head">
        <p class="cd-title">{title}</p>
        <button type="button" class="cd-close" onClick={onClose} aria-label={t.close}>✕</button>
      </header>

      <div class="cd-editor">
        <div ref={host} class="cd-cm" />
        {!ready && <p class="cd-loading">{t.loading}</p>}
      </div>

      <div class="cd-bar">
        <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" disabled={busy} onClick={run}>
          {busy ? t.running : t.run}
        </button>
        {verdict !== null && (
          <span class={verdict ? "cd-verdict ok" : "cd-verdict bad"}>{verdict ? t.passed : t.failed}</span>
        )}
        <span class="cd-hint">{t.hint}</span>
      </div>

      <section class="cd-out" aria-live="polite">
        <p class="cd-out-label">{t.output}</p>
        {error && <pre class="cd-err">{error}</pre>}
        {stdout ? <pre class="cd-std">{stdout}</pre> : !error && <p class="cd-empty">{t.empty}</p>}
      </section>
    </aside>
  );
}
