import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { loadStore, needsRevisit, saveEntry, type DrillEntry } from "../drill-state";
import { labelsFor } from "./labels";
import { calcMastery } from "./mastery";
import {
  appendAttemptHistory,
  loadAttemptHistory,
  loadSession,
  saveAttemptHistory,
  saveSession,
  withNewAttempt,
} from "./session-store";
import { allPassed, runProblemTests } from "./run-harness";
import { formatClock } from "./format";
import type {
  Attempt, BankRow, DebriefTab, PersistedSession, RailTab, Scheme, Screen, SolveMode, TestRunResult, TraceEvent, WorkspaceProblem,
} from "./types";
import Header from "./Header";
import WorkspaceScreen from "./WorkspaceScreen";
import DebriefScreen, { type QueueCandidate } from "./DebriefScreen";
import MetricsScreen, { type MetricAttempt } from "./MetricsScreen";
import BankScreen, { type BankFilters } from "./BankScreen";
import ExpeditionPass from "./ExpeditionPass";

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

type Props = {
  lang: Locale;
  problem: WorkspaceProblem;
  bankProblems: BankProblem[];
  trackHref: string;
  telegramStarsUrl: string | null;
};

const REVISIT_DAYS = 5; // mirrors ../drill-state.ts's own fixed revisit window
const TICK_MS = 1000;

type SubmissionSnapshot = {
  code: string;
  results: TestRunResult[];
  trace: TraceEvent[];
  elapsedSeconds: number;
  hintsOpen: number;
  mastery: number;
  mode: SolveMode;
  attemptCount: number;
  firstDiagnosis: TraceEvent["label"] | null;
};

type CompletedRun = {
  results: TestRunResult[];
  code: string;
  traceEvent: TraceEvent;
};

function bankRowStatus(entry: DrillEntry | undefined, now: number): BankRow["status"] {
  if (!entry || entry.status === "unattempted") return "unattempted";
  if (entry.status === "attempted") return "attempted";
  return needsRevisit(entry, now) ? "due" : "solved";
}

export default function AlgorithmWorkspace({ lang, problem, bankProblems, trackHref, telegramStarsUrl }: Props) {
  const labels = useMemo(() => labelsFor(lang), [lang]);
  const initialSession = useMemo(() => loadSession(problem.id), [problem.id]);
  const initialCode = initialSession?.code || problem.seedCode;

  const [screen, setScreen] = useState<Screen>("workspace");
  const [mode, setMode] = useState<SolveMode>(initialSession?.mode ?? "timed");
  const [scheme, setScheme] = useState<Scheme>(initialSession?.scheme ?? "ink");
  const [code, setCode] = useState(initialCode);
  const [choice, setChoice] = useState<string | null>(initialSession?.choice ?? null);
  const [committed, setCommitted] = useState<string | null>(initialSession?.committed ?? null);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSession?.elapsedSeconds ?? 0);
  const [sealedAtSeconds, setSealedAtSeconds] = useState(initialSession?.sealedAtSeconds ?? 0);
  const [hintsOpen, setHintsOpen] = useState(initialSession?.hintsOpen ?? 0);
  const [railTab, setRailTab] = useState<RailTab>("hints");
  const [attempts, setAttempts] = useState<Attempt[]>(initialSession?.attempts ?? []);
  const [storageOk, setStorageOk] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningAction, setRunningAction] = useState<"run" | "submit" | null>(null);
  const [testResults, setTestResults] = useState<TestRunResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [firstDiagnosis, setFirstDiagnosis] = useState<TraceEvent["label"] | null>(null);
  const [debriefTab, setDebriefTab] = useState<DebriefTab>("analysis");
  const [metricsView, setMetricsView] = useState<"patterns" | "habits" | "pace">("patterns");
  const [bankFilters, setBankFilters] = useState<BankFilters>({ pattern: "all", difficulty: "all", company: "all", status: "all" });
  const [drillNow, setDrillNow] = useState<number | null>(null);
  const [submission, setSubmission] = useState<SubmissionSnapshot | null>(null);
  const codeRef = useRef(initialCode);
  const codeRevision = useRef(0);
  const runningRef = useRef(false);
  const submittingRef = useRef(false);
  const navigationRevision = useRef(0);

  const mastery = calcMastery(hintsOpen, mode === "interview");
  const currentProblemUnit = useMemo(
    () => bankProblems.find((bankProblem) => bankProblem.id === problem.id)?.unit,
    [bankProblems, problem.id],
  );

  useEffect(() => {
    const saved = loadSession(problem.id);
    if (saved) {
      const savedCode = saved.code || problem.seedCode;
      codeRef.current = savedCode;
      setCode(savedCode);
      setMode(saved.mode);
      setScheme(saved.scheme);
      setAttempts(saved.attempts);
      setChoice(saved.choice ?? null);
      setCommitted(saved.committed ?? null);
      setElapsedSeconds(saved.elapsedSeconds ?? 0);
      setSealedAtSeconds(saved.sealedAtSeconds ?? 0);
      setHintsOpen(saved.hintsOpen ?? 0);
      if (saved.attempts.length > 0 && loadAttemptHistory(problem.id).length === 0) {
        saveAttemptHistory(problem.id, saved.attempts);
      }
    }
    if (!saved) codeRef.current = problem.seedCode;
    codeRevision.current += 1;
    setDrillNow(Date.now());
  }, [problem.id, problem.seedCode]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => {
        if (!committed || submitted || submittingRef.current || screen !== "workspace" || mode === "untimed") return s;
        if (mode === "interview" && s >= 1200) return s;
        return s + 1;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [attempts, choice, committed, hintsOpen, mode, problem.id, scheme, sealedAtSeconds, screen, submitted]);

  useEffect(() => {
    if (!committed || elapsedSeconds === 0) return;
    const ok = saveSession(problem.id, {
      code: codeRef.current,
      mode,
      scheme,
      attempts,
      choice,
      committed,
      elapsedSeconds,
      sealedAtSeconds,
      hintsOpen,
    });
    setStorageOk(ok);
  }, [attempts, choice, committed, elapsedSeconds, hintsOpen, mode, problem.id, scheme, sealedAtSeconds]);

  useEffect(() => {
    if (screen !== "debrief" || !submitted) return;
    document.getElementById("algorithm-debrief-heading")?.focus();
  }, [screen, submitted]);

  function persist(patch: Partial<PersistedSession> = {}) {
    const ok = saveSession(problem.id, {
      code: codeRef.current,
      mode,
      scheme,
      attempts,
      choice,
      committed,
      elapsedSeconds,
      sealedAtSeconds,
      hintsOpen,
      ...patch,
    });
    setStorageOk(ok);
    return ok;
  }

  function pushTrace(kind: TraceEvent["kind"], label: TraceEvent["label"]) {
    setTrace((t) => [...t, { atSeconds: elapsedSeconds, kind, label }]);
  }

  function reset() {
    navigationRevision.current += 1;
    codeRef.current = problem.seedCode;
    setMode("timed"); setCode(problem.seedCode); setCommitted(null); setChoice(null); setHintsOpen(0);
    setAttempts([]); setTestResults(null); setRunError(null); setSealedAtSeconds(0);
    setElapsedSeconds(0); setScreen("workspace"); setSubmitted(false); setRailTab("hints");
    setTrace([]); setFirstDiagnosis(null); setDebriefTab("analysis"); setSubmission(null);
    codeRevision.current += 1;
    const ok = saveSession(problem.id, {
      code: problem.seedCode,
      mode: "timed",
      scheme,
      attempts: [],
      choice: null,
      committed: null,
      elapsedSeconds: 0,
      sealedAtSeconds: 0,
      hintsOpen: 0,
    });
    setStorageOk(ok);
  }

  function seal() {
    if (!choice) return;
    setCommitted(choice);
    setSealedAtSeconds(elapsedSeconds);
    setTrace([{ atSeconds: elapsedSeconds, kind: "accent", label: { en: `Sealed ${choice}`, ru: `Зафиксировано: ${choice}` } }]);
    persist({ committed: choice, choice, sealedAtSeconds: elapsedSeconds });
  }

  function onCodeChange(next: string) {
    codeRef.current = next;
    codeRevision.current += 1;
    setCode(next);
    setTestResults(null);
    setRunError(null);
    if (submitted) setSubmitted(false);
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
    if (runningRef.current || rung !== hintsOpen) return;
    setHintsOpen(rung + 1);
    setRailTab("hints");
    pushTrace("warn", { en: `Opened rung ${rung + 1}`, ru: `Открыта ступень ${rung + 1}` });
    persist({ hintsOpen: rung + 1 });
  }

  async function runTests(traceKind: "run" | "submit" = "run"): Promise<CompletedRun | null> {
    if (runningRef.current) return null;
    const revision = codeRevision.current;
    const codeSnapshot = codeRef.current;
    runningRef.current = true;
    setRunning(true);
    setRunningAction(traceKind);
    setTestResults(null);
    setRunError(null);
    try {
      const outcome = await runProblemTests(problem, codeSnapshot, traceKind === "submit" ? "all" : "visible");
      if (revision !== codeRevision.current) {
        setRunError(labels.workspace.staleRun);
        return null;
      }
      if (!outcome.ok) {
        setRunError(outcome.error);
        pushTrace("danger", { en: `Run failed: ${outcome.error}`, ru: `Ошибка выполнения: ${outcome.error}` });
        return null;
      }
      setTestResults(outcome.results);
      const passedCount = outcome.results.filter((r) => r.pass).length;
      const clean = passedCount === outcome.results.length;
      const label = traceKind === "submit"
        ? { en: `Submitted · ${passedCount}/${outcome.results.length} passed`, ru: `Отправлено · пройдено ${passedCount}/${outcome.results.length}` }
        : { en: `Run · ${passedCount}/${outcome.results.length} passed`, ru: `Запуск · пройдено ${passedCount}/${outcome.results.length}` };
      const traceEvent: TraceEvent = { atSeconds: elapsedSeconds, kind: clean ? "ok" : "danger", label };
      pushTrace(traceEvent.kind, traceEvent.label);
      if (!clean && !firstDiagnosis) {
        const withDiagnosis = outcome.results.find((r) => r.test.visible && !r.pass && r.test.diagnosis);
        if (withDiagnosis?.test.diagnosis) setFirstDiagnosis(withDiagnosis.test.diagnosis);
      }
      return { results: outcome.results, code: codeSnapshot, traceEvent };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setRunError(message);
      pushTrace("danger", { en: `Run failed: ${message}`, ru: `Ошибка выполнения: ${message}` });
      return null;
    } finally {
      runningRef.current = false;
      setRunning(false);
      setRunningAction(null);
    }
  }

  function saveAttempt(results: TestRunResult[] | null = testResults, wasSubmitted = false, codeSnapshot = codeRef.current) {
    const entry: Attempt = {
      atLabel: mode === "untimed" ? "—" : formatClock(elapsedSeconds),
      mode, mastery, code: codeSnapshot, lines: codeSnapshot.split("\n").length, chars: codeSnapshot.length,
      createdAt: Date.now(), elapsedSeconds, hintsOpen, submitted: wasSubmitted,
      testsSummary: results ? { passed: results.filter((r) => r.pass).length, total: results.length } : undefined,
      failures: results?.filter((r) => r.test.visible && !r.pass).map((r) => ({ args: r.test.args, actual: r.actual })),
    };
    const list = withNewAttempt(attempts, entry);
    setAttempts(list);
    if (!wasSubmitted) setRailTab("attempts");
    persist({ attempts: list, code: codeSnapshot });
    if (!appendAttemptHistory(problem.id, entry)) setStorageOk(false);
    return list;
  }

  function restore(a: Attempt) {
    codeRef.current = a.code;
    codeRevision.current += 1;
    setCode(a.code);
    setTestResults(null);
    setRunError(null);
    setSubmitted(false);
    persist({ code: a.code });
  }

  async function submit() {
    if (runningRef.current) return;
    const navigationAtStart = navigationRevision.current;
    submittingRef.current = true;
    try {
      const completed = await runTests("submit");
      if (!completed) return;
      const submittedAttempts = saveAttempt(completed.results, true, completed.code);
      const visibleDiagnosis = completed.results.find((result) => result.test.visible && !result.pass && result.test.diagnosis)?.test.diagnosis ?? firstDiagnosis;
      setSubmission({
        code: completed.code,
        results: completed.results,
        trace: [...trace, completed.traceEvent],
        elapsedSeconds,
        hintsOpen,
        mastery,
        mode,
        attemptCount: submittedAttempts.length,
        firstDiagnosis: visibleDiagnosis ?? null,
      });
      setSubmitted(true);
      if (navigationRevision.current === navigationAtStart) setScreen("debrief");
      const progressOk = allPassed(completed.results)
        ? saveEntry(problem.id, "solved", Date.now(), hintsOpen === 0, currentProblemUnit)
        : saveEntry(problem.id, "attempted", Date.now(), undefined, currentProblemUnit);
      if (!progressOk) setStorageOk(false);
      setDrillNow(Date.now());
    } finally {
      submittingRef.current = false;
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
      status: bankRowStatus(store[p.id], drillNow),
      href: `${trackHref}/${p.unit}/drill`,
      isWorkspaceProblem: p.id === problem.id,
    }));
  }, [bankProblems, drillNow, problem.id, submitted, trackHref]);

  const metricAttempts = useMemo<MetricAttempt[]>(() => {
    if (drillNow === null) return [];
    return bankProblems.flatMap((p) => {
      const history = loadAttemptHistory(p.id);
      return history.map((attempt) => ({
        ...attempt,
        problemId: p.id,
        title: p.title,
        pattern: p.pattern,
        difficulty: p.difficulty,
        targetMinutes: p.targetMinutes,
      }));
    });
  }, [attempts, bankProblems, drillNow]);

  const expeditionCounts = useMemo(() => Object.fromEntries(
    ["two-pointers", "sliding-window", "binary-search", "graphs"].map((pattern) => [
      pattern,
      bankProblems.filter((p) => p.pattern === pattern).length,
    ]),
  ), [bankProblems]);

  function openBankPattern(pattern: string) {
    setBankFilters({ pattern, difficulty: "all", company: "all", status: "all" });
    navigate("bank");
  }

  function focusScreenTab(next: Screen) {
    document.getElementById(`algorithm-nav-${next}`)?.focus();
  }

  function navigate(next: Screen) {
    navigationRevision.current += 1;
    setScreen(next);
    focusScreenTab(next);
  }

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
    <div class="algorithm-workspace-root" style="background:var(--paper);color:var(--ink);min-height:100vh">
      <ExpeditionPass
        lang={lang}
        telegramStarsUrl={telegramStarsUrl}
        routeCounts={expeditionCounts}
        onOpenPattern={openBankPattern}
        onDismiss={() => focusScreenTab(screen)}
      />
      <Header labels={labels} screen={screen} onNavigate={navigate} onReset={reset} />

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
          attempts={attempts} onRestore={restore} onSaveAttempt={() => { saveAttempt(); }}
          storageOk={storageOk}
          running={running} runningAction={runningAction} onRunTests={() => { void runTests(); }}
          testResults={testResults} runError={runError}
          submitted={submitted} onSubmit={() => { void submit(); }}
        />
      )}

      {screen === "debrief" && (!submitted || !committed) && (
        <div style="max-width:760px;margin:0 auto;padding:64px 32px">
          <span style="font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">
            {lang === "ru" ? "разбор ещё не готов" : "debrief not ready"}
          </span>
          <h1 style="font-family:var(--font-display);font-size:42px;font-weight:470;letter-spacing:-.03em;line-height:1.05;margin:16px 0 0">
            {lang === "ru" ? "Сначала заверши и отправь попытку." : "Finish and submit an attempt first."}
          </h1>
          <p style="font-size:15px;line-height:1.65;color:var(--ink-2);max-width:58ch">
            {lang === "ru"
              ? "Разбор строится из твоего зафиксированного прогноза, реальных тестов, подсказок, времени и кода."
              : "The debrief is built from your sealed prediction, real test results, hints, elapsed time, and submitted code."}
          </p>
          <button type="button" onClick={() => navigate("workspace")} style="appearance:none;cursor:pointer;background:var(--ink);border:0;color:var(--paper);padding:9px 14px;font-size:13px">
            {lang === "ru" ? "Вернуться в Workspace" : "Return to Workspace"}
          </button>
        </div>
      )}

      {screen === "debrief" && submitted && committed && submission && (
        <DebriefScreen
          lang={lang} labels={labels} problem={problem}
          committed={committed}
          elapsedLabel={submission.mode === "untimed" ? (lang === "ru" ? "без таймера" : "untimed") : formatClock(submission.elapsedSeconds)}
          mastery={submission.mastery} hintsOpen={submission.hintsOpen}
          testResults={submission.results}
          submittedCode={submission.code}
          trace={submission.trace}
          firstDiagnosis={submission.firstDiagnosis}
          sealedAtLabel={formatClock(sealedAtSeconds)}
          revisitDays={REVISIT_DAYS}
          queue={queue}
          attemptCount={submission.attemptCount}
          mode={submission.mode}
          tab={debriefTab} onTab={setDebriefTab}
        />
      )}

      {screen === "metrics" && (
        <MetricsScreen
          lang={lang} labels={labels} view={metricsView} onView={setMetricsView}
          rows={bankRows} attempts={metricAttempts}
          current={{
            elapsedSeconds, hintsOpen, mastery, submitted, mode,
            passed: testResults?.filter((r) => r.pass).length ?? 0,
            total: testResults?.length ?? 0,
          }}
        />
      )}

      {screen === "bank" && (
        <BankScreen
          labels={labels} rows={bankRows} patterns={patterns} companies={companies}
          filters={bankFilters} onFilters={setBankFilters}
          onOpenWorkspace={(id) => { if (id === problem.id) navigate("workspace"); }}
        />
      )}
    </div>
  );
}
