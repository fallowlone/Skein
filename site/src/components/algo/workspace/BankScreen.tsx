import type { BankRow } from "./types";
import type { Labels } from "./labels";
import { chipStyle, monoLabel, monoLabelInk } from "./style-helpers";

export type BankFilters = { pattern: string; difficulty: string; company: string; status: string };

type Props = {
  labels: Labels;
  rows: BankRow[];
  patterns: string[];
  companies: string[];
  filters: BankFilters;
  onFilters: (f: BankFilters) => void;
  onOpenWorkspace: (id: string) => void;
};

const DIFFS = ["all", "easy", "medium", "hard"];
const STATUSES = ["all", "unattempted", "attempted", "solved", "due"];

function diffColor(d: string): string {
  return d === "easy" ? "var(--ok)" : d === "medium" ? "var(--warn)" : "var(--danger)";
}
function statusColor(s: string): string {
  return s === "due" ? "var(--warn)" : s === "solved" ? "var(--ok)" : "var(--muted)";
}
function statusLabel(labels: Labels, s: string): string {
  if (s === "all") return labels.bank.all;
  return labels.bank.status[s as keyof Labels["bank"]["status"]] ?? s;
}
function difficultyLabel(labels: Labels, d: string): string {
  if (d === "all") return labels.bank.all;
  return labels.metrics[d as "easy" | "medium" | "hard"] ?? d;
}

export default function BankScreen({ labels, rows, patterns, companies, filters, onFilters, onOpenWorkspace }: Props) {
  const l = labels.bank;
  const shown = rows.filter((p) =>
    (filters.pattern === "all" || p.pattern === filters.pattern) &&
    (filters.difficulty === "all" || p.difficulty === filters.difficulty) &&
    (filters.company === "all" || p.companies.includes(filters.company)) &&
    (filters.status === "all" || p.status === filters.status));

  const groups: { key: keyof BankFilters; name: string; options: string[]; format: (v: string) => string }[] = [
    { key: "pattern", name: l.filters.pattern, options: patterns, format: (v) => (v === "all" ? l.all : v) },
    { key: "difficulty", name: l.filters.difficulty, options: DIFFS, format: (v) => difficultyLabel(labels, v) },
    { key: "company", name: l.filters.company, options: companies, format: (v) => (v === "all" ? l.all : v) },
    { key: "status", name: l.filters.status, options: STATUSES, format: (v) => statusLabel(labels, v) },
  ];

  return (
    <div style="max-width:1180px;margin:0 auto;padding:40px 32px 64px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
        <span style={monoLabel}>{l.kicker}</span>
      </div>
      <h1 style="font-family:var(--font-display);font-size:44px;font-weight:470;letter-spacing:-0.032em;line-height:1.0;margin:0">{l.title}</h1>

      <div style="display:flex;flex-direction:column;gap:12px;margin-top:28px;padding:18px 0;border-top:0.5px solid var(--rule-strong);border-bottom:0.5px solid var(--rule)">
        {groups.map((g) => (
          <div key={g.key} style="display:grid;grid-template-columns:84px minmax(0,1fr);gap:16px;align-items:center">
            <span style={monoLabel}>{g.name}</span>
            <div style="display:flex;flex-wrap:wrap;gap:5px">
              {g.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onFilters({ ...filters, [g.key]: opt })}
                  style={chipStyle(filters[g.key] === opt)}
                >
                  {g.format(opt)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style="display:grid;grid-template-columns:36px minmax(0,1fr) 150px 92px 108px 76px;gap:16px;align-items:baseline;padding:12px 0;border-bottom:0.5px solid var(--rule-strong)">
        <span style={monoLabel}>{l.cols.lc}</span>
        <span style={monoLabelInk}>{l.cols.problem}</span>
        <span style={monoLabel}>{l.cols.pattern}</span>
        <span style={monoLabel}>{l.cols.difficulty}</span>
        <span style={monoLabel}>{l.cols.status}</span>
        <span style={`${monoLabel};text-align:right`}>{l.cols.target}</span>
      </div>

      {shown.map((p) => (
        <a
          key={p.id}
          href={p.isWorkspaceProblem ? undefined : p.href}
          onClick={p.isWorkspaceProblem ? (e) => { e.preventDefault(); onOpenWorkspace(p.id); } : undefined}
          style="display:grid;grid-template-columns:36px minmax(0,1fr) 150px 92px 108px 76px;gap:16px;align-items:baseline;padding:13px 0;border-bottom:0.5px solid var(--hairline);cursor:pointer;transition:background 120ms var(--ease)"
        >
          <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums">{p.leetcodeId}</span>
          <span style="font-family:var(--font-display);font-size:18px;font-weight:500;line-height:1.24;color:var(--ink);min-width:0;text-wrap:pretty">{p.title}</span>
          <span style="font-family:var(--font-mono);font-size:11px;color:var(--ink-2)">{p.pattern}</span>
          <span style={`font-family:var(--font-mono);font-size:11px;color:${diffColor(p.difficulty)}`}>{p.difficulty}</span>
          <span style={`font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.06em;text-transform:uppercase;color:${statusColor(p.status)}`}>{statusLabel(labels, p.status)}</span>
          <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums">{p.targetMinutes} min</span>
        </a>
      ))}

      <div style="display:flex;align-items:baseline;gap:12px;margin-top:16px">
        <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted);letter-spacing:0.04em">{l.count(shown.length, rows.length)}</span>
        <span style={monoLabel}>{l.footnote}</span>
      </div>
    </div>
  );
}
