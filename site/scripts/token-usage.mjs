#!/usr/bin/env node
// Token usage from Claude Code transcripts (~/.claude/projects/<slug>/**/*.jsonl, subagents included).
// Transcripts get purged, so `--log` upserts per-session totals into .claude/token-log.jsonl (gitignored).
//
//   node scripts/token-usage.mjs [--since 2026-06-14] [--until 2026-06-16] [--by day|session|model]
//                                [--project <substr>] [--log] [--quiet]
//
// Slice by work: --since "$(git log -1 --format=%aI <commit>~1)" --until "$(git log -1 --format=%aI <commit>)".
// Messages are deduped by API message id (streamed blocks repeat it); the largest output_tokens wins.
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const slug = (p) => p.replace(/[^a-zA-Z0-9]/g, "-"); // how Claude Code names project dirs
const project = opt("project", slug(root));
const since = opt("since") ? new Date(opt("since")) : null;
const until = opt("until") ? new Date(opt("until")) : null;
const by = opt("by", "day");
if (!["day", "session", "model"].includes(by)) { console.error("--by: day | session | model"); process.exit(1); }
const logPath = join(root, ".claude", "token-log.jsonl");

function* transcripts(dir, minMtime) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* transcripts(p, minMtime);
    else if (e.name.endsWith(".jsonl") && (!minMtime || statSync(p).mtime >= minMtime)) yield p;
  }
}

const base = join(homedir(), ".claude", "projects");
const dirs = existsSync(base) ? readdirSync(base).filter((d) => d.startsWith(project) || d.includes(project)) : [];
// mtime prefilter: a file last written before `since` cannot hold messages after it.
const byId = new Map(); // message id -> { ts, session, model, usage }
for (const d of dirs) {
  for (const f of transcripts(join(base, d), since)) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (!line.includes('"usage"')) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      const m = o.message;
      if (o.type !== "assistant" || !m?.usage || !m.id) continue;
      const ts = new Date(o.timestamp);
      if ((since && ts < since) || (until && ts > until)) continue;
      const prev = byId.get(m.id);
      if (!prev || (m.usage.output_tokens ?? 0) >= (prev.usage.output_tokens ?? 0)) {
        byId.set(m.id, { ts, session: o.sessionId ?? f, model: m.model ?? "unknown", usage: m.usage });
      }
    }
  }
}

const empty = () => ({ msgs: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });
const add = (a, u) => {
  a.msgs++;
  a.input += u.input_tokens ?? 0;
  a.cacheWrite += u.cache_creation_input_tokens ?? 0;
  a.cacheRead += u.cache_read_input_tokens ?? 0;
  a.output += u.output_tokens ?? 0;
};

const keyOf = { day: (r) => r.ts.toISOString().slice(0, 10), session: (r) => r.session, model: (r) => r.model }[by];
const rows = new Map(); const total = empty(); const perSession = new Map();
for (const r of byId.values()) {
  const k = keyOf(r);
  add(rows.get(k) ?? rows.set(k, empty()).get(k), r.usage);
  add(total, r.usage);
  const sk = `${r.session}\t${r.model}`;
  const s = perSession.get(sk) ?? { sessionId: r.session, model: r.model, first: r.ts, last: r.ts, ...empty() };
  add(s, r.usage); if (r.ts < s.first) s.first = r.ts; if (r.ts > s.last) s.last = r.ts;
  perSession.set(sk, s);
}

if (flag("log")) {
  // Upsert by sessionId+model: re-running only refreshes totals, so the log never double-counts.
  const old = new Map();
  if (existsSync(logPath)) for (const l of readFileSync(logPath, "utf8").split("\n")) {
    if (l) { const o = JSON.parse(l); old.set(`${o.sessionId}\t${o.model}`, o); }
  }
  for (const [k, s] of perSession) {
    old.set(k, { ...s, first: s.first.toISOString(), last: s.last.toISOString(), loggedAt: new Date().toISOString() });
  }
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, [...old.values()].map((o) => JSON.stringify(o)).join("\n") + "\n");
}

if (!flag("quiet")) {
  const n = (x) => x.toLocaleString("en-US");
  const head = ["", "msgs", "input", "cache write", "cache read", "output"];
  const fmt = (k, r) => [k, n(r.msgs), n(r.input), n(r.cacheWrite), n(r.cacheRead), n(r.output)];
  const table = [head, ...[...rows].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, r]) => fmt(k, r)), fmt("TOTAL", total)];
  const w = head.map((_, i) => Math.max(...table.map((r) => r[i].length)));
  for (const r of table) console.log(r.map((c, i) => (i ? c.padStart(w[i]) : c.padEnd(w[i]))).join("  "));
  if (!byId.size) console.log(`no transcripts matched "${project}" in ${base}`);
}
