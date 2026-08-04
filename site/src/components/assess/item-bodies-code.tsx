// site/src/components/assess/item-bodies-code.tsx
// Per-kind item bodies for the code-execution family: debug, exec. Split from
// item-bodies.tsx (the text/self-grade family) to keep both files near ~200 lines.
import { useState } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import type { Locale } from "~/i18n";
import { t } from "~/i18n";
import type { PracticeTaskData } from "~/content.config";
import type { ExecCheck, ExecResult } from "~/scripts/practice-grade";
import { runDebug, type DebugRunResult } from "~/scripts/debug-runner";
import { gradeExec } from "~/scripts/assess/graders";
import HintLadder from "./HintLadder";
import { tt, KindMismatch, type Submit } from "./item-bodies";

const JsSandbox = lazy(() => import("~/components/pedagogy/JsSandbox"));
const SqlSandbox = lazy(() => import("~/components/pedagogy/SqlSandbox"));

type DebugProps = { lang: Locale; task: PracticeTaskData; hintsUsed: 0 | 1 | 2; onHint: () => void; onSubmit: Submit };

const DIGEST_MAX = 240;

export function DebugBody({ lang, task, hintsUsed, onHint, onSubmit }: DebugProps) {
  if (task.type !== "debug") return <KindMismatch lang={lang} />;
  const [code, setCode] = useState(task.starter);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DebugRunResult | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await runDebug({ setup: task.setup, learnerCode: code, verify: task.verify, check: task.check });
      setResult(r);
      if (r.status === "pass") onSubmit("correct", { answerDigest: code.slice(0, DIGEST_MAX) });
    } finally {
      setBusy(false);
    }
  };

  // Lets the learner lock in a still-failing attempt as their final answer instead
  // of iterating forever — "submit" is one of the three controls every kind must
  // offer. Reuses gradeExec (Task 9) for the failureNote so a fail/error attempt
  // gets the same specific note an exec item would.
  const submitCurrent = () => {
    if (!result || result.status === "pass") return;
    const execResult: ExecResult = result.status === "error" ? { error: result.message } : { stdout: result.stdout };
    const gr = gradeExec(task.check, execResult);
    onSubmit(gr.outcome, { failureNote: gr.failureNote, answerDigest: code.slice(0, DIGEST_MAX) });
  };

  const hints = task.hints.map((h: { en: string; ru: string }) => tt(lang, h.en, h.ru));

  return (
    <div class="assess-body">
      <div class="assess-label">{t("assess.item.evidence", lang)}</div>
      <pre class="assess-evidence">{tt(lang, task.evidence.en, task.evidence.ru)}</pre>
      <textarea
        class="assess-code"
        value={code}
        onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
      />
      <div class="assess-run-bar">
        <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" disabled={busy} onClick={run}>
          {busy ? t("assess.debug.running", lang) : t("assess.debug.run", lang)}
        </button>
        {result?.status === "pass" && <span class="assess-verdict ok">{t("assess.debug.pass", lang)}</span>}
        {result && result.status !== "pass" && <span class="assess-verdict bad">{t("assess.debug.fail", lang)}</span>}
      </div>
      {result && result.status !== "pass" && (
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={submitCurrent}>
          {t("assess.item.submit", lang)}
        </button>
      )}
      <HintLadder lang={lang} hints={hints} hintsUsed={hintsUsed} onHint={onHint} />
    </div>
  );
}

interface ExecContent {
  runtime: "sql" | "js";
  code: string;
  setup?: string;
  check: ExecCheck;
}

/** Normalises the two content shapes that map to kind "exec" (Task 6's kindOf):
 *  a `sandbox` task, or a `fix` task with `grading.mode === "exec"`. Returns null
 *  for a parametric sandbox or any shape with no ExecCheck to grade against. */
function resolveExec(task: PracticeTaskData): ExecContent | null {
  if (task.type === "sandbox" && task.runtime !== "parametric" && task.expected) {
    return { runtime: task.runtime, code: task.initialCode ?? "", setup: task.setup, check: task.expected };
  }
  if (task.type === "fix" && task.grading.mode === "exec") {
    return { runtime: task.grading.runtime, code: task.starter ?? "", setup: task.grading.setup, check: task.grading.check };
  }
  return null;
}

type ExecProps = { lang: Locale; task: PracticeTaskData; onSubmit: Submit };

/** A real gap in the corpus, not a bug here: Task 6's kindOf() maps EVERY
 *  `sandbox` task to kind "exec" regardless of runtime or whether `expected` is
 *  set, but parametric sandboxes (interactive widgets like DBLeverSandbox) carry
 *  no ExecCheck at all — there is nothing to grade deterministically. Rather than
 *  crash or silently skip grading, this falls back to a self-report, the same
 *  outcome vocabulary the commit/reveal kinds use. */
function UngradableExecFallback({ lang, onSubmit }: Omit<ExecProps, "task">) {
  const grade = (g: "hit" | "partial" | "miss") => {
    onSubmit(g === "hit" ? "correct" : g === "partial" ? "partial" : "wrong");
  };
  return (
    <div class="assess-body">
      <p class="assess-mismatch">
        {tt(
          lang,
          "This item can't be auto-graded — rate your own attempt honestly.",
          "Это задание нельзя проверить автоматически — честно оцени свою попытку.",
        )}
      </p>
      <div class="assess-selfgrade">
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade("hit")}>{t("assess.selfgrade.hit", lang)}</button>
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade("partial")}>{t("assess.selfgrade.partial", lang)}</button>
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => grade("miss")}>{t("assess.selfgrade.miss", lang)}</button>
      </div>
    </div>
  );
}

export function ExecBody({ lang, task, onSubmit }: ExecProps) {
  const content = resolveExec(task);
  const [lastResult, setLastResult] = useState<{ ok: boolean; result: ExecResult } | null>(null);

  if (!content) {
    if (task.type !== "sandbox" && !(task.type === "fix" && task.grading.mode === "exec")) return <KindMismatch lang={lang} />;
    return <UngradableExecFallback lang={lang} onSubmit={onSubmit} />;
  }

  const onResult = (ok: boolean, result?: ExecResult) => {
    if (result) setLastResult({ ok, result });
  };

  const submitLast = () => {
    if (!lastResult) return;
    if (lastResult.ok) {
      onSubmit("correct");
      return;
    }
    const gr = gradeExec(content.check, lastResult.result);
    onSubmit(gr.outcome, { failureNote: gr.failureNote });
  };

  return (
    <div class="assess-body">
      <Suspense fallback={<p class="assess-loading">{t("assess.item.loading", lang)}</p>}>
        {content.runtime === "sql" ? (
          <SqlSandbox lang={lang} setup={content.setup} initialSql={content.code} check={content.check} onResult={onResult} />
        ) : (
          <JsSandbox lang={lang} setup={content.setup} initialCode={content.code} check={content.check} onResult={onResult} />
        )}
      </Suspense>
      {lastResult && !lastResult.ok && (
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={submitLast}>
          {t("assess.item.submit", lang)}
        </button>
      )}
    </div>
  );
}
