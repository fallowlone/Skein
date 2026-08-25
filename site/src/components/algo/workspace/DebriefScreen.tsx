import type { Locale } from "~/i18n";
import type { Bi, DebriefTab, TestRunResult, TraceEvent, WorkspaceProblem } from "./types";
import type { Labels } from "./labels";
import { monoLabel, monoLabelInk, sectionRule, tabStyle } from "./style-helpers";
import { formatClock } from "./format";

export type QueueCandidate = { title: string; pattern: string; href: string; targetMinutes: number };

type Props = {
  lang: Locale;
  labels: Labels;
  problem: WorkspaceProblem;
  committed: string;
  elapsedLabel: string;
  mastery: number;
  hintsOpen: number;
  testResults: TestRunResult[];
  submittedCode: string;
  trace: TraceEvent[];
  firstDiagnosis: Bi | null;
  sealedAtLabel: string;
  revisitDays: number;
  queue: QueueCandidate[];
  tab: DebriefTab;
  onTab: (t: DebriefTab) => void;
};

const TABS: DebriefTab[] = ["analysis", "diff", "next"];
const TONE_INK: Record<string, string> = {
  quiet: "var(--muted)", accent: "var(--accent)", solid: "var(--ink-2)",
  danger: "var(--danger)", warn: "var(--warn)", ok: "var(--ok)",
};
const TONE_BG: Record<string, string> = {
  quiet: "transparent", accent: "var(--accent-ghost)",
  solid: "color-mix(in srgb, var(--ink) 6%, transparent)",
  danger: "color-mix(in srgb, var(--danger) 14%, transparent)",
  warn: "color-mix(in srgb, var(--warn) 20%, transparent)",
  ok: "color-mix(in srgb, var(--ok) 18%, transparent)",
};

function traceSegments(trace: TraceEvent[]) {
  return trace.map((event, i) => {
    const next = trace[i + 1];
    const span = Math.max(1, (next ? next.atSeconds : event.atSeconds + 1) - event.atSeconds);
    return { event, span };
  });
}

export default function DebriefScreen(props: Props) {
  const { lang, labels, problem, committed, elapsedLabel, mastery, hintsOpen, testResults,
    submittedCode, trace, firstDiagnosis, sealedAtLabel, revisitDays, queue, tab, onTab } = props;
  const l = labels.debrief;
  const passed = testResults.filter((r) => r.pass).length;
  const total = testResults.length;
  const segments = traceSegments(trace);
  const refLines = problem.referenceSolution.split("\n").length;
  const yourLines = submittedCode.split("\n").length;

  return (
    <div style="max-width:1180px;margin:0 auto;padding:40px 32px 64px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <span style="width:6px;height:6px;border-radius:1px;background:oklch(53% 0.10 168)" />
        <span style={monoLabel}>{l.submittedKicker(problem.title, passed, total)}</span>
      </div>
      <h1 style="font-family:var(--font-display);font-size:46px;font-weight:470;letter-spacing:-0.032em;line-height:1.0;margin:0;max-width:20ch;text-wrap:pretty">
        {passed < total
          ? l.headlineFailing(elapsedLabel, passed, total)
          : hintsOpen === 0 ? l.headlineClean(elapsedLabel) : l.headlineHinted(elapsedLabel, mastery)}
      </h1>

      <div style="display:flex;gap:2px;margin-top:28px;border-bottom:0.5px solid var(--rule-strong)">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => onTab(t)} style={tabStyle(tab === t)}>{l.tabs[t]}</button>
        ))}
      </div>

      {tab === "analysis" && (
        <div style="padding-top:32px;display:flex;flex-direction:column;gap:40px">
          <div style={`display:grid;grid-template-columns:repeat(2,1fr);gap:0;${sectionRule}`}>
            <div style="padding:20px 24px 20px 0;border-right:0.5px solid var(--rule)">
              <div style={monoLabel}>{l.youPredicted}</div>
              <div style="font-family:var(--font-mono);font-size:36px;letter-spacing:-0.03em;color:var(--ink);margin-top:10px">{committed}</div>
              <p style="margin:8px 0 0;font-size:13.5px;line-height:1.55;color:var(--muted)">{l.sealedAt(sealedAtLabel)}</p>
            </div>
            <div style="padding:20px 0 20px 24px">
              <div style={monoLabel}>{l.referenceBound}</div>
              <div style="font-family:var(--font-mono);font-size:36px;letter-spacing:-0.03em;color:var(--ink);margin-top:10px">{problem.referenceBigO}</div>
              <p style="margin:8px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-2);text-wrap:pretty">{l.referenceBoundBody}</p>
            </div>
          </div>

          <div>
            <div style={`${monoLabelInk};padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)`}>{l.firstBreakHeading}</div>
            {firstDiagnosis ? (
              <p style="margin:16px 0 0;font-size:15px;line-height:1.66;color:var(--ink-2);max-width:66ch;text-wrap:pretty">{firstDiagnosis[lang]}</p>
            ) : (
              <p style="margin:16px 0 0;font-size:15px;line-height:1.66;color:var(--ink-2);max-width:66ch;text-wrap:pretty">{l.firstBreakClean}</p>
            )}
          </div>

          <div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)">
              <span style={monoLabelInk}>{l.traceHeading}</span>
              <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted);font-variant-numeric:tabular-nums">
                {elapsedLabel} total · 20:00 {l.traceTarget}
              </span>
            </div>
            <div style="margin-top:20px">
              <div style="display:flex;height:44px;border:0.5px solid var(--rule);background:var(--card)">
                {segments.map(({ event, span }, i) => (
                  <div
                    key={i}
                    title={event.label[lang]}
                    style={`flex:${span} 0 0;display:flex;align-items:center;padding:0 8px;background:${TONE_BG[event.kind] ?? "transparent"};border-right:0.5px solid var(--rule);min-width:0`}
                  >
                    <span style={`font-family:var(--font-mono);font-size:9px;letter-spacing:0.06em;text-transform:uppercase;color:${TONE_INK[event.kind] ?? "var(--muted)"};white-space:nowrap;overflow:hidden`}>
                      {event.label[lang]}
                    </span>
                  </div>
                ))}
              </div>
              <div style="display:flex;margin-top:8px">
                {segments.map(({ event, span }, i) => (
                  <div key={i} style={`flex:${span} 0 0;padding-right:10px;min-width:0`}>
                    <div style="font-family:var(--font-mono);font-size:10px;color:var(--ink);font-variant-numeric:tabular-nums">{formatClock(event.atSeconds)}</div>
                    <div style="font-size:12px;line-height:1.4;color:var(--muted);margin-top:3px;text-wrap:pretty">{event.label[lang]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "diff" && (
        <div style="padding-top:32px">
          <div style="display:flex;align-items:baseline;gap:14px;padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)">
            <span style={monoLabelInk}>{l.diffHeading}</span>
            <span style="flex:1" />
            <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted)">{l.diffBothBound(problem.referenceBigO)}</span>
          </div>
          <p style="margin:16px 0 24px;font-size:15px;line-height:1.66;color:var(--ink-2);max-width:70ch;text-wrap:pretty">{l.diffBody}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div style="border:0.5px solid var(--rule);background:var(--code-bg);min-width:0;overflow:hidden">
              <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:0.5px solid var(--rule)">
                <span style={monoLabel}>{l.diffYoursLabel(yourLines)}</span>
              </div>
              <pre style="margin:0;padding:14px 0;overflow-x:auto;font-family:var(--font-mono);font-size:12.5px;line-height:1.72;color:var(--code-ink)"><code>{submittedCode}</code></pre>
            </div>
            <div style="border:0.5px solid var(--rule);background:var(--code-bg);min-width:0;overflow:hidden">
              <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:0.5px solid var(--rule)">
                <span style={monoLabel}>{l.diffRefLabel(refLines)}</span>
              </div>
              <pre style="margin:0;padding:14px 0;overflow-x:auto;font-family:var(--font-mono);font-size:12.5px;line-height:1.72;color:var(--code-ink)"><code>{problem.referenceSolution}</code></pre>
            </div>
          </div>
        </div>
      )}

      {tab === "next" && (
        <div style="padding-top:32px;display:flex;flex-direction:column;gap:36px">
          <div style="border-left:2px solid var(--accent);padding:4px 0 4px 22px">
            <p style="margin:0;font-family:var(--font-display);font-size:22px;line-height:1.4;color:var(--ink);max-width:60ch;text-wrap:pretty">
              {passed < total ? l.nextIntroFailing : hintsOpen > 0 ? l.nextIntroHinted(hintsOpen) : l.nextIntroClean}
            </p>
          </div>

          <div>
            <div style={`${monoLabelInk};padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)`}>{l.nextHeading}</div>
            {queue.map((q) => (
              <a
                key={q.href}
                href={q.href}
                style="display:grid;grid-template-columns:minmax(0,1fr) 140px 84px;gap:20px;align-items:baseline;padding:16px 0;border-bottom:0.5px solid var(--hairline);transition:background 120ms var(--ease)"
              >
                <span style="min-width:0">
                  <span style="display:block;font-family:var(--font-display);font-size:19px;font-weight:520;line-height:1.24;color:var(--ink)">{q.title}</span>
                  <span style="display:block;font-size:13.5px;line-height:1.55;color:var(--muted);margin-top:5px;text-wrap:pretty">{l.queueWhySamePattern(q.pattern)}</span>
                </span>
                <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted);letter-spacing:0.06em">{q.pattern}</span>
                <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums">{q.targetMinutes} min</span>
              </a>
            ))}
          </div>

          <div style="display:flex;align-items:baseline;gap:14px;padding-top:16px;border-top:0.5px solid var(--rule)">
            <span style="font-size:13.5px;color:var(--muted)">{l.revisit(problem.title, revisitDays)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
