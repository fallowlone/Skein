// site/src/components/german/OutputModule.tsx
// German output (writing) module. Adapted from components/english/OutputModule.tsx,
// repointed to ~/german/*. With a BYOK key set, responses are graded by
// gradeGermanOutput; with no key, the learner self-assesses against modelAnswer.de
// (+ .ru). The API-key UI is the shared ~/components/english/KeyEntry (one BYOK
// keystore singleton backs both layers). German bands are A1/A2/B1.
import { useMemo, useState } from "preact/hooks";
import { germanOutputTasks } from "~/german/data/output/tasks";
import type { OutputTask, GradingResult, GerBand } from "~/german/types";
import { germanState, getPlacement, getGradingModel, recordOutputAttempt } from "~/german/state";
import { keyStatus } from "~/english/byok";
import { gradeGermanOutput } from "~/german/byok/grade";
import { type Locale } from "~/i18n";
import KeyEntry from "~/components/english/KeyEntry";

type Props = { lang: Locale };
const now = () => Date.now();

function bandsUpTo(band: GerBand): GerBand[] {
  const order: GerBand[] = ["A1", "A2", "B1"];
  return order.slice(0, order.indexOf(band) + 1);
}

export default function OutputModule({ lang }: Props) {
  germanState.value; // subscribe
  const band = getPlacement()?.band ?? "A1";
  const allowed = bandsUpTo(band);
  const tasks = useMemo<OutputTask[]>(() => germanOutputTasks.filter((t) => allowed.includes(t.band)), [band]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [selfAssess, setSelfAssess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const task = openId ? germanOutputTasks.find((t) => t.id === openId) ?? null : null;

  const L = lang === "en" ? {
    write: "Write your response", submit: "Get AI feedback", selfAssessBtn: "Show model answer",
    back: "← All tasks", rubric: "You'll be graded on", corrections: "Corrections", better: "A stronger version",
    band: "Estimated level", notice: "Notice next time", model: "Model answer", grading: "Grading…",
  } : {
    write: "Напиши ответ", submit: "Получить AI-фидбек", selfAssessBtn: "Показать образец",
    back: "← Все задания", rubric: "Оценивается по", corrections: "Исправления", better: "Сильнее версия",
    band: "Оценка уровня", notice: "Обрати внимание", model: "Образец ответа", grading: "Оцениваю…",
  };

  function openTask(id: string) { setOpenId(id); setText(""); setResult(null); setSelfAssess(false); setErr(null); }

  async function submit() {
    if (!task) return;
    setBusy(true); setErr(null);
    try {
      const st = await keyStatus();
      if (st === "device" || st === "unlocked") {
        const r = await gradeGermanOutput(task, text, getGradingModel());
        setResult(r);
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
            <div><div class="meta mb-1">{L.better}</div><p class="text-[14px] text-ink m-0">{result.betterVersion}</p></div>
            {result.noticingHints.length ? (
              <div><div class="meta mb-1">{L.notice}</div>
                <ul class="text-[13px] text-ink">{result.noticingHints.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
            ) : null}
          </div>
        ) : null}

        {selfAssess && task.modelAnswer ? (
          <div class="mt-5">
            <div class="meta mb-1">{L.model}</div>
            <p class="text-[14px] text-ink m-0 whitespace-pre-line">{task.modelAnswer.de}</p>
            <p class="text-[13px] text-muted m-0 mt-2 whitespace-pre-line">{task.modelAnswer.ru}</p>
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
