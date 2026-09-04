import { useEffect, useState } from "preact/hooks";

const TOKEN_KEY = "skein.admin.token";

interface LessonRow {
  lesson: string;
  track: string | null;
  views: number;
  uniqueClients: number;
  avgSeconds: number | null;
  timeSamples: number;
  attempts: number;
  correctRatio: number | null;
}
interface Question { id: number; ts: number; lesson: string; lang: string | null; text: string; }
interface Summary { lessons: LessonRow[]; questions: Question[]; }

function fmtTime(s: number | null): string {
  if (s === null) return "—";
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

/** Owner-only metrics view; token is checked server-side (ADMIN_TOKEN secret). */
export default function AdminMetrics() {
  const [token, setToken] = useState("");
  const [stored, setStored] = useState<string | null>(null);
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setStored(localStorage.getItem(TOKEN_KEY)); } catch { /* no-op */ }
  }, []);

  useEffect(() => {
    if (stored) void load(stored);
  }, [stored]);

  const load = async (tok: string) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/summary", { headers: { Authorization: `Bearer ${tok}` } });
      if (res.status === 401) throw new Error("Bad token.");
      if (res.status === 503) throw new Error("ADMIN_TOKEN is not configured on the Pages project.");
      if (!res.ok) throw new Error(`API error ${res.status} — is the D1 database provisioned and migration 0002 applied?`);
      setData(await res.json());
      try { localStorage.setItem(TOKEN_KEY, tok); } catch { /* no-op */ }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed.");
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div class="max-w-md">
        <p class="text-sm text-muted mb-3">Enter the admin token to load metrics.</p>
        <div class="flex gap-2">
          <input type="password" class="font-mono flex-1 px-3 py-1.5 bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] text-ink"
            value={token} onInput={(e) => setToken((e.target as HTMLInputElement).value)} placeholder="ADMIN_TOKEN" />
          <button type="button" class="oa-btn oa-btn-primary oa-btn-sm disabled:opacity-50" disabled={busy || !token.trim()}
            onClick={() => load(token.trim())}>
            {busy ? "Loading…" : "Load"}
          </button>
        </div>
        {err && <p class="text-sm text-danger mt-3">{err}</p>}
        <details class="mt-4 text-xs text-muted">
          <summary>Setup (one-time, operator)</summary>
          <ol class="list-decimal pl-5 mt-2 space-y-1">
            <li>Create the D1 database and bind it as <code>DB</code> on the Pages project.</li>
            <li>Apply migrations: <code>wrangler d1 execute &lt;db&gt; --remote --file functions/migrations/0001_init.sql</code>, then <code>0002_metrics_feedback.sql</code>.</li>
            <li>Set the <code>ADMIN_TOKEN</code> secret (Pages → Settings → Environment variables).</li>
          </ol>
        </details>
      </div>
    );
  }

  return (
    <div>
      <div class="flex items-center gap-3 mb-6">
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" disabled={busy} onClick={() => stored && load(stored)}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
        <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm text-muted" onClick={() => {
          try { localStorage.removeItem(TOKEN_KEY); } catch { /* no-op */ }
          setStored(null); setData(null); setToken("");
        }}>
          Forget token
        </button>
      </div>

      <h2 class="font-display text-xl mb-2">Lessons ({data.lessons.length})</h2>
      <div class="overflow-x-auto mb-10">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="text-left text-xs font-mono uppercase text-muted border-b border-hairline-2">
              <th class="py-2 pr-4">Lesson</th>
              <th class="py-2 pr-4">Views</th>
              <th class="py-2 pr-4">Unique</th>
              <th class="py-2 pr-4">Avg time</th>
              <th class="py-2 pr-4">Attempts</th>
              <th class="py-2 pr-4">Correct</th>
            </tr>
          </thead>
          <tbody>
            {data.lessons.map((l) => (
              <tr key={l.lesson} class="border-b border-hairline">
                <td class="py-2 pr-4 font-mono text-xs">{l.lesson}</td>
                <td class="py-2 pr-4 tabular-nums">{l.views}</td>
                <td class="py-2 pr-4 tabular-nums">{l.uniqueClients}</td>
                <td class="py-2 pr-4 tabular-nums">{fmtTime(l.avgSeconds)}</td>
                <td class="py-2 pr-4 tabular-nums">{l.attempts || "—"}</td>
                <td class="py-2 pr-4 tabular-nums">{l.correctRatio === null ? "—" : `${Math.round(l.correctRatio * 100)}%`}</td>
              </tr>
            ))}
            {data.lessons.length === 0 && (
              <tr><td colSpan={6} class="py-4 text-muted">No events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 class="font-display text-xl mb-2">Reader questions ({data.questions.length})</h2>
      <ul class="space-y-3">
        {data.questions.map((q) => (
          <li key={q.id} class="rounded-[var(--r-md)] border-[0.5px] border-hairline-2 bg-card p-4">
            <div class="text-xs font-mono text-muted mb-1">
              {new Date(q.ts).toISOString().slice(0, 16).replace("T", " ")} · {q.lesson} · {q.lang ?? "?"}
            </div>
            <p class="text-sm m-0 whitespace-pre-wrap">{q.text}</p>
          </li>
        ))}
        {data.questions.length === 0 && <li class="text-sm text-muted">No questions yet.</li>}
      </ul>
    </div>
  );
}
