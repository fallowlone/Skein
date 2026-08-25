import type { Locale } from "~/i18n";
import type { Attempt, RailTab, WorkspaceProblem } from "./types";
import type { Labels } from "./labels";
import { HINT_COSTS } from "./mastery";
import { monoLabel, tabStyle } from "./style-helpers";

type Props = {
  lang: Locale;
  labels: Labels;
  problem: WorkspaceProblem;
  railTab: RailTab;
  onRailTab: (t: RailTab) => void;
  hintsOpen: number;
  onReveal: (rung: number) => void;
  mastery: number;
  masteryDelta: number;
  interviewMode: boolean;
  attempts: Attempt[];
  onRestore: (a: Attempt) => void;
  storageOk: boolean;
  submitted: boolean;
};

const TABS: RailTab[] = ["hints", "attempts", "solutions"];
const skeletonWidths = ["96%", "88%", "54%"];

function masteryColor(mastery: number): string {
  if (mastery === 100) return "var(--ok)";
  if (mastery >= 70) return "var(--ink)";
  return "var(--warn)";
}
function markColor(mark: string): string {
  return mark === "canonical" ? "var(--ok)" : "var(--muted)";
}

export default function RightRail(props: Props) {
  const { lang, labels, problem, railTab, onRailTab, hintsOpen, onReveal, mastery, masteryDelta,
    interviewMode, attempts, onRestore, storageOk, submitted } = props;
  const l = labels.rail;
  const factor = interviewMode ? 2 : 1;
  const roles = labels.rungRoles;

  return (
    <aside style="border-left:0.5px solid var(--rule);align-self:stretch;min-height:calc(100vh - 56px)">
      <div style="position:sticky;top:56px;padding:24px 20px;display:flex;flex-direction:column;gap:0">
        <div style="display:flex;gap:2px;border-bottom:0.5px solid var(--rule-strong)">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => onRailTab(t)} style={tabStyle(railTab === t)}>{l[t]}</button>
          ))}
        </div>

        {railTab === "hints" && (
          <div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;padding:14px 0 12px;border-bottom:0.5px solid var(--hairline)">
              <span style={monoLabel}>{interviewMode ? l.ladderNoteInterview : l.ladderNote}</span>
              <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted);font-variant-numeric:tabular-nums">{l.spentOf(hintsOpen)}</span>
            </div>

            <div style="display:flex;align-items:baseline;justify-content:space-between;padding:14px 0;border-bottom:0.5px solid var(--hairline)">
              <span style={monoLabel}>{l.mastery}</span>
              <span style="display:flex;align-items:baseline;gap:8px">
                <span style={`font-family:var(--font-mono);font-size:26px;font-variant-numeric:tabular-nums;letter-spacing:-0.03em;color:${masteryColor(mastery)};transition:color 220ms var(--ease)`}>{mastery}</span>
                {masteryDelta > 0 && <span style="font-family:var(--font-mono);font-size:11px;color:var(--danger)">−{masteryDelta}</span>}
              </span>
            </div>

            {problem.hints.map((hint, i) => {
              const open = i < hintsOpen;
              const next = i === hintsOpen;
              return (
                <div key={i} style={`padding:16px 0;border-bottom:0.5px solid var(--hairline);opacity:${open || next ? "1" : "0.55"}`}>
                  <div style="display:flex;align-items:baseline;gap:10px">
                    <span style={`font-family:var(--font-mono);font-size:10px;color:${open ? "var(--ink)" : "var(--muted)"};font-variant-numeric:tabular-nums`}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={`font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.08em;text-transform:uppercase;color:${open ? "var(--ink)" : "var(--muted)"};flex:1`}>{roles[i] ?? ""}</span>
                    <span style={`font-family:var(--font-mono);font-size:10px;color:${open ? "var(--muted)" : "var(--danger)"}`}>
                      {open ? `spent ${HINT_COSTS[i] * factor}` : `−${HINT_COSTS[i] * factor}`}
                    </span>
                  </div>
                  {open && <p style="margin:10px 0 0;font-size:13.5px;line-height:1.6;color:var(--ink-2);text-wrap:pretty">{hint[lang]}</p>}
                  {!open && (
                    <>
                      <div style="margin-top:10px;display:flex;flex-direction:column;gap:5px" aria-hidden="true">
                        {skeletonWidths.map((w) => <span key={w} style={`height:7px;background:var(--rule);width:${w}`} />)}
                      </div>
                      <button
                        type="button"
                        disabled={!next}
                        onClick={() => onReveal(i)}
                        style={`appearance:none;margin-top:12px;width:100%;cursor:${next ? "pointer" : "not-allowed"};background:transparent;border:0.5px solid ${next ? "var(--rule-strong)" : "var(--rule)"};color:${next ? "var(--ink)" : "var(--muted)"};font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;padding:8px 10px;border-radius:1px;transition:border-color 120ms var(--ease),background 120ms var(--ease)`}
                      >
                        {next ? l.reveal(i + 1) : l.lockedReveal(hintsOpen + 1)}
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            <p style="margin:16px 0 0;font-family:var(--font-mono);font-size:9.5px;line-height:1.7;letter-spacing:0.04em;color:var(--muted);text-transform:uppercase">{l.footnote}</p>
          </div>
        )}

        {railTab === "attempts" && (
          <div style="padding-top:16px">
            {attempts.length === 0 && (
              <p style="margin:0;font-size:13px;line-height:1.6;color:var(--muted);text-wrap:pretty">{l.noAttempts}</p>
            )}
            {attempts.map((a, i) => (
              <div key={i} style="padding:12px 0;border-bottom:0.5px solid var(--hairline);display:flex;flex-direction:column;gap:7px">
                <div style="display:flex;align-items:baseline;gap:8px">
                  <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums">#{String(attempts.length - i).padStart(2, "0")}</span>
                  <span style={`font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:${a.testsSummary && a.testsSummary.passed < a.testsSummary.total ? "var(--danger)" : a.testsSummary ? "var(--ok)" : "var(--muted)"};flex:1`}>
                    {a.testsSummary ? l.testsPassedOf(a.testsSummary.passed, a.testsSummary.total) : l.notRun}
                  </span>
                  <span style="font-family:var(--font-mono);font-size:11px;color:var(--ink);font-variant-numeric:tabular-nums">{a.atLabel}</span>
                </div>
                <div style="display:flex;align-items:baseline;gap:10px">
                  <span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">{a.mode}</span>
                  <span style="font-family:var(--font-mono);font-size:9.5px;color:var(--muted)">·</span>
                  <span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">{l.mastery} {a.mastery}</span>
                  <span style="flex:1" />
                  <button
                    type="button"
                    onClick={() => onRestore(a)}
                    style="appearance:none;cursor:pointer;background:transparent;border:0.5px solid var(--rule);color:var(--ink-2);font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;padding:4px 7px;border-radius:1px;transition:border-color 120ms var(--ease)"
                  >
                    {l.restore}
                  </button>
                </div>
                <div style="font-family:var(--font-mono);font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums">{a.lines} lines · {a.chars} chars</div>
              </div>
            ))}
            <p style="margin:14px 0 0;font-family:var(--font-mono);font-size:9px;letter-spacing:0.06em;line-height:1.7;text-transform:uppercase;color:var(--muted)">
              {storageOk ? l.storageOk : l.storageBad}
            </p>
          </div>
        )}

        {railTab === "solutions" && (
          <div style="padding-top:16px">
            {!submitted && (
              <div style="display:flex;flex-direction:column;gap:12px">
                <div style="display:flex;align-items:center;gap:9px">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="width:15px;height:15px;color:var(--muted)"><rect x="5" y="10.5" width="14" height="9" rx="1" /><path d="M8 10.5V7.2a4 4 0 018 0v3.3" /></svg>
                  <span style={monoLabel}>{l.solutionsLockedTitle}</span>
                </div>
                <p style="margin:0;font-size:13px;line-height:1.6;color:var(--ink-2);text-wrap:pretty">{l.solutionsLockedBody}</p>
                <div style="display:flex;flex-direction:column;gap:5px" aria-hidden="true">
                  {["92%", "74%", "84%", "46%"].map((w) => <span key={w} style={`height:7px;background:var(--rule);width:${w}`} />)}
                </div>
              </div>
            )}
            {submitted && problem.solutions.map((sol, i) => (
              <div key={i} style="padding:14px 0;border-bottom:0.5px solid var(--hairline);display:flex;flex-direction:column;gap:8px">
                <span style="font-family:var(--font-display);font-size:16px;font-weight:520;color:var(--ink);line-height:1.24">{sol.title[lang]}</span>
                <div style="display:flex;gap:6px">
                  <span style="font-family:var(--font-mono);font-size:10px;color:var(--ink-2);border:0.5px solid var(--rule);padding:2px 6px;border-radius:1px">{sol.time}</span>
                  <span style="font-family:var(--font-mono);font-size:10px;color:var(--ink-2);border:0.5px solid var(--rule);padding:2px 6px;border-radius:1px">{sol.space}</span>
                  <span style={`font-family:var(--font-mono);font-size:10px;color:${markColor(sol.mark)};border:0.5px solid var(--rule);padding:2px 6px;border-radius:1px`}>{sol.mark}</span>
                </div>
                <p style="margin:0;font-size:12.5px;line-height:1.6;color:var(--muted);text-wrap:pretty">{sol.note[lang]}</p>
              </div>
            ))}
            {submitted && (
              <p style="margin:14px 0 0;font-family:var(--font-mono);font-size:9px;letter-spacing:0.06em;line-height:1.7;text-transform:uppercase;color:var(--muted)">{l.solutionsOpenNote}</p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
