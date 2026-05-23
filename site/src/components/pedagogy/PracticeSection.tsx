import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { PracticeTaskData } from "~/content.config";
import { checkBlank } from "~/scripts/practice-grade";
import { setTaskStatus } from "~/scripts/practice-state";

type Props = { lang: Locale; lessonKey: string; tasks: PracticeTaskData[] };

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export default function PracticeSection({ lang, lessonKey, tasks }: Props) {
  return (
    <section data-practice-layer data-lesson-key={lessonKey} class="my-12">
      <h2 class="font-bold text-ink text-2xl mb-1">{tt(lang, "Practice", "Практика")}</h2>
      <p class="text-sm text-muted mb-6">
        {tt(lang, "Do these to turn recognition into skill.", "Сделай это, чтобы превратить узнавание в навык.")}
      </p>
      <ol class="space-y-4">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskCard lang={lang} lessonKey={lessonKey} task={task} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function TaskCard({ lang, lessonKey, task }: { lang: Locale; lessonKey: string; task: PracticeTaskData }) {
  const [open, setOpen] = useState(false);
  const onOpen = () => {
    setOpen((v) => {
      if (!v) setTaskStatus(lessonKey, task.id, "seen");
      return !v;
    });
  };
  return (
    <div data-practice-task={task.id} class="rounded-2xl border-2 border-rule bg-card p-5">
      <button type="button" onClick={onOpen} class="w-full flex items-center justify-between gap-3 text-left">
        <span class="font-semibold text-ink">{tt(lang, task.title.en, task.title.ru)}</span>
        <span class="flex items-center gap-2 shrink-0">
          <span class="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full border border-rule text-muted">{task.difficulty}</span>
          <span class="text-xs font-mono text-muted">{task.estMin} min</span>
        </span>
      </button>
      {open && (
        <div class="mt-4">
          <div class="prose max-w-none text-sm mb-4" dangerouslySetInnerHTML={{ __html: tt(lang, task.prompt.en, task.prompt.ru) }} />
          <TaskBody lang={lang} lessonKey={lessonKey} task={task} />
        </div>
      )}
    </div>
  );
}

function TaskBody({ lang, lessonKey, task }: { lang: Locale; lessonKey: string; task: PracticeTaskData }) {
  switch (task.type) {
    case "predict":
      return <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.reveal.en, task.reveal.ru)} pre={tt(lang, task.scenario.en, task.scenario.ru)} />;
    case "design":
      return (
        <div>
          <Constraints lang={lang} text={tt(lang, task.constraints.en, task.constraints.ru)} />
          <Rubric lang={lang} items={task.rubric.map((r) => tt(lang, r.en, r.ru))} />
          <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.model.en, task.model.ru)} />
        </div>
      );
    case "incident":
      return <Incident lang={lang} lessonKey={lessonKey} taskId={task.id} steps={task.steps.map((s) => ({ label: tt(lang, s.label.en, s.label.ru), prompt: tt(lang, s.prompt.en, s.prompt.ru), reveal: tt(lang, s.reveal.en, s.reveal.ru) }))} />;
    case "diagnose":
      if (task.grading.mode === "blanks") {
        return <Blanks lang={lang} lessonKey={lessonKey} taskId={task.id}
          evidence={task.evidence ? tt(lang, task.evidence.en, task.evidence.ru) : null}
          blanks={task.grading.blanks.map((b) => ({ id: b.id, accept: b.accept, hint: b.hint ? tt(lang, b.hint.en, b.hint.ru) : null }))} />;
      }
      return (
        <div>
          {task.evidence && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{tt(lang, task.evidence.en, task.evidence.ru)}</pre>}
          <Rubric lang={lang} items={task.grading.rubric.map((r) => tt(lang, r.en, r.ru))} />
          <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.grading.model.en, task.grading.model.ru)} />
        </div>
      );
    case "fix":
      if (task.grading.mode === "self") {
        return (
          <div>
            {task.starter && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{task.starter}</pre>}
            <Rubric lang={lang} items={task.grading.rubric.map((r) => tt(lang, r.en, r.ru))} />
            <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.grading.model.en, task.grading.model.ru)} />
          </div>
        );
      }
      return null; // fix-exec: runtime, filled in P3
    case "sandbox":
      return null; // runtime/parametric: filled in P3
    default:
      return null;
  }
}

function Reveal({ lang, lessonKey, taskId, body, pre }: { lang: Locale; lessonKey: string; taskId: string; body: string; pre?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      {pre && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{pre}</pre>}
      {!shown ? (
        <button type="button" class="px-4 py-1.5 rounded-full border-2 border-ok text-ok text-sm font-semibold"
          onClick={() => { setShown(true); setTaskStatus(lessonKey, taskId, "done"); }}>
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

function Blanks({ lang, lessonKey, taskId, evidence, blanks }: {
  lang: Locale; lessonKey: string; taskId: string; evidence: string | null;
  blanks: { id: string; accept: string[]; hint: string | null }[];
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
    setTaskStatus(lessonKey, taskId, allOk ? "done" : "attempted");
  };
  return (
    <div>
      {evidence && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{evidence}</pre>}
      <ul class="space-y-3">
        {blanks.map((b) => (
          <li key={b.id}>
            <input class="font-mono w-full max-w-md px-3 py-1.5 border border-gray-300 rounded"
              value={values[b.id] ?? ""}
              onInput={(e) => setValues({ ...values, [b.id]: (e.target as HTMLInputElement).value })} />
            {result && (
              <span class={`ml-2 text-sm ${result[b.id] ? "text-ok" : "text-red-600"}`}>
                {result[b.id] ? "✓" : tt(lang, "try again", "ещё раз")}
              </span>
            )}
            {result && !result[b.id] && b.hint && <div class="text-xs text-muted mt-1">{b.hint}</div>}
          </li>
        ))}
      </ul>
      <button type="button" class="mt-3 px-4 py-1.5 rounded-full bg-ink text-white text-sm font-semibold" onClick={submit}>
        {tt(lang, "Check", "Проверить")}
      </button>
    </div>
  );
}

function Incident({ lang, lessonKey, taskId, steps }: {
  lang: Locale; lessonKey: string; taskId: string;
  steps: { label: string; prompt: string; reveal: string }[];
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  return (
    <ol class="space-y-4">
      {steps.map((s, i) => (
        <li key={i} class="border-l-2 border-rule pl-4">
          <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{s.label}</div>
          <div class="prose max-w-none text-sm mb-2" dangerouslySetInnerHTML={{ __html: s.prompt }} />
          {!revealed[i] ? (
            <button type="button" class="text-sm text-ok font-semibold"
              onClick={() => {
                const next = { ...revealed, [i]: true };
                setRevealed(next);
                setTaskStatus(lessonKey, taskId, Object.keys(next).length === steps.length ? "done" : "attempted");
              }}>
              {tt(lang, "Reveal", "Показать")}
            </button>
          ) : (
            <div class="prose max-w-none text-sm bg-card-2 p-3 rounded" dangerouslySetInnerHTML={{ __html: s.reveal }} />
          )}
        </li>
      ))}
    </ol>
  );
}
