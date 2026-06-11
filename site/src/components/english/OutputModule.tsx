// site/src/components/english/OutputModule.tsx
import { useMemo, useState } from "preact/hooks";
import { outputTasks } from "~/english/data/output/tasks";
import type { OutputTask, GradingResult, Band } from "~/english/types";
import { englishState, getPlacement, getGradingModel, recordOutputAttempt, addChunk } from "~/english/state";
import { keyStatus } from "~/english/byok";
import { gradeOutput } from "~/english/byok/anthropic";
import { type Locale } from "~/i18n";
import KeyEntry from "./KeyEntry";

type Props = { lang: Locale };
const now = () => Date.now();

function bandsUpTo(band: Band): Band[] {
  const order: Band[] = ["A2", "B1", "B2"];
  return order.slice(0, order.indexOf(band) + 1);
}

export default function OutputModule({ lang }: Props) {
  englishState.value; // subscribe
  const band = getPlacement()?.band ?? "A2";
  const allowed = bandsUpTo(band);
  const tasks = useMemo<OutputTask[]>(() => outputTasks.filter((t) => allowed.includes(t.band)), [band]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [selfAssess, setSelfAssess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedBetter, setSavedBetter] = useState(false); // upgrade-cycle: better version → chunk card

  const task = openId ? outputTasks.find((t) => t.id === openId) ?? null : null;

  const L = lang === "en" ? {
    title: "Output", write: "Write your response", submit: "Get AI feedback", selfAssessBtn: "Show model answer",
    back: "← All tasks", rubric: "You'll be graded on", corrections: "Corrections", better: "A stronger version",
    band: "Estimated level", notice: "Notice next time", model: "Model answer", grading: "Grading…",
    needKey: "Add an API key for AI feedback, or self-assess against the model answer.",
    toSrs: "→ SRS", savedSrs: "saved ✓", myVersion: "my version: ",
  } : {
    title: "Письмо", write: "Напиши ответ", submit: "Получить AI-фидбек", selfAssessBtn: "Показать образец",
    back: "← Все задания", rubric: "Оценивается по", corrections: "Исправления", better: "Сильнее версия",
    band: "Оценка уровня", notice: "Обрати внимание", model: "Образец ответа", grading: "Оцениваю…",
    needKey: "Добавь API-ключ для AI-фидбека или сверься с образцом.",
    toSrs: "→ в карточки", savedSrs: "сохранено ✓", myVersion: "моя версия: ",
  };

  function openTask(id: string) { setOpenId(id); setText(""); setResult(null); setSelfAssess(false); setErr(null); setSavedBetter(false); }

  async function submit() {
    if (!task) return;
    setBusy(true); setErr(null);
    try {
      const st = await keyStatus();
      if (st === "device" || st === "unlocked") {
        const r = await gradeOutput(task, text, getGradingModel());
        setResult(r);
        setSavedBetter(false);
        recordOutputAttempt(task.id, r.scoreBand, now());
      } else {
        setSelfAssess(true);
      }
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  }

  if (task) {
    return (
      <div class="max-w-[620px] mx-auto">
        <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm text-[12px] text-muted mb-4" onClick={() => setOpenId(null)}>{L.back}</button>
        <p class="text-[15px] text-ink mb-1">{task.prompt[lang]}</p>
        <p class="text-[12px] text-muted mb-4">{L.rubric}: {task.rubric.join(" · ")}</p>
        <textarea value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} rows={6}
          class="w-full bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] px-3 py-2 text-[14px] text-ink mb-3 focus:border-accent" placeholder={L.write} />
        <div class="flex gap-2">
          <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" disabled={busy || text.trim().length === 0} onClick={submit}>{busy ? L.grading : L.submit}</button>
          {task.modelAnswer ? <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]" onClick={() => setSelfAssess((v) => !v)}>{L.selfAssessBtn}</button> : null}
        </div>
        {err ? <div class="text-[12px] text-danger mt-3">{err}</div> : null}

        {result ? (
          <div class="mt-5 flex flex-col gap-4">
            <div class="text-[13px] text-muted">{L.band}: <span class="text-ink font-semibold">{result.scoreBand}</span></div>
            {result.corrections.length ? (
              <div><div class="meta mb-2">{L.corrections}</div>
                <ul class="flex flex-col gap-1 m-0 p-0 list-none">
                  {result.corrections.map((c, i) => (
                    <li key={i} class="text-[13px]"><span class="line-through text-muted">{c.before}</span> → <span class="text-ink">{c.after}</span> <span class="text-muted">— {c.why}</span></li>
                  ))}
                </ul></div>
            ) : null}
            {result.betterVersion ? (
              <div>
                <div class="meta mb-1 flex items-center gap-2 flex-wrap">
                  <span>{L.better}</span>
                  <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm text-[11px]" disabled={savedBetter}
                    onClick={() => { addChunk(result.betterVersion, L.myVersion + text.slice(0, 120), now(), "upgrade-cycle"); setSavedBetter(true); }}>
                    {savedBetter ? L.savedSrs : L.toSrs}
                  </button>
                </div>
                <p class="text-[14px] text-ink m-0">{result.betterVersion}</p>
              </div>
            ) : null}
            {result.noticingHints.length ? (
              <div><div class="meta mb-1">{L.notice}</div>
                <ul class="text-[13px] text-ink">{result.noticingHints.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
            ) : null}
          </div>
        ) : null}

        {selfAssess && task.modelAnswer ? (
          <div class="mt-5">
            <div class="meta mb-1">{L.model}</div>
            <p class="text-[14px] text-ink m-0">{task.modelAnswer[lang]}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div class="max-w-[620px] mx-auto">
      <KeyEntry lang={lang} />
      <ul class="flex flex-col gap-2 m-0 p-0 list-none mt-2">
        {tasks.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => openTask(t.id)}
              class="w-full text-left bg-card border border-rule rounded-[2px] px-4 py-3 cursor-pointer hover:border-rule-strong transition-colors">
              <span class="block text-[14px] text-ink font-semibold">{t.prompt[lang]}</span>
              <span class="block text-[12px] text-muted">{t.type} · {t.band}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
