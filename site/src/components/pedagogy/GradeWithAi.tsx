// site/src/components/pedagogy/GradeWithAi.tsx
// Opt-in "Grade with AI (BYOK)" control for design / incident / diagnose(self)
// practice tasks. Reuses the English BYOK keystore + transport; nothing fires
// until the learner clicks. No key → a note pointing to the English page; the
// existing self-grade flow in PracticeSection is untouched.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { PracticeTaskData } from "~/content.config";
import { keyStatus } from "~/english/byok";
import { getGradingModel } from "~/english/state";
import { gradePractice, MAX_INPUT_CHARS, type PracticeCritique } from "~/scripts/practice-grade-llm";

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

const VERDICT_LABEL: Record<PracticeCritique["verdict"], { en: string; ru: string; cls: string }> = {
  correct: { en: "Correct", ru: "Верно", cls: "text-ok" },
  partial: { en: "Partial", ru: "Частично", cls: "text-warn" },
  incorrect: { en: "Incorrect", ru: "Неверно", cls: "text-danger" },
};
const MISSED_LABEL: Record<string, { en: string; ru: string }> = {
  "failure-mode": { en: "Missed failure mode", ru: "Упущенный режим отказа" },
  tradeoff: { en: "Missed tradeoff", ru: "Упущенный компромисс" },
};

export default function GradeWithAi({ lang, task }: { lang: Locale; task: PracticeTaskData }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [needKey, setNeedKey] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<PracticeCritique | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    setNeedKey(false);
    try {
      const st = await keyStatus();
      if (st === "device" || st === "unlocked") {
        const r = await gradePractice(task, lang, text, getGradingModel());
        setResult(r);
      } else {
        setNeedKey(true);
      }
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        class="oa-btn oa-btn-secondary oa-btn-sm mt-3"
        onClick={() => setOpen(true)}
      >
        {tt(lang, "Grade with AI (BYOK)", "Оценить с ИИ (свой ключ)")}
      </button>
    );
  }

  return (
    <div class="mt-4 border-t-[0.5px] border-hairline pt-4">
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-2">
        {tt(lang, "AI judgment feedback", "AI-оценка суждения")}
      </div>
      <textarea
        value={text}
        maxLength={MAX_INPUT_CHARS}
        rows={6}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        placeholder={tt(lang, "Paste your answer — you'll get a senior critique mapped to the rubric.", "Вставь свой ответ — получишь senior-разбор по чек-листу.")}
        class="w-full bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] px-3 py-2 text-sm text-ink mb-2 focus:border-accent"
      />
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="oa-btn oa-btn-primary oa-btn-sm"
          disabled={busy || text.trim().length === 0}
          onClick={submit}
        >
          {busy ? tt(lang, "Grading…", "Оцениваю…") : tt(lang, "Grade my answer", "Оценить ответ")}
        </button>
        <span class="text-xs text-muted tabular-nums">{text.length}/{MAX_INPUT_CHARS}</span>
      </div>

      {needKey && (
        <div class="text-xs text-muted mt-3">
          {tt(
            lang,
            "Add an Anthropic API key on the English page to enable AI grading. Self-grading above still works.",
            "Добавь Anthropic API-ключ на странице English, чтобы включить AI-оценку. Самооценка выше работает и так.",
          )}
        </div>
      )}
      {err && <div class="text-xs text-danger mt-3">{err}</div>}

      {result && (
        <div class="mt-4 flex flex-col gap-3 text-sm">
          <div>
            <span class="text-[10px] font-mono uppercase tracking-wide text-muted mr-2">{tt(lang, "Verdict", "Вердикт")}</span>
            <span class={`font-semibold ${VERDICT_LABEL[result.verdict].cls}`}>
              {tt(lang, VERDICT_LABEL[result.verdict].en, VERDICT_LABEL[result.verdict].ru)}
            </span>
          </div>

          <ul class="space-y-1">
            {result.rubricChecks.map((c, i) => (
              <li key={i} class="flex items-start gap-2">
                <span class={c.met ? "text-ok" : "text-danger"}>{c.met ? "✓" : "✗"}</span>
                <span><span class="text-ink">{c.item}</span> <span class="text-muted">— {c.note}</span></span>
              </li>
            ))}
          </ul>

          {result.seniorAdditions.length > 0 && (
            <div>
              <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "A senior would also catch", "Senior заметил бы ещё")}</div>
              <ul class="space-y-1">
                {result.seniorAdditions.map((s, i) => (
                  <li key={i} class="flex items-start gap-2 text-ink"><span class="text-muted">+</span> <span>{s}</span></li>
                ))}
              </ul>
            </div>
          )}

          {result.missed.kind !== "none" && (
            <div class="text-ink">
              <span class="text-[10px] font-mono uppercase tracking-wide text-danger mr-2">
                {tt(lang, MISSED_LABEL[result.missed.kind]?.en ?? "Missed", MISSED_LABEL[result.missed.kind]?.ru ?? "Упущено")}
              </span>
              {result.missed.what}
            </div>
          )}

          <p class="text-ink m-0">{result.summary}</p>
        </div>
      )}
    </div>
  );
}
