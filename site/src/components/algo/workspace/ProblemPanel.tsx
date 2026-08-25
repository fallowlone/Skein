import type { Locale } from "~/i18n";
import type { WorkspaceProblem } from "./types";
import type { Labels } from "./labels";
import { monoLabel } from "./style-helpers";

const DIFF_LABEL: Record<WorkspaceProblem["difficulty"], Record<Locale, string>> = {
  easy: { en: "easy", ru: "лёгкая" },
  medium: { en: "medium", ru: "средняя" },
  hard: { en: "hard", ru: "сложная" },
};

const tagStyle = "font-family:var(--font-mono);font-size:10.5px;padding:2px 6px;border:0.5px solid var(--rule-strong);color:var(--ink-2);border-radius:1px";
const codeChip = "font-family:var(--font-mono);font-size:13px;background:var(--card-2);padding:1px 5px;border-radius:1px";

type Props = { lang: Locale; labels: Labels; problem: WorkspaceProblem };

export default function ProblemPanel({ lang, labels, problem }: Props) {
  const l = labels.workspace;
  return (
    <section style="border-right:0.5px solid var(--rule);padding:32px;display:flex;flex-direction:column;gap:24px;min-width:0">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:6px;height:6px;border-radius:1px;background:oklch(53% 0.10 168)" />
        <span style={monoLabel}>{problem.pattern} · leetcode {problem.leetcodeId}</span>
      </div>

      <div>
        <h1 style="font-family:var(--font-display);font-size:38px;font-weight:480;letter-spacing:-0.03em;line-height:1.02;margin:0">{problem.title}</h1>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px">
          <span style={`${tagStyle};border-color:color-mix(in srgb, var(--warn) 55%, transparent);color:var(--warn)`}>
            {DIFF_LABEL[problem.difficulty][lang]}
          </span>
          <span style={tagStyle}>{problem.pattern}</span>
          <span style={tagStyle}>leetcode {problem.leetcodeId}</span>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px">
        {problem.statement.map((p, i) => (
          <p key={i} style="margin:0;font-size:15px;line-height:1.68;color:var(--ink-2);text-wrap:pretty">{p[lang]}</p>
        ))}
      </div>

      <div style="border-top:0.5px solid var(--rule);padding-top:16px">
        <div style={`${monoLabel};margin-bottom:10px`}>{l.workedExample}</div>
        <div style="background:var(--card);border:0.5px solid var(--rule);border-radius:1px;padding:14px 16px;display:flex;flex-direction:column;gap:8px">
          <div style="display:grid;grid-template-columns:66px minmax(0,1fr);gap:12px;align-items:baseline">
            <span style={monoLabel}>{l.input}</span>
            <code style={codeChip}>{problem.example.input}</code>
          </div>
          <div style="display:grid;grid-template-columns:66px minmax(0,1fr);gap:12px;align-items:baseline">
            <span style={monoLabel}>{l.output}</span>
            <code style={codeChip}>{problem.example.output}</code>
          </div>
          <div style="display:grid;grid-template-columns:66px minmax(0,1fr);gap:12px;align-items:baseline;border-top:0.5px solid var(--hairline);padding-top:8px">
            <span style={monoLabel}>{l.why}</span>
            <span style="font-size:13.5px;line-height:1.55;color:var(--ink-2)">{problem.example.why[lang]}</span>
          </div>
        </div>
      </div>

      {problem.companies.length > 0 && (
        <div style="border-top:0.5px solid var(--rule);padding-top:16px">
          <div style={`${monoLabel};margin-bottom:10px`}>{l.askedAt}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            {problem.companies.map((c) => (
              <span key={c} style="font-family:var(--font-mono);font-size:10.5px;padding:2px 6px;border:0.5px solid var(--rule);color:var(--muted);border-radius:1px">{c}</span>
            ))}
          </div>
        </div>
      )}

      {problem.followUp && (
        <div style="margin-top:auto;border-top:0.5px solid var(--rule);padding-top:14px">
          <div style={`${monoLabel};margin-bottom:8px`}>{l.followUp}</div>
          <p style="margin:0;font-size:13.5px;line-height:1.6;color:var(--muted);text-wrap:pretty">{problem.followUp[lang]}</p>
        </div>
      )}
    </section>
  );
}
