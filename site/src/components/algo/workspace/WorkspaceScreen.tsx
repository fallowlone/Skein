import type { Locale } from "~/i18n";
import type { Attempt, RailTab, Scheme, SolveMode, TestRunResult, WorkspaceProblem } from "./types";
import type { Labels } from "./labels";
import ProblemPanel from "./ProblemPanel";
import RightRail from "./RightRail";
import CodeEditor from "./CodeEditor";
import { monoLabel, monoLabelInk } from "./style-helpers";
import { formatClock } from "./format";

type Props = {
  lang: Locale;
  labels: Labels;
  problem: WorkspaceProblem;

  mode: SolveMode; onModeChange: (m: SolveMode) => void;
  choice: string | null; onChoice: (c: string) => void;
  committed: string | null; onSeal: () => void;

  code: string; onCodeChange: (c: string) => void;
  scheme: Scheme; onScheme: (s: Scheme) => void;

  elapsedSeconds: number; mastery: number; masteryDelta: number;

  railTab: RailTab; onRailTab: (t: RailTab) => void;
  hintsOpen: number; onReveal: (rung: number) => void;
  attempts: Attempt[]; onRestore: (a: Attempt) => void; onSaveAttempt: () => void;
  storageOk: boolean;

  running: boolean; onRunTests: () => void;
  testResults: TestRunResult[] | null;
  submitted: boolean; onSubmit: () => void;
};

const SCHEMES: Scheme[] = ["ink", "paper", "slate"];

export default function WorkspaceScreen(props: Props) {
  const { lang, labels, problem, mode, onModeChange, choice, onChoice, committed, onSeal,
    code, onCodeChange, scheme, onScheme, elapsedSeconds, mastery, masteryDelta,
    railTab, onRailTab, hintsOpen, onReveal, attempts, onRestore, onSaveAttempt, storageOk,
    running, onRunTests, testResults, submitted, onSubmit } = props;
  const l = labels.workspace;

  const shownSeconds = mode === "interview" ? Math.max(0, 1200 - elapsedSeconds) : elapsedSeconds;
  const over = mode === "interview" ? shownSeconds <= 300 : elapsedSeconds > 1200;
  const clockLabel = mode === "untimed" ? l.untimed : mode === "interview" ? l.remaining : l.elapsed;
  const clockSuffix = mode === "untimed" ? l.noClock : mode === "interview" ? l.interviewSim : l.targetSuffix;
  const paceWidth = mode === "untimed" ? "0%" : `${Math.min(100, (elapsedSeconds / 1200) * 100)}%`;

  const passed = testResults?.filter((r) => r.pass).length ?? 0;
  const total = testResults?.length ?? 0;
  const hiddenCount = problem.tests.filter((t) => !t.visible).length;
  const visibleTests = testResults?.filter((r) => r.test.visible) ?? [];

  return (
    <div style="display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr) 300px;align-items:start;min-height:calc(100vh - 56px);min-width:1180px">
      <ProblemPanel lang={lang} labels={labels} problem={problem} />

      <section style="min-width:0;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;gap:20px;padding:0 24px;height:52px;border-bottom:0.5px solid var(--rule)">
          <span style="display:flex;align-items:baseline;gap:8px">
            <span style={monoLabel}>{clockLabel}</span>
            <span style={`font-family:var(--font-mono);font-size:19px;font-variant-numeric:tabular-nums;letter-spacing:-0.02em;color:${over ? "var(--warn)" : "var(--ink)"}`}>
              {mode === "untimed" ? "—" : formatClock(shownSeconds)}
            </span>
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums">{clockSuffix}</span>
          </span>
          <span style="flex:1;height:2px;background:var(--rule);position:relative;max-width:280px">
            <span style={`position:absolute;inset:0 auto 0 0;background:var(--accent);width:${paceWidth}`} />
          </span>
          <span style="flex:1" />
          <span style="display:flex;align-items:baseline;gap:8px">
            <span style={monoLabel}>{l.masteryAtStake}</span>
            <span style={`font-family:var(--font-mono);font-size:19px;font-variant-numeric:tabular-nums;letter-spacing:-0.02em;color:${mastery === 100 ? "var(--ok)" : mastery >= 70 ? "var(--ink)" : "var(--warn)"};transition:color 220ms var(--ease)`}>
              {mastery}
            </span>
          </span>
        </div>

        {!committed && (
          <div style="padding:56px 48px;display:flex;flex-direction:column;gap:0;max-width:780px">
            <span style={monoLabel}>{l.step1}</span>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:16px;border-top:0.5px solid var(--rule-strong);border-bottom:0.5px solid var(--rule)">
              {(["timed", "untimed", "interview"] as SolveMode[]).map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  style={`appearance:none;cursor:pointer;display:flex;flex-direction:column;gap:8px;align-items:flex-start;text-align:left;padding:16px;background:${mode === m ? "var(--accent-ghost)" : "transparent"};border:0;border-right:${i < 2 ? "0.5px solid var(--rule)" : "0"};transition:background 120ms var(--ease)`}
                >
                  <span style="display:flex;align-items:center;gap:9px">
                    <span style={`width:9px;height:9px;border-radius:1px;border:0.5px solid ${mode === m ? "var(--accent)" : "var(--rule-strong)"};background:${mode === m ? "var(--accent)" : "transparent"}`} />
                    <span style="font-size:14px;font-weight:500;color:var(--ink)">{labels.modes[m].label}</span>
                  </span>
                  <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);text-align:left;line-height:1.55">{labels.modes[m].note}</span>
                </button>
              ))}
            </div>

            <span style={`${monoLabel};color:var(--accent);margin-top:40px`}>{l.step2}</span>
            <h2 style="font-family:var(--font-display);font-size:34px;font-weight:480;letter-spacing:-0.028em;line-height:1.08;margin:14px 0 0;text-wrap:pretty">{l.commitTitle}</h2>
            <p style="margin:14px 0 0;font-size:15.5px;line-height:1.66;color:var(--ink-2);max-width:56ch;text-wrap:pretty">{l.commitBody}</p>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:32px;border-top:0.5px solid var(--rule-strong);border-bottom:0.5px solid var(--rule-strong)">
              {labels.complexities.map((c, i) => (
                <button
                  key={c.big}
                  type="button"
                  onClick={() => onChoice(c.big)}
                  style={`appearance:none;cursor:pointer;display:flex;flex-direction:column;gap:8px;align-items:flex-start;text-align:left;padding:20px 16px;background:${choice === c.big ? "var(--accent-ghost)" : "transparent"};border:0;border-right:${i < 3 ? "0.5px solid var(--rule)" : "0"};box-shadow:${choice === c.big ? "inset 0 2px 0 var(--accent)" : "none"};transition:background 120ms var(--ease)`}
                >
                  <span style="font-family:var(--font-mono);font-size:20px;letter-spacing:-0.01em;color:var(--ink)">{c.big}</span>
                  <span style="font-size:12.5px;line-height:1.45;color:var(--muted);text-align:left">{c.note}</span>
                </button>
              ))}
            </div>

            <div style="display:flex;align-items:center;gap:14px;margin-top:24px">
              <button
                type="button"
                disabled={!choice}
                onClick={onSeal}
                style={`appearance:none;cursor:${choice ? "pointer" : "not-allowed"};background:${choice ? "var(--ink)" : "transparent"};border:0.5px solid ${choice ? "var(--ink)" : "var(--rule)"};color:${choice ? "var(--paper)" : "var(--muted)"};font-size:13.5px;font-weight:500;padding:9px 16px;border-radius:1px;transition:opacity 120ms var(--ease)`}
              >
                {l.seal}
              </button>
              <span style="font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.06em;color:var(--muted)">
                {choice ? l.sealHintLocked : l.sealHintPick}
              </span>
            </div>
          </div>
        )}

        {committed && (
          <div style="display:flex;flex-direction:column;min-width:0">
            <div style="display:flex;align-items:center;gap:14px;padding:10px 24px;background:var(--accent-ghost);border-bottom:0.5px solid var(--rule)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="width:14px;height:14px;color:var(--accent)"><rect x="5" y="10.5" width="14" height="9" rx="1" /><path d="M8 10.5V7.2a4 4 0 018 0v3.3" /></svg>
              <span style={monoLabel}>{l.sealedPrediction}</span>
              <span style="font-family:var(--font-mono);font-size:14px;color:var(--ink)">{committed}</span>
              <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted);letter-spacing:0.04em">{l.scoredAgainst}</span>
            </div>

            <div style="display:flex;align-items:stretch;border-bottom:0.5px solid var(--rule);background:var(--card)">
              <span style="display:inline-flex;align-items:center;gap:8px;padding:0 16px;height:38px;border-right:0.5px solid var(--rule);background:var(--paper);font-family:var(--font-mono);font-size:11.5px;color:var(--ink)">
                <span style="width:5px;height:5px;border-radius:1px;background:var(--accent)" />{l.solutionFile}
              </span>
              <span style="display:inline-flex;align-items:center;padding:0 16px;height:38px;border-right:0.5px solid var(--rule);font-family:var(--font-mono);font-size:11.5px;color:var(--muted)">{l.scratchFile}</span>
              <span style="flex:1" />
              <span style={`display:inline-flex;align-items:center;padding:0 12px;${monoLabel}`}>{l.langBadge}</span>
              <span style="display:inline-flex;align-items:center;gap:4px;padding:0 12px 0 0">
                {SCHEMES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    title={labels.schemes[s].title}
                    onClick={() => onScheme(s)}
                    style={`appearance:none;cursor:pointer;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;padding:4px 8px;border-radius:1px;border:0.5px solid ${scheme === s ? "var(--ink)" : "var(--rule)"};background:${scheme === s ? "var(--ink)" : "transparent"};color:${scheme === s ? "var(--paper)" : "var(--muted)"};transition:border-color 120ms var(--ease)`}
                  >
                    {labels.schemes[s].label}
                  </button>
                ))}
              </span>
            </div>

            <CodeEditor
              code={code}
              onChange={onCodeChange}
              scheme={scheme}
              completionsHint={l.completionsHint}
              completionsPrompt={l.completionsPrompt}
            />

            <div style="display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:0.5px solid var(--rule);flex-wrap:wrap">
              <button
                type="button"
                onClick={onRunTests}
                disabled={running}
                style="appearance:none;cursor:pointer;background:transparent;border:0.5px solid var(--rule-strong);color:var(--ink);font-size:13.5px;font-weight:500;padding:9px 16px;border-radius:1px;transition:border-color 120ms var(--ease),background 120ms var(--ease)"
              >
                {l.runTests}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                style="appearance:none;cursor:pointer;background:var(--ink);border:0.5px solid var(--ink);color:var(--paper);font-size:13.5px;font-weight:500;padding:9px 16px;border-radius:1px;transition:opacity 120ms var(--ease)"
              >
                {l.submit}
              </button>
              <button
                type="button"
                onClick={onSaveAttempt}
                style="appearance:none;cursor:pointer;background:transparent;border:0.5px solid var(--rule);color:var(--ink-2);display:inline-flex;align-items:center;gap:7px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;padding:8px 11px;border-radius:1px;transition:border-color 120ms var(--ease),color 120ms var(--ease)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><path d="M5 4h11l3 3v13H5z" /><path d="M8.5 4v5h7" /><path d="M8.5 20v-6h7v6" /></svg>
                {l.saveAttempt}
              </button>
              <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted);letter-spacing:0.04em">
                {running ? "…" : testResults ? `${passed} of ${total} pass` : l.runHintIdle}
              </span>
            </div>

            <div style="padding:20px 24px 40px;min-width:0">
              <div style="display:flex;align-items:baseline;gap:14px;padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)">
                <span style={monoLabelInk}>{l.testsHeading}</span>
                <span style={`font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.06em;color:${testResults && passed < total ? "var(--danger)" : "var(--muted)"}`}>
                  {testResults ? `${passed} / ${total}` : "—"}
                </span>
                <span style="flex:1" />
                <span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.06em;color:var(--muted)">{l.hiddenCasesNote(hiddenCount)}</span>
              </div>

              {(testResults ? visibleTests : problem.tests.filter((t) => t.visible).map((test) => ({ test, pass: false, actual: "", ms: 0 }))).map((r, i) => (
                <div key={i}>
                  <div style="display:grid;grid-template-columns:14px minmax(0,1fr) 64px;gap:12px;align-items:center;padding:11px 0;border-bottom:0.5px solid var(--hairline)">
                    <span style={`width:8px;height:8px;border-radius:1px;background:${testResults ? (r.pass ? "var(--ok)" : "var(--danger)") : "transparent"};border:0.5px solid ${testResults ? (r.pass ? "var(--ok)" : "var(--danger)") : "var(--rule-strong)"}`} />
                    <code style="font-family:var(--font-mono);font-size:12.5px;color:var(--ink-2);min-width:0;overflow-x:auto">{r.test.args}</code>
                    <span style={`font-family:var(--font-mono);font-size:11px;color:${testResults ? (r.pass ? "var(--ok)" : "var(--danger)") : "var(--muted)"};letter-spacing:0.06em;text-transform:uppercase`}>
                      {testResults ? (r.pass ? "pass" : "fail") : "queued"}
                    </span>
                  </div>
                  {testResults && !r.pass && (
                    <div style="margin:0 0 4px 26px;border-left:2px solid var(--danger);padding:10px 14px;background:color-mix(in srgb, var(--danger) 7%, transparent);display:flex;flex-direction:column;gap:6px">
                      <div style="display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;align-items:baseline">
                        <span style={monoLabel}>{l.expected}</span>
                        <code style="font-family:var(--font-mono);font-size:12.5px;color:var(--ink)">{JSON.stringify(r.test.expected)}</code>
                      </div>
                      <div style="display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;align-items:baseline">
                        <span style={`font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--danger)`}>{l.actual}</span>
                        <code style="font-family:var(--font-mono);font-size:12.5px;color:var(--ink)">{r.actual}</code>
                      </div>
                      <p style="margin:2px 0 0;font-size:13px;line-height:1.55;color:var(--ink-2)">
                        {r.test.diagnosis ? r.test.diagnosis[lang] : l.genericDiagnosis(JSON.stringify(r.test.expected), r.actual)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <RightRail
        lang={lang}
        labels={labels}
        problem={problem}
        railTab={railTab}
        onRailTab={onRailTab}
        hintsOpen={hintsOpen}
        onReveal={onReveal}
        mastery={mastery}
        masteryDelta={masteryDelta}
        interviewMode={mode === "interview"}
        attempts={attempts}
        onRestore={onRestore}
        storageOk={storageOk}
        submitted={submitted}
      />
    </div>
  );
}
