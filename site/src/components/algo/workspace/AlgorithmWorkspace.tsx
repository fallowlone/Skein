import { useEffect, useMemo, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { loadStore, needsRevisit, saveEntry, type DrillEntry } from "../drill-state";
import { labelsFor } from "./labels";
import { calcMastery } from "./mastery";
import { loadSession, saveSession, withNewAttempt } from "./session-store";
import { allPassed, runProblemTests } from "./run-harness";
import { formatClock } from "./format";
import type {
  Attempt, BankRow, DebriefTab, RailTab, Scheme, Screen, SolveMode, TestRunResult, TraceEvent, WorkspaceProblem,
} from "./types";
import Header from "./Header";
import WorkspaceScreen from "./WorkspaceScreen";
import DebriefScreen, { type QueueCandidate } from "./DebriefScreen";
import MetricsScreen from "./MetricsScreen";
import BankScreen, { type BankFilters } from "./BankScreen";

export type BankProblem = {
  id: string;
  leetcodeId: number;
  title: string;
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  targetMinutes: number;
  companies: string[];
  unit: string;
};

type Props = { lang: Locale; problem: WorkspaceProblem; bankProblems: BankProblem[]; trackHref: string };

const REVISIT_DAYS = 5; // mirrors ../drill-state.ts's own fixed revisit window
const TICK_MS = 1000;

function bankRowStatus(entry: DrillEntry | undefined, now: number): BankRow["status"] {
  if (!entry || entry.status === "unattempted") return "unattempted";
  if (entry.status === "attempted") return "attempted";
  return needsRevisit(entry, now) ? "due" : "solved";
}

export default function AlgorithmWorkspace({ lang, problem, bankProblems, trackHref }: Props) {
  const labels = useMemo(() => labelsFor(lang), [lang]);

  const [screen, setScreen] = useState<Screen>("workspace");
  const [mode, setMode] = useState<SolveMode>("timed");
  const [scheme, setScheme] = useState<Scheme>("ink");
  const [code, setCode] = useState(problem.seedCode);
  const [choice, setChoice] = useState<string | null>(null);
  const [committed, setCommitted] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sealedAtSeconds, setSealedAtSeconds] = useState(0);
  const [hintsOpen, setHintsOpen] = useState(0);
  const [railTab, setRailTab] = useState<RailTab>("hints");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [storageOk, setStorageOk] = useState(true);
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestRunResult[] | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [firstDiagnosis, setFirstDiagnosis] = useState<TraceEvent["label"] | null>(null);
  const [debriefTab, setDebriefTab] = useState<DebriefTab>("analysis");
  const [metricsView, setMetricsView] = useState<"patterns" | "habits" | "pace">("patterns");
  const [bankFilters, setBankFilters] = useState<BankFilters>({ pattern: "all", difficulty: "all", company: "all", status: "all" });
  const [drillNow, setDrillNow] = useState<number | null>(null);

  const mastery = calcMastery(hintsOpen, mode === "interview");

  useEffect(() => {
    const saved = loadSession(problem.id);
    if (saved) {
      setCode(saved.code || problem.seedCode);
      setMode(saved.mode);
      setScheme(saved.scheme);
      setAttempts(saved.attempts);
    }
    setDrillNow(Date.now());
  }, [problem.id, problem.seedCode]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => {
        if (!committed || screen !== "workspace" || mode === "untimed") return s;
        if (mode === "interview" && s >= 1200) return s;
        return s + 1;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [committed, screen, mode]);

  function persist(patch: Partial<{ code: string; mode: SolveMode; scheme: Scheme; attempts: Attempt[] }> = {}) {
    const ok = saveSession(problem.id, { code, mode, scheme, attempts, ...patch });
    setStorageOk(ok);
  }

  function pushTrace(kind: TraceEvent["kind"], label: TraceEvent["label"]) {
    setTrace((t) => [...t, { atSeconds: elapsedSeconds, kind, label }]);
  }

  function reset() {
    setCommitted(null); setChoice(null); setHintsOpen(0); setTestResults(null);
    setElapsedSeconds(0); setScreen("workspace"); setSubmitted(false); setRailTab("hints");
    setTrace([]); setFirstDiagnosis(null); setDebriefTab("analysis");
  }

  function seal() {
    if (!choice) return;
    setCommitted(choice);
    setSealedAtSeconds(elapsedSeconds);
    setTrace([{ atSeconds: elapsedSeconds, kind: "accent", label: { en: `Sealed ${choice}`, ru: `Зафиксировано: ${choice}` } }]);
  }

  function onCodeChange(next: string) {
    setCode(next);
    persist({ code: next });
  }

  function onScheme(next: Scheme) {
    setScheme(next);
    persist({ scheme: next });
  }

  function onModeChange(next: SolveMode) {
    setMode(next);
    persist({ mode: next });
  }

  function onReveal(rung: number) {
    if (rung !== hintsOpen) return;
    setHintsOpen(rung + 1);
    setRailTab("hints");
    pushTrace("warn", { en: `Opened rung ${rung + 1}`, ru: `Открыта ступень ${rung + 1}` });
  }

  async function runTests(traceKind: "run" | "submit" = "run"): Promise<TestRunResult[] | null> {
    setRunning(true);
    const outcome = await runProblemTests(problem, code);
    setRunning(false);
    if (!outcome.ok) {
      pushTrace("danger", { en: `Run failed: ${outcome.error}`, ru: `Ошибка выполнения: ${outcome.error}` });
      return null;
    }
    setTestResults(outcome.results);
    const passedCount = outcome.results.filter((r) => r.pass).length;
    const clean = passedCount === outcome.results.length;
    const label = traceKind === "submit"
      ? { en: `Submitted · ${passedCount}/${outcome.results.length} passed`, ru: `Отправлено · пройдено ${passedCount}/${outcome.results.length}` }
      : { en: `Run · ${passedCount}/${outcome.results.length} passed`, ru: `Запуск · пройдено ${passedCount}/${outcome.results.length}` };
    pushTrace(clean ? "ok" : "danger", label);
    if (!clean && !firstDiagnosis) {
      const withDiagnosis = outcome.results.find((r) => !r.pass && r.test.diagnosis);
      if (withDiagnosis?.test.diagnosis) setFirstDiagnosis(withDiagnosis.test.diagnosis);
    }
    return outcome.results;
  }

  function saveAttempt() {
    const entry: Attempt = {
      atLabel: mode === "untimed" ? "—" : formatClock(elapsedSeconds),
      mode, mastery, code, lines: code.split("\n").length, chars: code.length,
      testsSummary: testResults ? { passed: testResults.filter((r) => r.pass).length, total: testResults.length } : undefined,
    };
    const list = withNewAttempt(attempts, entry);
    setAttempts(list);
    setRailTab("attempts");
    persist({ attempts: list });
  }

  function restore(a: Attempt) {
    setCode(a.code);
    persist({ code: a.code });
  }

  async function submit() {
    const results = await runTests("submit");
    setSubmitted(true);
    setScreen("debrief");
    if (results && allPassed(results)) {
      saveEntry(problem.id, "solved", Date.now(), hintsOpen === 0);
    } else {
      saveEntry(problem.id, "attempted", Date.now());
    }
  }

  const patterns = useMemo(() => ["all", ...new Set(bankProblems.map((p) => p.pattern))], [bankProblems]);
  const companies = useMemo(() => ["all", ...new Set(bankProblems.flatMap((p) => p.companies))], [bankProblems]);

  const bankRows: BankRow[] = useMemo(() => {
    if (drillNow === null) return [];
    const store = loadStore();
    return bankProblems.map((p) => ({
      id: p.id, leetcodeId: p.leetcodeId, title: p.title, pattern: p.pattern,
      difficulty: p.difficulty, targetMinutes: p.targetMinutes, companies: p.companies,
      status: p.id === problem.id && submitted ? "solved" : bankRowStatus(store[p.id], drillNow),
      href: `${trackHref}/${p.unit}/drill`,
      isWorkspaceProblem: p.id === problem.id,
    }));
  }, [bankProblems, drillNow, problem.id, submitted, trackHref]);

  const queue: QueueCandidate[] = useMemo(() => {
    if (drillNow === null) return [];
    const store = loadStore();
    const unsolved = bankProblems.filter((p) => p.id !== problem.id && bankRowStatus(store[p.id], drillNow) !== "solved");
    const samePattern = unsolved.filter((p) => p.pattern === problem.pattern);
    const rest = unsolved.filter((p) => p.pattern !== problem.pattern);
    return [...samePattern, ...rest].slice(0, 2).map((p) => ({
      title: p.title, pattern: p.pattern, targetMinutes: p.targetMinutes,
      href: `${trackHref}/${p.unit}/drill`,
    }));
  }, [bankProblems, drillNow, problem.id, problem.pattern, trackHref]);

  return (
    <div style="background:var(--paper);color:var(--ink);min-height:100vh">
      <Header labels={labels} screen={screen} onNavigate={setScreen} onReset={reset} />

      {screen === "workspace" && (
        <WorkspaceScreen
          lang={lang} labels={labels} problem={problem}
          mode={mode} onModeChange={onModeChange}
          choice={choice} onChoice={setChoice}
          committed={committed} onSeal={seal}
          code={code} onCodeChange={onCodeChange}
          scheme={scheme} onScheme={onScheme}
          elapsedSeconds={elapsedSeconds} mastery={mastery} masteryDelta={100 - mastery}
          railTab={railTab} onRailTab={setRailTab}
          hintsOpen={hintsOpen} onReveal={onReveal}
          attempts={attempts} onRestore={restore} onSaveAttempt={saveAttempt}
          storageOk={storageOk}
          running={running} onRunTests={() => { void runTests(); }}
          testResults={testResults}
          submitted={submitted} onSubmit={() => { void submit(); }}
        />
      )}

      {screen === "debrief" && committed && (
        <DebriefScreen
          lang={lang} labels={labels} problem={problem}
          committed={committed}
          elapsedLabel={formatClock(elapsedSeconds)}
          mastery={mastery} hintsOpen={hintsOpen}
          testResults={testResults ?? []}
          submittedCode={code}
          trace={trace}
          firstDiagnosis={firstDiagnosis}
          sealedAtLabel={formatClock(sealedAtSeconds)}
          revisitDays={REVISIT_DAYS}
          queue={queue}
          tab={debriefTab} onTab={setDebriefTab}
        />
      )}

      {screen === "metrics" && (
        <MetricsScreen lang={lang} labels={labels} view={metricsView} onView={setMetricsView} />
      )}

      {screen === "bank" && (
        <BankScreen
          labels={labels} rows={bankRows} patterns={patterns} companies={companies}
          filters={bankFilters} onFilters={setBankFilters}
          onOpenWorkspace={(id) => { if (id === problem.id) setScreen("workspace"); }}
        />
      )}
    </div>
  );
}
