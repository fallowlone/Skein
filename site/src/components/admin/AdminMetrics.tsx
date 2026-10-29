import { Input as ShadcnInput } from "~/components/ui/input";
import { Button as ShadcnButton } from "~/components/ui/button";
import { Icon } from "~/components/ui/icon";
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
interface Summary { lessons: LessonRow[]; questions: Question[]; page: number; per_page: number; totalLessons: number; }

const PER_PAGE = 50;

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
  const [page, setPage] = useState(1);
  const [range, setRange] = useState("all");

  useEffect(() => {
    try { setStored(localStorage.getItem(TOKEN_KEY)); } catch { /* no-op */ }
  }, []);

  useEffect(() => {
    if (stored) void load(stored);
  }, [stored]);

  const load = async (tok: string, nextPage = 1, nextRange: string = range) => {
    setBusy(true);
    setErr(null);
    try {
      const since = nextRange === "all" ? "" : `&since=${Date.now() - Number(nextRange) * 86_400_000}`;
      const res = await fetch(`/api/admin/summary?page=${nextPage}&per_page=${PER_PAGE}${since}`, { headers: { Authorization: `Bearer ${tok}` } });
      if (res.status === 401) throw new Error("Bad token.");
      if (res.status === 503) throw new Error("ADMIN_TOKEN is not configured on the Pages project.");
      if (!res.ok) throw new Error(`API error ${res.status} — is the D1 database provisioned and migration 0002 applied?`);
      setData(await res.json());
      setPage(nextPage);
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
          <ShadcnInput type="password" leadingIcon="lock" passwordToggle
            showPasswordLabel="Show token" hidePasswordLabel="Hide token"
            class="font-mono flex-1 px-3 py-1.5 bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] text-ink"
            value={token} onInput={(e) => setToken((e.target as HTMLInputElement).value)} placeholder="ADMIN_TOKEN"
            state={err ? "error" : "default"} />
          <ShadcnButton type="button" class="oa-btn oa-btn-primary oa-btn-sm disabled:opacity-50" disabled={busy || !token.trim()}
            onClick={() => load(token.trim())}>
            <Icon name="check" size={14} />
            {busy ? "Loading…" : "Load"}
          </ShadcnButton>
        </div>
        {err && <p class="text-sm text-danger mt-3">{err}</p>}
        <details class="mt-4 text-xs text-muted">
          <summary>Setup (one-time, operator)</summary>
          <ol class="list-decimal pl-5 mt-2 space-y-1">
            <li>Create the D1 database and bind it as <code>DB</code> on the Pages project.</li>
            <li>Apply every migration in order: <code>for f in functions/migrations/*.sql; do wrangler d1 execute &lt;db&gt; --remote --file "$f"; done</code>.</li>
            <li>Set the <code>ADMIN_TOKEN</code> secret (Pages → Settings → Environment variables).</li>
          </ol>
        </details>
      </div>
    );
  }

  return (
    <div>
      <div class="flex items-center gap-3 mb-6">
        <ShadcnButton type="button" class="oa-btn oa-btn-secondary oa-btn-sm" disabled={busy} onClick={() => stored && load(stored, page)}>
          {busy ? "Refreshing…" : "Refresh"}
        </ShadcnButton>
        <label class="text-sm text-muted flex items-center gap-2">
          Range
          <select class="bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] px-2 py-1 text-ink"
            value={range} disabled={busy}
            onChange={(e) => { const r = (e.target as HTMLSelectElement).value; setRange(r); setPage(1); stored && load(stored, 1, r); }}>
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <ShadcnButton type="button" class="oa-btn oa-btn-ghost oa-btn-sm text-muted" onClick={() => {
          try { localStorage.removeItem(TOKEN_KEY); } catch { /* no-op */ }
          setStored(null); setData(null); setToken("");
        }}>
          Forget token
        </ShadcnButton>
      </div>

      <h2 class="font-display text-xl mb-2">Lessons ({data.totalLessons})</h2>
      {data.totalLessons > data.lessons.length && (
        <div class="flex items-center gap-3 mb-4 text-sm text-muted">
          <ShadcnButton type="button" class="oa-btn oa-btn-ghost oa-btn-sm" disabled={busy || page <= 1}
            onClick={() => stored && load(stored, page - 1)}>
            ← Prev
          </ShadcnButton>
          <span class="tabular-nums">Page {data.page} of {Math.max(1, Math.ceil(data.totalLessons / data.per_page))}</span>
          <ShadcnButton type="button" class="oa-btn oa-btn-ghost oa-btn-sm"
            disabled={busy || page >= Math.ceil(data.totalLessons / data.per_page)}
            onClick={() => stored && load(stored, page + 1)}>
            Next →
          </ShadcnButton>
        </div>
      )}
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
