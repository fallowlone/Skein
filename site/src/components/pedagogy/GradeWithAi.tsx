// site/src/components/pedagogy/GradeWithAi.tsx
// Opt-in AI grading for design / incident / diagnose(self) practice tasks.
// BYOK stays free; entitled Coach users can use the server-managed provider.
// Nothing is sent until the learner clicks, and self-grade remains untouched.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { PracticeTaskData } from "~/content.config";
import { keyStatus } from "~/english/byok";
import { getGradingModel } from "~/english/state";
import { gradePractice, MAX_INPUT_CHARS, type PracticeCritique } from "~/scripts/practice-grade-llm";
import { fetchCoachStatus, gradePracticeManaged, type CoachStatus } from "~/lib/coach";

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

function friendlyError(lang: Locale, code: string): string {
  if (code === "coach_quota_exhausted") {
    return tt(lang, "Coach AI limit reached for this month. BYOK and self-grading still work.", "Месячный лимит Coach AI исчерпан. Свой ключ и самооценка продолжают работать.");
  }
  if (code === "managed_ai_unavailable" || code === "ai_grading_failed") {
    return tt(lang, "AI grading is temporarily unavailable. Your answer is still here; BYOK and self-grading still work.", "AI-оценка временно недоступна. Ответ сохранён в форме; свой ключ и самооценка продолжают работать.");
  }
  if (code === "unauthenticated" || code === "coach_required" || code === "terms_required" || code === "coach_status_failed") {
    return tt(lang, "Coach status could not be verified. BYOK and self-grading still work.", "Не удалось проверить статус Coach. Свой ключ и самооценка продолжают работать.");
  }
  return tt(lang, "AI grading failed. Please try again or use BYOK/self-grading.", "AI-оценка не удалась. Попробуйте ещё раз или используйте свой ключ/самооценку.");
}

export default function GradeWithAi({ lang, task }: { lang: Locale; task: PracticeTaskData }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [needKey, setNeedKey] = useState(false);
  const [lockedKey, setLockedKey] = useState(false);
  const [coach, setCoach] = useState<CoachStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<PracticeCritique | null>(null);

  async function openPanel() {
    setOpen(true);
    setErr(null);
    setNeedKey(false);
    setLockedKey(false);
    try {
      const st = await keyStatus();
      if (st === "device" || st === "unlocked") return;
      if (st === "locked") {
        setLockedKey(true);
        return;
      }
      const status = await fetchCoachStatus();
      setCoach(status);
      if (!(status.entitlements.coach && status.managedAi.available && status.managedAi.remaining > 0)) {
        setNeedKey(true);
      }
    } catch (e) {
      setErr(friendlyError(lang, String((e as Error).message)));
    }
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    setNeedKey(false);
    setLockedKey(false);
    try {
      const st = await keyStatus();
      if (st === "device" || st === "unlocked") {
        const r = await gradePractice(task, lang, text, getGradingModel());
        setResult(r);
      } else if (st === "locked") {
        setLockedKey(true);
      } else {
        const status = await fetchCoachStatus();
        setCoach(status);
        if (status.entitlements.coach && status.managedAi.available && status.managedAi.remaining > 0) {
          const managed = await gradePracticeManaged(task, lang, text);
          setResult(managed.critique);
          setCoach({
            ...status,
            managedAi: { ...status.managedAi, used: managed.usage.used, remaining: managed.usage.remaining },
          });
        } else {
          setNeedKey(true);
        }
      }
    } catch (e) {
      setErr(friendlyError(lang, String((e as Error).message)));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        class="oa-btn oa-btn-secondary oa-btn-sm mt-3"
        onClick={() => void openPanel()}
      >
        {tt(lang, "Grade with AI", "Оценить с ИИ")}
      </button>
    );
  }

  return (
    <div class="mt-4 border-t-[0.5px] border-hairline pt-4">
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-2">
        {tt(lang, "AI judgment feedback", "AI-оценка суждения")}
      </div>
      <p class="m-0 mb-3 text-xs text-muted">
        {tt(
          lang,
          "AI grading is optional: use your own Anthropic key for free, or Coach for managed AI. When you submit, this answer plus the current task and rubric/model-answer context go to Anthropic; your broader progress history is not sent.",
          "AI-оценка необязательна: используйте свой Anthropic API-ключ бесплатно или Coach для managed AI. При отправке этот ответ, текущее задание и контекст rubric/model answer передаются Anthropic; остальная история прогресса не отправляется.",
        )}
      </p>
      <textarea
        value={text}
        maxLength={MAX_INPUT_CHARS}
        rows={6}
        aria-label={tt(lang, "Practice answer for AI grading", "Ответ для AI-оценки")}
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
        <div class="text-xs text-muted mt-3" role="status" aria-live="polite">
          {coach?.entitlements.coach && !coach.managedAi.available ? (
            tt(lang, "Coach managed AI is temporarily unavailable. Your own API key and self-grading still work.", "Managed AI в Coach временно недоступен. Свой API-ключ и самооценка продолжают работать.")
          ) : coach?.entitlements.coach && coach.managedAi.remaining <= 0 ? (
            tt(lang, `Coach AI limit reached for this month. It resets ${new Date(coach.managedAi.resetsAt).toLocaleDateString()}. BYOK remains available.`, `Месячный лимит Coach AI исчерпан. Сброс: ${new Date(coach.managedAi.resetsAt).toLocaleDateString()}. Свой ключ остаётся доступен.`)
          ) : coach && !coach.managedAi.available ? (
            tt(lang, "Coach signup is paused while managed AI is unavailable. Your own Anthropic API key and self-grading still work for free.", "Подключение Coach приостановлено, пока managed AI недоступен. Свой Anthropic API-ключ и самооценка продолжают работать бесплатно.")
          ) : !coach?.authenticated ? (
            <>{tt(lang, "Sign in with GitHub to use Coach, or add your own Anthropic key. Self-grading remains free.", "Войдите через GitHub для Coach или добавьте свой Anthropic API-ключ. Самооценка остаётся бесплатной.")} <a class="underline" href={`/${lang}/account`}>{tt(lang, "Account", "Аккаунт")}</a></>
          ) : coach?.billing.configured && coach.billing.sponsorUrl && coach.managedAi.available ? (
            <>{tt(lang, `Coach adds ${coach.managedAi.limit} managed senior reviews per month. All lessons, practice, path, SRS, readiness and BYOK remain free.`, `Coach добавляет ${coach.managedAi.limit} managed senior-разборов в месяц. Все уроки, практика, path, SRS, readiness и BYOK остаются бесплатными.`)} <a class="underline" href={coach.billing.sponsorUrl} target="_blank" rel="noreferrer">{tt(lang, "Unlock Coach with GitHub Sponsors", "Открыть Coach через GitHub Sponsors")}</a>. {tt(lang, "Use the same personal GitHub account and a public recurring sponsorship for automatic unlock.", "Для автоматического доступа используйте тот же личный GitHub-аккаунт и публичную регулярную подписку.")}</>
          ) : (
            tt(lang, "Coach checkout is not configured yet. Add your own Anthropic API key to use AI grading for free.", "Оплата Coach пока не настроена. Добавьте свой Anthropic API-ключ, чтобы бесплатно использовать AI-оценку.")
          )}
        </div>
      )}
      {lockedKey && (
        <div class="text-xs text-muted mt-3" role="status" aria-live="polite">
          {tt(lang, "Your saved Anthropic key is locked on this device. Unlock it in Account to keep using BYOK for free.", "Сохранённый Anthropic API-ключ заблокирован на этом устройстве. Разблокируйте его в Аккаунте, чтобы продолжить бесплатно использовать BYOK.")} <a class="underline" href={`/${lang}/account`}>{tt(lang, "Open Account", "Открыть Аккаунт")}</a>
        </div>
      )}
      {err && <div class="text-xs text-danger mt-3" role="alert">{err}</div>}

      {result && (
        <div class="mt-4 flex flex-col gap-3 text-sm" aria-live="polite">
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
