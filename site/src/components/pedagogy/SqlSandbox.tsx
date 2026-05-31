import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { applyExecCheck, type ExecCheck, type ExecResult } from "~/scripts/practice-grade";

type Props = {
  lang: Locale;
  setup?: string;
  initialSql?: string;
  check?: ExecCheck;
  onResult?: (passed: boolean) => void;
};

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export default function SqlSandbox({ lang, setup, initialSql, check, onResult }: Props) {
  const [sql, setSql] = useState(initialSql ?? "");
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  const run = async () => {
    setBusy(true); setError(null); setRows(null); setVerdict(null);
    try {
      const { PGlite } = await import("@electric-sql/pglite"); // code-split WASM
      const db = new PGlite();
      if (setup) await db.exec(setup);
      const res = await db.query(sql);
      const out = (res.rows ?? []) as Record<string, unknown>[];
      setRows(out);
      if (check) {
        const r: ExecResult = { rows: out };
        const ok = applyExecCheck(check, r);
        setVerdict(ok); onResult?.(ok);
      }
      await db.close?.();
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
        value={sql} onInput={(e) => setSql((e.target as HTMLTextAreaElement).value)} />
      <button type="button" disabled={busy}
        class="mt-2 oa-btn oa-btn-primary oa-btn-sm disabled:opacity-50"
        onClick={run}>
        {busy ? tt(lang, "Running…", "Выполняю…") : tt(lang, "Run", "Запустить")}
      </button>
      {error && <pre class="text-xs text-danger mt-2 whitespace-pre-wrap">{error}</pre>}
      {rows && (
        <pre class="text-xs mt-2 overflow-x-auto bg-card p-2 rounded-[var(--r-sm)] text-[var(--code-ink)]">{JSON.stringify(rows, null, 2)}</pre>
      )}
      {verdict !== null && (
        <div class={`text-sm mt-2 font-semibold ${verdict ? "text-ok" : "text-danger"}`}>
          {verdict ? tt(lang, "✓ passed", "✓ пройдено") : tt(lang, "✗ not yet", "✗ пока нет")}
        </div>
      )}
    </div>
  );
}
