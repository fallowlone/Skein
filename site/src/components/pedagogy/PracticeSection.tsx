import { useEffect, useState } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import type { Locale } from "~/i18n";
import type { PracticeTaskData } from "~/content.config";
import { checkBlank } from "~/scripts/practice-grade";
import { setTaskStatus, readProgress, readAttempts } from "~/scripts/practice-state";
import { recommendNext } from "~/scripts/path/adaptive-difficulty";
import { recordPracticeResult } from "~/scripts/metrics";
import { recordPracticeOutcome } from "~/scripts/path/path-io";
import { runDebug, type DebugRunResult } from "~/scripts/debug-runner";
import type { ExecCheck } from "~/scripts/practice-grade";
import { cardsFromPractice } from "~/scripts/review-harvest";
import { addCard } from "~/scripts/review-state";

const SqlSandbox = lazy(() => import("./SqlSandbox"));
const JsSandbox = lazy(() => import("./JsSandbox"));
// Opt-in LLM critique; lazy so the BYOK keystore loads only when a gradable
// (design / incident / diagnose-self) task is opened.
const GradeWithAi = lazy(() => import("./GradeWithAi"));

// name → lazy parametric component (must match PARAMETRIC_COMPONENT_NAMES)
const PARAMETRIC: Record<string, ReturnType<typeof lazy>> = {
  DBLeverSandbox: lazy(() => import("./sandboxes/DBLeverSandbox")),
  RequestBudgetSandbox: lazy(() => import("./sandboxes/RequestBudgetSandbox")),
};

type Props = { lang: Locale; lessonKey: string; tasks: PracticeTaskData[] };

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

// Mirrors the global masteryThreshold default so the recall/apply/stretch band cutoffs in
// recommendNext line up with the rest of the adaptive engine without importing the path config.
const PRACTICE_THRESHOLD = 0.6;

export const DIFFICULTY_ORDER = ["recall", "apply", "stretch"] as const;
export function difficultyRank(d: string): number {
  const i = (DIFFICULTY_ORDER as readonly string[]).indexOf(d);
  return i === -1 ? DIFFICULTY_ORDER.length : i;
}
export function orderTasks<T extends { difficulty: string }>(tasks: T[]): T[] {
  return tasks
    .map((t, i) => [t, i] as const)
    .sort((a, b) => difficultyRank(a[0].difficulty) - difficultyRank(b[0].difficulty) || a[1] - b[1])
    .map(([t]) => t);
}
const TIER_LABEL: Record<string, { en: string; ru: string }> = {
  recall: { en: "Recall", ru: "Вспомнить" },
  apply: { en: "Apply", ru: "Применить" },
  stretch: { en: "Stretch", ru: "Углубить" },
};
const TYPE_HINT: Record<string, { en: string; ru: string }> = {
  predict: { en: "Commit to a prediction first, then reveal.", ru: "Сначала дай прогноз, потом открой ответ." },
  diagnose: { en: "Name the exact cause — fill the blanks or self-check against the model.", ru: "Назови точную причину — заполни пропуски или сверься с эталоном." },
  fix: { en: "Rewrite the broken code, then run it or grade against the model.", ru: "Перепиши сломанный код, затем запусти или сверься с эталоном." },
  design: { en: "Design under the constraints, then self-grade with the checklist.", ru: "Спроектируй под ограничения, затем оцени себя по чек-листу." },
  incident: { en: "Work it step by step; reveal each step only after you answer.", ru: "Иди по шагам; открывай шаг только после своего ответа." },
  sandbox: { en: "Write code in the runnable sandbox until the check passes.", ru: "Пиши код в песочнице, пока проверка не пройдёт." },
  review: { en: "Review the diff. Spot the bug, the missing test, the unstated tradeoff, the simpler design — then reveal the planted findings.", ru: "Отревьюй дифф. Найди баг, недостающий тест, неназванный компромисс, более простой дизайн — затем открой заложенные находки." },
  debug: { en: "Read the evidence, form a hypothesis, edit the broken code, and re-run until the check passes.", ru: "Прочитай улики, выдвини гипотезу, правь сломанный код и перезапускай, пока проверка не пройдёт." },
};
const SEVERITY_LABEL: Record<string, { en: string; ru: string }> = {
  bug: { en: "Bug", ru: "Баг" },
  "missing-test": { en: "Missing test", ru: "Нет теста" },
  tradeoff: { en: "Unstated tradeoff", ru: "Неназванный компромисс" },
  simplification: { en: "Simpler design", ru: "Проще можно" },
};

export default function PracticeSection({ lang, lessonKey, tasks }: Props) {
  const ordered = orderTasks(tasks);
  // Lazy-seed spaced-repetition cards from this lesson's practice on first visit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    cardsFromPractice(lessonKey, lang, tasks).forEach(addCard);
  }, []);
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  void tick; // tick only forces a re-render; readProgress is re-read each render
  const p = readProgress(lessonKey);
  const done = ordered.filter((t) => p[t.id] === "done").length;
  // Adaptive "do this next" cue. We deliberately avoid importing the path graph / decayed knowledge
  // here (it would bloat every lesson bundle). Instead we use the cheapest, most direct assessment
  // signal — the learner's own attempt record on THIS lesson's tasks (readAttempts, already local) —
  // to derive a difficulty band and recommend the matching open task. With no attempts yet this is
  // byte-identical to "first open task, easiest→hardest" (`ordered` is pre-sorted recall→apply→stretch).
  const rec = recommendNext(ordered, p, readAttempts(lessonKey), PRACTICE_THRESHOLD);
  const recommendedId = rec.taskId ?? undefined;
  return (
    <section data-practice-layer data-lesson-key={lessonKey} class="my-12">
      <h2 class="font-display font-[520] text-ink text-2xl mb-1">{tt(lang, "Practice", "Практика")}</h2>
      <p class="text-sm text-muted mb-3">
        {tt(lang, "Start at the top. Tasks go easiest → hardest: recall a fact, apply it to a case, then a senior-level stretch. Open one, attempt it, then reveal.", "Начни сверху. Задачи идут от простого к сложному: вспомнить факт, применить к случаю, затем senior-уровень. Открой, попробуй, потом открой ответ.")}
      </p>
      <div class="flex items-center gap-3 mb-6 text-xs font-mono text-muted">
        <span class="px-2 py-0.5 rounded-[var(--r-sm)] border-[0.5px] border-hairline-2">{tt(lang, "recall", "вспомнить")}</span>
        <span aria-hidden="true">→</span>
        <span class="px-2 py-0.5 rounded-[var(--r-sm)] border-[0.5px] border-hairline-2">{tt(lang, "apply", "применить")}</span>
        <span aria-hidden="true">→</span>
        <span class="px-2 py-0.5 rounded-[var(--r-sm)] border-[0.5px] border-hairline-2">{tt(lang, "stretch", "углубить")}</span>
        <span class="ml-auto tabular-nums">{done} {tt(lang, "of", "из")} {ordered.length} {tt(lang, "done", "завершено")}</span>
      </div>
      <ol class="space-y-4">
        {ordered.map((task) => (
          <li key={task.id}>
            <TaskCard lang={lang} lessonKey={lessonKey} task={task} recommended={task.id === recommendedId} adaptive={task.id === recommendedId && rec.reason === "performance"} onChange={bump} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function TaskCard({ lang, lessonKey, task, recommended, adaptive, onChange }: { lang: Locale; lessonKey: string; task: PracticeTaskData; recommended?: boolean; adaptive?: boolean; onChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const onOpen = () => {
    setOpen((v) => {
      if (!v) { setTaskStatus(lessonKey, task.id, "seen"); onChange?.(); }
      return !v;
    });
  };
  const hint = TYPE_HINT[task.type];
  return (
    <div data-practice-task={task.id} class="rounded-[var(--r-md)] border-[0.5px] border-hairline-2 bg-card p-5">
      <button type="button" onClick={onOpen} class="w-full flex items-center justify-between gap-3 text-left">
        <span class="flex items-center gap-2 min-w-0">
          <span class="font-medium text-ink">{tt(lang, task.title.en, task.title.ru)}</span>
          {recommended && (
            <span
              class="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-[var(--r-sm)] bg-accent-ghost text-accent shrink-0"
              title={adaptive ? tt(lang, "Matched to your recent practice on this lesson", "Подобрано по твоей недавней практике в этом уроке") : undefined}
              aria-label={adaptive ? tt(lang, "Recommended: matched to your recent practice on this lesson", "Рекомендовано: подобрано по твоей недавней практике в этом уроке") : tt(lang, "Recommended: start here", "Рекомендовано: начни здесь")}
            >
              {adaptive ? tt(lang, "Matched to you", "Под тебя") : tt(lang, "Start here", "Начни здесь")}
            </span>
          )}
        </span>
        <span class="flex items-center gap-2 shrink-0">
          <span class="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-[var(--r-sm)] border-[0.5px] border-hairline-2 text-muted">{tt(lang, (TIER_LABEL[task.difficulty]?.en ?? task.difficulty), (TIER_LABEL[task.difficulty]?.ru ?? task.difficulty))}</span>
          <span class="text-xs font-mono text-muted">{task.estMin} min</span>
        </span>
      </button>
      {open && (
        <div class="mt-4">
          {hint && <p class="text-xs text-muted italic mb-3">{tt(lang, hint.en, hint.ru)}</p>}
          <div class="prose max-w-none text-sm mb-4" dangerouslySetInnerHTML={{ __html: tt(lang, task.prompt.en, task.prompt.ru) }} />
          <TaskBody lang={lang} lessonKey={lessonKey} task={task} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function TaskBody({ lang, lessonKey, task, onChange }: { lang: Locale; lessonKey: string; task: PracticeTaskData; onChange?: () => void }) {
  switch (task.type) {
    case "predict":
      return <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.reveal.en, task.reveal.ru)} pre={tt(lang, task.scenario.en, task.scenario.ru)} onChange={onChange} />;
    case "design":
      return (
        <div>
          <Constraints lang={lang} text={tt(lang, task.constraints.en, task.constraints.ru)} />
          <Rubric lang={lang} items={task.rubric.map((r) => tt(lang, r.en, r.ru))} />
          <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.model.en, task.model.ru)} onChange={onChange} />
          <Suspense fallback={null}><GradeWithAi lang={lang} task={task} /></Suspense>
        </div>
      );
    case "incident":
      return (
        <div>
          <Incident lang={lang} lessonKey={lessonKey} taskId={task.id} steps={task.steps.map((s) => ({ label: tt(lang, s.label.en, s.label.ru), prompt: tt(lang, s.prompt.en, s.prompt.ru), reveal: tt(lang, s.reveal.en, s.reveal.ru) }))} onChange={onChange} />
          <Suspense fallback={null}><GradeWithAi lang={lang} task={task} /></Suspense>
        </div>
      );
    case "diagnose":
      if (task.grading.mode === "blanks") {
        return <Blanks lang={lang} lessonKey={lessonKey} taskId={task.id}
          evidence={task.evidence ? tt(lang, task.evidence.en, task.evidence.ru) : null}
          blanks={task.grading.blanks.map((b) => ({ id: b.id, accept: b.accept, hint: b.hint ? tt(lang, b.hint.en, b.hint.ru) : null }))}
          onChange={onChange} />;
      }
      return (
        <div>
          {task.evidence && <pre class="text-xs bg-card-2 border-[0.5px] border-hairline p-3 rounded-[var(--r-sm)] mb-3 overflow-x-auto">{tt(lang, task.evidence.en, task.evidence.ru)}</pre>}
          <Rubric lang={lang} items={task.grading.rubric.map((r) => tt(lang, r.en, r.ru))} />
          <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.grading.model.en, task.grading.model.ru)} onChange={onChange} />
          <Suspense fallback={null}><GradeWithAi lang={lang} task={task} /></Suspense>
        </div>
      );
    case "fix":
      if (task.grading.mode === "self") {
        return (
          <div>
            {task.starter && <pre class="text-xs bg-card-2 border-[0.5px] border-hairline p-3 rounded-[var(--r-sm)] mb-3 overflow-x-auto">{task.starter}</pre>}
            <Rubric lang={lang} items={task.grading.rubric.map((r) => tt(lang, r.en, r.ru))} />
            <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.grading.model.en, task.grading.model.ru)} onChange={onChange} />
          </div>
        );
      }
      {
        const done = () => { setTaskStatus(lessonKey, task.id, "done"); onChange?.(); };
        const common = { lang, setup: task.grading.setup, check: task.grading.check, onResult: (ok: boolean) => { recordPracticeResult(lessonKey, task.id, "fix", ok); recordPracticeOutcome(lessonKey, task.id, ok); if (ok) done(); } };
        return (
          <div>
            {task.starter && <pre class="text-xs bg-card-2 border-[0.5px] border-hairline p-3 rounded-[var(--r-sm)] mb-3 overflow-x-auto">{task.starter}</pre>}
            <Suspense fallback={<Loading lang={lang} />}>
              {task.grading.runtime === "sql"
                ? <SqlSandbox {...common} initialSql={task.starter ?? ""} />
                : <JsSandbox {...common} initialCode={task.starter ?? ""} />}
            </Suspense>
          </div>
        );
      }
    case "sandbox": {
      const done = () => { setTaskStatus(lessonKey, task.id, "done"); onChange?.(); };
      if (task.runtime === "parametric") {
        const Comp = task.parametric ? PARAMETRIC[task.parametric.component] : undefined;
        if (!Comp) return null;
        // parametric sandboxes own their completion lifecycle; no setTaskStatus/onChange here
        return <Suspense fallback={<Loading lang={lang} />}><Comp lang={lang} /></Suspense>;
      }
      if (task.runtime === "sql") {
        return <Suspense fallback={<Loading lang={lang} />}>
          <SqlSandbox lang={lang} setup={task.setup} initialSql={task.initialCode ?? ""} check={task.expected} onResult={(ok) => { recordPracticeResult(lessonKey, task.id, "sandbox", ok); recordPracticeOutcome(lessonKey, task.id, ok); if (ok) done(); }} />
        </Suspense>;
      }
      return <Suspense fallback={<Loading lang={lang} />}>
        <JsSandbox lang={lang} setup={task.setup} initialCode={task.initialCode ?? ""} check={task.expected} onResult={(ok) => { recordPracticeResult(lessonKey, task.id, "sandbox", ok); recordPracticeOutcome(lessonKey, task.id, ok); if (ok) done(); }} />
      </Suspense>;
    }
    case "review":
      return <ReviewBody lang={lang} lessonKey={lessonKey} taskId={task.id} diff={task.diff} findings={task.findings} decoys={task.decoys} onChange={onChange} />;
    case "debug":
      return <DebugBody lang={lang} lessonKey={lessonKey} taskId={task.id} starter={task.starter} setup={task.setup} verify={task.verify} check={task.check} evidence={task.evidence} hints={task.hints} reveal={task.reveal} onChange={onChange} />;
    default:
      return null;
  }
}

function DebugBody({ lang, lessonKey, taskId, starter, setup, verify, check, evidence, hints, reveal, onChange }: {
  lang: Locale; lessonKey: string; taskId: string;
  starter: string; setup?: string; verify: string; check: ExecCheck;
  evidence: { en: string; ru: string };
  hints: { en: string; ru: string }[];
  reveal: { en: string; ru: string };
  onChange?: () => void;
}) {
  const [code, setCode] = useState(starter);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DebugRunResult | null>(null);
  const [hintIdx, setHintIdx] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await runDebug({ setup, learnerCode: code, verify, check });
      setResult(r);
      recordPracticeResult(lessonKey, taskId, "debug", r.status === "pass");
      recordPracticeOutcome(lessonKey, taskId, r.status === "pass");
      if (r.status === "pass") { setTaskStatus(lessonKey, taskId, "done"); onChange?.(); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "Evidence", "Что наблюдаем")}</div>
      <pre class="text-xs bg-card-2 border-[0.5px] border-hairline p-3 rounded-[var(--r-sm)] mb-3 overflow-x-auto">{tt(lang, evidence.en, evidence.ru)}</pre>
      <textarea
        class="font-mono w-full text-xs p-2 rounded-[var(--r-sm)] border border-hairline-2 bg-[var(--code-bg)] text-[var(--code-ink)] min-h-[120px]"
        value={code}
        onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
      />
      <div class="flex items-center gap-2 mt-2">
        <button type="button" disabled={busy} class="oa-btn oa-btn-primary oa-btn-sm disabled:opacity-50" onClick={run}>
          {busy ? tt(lang, "Running…", "Выполняю…") : tt(lang, "Run", "Запустить")}
        </button>
        {hintIdx < hints.length && (
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm"
            onClick={() => { if (hintIdx === 0) { setTaskStatus(lessonKey, taskId, "attempted"); onChange?.(); } setHintIdx((i) => i + 1); }}>
            {tt(lang, "Hint", "Подсказка")}
          </button>
        )}
        {!showSolution && (
          <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm text-xs text-muted" onClick={() => setShowSolution(true)}>
            {tt(lang, "Show solution", "Показать решение")}
          </button>
        )}
      </div>

      {result?.status === "pass" && <div class="text-sm mt-2 font-semibold text-ok">{tt(lang, "✓ fixed", "✓ починено")}</div>}
      {result?.status === "fail" && (
        <>
          <div class="text-sm mt-2 font-semibold text-danger">{tt(lang, "✗ not yet", "✗ пока нет")}</div>
          {result.stdout && <pre class="text-xs mt-1 bg-card p-2 rounded-[var(--r-sm)] overflow-x-auto">{result.stdout}</pre>}
        </>
      )}
      {result?.status === "error" && <pre class="text-xs text-danger mt-2 whitespace-pre-wrap">{result.message}</pre>}

      {hintIdx > 0 && (
        <ul class="mt-3 space-y-1">
          {hints.slice(0, hintIdx).map((h, i) => <li key={i} class="text-sm text-muted">💡 {tt(lang, h.en, h.ru)}</li>)}
        </ul>
      )}
      {showSolution && <div class="mt-3 prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: tt(lang, reveal.en, reveal.ru) }} />}
    </div>
  );
}

function ReviewBody({ lang, lessonKey, taskId, diff, findings, decoys, onChange }: {
  lang: Locale; lessonKey: string; taskId: string;
  diff: { lang: string; code: string };
  findings: { id: string; label: { en: string; ru: string }; severity: string; explanation: { en: string; ru: string }; planted: true }[];
  decoys?: { id: string; label: { en: string; ru: string }; explanation: { en: string; ru: string } }[];
  onChange?: () => void;
}) {
  const [shown, setShown] = useState(false);
  const dims: { key: string; en: string; ru: string }[] = [
    { key: "bug", en: "a bug", ru: "баг" },
    { key: "missing-test", en: "a missing test", ru: "нет теста" },
    { key: "tradeoff", en: "an unstated tradeoff", ru: "неназванный компромисс" },
    { key: "simplification", en: "a simpler design", ru: "проще можно" },
  ];
  return (
    <div>
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{diff.lang}</div>
      <pre class="text-xs bg-card-2 border-[0.5px] border-hairline p-3 rounded-[var(--r-sm)] mb-4 overflow-x-auto">{diff.code}</pre>
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "What did you find?", "Что ты нашёл?")}</div>
      <ul class="space-y-1 mb-4">
        {dims.map((d) => (
          <li key={d.key} class="flex items-start gap-2 text-sm">
            <input type="checkbox" class="mt-1" /> <span>{tt(lang, d.en, d.ru)}</span>
          </li>
        ))}
      </ul>
      {!shown ? (
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm"
          onClick={() => { setShown(true); setTaskStatus(lessonKey, taskId, "done"); onChange?.(); }}>
          {tt(lang, "Reveal findings", "Показать находки")}
        </button>
      ) : (
        <div class="mt-2 flex flex-col gap-3">
          {findings.map((f) => (
            <div key={f.id} class="border-l-2 border-hairline-strong pl-3">
              <span class={`text-[10px] font-mono uppercase tracking-wide mr-2 ${f.severity === "bug" ? "text-danger" : "text-muted"}`}>
                {tt(lang, SEVERITY_LABEL[f.severity]?.en ?? f.severity, SEVERITY_LABEL[f.severity]?.ru ?? f.severity)}
              </span>
              <span class="text-ink font-medium text-sm">{tt(lang, f.label.en, f.label.ru)}</span>
              <div class="prose max-w-none text-sm text-ink-2 mt-1" dangerouslySetInnerHTML={{ __html: tt(lang, f.explanation.en, f.explanation.ru) }} />
            </div>
          ))}
          {decoys && decoys.length > 0 && (
            <div class="mt-2">
              <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "Not issues — a senior wouldn't block on these", "Не дефекты — senior на этом не блокирует")}</div>
              {decoys.map((d) => (
                <div key={d.id} class="border-l-2 border-hairline pl-3 mb-2">
                  <span class="text-muted font-medium text-sm">{tt(lang, d.label.en, d.label.ru)}</span>
                  <div class="prose max-w-none text-sm text-muted mt-1" dangerouslySetInnerHTML={{ __html: tt(lang, d.explanation.en, d.explanation.ru) }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Reveal({ lang, lessonKey, taskId, body, pre, onChange }: { lang: Locale; lessonKey: string; taskId: string; body: string; pre?: string; onChange?: () => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      {pre && <pre class="text-xs bg-card-2 border-[0.5px] border-hairline p-3 rounded-[var(--r-sm)] mb-3 overflow-x-auto">{pre}</pre>}
      {!shown ? (
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm"
          onClick={() => { setShown(true); setTaskStatus(lessonKey, taskId, "done"); onChange?.(); }}>
          {tt(lang, "Reveal model answer", "Показать ответ")}
        </button>
      ) : (
        <div class="prose max-w-none text-sm mt-2" dangerouslySetInnerHTML={{ __html: body }} />
      )}
    </div>
  );
}

function Constraints({ lang, text }: { lang: Locale; text: string }) {
  return (
    <div class="mb-3">
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "Constraints", "Ограничения")}</div>
      <div class="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

function Rubric({ lang, items }: { lang: Locale; items: string[] }) {
  return (
    <div class="mb-3">
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "Self-grade checklist", "Чек-лист самооценки")}</div>
      <ul class="space-y-1">
        {items.map((it, i) => (
          <li key={i} class="flex items-start gap-2 text-sm">
            <input type="checkbox" class="mt-1" /> <span dangerouslySetInnerHTML={{ __html: it }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Blanks({ lang, lessonKey, taskId, evidence, blanks, onChange }: {
  lang: Locale; lessonKey: string; taskId: string; evidence: string | null;
  blanks: { id: string; accept: string[]; hint: string | null }[];
  onChange?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, boolean> | null>(null);
  const submit = () => {
    const r: Record<string, boolean> = {};
    let allOk = true;
    for (const b of blanks) {
      const ok = checkBlank(b.accept, values[b.id] ?? "");
      r[b.id] = ok;
      if (!ok) allOk = false;
    }
    setResult(r);
    recordPracticeResult(lessonKey, taskId, "diagnose", allOk);
    recordPracticeOutcome(lessonKey, taskId, allOk);
    setTaskStatus(lessonKey, taskId, allOk ? "done" : "attempted");
    onChange?.();
  };
  return (
    <div>
      {evidence && <pre class="text-xs bg-card-2 border-[0.5px] border-hairline p-3 rounded-[var(--r-sm)] mb-3 overflow-x-auto">{evidence}</pre>}
      <ul class="space-y-4">
        {blanks.map((b) => (
          <li key={b.id}>
            {b.hint && <label class="block text-sm text-ink-2 mb-1">{b.hint}</label>}
            <div class="flex items-center">
              <input class="font-mono w-full max-w-md px-3 py-1.5 bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] text-ink"
                placeholder={tt(lang, "one word or number", "одно слово или число")}
                value={values[b.id] ?? ""}
                onInput={(e) => setValues({ ...values, [b.id]: (e.target as HTMLInputElement).value })} />
              {result && (
                <span class={`ml-2 text-sm shrink-0 ${result[b.id] ? "text-ok" : "text-danger"}`}>
                  {result[b.id] ? "✓" : tt(lang, "try again", "ещё раз")}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button type="button" class="oa-btn oa-btn-primary oa-btn-sm mt-3" onClick={submit}>
        {tt(lang, "Check", "Проверить")}
      </button>
    </div>
  );
}

function Incident({ lang, lessonKey, taskId, steps, onChange }: {
  lang: Locale; lessonKey: string; taskId: string;
  steps: { label: string; prompt: string; reveal: string }[];
  onChange?: () => void;
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  return (
    <ol class="space-y-4">
      {steps.map((s, i) => (
        <li key={i} class="border-l-2 border-hairline-strong pl-4">
          <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{s.label}</div>
          <div class="prose max-w-none text-sm mb-2" dangerouslySetInnerHTML={{ __html: s.prompt }} />
          {!revealed[i] ? (
            <button type="button" class="text-sm text-ok font-semibold"
              onClick={() => {
                const next = { ...revealed, [i]: true };
                setRevealed(next);
                setTaskStatus(lessonKey, taskId, Object.keys(next).length === steps.length ? "done" : "attempted");
                onChange?.();
              }}>
              {tt(lang, "Reveal", "Показать")}
            </button>
          ) : (
            <div class="prose max-w-none text-sm bg-card-2 border-[0.5px] border-hairline p-3 rounded-[var(--r-sm)]" dangerouslySetInnerHTML={{ __html: s.reveal }} />
          )}
        </li>
      ))}
    </ol>
  );
}

function Loading({ lang }: { lang: Locale }) {
  return <div class="text-xs text-muted py-3">{tt(lang, "Loading runtime…", "Загружаю среду…")}</div>;
}
