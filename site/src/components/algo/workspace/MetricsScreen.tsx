import type { Locale } from "~/i18n";
import type { Attempt, BankRow, SolveMode } from "./types";
import type { Labels } from "./labels";
import { formatClock } from "./format";
import { monoLabel, monoLabelInk, tabStyle } from "./style-helpers";

export type MetricAttempt = Attempt & {
  problemId: string;
  title: string;
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  targetMinutes: number;
};

type MetricsView = "patterns" | "habits" | "pace";
type CurrentSession = {
  elapsedSeconds: number;
  hintsOpen: number;
  mastery: number;
  submitted: boolean;
  mode: SolveMode;
  passed: number;
  total: number;
};

type Props = {
  lang: Locale;
  labels: Labels;
  view: MetricsView;
  onView: (v: MetricsView) => void;
  rows: BankRow[];
  attempts: MetricAttempt[];
  current: CurrentSession;
};

const VIEWS: MetricsView[] = ["patterns", "habits", "pace"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function isSolved(status: BankRow["status"]): boolean {
  return status === "solved" || status === "due";
}

function resultLabel(lang: Locale, attempt: MetricAttempt): string {
  if (!attempt.testsSummary) return lang === "ru" ? "тесты не запускались" : "not run";
  const { passed, total } = attempt.testsSummary;
  return lang === "ru" ? `${passed}/${total} пройдено` : `${passed}/${total} passed`;
}

export default function MetricsScreen({ lang, labels, view, onView, rows, attempts, current }: Props) {
  const l = labels.metrics;
  const solved = rows.filter((row) => isSolved(row.status)).length;
  const submittedAttempts = attempts.filter((attempt) => attempt.submitted);
  const cleanSubmissions = submittedAttempts.filter((attempt) =>
    attempt.testsSummary && attempt.testsSummary.total > 0 && attempt.testsSummary.passed === attempt.testsSummary.total);
  const timedAttempts = attempts
    .filter((attempt) => attempt.mode !== "untimed" && typeof attempt.elapsedSeconds === "number")
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const totalHints = attempts.reduce((sum, attempt) => sum + (attempt.hintsOpen ?? 0), 0);
  const failureCases = attempts.flatMap((attempt) =>
    (attempt.failures ?? []).map((failure) => ({ ...failure, title: attempt.title })));
  const patternNames = [...new Set(rows.map((row) => row.pattern))].sort();

  return (
    <div style="max-width:1180px;margin:0 auto;padding:40px 32px 64px">
      <span style={monoLabel}>{lang === "ru" ? "данные из текущего браузера" : "measured in this browser"}</span>
      <h1 style="font-family:var(--font-display);font-size:48px;font-weight:470;letter-spacing:-0.034em;line-height:1.02;margin:16px 0 0;max-width:24ch;text-wrap:pretty">
        {lang === "ru"
          ? `${solved} из ${rows.length} задач решено · ${attempts.length} сохранённых попыток.`
          : `${solved} of ${rows.length} problems solved · ${attempts.length} saved attempts.`}
      </h1>

      <div role="tablist" aria-label={lang === "ru" ? "Представление метрик" : "Metrics view"} style="display:flex;gap:2px;margin-top:28px;border-bottom:0.5px solid var(--rule-strong)">
        {VIEWS.map((v) => (
          <button
            key={v}
            id={`metrics-tab-${v}`}
            type="button"
            role="tab"
            aria-selected={view === v}
            aria-controls={`metrics-panel-${v}`}
            tabIndex={view === v ? 0 : -1}
            onClick={() => onView(v)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
              const index = tabs.indexOf(event.currentTarget);
              const nextIndex = event.key === "Home" ? 0
                : event.key === "End" ? tabs.length - 1
                  : event.key === "ArrowRight" ? (index + 1) % tabs.length
                    : (index - 1 + tabs.length) % tabs.length;
              tabs[nextIndex]?.focus();
              tabs[nextIndex]?.click();
            }}
            style={tabStyle(view === v)}
          >{l.views[v]}</button>
        ))}
      </div>

      <div id="metrics-panel-patterns" role="tabpanel" aria-labelledby="metrics-tab-patterns" hidden={view !== "patterns"} style="padding-top:32px">
          <div style="overflow-x:auto;overscroll-behavior-x:contain">
            <div style="min-width:720px">
              <div style="display:grid;grid-template-columns:190px repeat(3,112px) minmax(0,1fr) 96px;gap:0;align-items:end;padding-bottom:8px;border-bottom:0.5px solid var(--rule-strong)">
                <span style={monoLabelInk}>{l.pattern}</span>
                <span style={`${monoLabel};text-align:center`}>{l.easy}</span>
                <span style={`${monoLabel};text-align:center`}>{l.medium}</span>
                <span style={`${monoLabel};text-align:center`}>{l.hard}</span>
                <span />
                <span style={`${monoLabel};text-align:right`}>{l.solved}</span>
              </div>
              {patternNames.map((pattern) => {
                const patternRows = rows.filter((row) => row.pattern === pattern);
                const patternSolved = patternRows.filter((row) => isSolved(row.status)).length;
                const due = patternRows.filter((row) => row.status === "due").length;
                return (
                  <div key={pattern} style="display:grid;grid-template-columns:190px repeat(3,112px) minmax(0,1fr) 96px;gap:0;align-items:center;border-bottom:0.5px solid var(--hairline)">
                    <span style="font-size:13.5px;color:var(--ink);padding-right:12px">{pattern}</span>
                    {DIFFICULTIES.map((difficulty) => {
                      const cells = patternRows.filter((row) => row.difficulty === difficulty);
                      const cellSolved = cells.filter((row) => isSolved(row.status)).length;
                      const pct = cells.length ? Math.round((cellSolved / cells.length) * 100) : 0;
                      return (
                        <span key={difficulty} style={`height:42px;display:grid;place-items:center;border-left:0.5px solid var(--hairline);background:color-mix(in srgb,var(--accent) ${pct}%,transparent)`}>
                          <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--ink);font-variant-numeric:tabular-nums;background:var(--card);border:0.5px solid var(--rule);border-radius:1px;padding:2px 6px">
                            {cells.length ? `${cellSolved}/${cells.length}` : "—"}
                          </span>
                        </span>
                      );
                    })}
                    <span style={`padding-left:16px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:${due ? "var(--warn)" : "var(--muted)"}`}>
                      {due ? (lang === "ru" ? `${due} повторить` : `${due} due`) : ""}
                    </span>
                    <span style="font-family:var(--font-mono);font-size:12px;color:var(--ink-2);text-align:right;font-variant-numeric:tabular-nums">{patternSolved}/{patternRows.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
      </div>

      <div id="metrics-panel-habits" role="tabpanel" aria-labelledby="metrics-tab-habits" hidden={view !== "habits"} style="padding-top:32px">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:0.5px solid var(--rule-strong);border-bottom:0.5px solid var(--rule-strong)">
            {[
              [lang === "ru" ? "отправки" : "submissions", submittedAttempts.length],
              [lang === "ru" ? "чистые отправки" : "clean submissions", cleanSubmissions.length],
              [lang === "ru" ? "подсказки в истории" : "hints in history", totalHints],
              [lang === "ru" ? "текущее mastery" : "current mastery", current.mastery],
            ].map(([label, value], i) => (
              <div key={String(label)} style={`padding:18px 20px;${i < 3 ? "border-right:0.5px solid var(--rule);" : ""}`}>
                <div style="font-family:var(--font-mono);font-size:30px;letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums">{value}</div>
                <div style={`${monoLabel};margin-top:6px`}>{label}</div>
              </div>
            ))}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px">
            <section>
              <div style={`${monoLabelInk};padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)`}>{lang === "ru" ? "Последние попытки" : "Recent attempts"}</div>
              {attempts.length === 0 ? (
                <p style="font-size:14px;line-height:1.6;color:var(--muted)">{lang === "ru" ? "Сохранённых попыток пока нет." : "No saved attempts yet."}</p>
              ) : attempts.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 8).map((attempt) => (
                <div key={`${attempt.problemId}-${attempt.createdAt ?? attempt.atLabel}`} style="padding:11px 0;border-bottom:0.5px solid var(--hairline)">
                  <div style="display:flex;gap:10px;align-items:baseline">
                    <span style="font-size:13.5px;color:var(--ink);flex:1">{attempt.title}</span>
                    <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted)">{resultLabel(lang, attempt)}</span>
                  </div>
                  <div style="margin-top:5px;font-family:var(--font-mono);font-size:9.5px;color:var(--muted)">
                    {attempt.mode} · {attempt.hintsOpen ?? 0} {lang === "ru" ? "подсказок" : "hints"} · mastery {attempt.mastery}
                  </div>
                </div>
              ))}
            </section>

            <section>
              <div style={`${monoLabelInk};padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)`}>{lang === "ru" ? "Реальные проваленные кейсы" : "Real failing cases"}</div>
              {failureCases.length === 0 ? (
                <p style="font-size:14px;line-height:1.6;color:var(--muted)">{lang === "ru" ? "В сохранённой истории нет проваленных тестов." : "No failing tests in saved history."}</p>
              ) : failureCases.slice(0, 8).map((failure, i) => (
                <div key={`${failure.title}-${failure.args}-${i}`} style="padding:11px 0;border-bottom:0.5px solid var(--hairline)">
                  <div style="font-size:13px;color:var(--ink)">{failure.title}</div>
                  <code style="display:block;margin-top:5px;font-family:var(--font-mono);font-size:10.5px;color:var(--muted);overflow-wrap:anywhere">{failure.args}</code>
                  <code style="display:block;margin-top:3px;font-family:var(--font-mono);font-size:10.5px;color:var(--danger);overflow-wrap:anywhere">{failure.actual}</code>
                </div>
              ))}
            </section>
          </div>
      </div>

      <div id="metrics-panel-pace" role="tabpanel" aria-labelledby="metrics-tab-pace" hidden={view !== "pace"} style="padding-top:32px">
          <div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)">
            <span style={monoLabelInk}>{lang === "ru" ? "Время попыток против цели банка" : "Attempt time vs bank target"}</span>
            <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted)">{lang === "ru" ? `${timedAttempts.length} измеренных попыток` : `${timedAttempts.length} measured attempts`}</span>
          </div>
          {timedAttempts.length === 0 ? (
            <p style="font-size:14px;line-height:1.6;color:var(--muted)">{lang === "ru" ? "Сохрани хотя бы одну попытку с таймером — здесь появится реальный темп." : "Save at least one timed attempt to measure pace here."}</p>
          ) : (
            <div style="overflow-x:auto;overscroll-behavior-x:contain">
              <div style="min-width:620px">
              {timedAttempts.slice(0, 12).map((attempt) => {
                const elapsed = attempt.elapsedSeconds ?? 0;
                const target = attempt.targetMinutes * 60;
                const within = elapsed <= target;
                return (
                  <div key={`${attempt.problemId}-${attempt.createdAt ?? attempt.atLabel}`} style="display:grid;grid-template-columns:minmax(0,1fr) 120px 120px 110px;gap:18px;align-items:center;padding:13px 0;border-bottom:0.5px solid var(--hairline)">
                    <span>
                      <span style="display:block;font-size:14px;color:var(--ink)">{attempt.title}</span>
                      <span style="display:block;margin-top:3px;font-family:var(--font-mono);font-size:9.5px;color:var(--muted)">{attempt.pattern}</span>
                    </span>
                    <span style="font-family:var(--font-mono);font-size:12px;color:var(--ink);text-align:right">{formatClock(elapsed)}</span>
                    <span style="font-family:var(--font-mono);font-size:12px;color:var(--muted);text-align:right">{formatClock(target)}</span>
                    <span style={`font-family:var(--font-mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;text-align:right;color:${within ? "var(--ok)" : "var(--warn)"}`}>
                      {within ? (lang === "ru" ? "в цели" : "within target") : (lang === "ru" ? "выше цели" : "over target")}
                    </span>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          <div style="margin-top:28px;padding-top:16px;border-top:0.5px solid var(--rule)">
            <span style={monoLabel}>{lang === "ru" ? "текущая сессия" : "current session"}</span>
            <p style="margin:8px 0 0;font-family:var(--font-mono);font-size:12px;color:var(--ink-2)">
              {current.mode === "untimed" ? (lang === "ru" ? "без таймера" : "untimed") : formatClock(current.elapsedSeconds)} · {current.hintsOpen} {lang === "ru" ? "подсказок" : "hints"} · {current.total ? `${current.passed}/${current.total} tests` : (lang === "ru" ? "тесты ещё не запускались" : "tests not run yet")}
            </p>
          </div>
      </div>
    </div>
  );
}
