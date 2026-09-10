import { Button as ShadcnButton } from "~/components/ui/button";
import { Textarea as ShadcnTextarea } from "~/components/ui/textarea";
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { askTutor, MAX_TUTOR_MESSAGES, recentMistakes, type TutorMessage, type TutorMode } from "~/scripts/ai-tutor";
import { readResponses, writeResponse } from "~/scripts/practice-state";
import { recordTutorOutcome } from "~/scripts/user-state";
import { effectiveKnowledge } from "~/scripts/path/path-io";
import { masteryOf } from "~/scripts/path/knowledge";

type Mode = TutorMode;
type Copy = { en: string; ru: string };

const modes: Record<Mode, { label: Copy; prompt: Copy }> = {
  socratic: {
    label: { en: "Socratic tutor", ru: "Сократический наставник" },
    prompt: { en: "One guiding question at a time; no complete solution.", ru: "Один наводящий вопрос за раз, без полного решения." },
  },
  debugging: {
    label: { en: "Debugging coach", ru: "Debugging-коуч" },
    prompt: { en: "Use observations, invariants, and hypotheses before fixes.", ru: "Сначала наблюдения, инварианты и гипотезы, затем исправления." },
  },
  interview: {
    label: { en: "Interview simulation", ru: "Симуляция собеседования" },
    prompt: { en: "Ask progressively harder follow-up questions.", ru: "Задавать всё более сложные уточняющие вопросы." },
  },
  hint: {
    label: { en: "Hint mode", ru: "Режим подсказок" },
    prompt: { en: "Give the smallest useful hint.", ru: "Дать минимальную полезную подсказку." },
  },
  "worked-example": {
    label: { en: "Worked example", ru: "Разобранный пример" },
    prompt: { en: "A complete worked solution is allowed in this explicit mode.", ru: "В этом явном режиме разрешён полный разбор решения." },
  },
};

const RECONSTRUCTION_KEY = "ai-tutor::reconstruction";
const tt = (lang: Locale, copy: Copy) => copy[lang];

export default function AiTutorModes({
  lang,
  lessonKey,
  concepts = [],
}: {
  lang: Locale;
  lessonKey?: string;
  concepts?: string[];
}) {
  const [mode, setMode] = useState<Mode>("socratic");
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<TutorMessage[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reconstructing, setReconstructing] = useState(false);
  const [reconstruction, setReconstruction] = useState(() => lessonKey ? readResponses(lessonKey)[RECONSTRUCTION_KEY] ?? "" : "");
  const [selfReport, setSelfReport] = useState<"independent" | "help" | null>(null);
  const active = modes[mode];
  const hasHelp = conversation.some((message) => message.role === "assistant");

  function chooseMode(next: Mode) {
    setMode(next);
    setDraft("");
    setConversation([]);
    setError("");
    setReconstructing(false);
    setSelfReport(null);
  }

  async function ask() {
    const attempt = draft.trim();
    if (!attempt) return;
    setBusy(true);
    setError("");
    try {
      const knowledge = effectiveKnowledge();
      const mastery = Object.fromEntries(concepts.map((concept) => [concept, masteryOf(knowledge, concept)]));
      const response = await askTutor({
        mode,
        lang,
        lessonKey,
        concepts,
        mastery,
        recentMistakes: lessonKey ? recentMistakes(lessonKey) : [],
        question: attempt,
        conversation,
      });
      if (!response) throw new Error("empty tutor response");
      const next: TutorMessage[] = [...conversation, { role: "user", content: attempt }, { role: "assistant", content: response }];
      setConversation(next.slice(-MAX_TUTOR_MESSAGES));
      setDraft("");
      if (conversation.length === 0) {
        recordTutorOutcome({ lessonKey: lessonKey ?? "unknown", mode, question: attempt, concepts });
      }
    } catch {
      setError(lang === "ru" ? "AI-наставник недоступен. Проверьте API-ключ." : "Tutor unavailable. Check your API key.");
    } finally {
      setBusy(false);
    }
  }

  function updateReconstruction(value: string) {
    setReconstruction(value);
    setSelfReport(null);
    if (lessonKey) writeResponse(lessonKey, RECONSTRUCTION_KEY, value);
  }

  const inputLabel = conversation.length
    ? tt(lang, { en: "Your follow-up attempt", ru: "Ваша следующая попытка" })
    : tt(lang, { en: "Your attempt", ru: "Ваша попытка" });

  return (
    <section class="mt-5 border-t-[0.5px] border-hairline pt-4" aria-label={tt(lang, { en: "AI tutor modes", ru: "Режимы AI-наставника" })}>
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-2">
        {tt(lang, { en: "AI tutor mode", ru: "Режим AI-наставника" })}
      </div>
      <div class="flex flex-wrap gap-2 mb-3">
        {(Object.keys(modes) as Mode[]).map((key) => (
          <ShadcnButton
            type="button"
            class="oa-btn oa-btn-secondary oa-btn-sm"
            aria-pressed={mode === key}
            onClick={() => chooseMode(key)}
          >
            {tt(lang, modes[key].label)}
          </ShadcnButton>
        ))}
      </div>
      <p class="m-0 text-sm text-muted">{tt(lang, active.prompt)}</p>
      <p class="mt-2 mb-0 text-sm text-muted">
        {tt(lang, {
          en: "Write your attempt before asking for help. Saying you do not know is an honest attempt.",
          ru: "Сначала опишите свою попытку. Честный ответ «не знаю» тоже считается попыткой.",
        })}
      </p>

      {!reconstructing && (
        <>
          {conversation.length > 0 && (
            <ol class="mt-3 space-y-2 text-sm" aria-live="polite">
              {conversation.map((message, index) => (
                <li key={index} class={message.role === "assistant" ? "text-ink" : "text-muted"}>
                  <strong>{message.role === "assistant" ? tt(lang, { en: "Tutor", ru: "Наставник" }) : tt(lang, { en: "You", ru: "Вы" })}:</strong> {message.content}
                </li>
              ))}
            </ol>
          )}
          <label class="block mt-3 text-sm text-ink" for="ai-tutor-input">{inputLabel}</label>
          <ShadcnTextarea
            id="ai-tutor-input"
            aria-label={inputLabel}
            class="w-full mt-1 bg-card border-[0.5px] border-hairline rounded px-2 py-2 text-sm"
            value={draft}
            rows={4}
            maxLength={4000}
            onInput={(event) => setDraft((event.target as HTMLTextAreaElement).value)}
          />
          <div class="flex flex-wrap gap-2 mt-2">
            {!conversation.length && (
              <ShadcnButton type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => setDraft(tt(lang, { en: "I don't know yet.", ru: "Я пока не знаю." }))}>
                {tt(lang, { en: "I don't know", ru: "Не знаю" })}
              </ShadcnButton>
            )}
            <ShadcnButton type="button" class="oa-btn oa-btn-primary oa-btn-sm" disabled={busy || !draft.trim()} onClick={() => void ask()}>
              {busy ? "…" : conversation.length ? tt(lang, { en: "Send follow-up", ru: "Отправить следующую попытку" }) : tt(lang, { en: "Ask for help", ru: "Попросить помощь" })}
            </ShadcnButton>
            {hasHelp && (
              <ShadcnButton type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => setReconstructing(true)}>
                {tt(lang, { en: "Reconstruct without help", ru: "Воспроизвести без помощи" })}
              </ShadcnButton>
            )}
          </div>
          {error && <p role="alert" class="mt-3 text-sm text-danger">{error}</p>}
        </>
      )}

      {reconstructing && (
        <div class="mt-4">
          <p class="text-sm text-muted">
            {tt(lang, { en: "Tutor help is hidden. Rebuild the reasoning in your own words.", ru: "Помощь наставника скрыта. Восстановите ход решения своими словами." })}
          </p>
          <label class="block mt-2 text-sm text-ink" for="ai-tutor-reconstruction">
            {tt(lang, { en: "Independent reconstruction", ru: "Самостоятельное воспроизведение" })}
          </label>
          <ShadcnTextarea
            id="ai-tutor-reconstruction"
            aria-label={tt(lang, { en: "Independent reconstruction", ru: "Самостоятельное воспроизведение" })}
            class="w-full mt-1 bg-card border-[0.5px] border-hairline rounded px-2 py-2 text-sm"
            value={reconstruction}
            rows={5}
            onInput={(event) => updateReconstruction((event.target as HTMLTextAreaElement).value)}
          />
          <fieldset class="mt-3" disabled={!reconstruction.trim()}>
            <legend class="text-sm text-muted">{tt(lang, { en: "Honest self-report", ru: "Честная самооценка" })}</legend>
            <div class="flex flex-wrap gap-2 mt-2">
              <ShadcnButton type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => setSelfReport("independent")}>
                {tt(lang, { en: "I reconstructed it independently", ru: "Я воспроизвёл это самостоятельно" })}
              </ShadcnButton>
              <ShadcnButton type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={() => setSelfReport("help")}>
                {tt(lang, { en: "I still need help", ru: "Мне всё ещё нужна помощь" })}
              </ShadcnButton>
            </div>
          </fieldset>
          <p class="mt-3 text-xs text-muted">
            {tt(lang, { en: "This self-report does not change mastery.", ru: "Эта самооценка не изменяет mastery." })}
          </p>
          {selfReport === "help" && (
            <ShadcnButton type="button" class="oa-btn oa-btn-secondary oa-btn-sm mt-2" onClick={() => setReconstructing(false)}>
              {tt(lang, { en: "Return to tutor", ru: "Вернуться к наставнику" })}
            </ShadcnButton>
          )}
          {selfReport === "independent" && (
            <p class="mt-3 text-sm text-muted">
              {tt(lang, { en: "Use this lesson's authored practice or ", ru: "Для отложенной проверки используйте авторскую практику урока или раздел " })}
              <a class="underline" href={`/${lang}/review`}>{tt(lang, { en: "Review", ru: "Повторение" })}</a>
              {tt(lang, { en: " for a delayed check.", ru: "." })}
            </p>
          )}
        </div>
      )}

      <details class="mt-3 text-xs text-muted">
        <summary>{tt(lang, { en: "Tutor context", ru: "Контекст наставника" })}</summary>
        <div class="mt-2">
          <div>{tt(lang, { en: "Lesson", ru: "Урок" })}: {lessonKey ?? "-"}</div>
          <div>{tt(lang, { en: "Concepts", ru: "Концепты" })}: {concepts.length ? concepts.join(", ") : "-"}</div>
          <div>{tt(lang, { en: "Path estimate", ru: "Оценка пути" })}: {concepts.length ? tt(lang, { en: "context only", ru: "только контекст" }) : "-"}</div>
          <div>{tt(lang, { en: "Mode", ru: "Режим" })}: {tt(lang, active.prompt)}</div>
        </div>
      </details>
    </section>
  );
}
