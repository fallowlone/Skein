import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { askTutor, recentMistakes, type TutorMode } from "~/scripts/ai-tutor";
import { recordTutorOutcome } from "~/scripts/user-state";
import { effectiveKnowledge } from "~/scripts/path/path-io";
import { masteryOf } from "~/scripts/path/knowledge";

type Mode = TutorMode;

const modes: Record<Mode, { en: string; ru: string; prompt: string }> = {
  socratic: {
    en: "Socratic tutor",
    ru: "Сократический наставник",
    prompt: "Ask the learner one guiding question at a time. Do not reveal the answer immediately.",
  },
  debugging: {
    en: "Debugging coach",
    ru: "Debugging-коуч",
    prompt: "Help isolate the bug by asking for observations, invariants and hypotheses before suggesting fixes.",
  },
  interview: {
    en: "Interview simulation",
    ru: "Симуляция собеседования",
    prompt: "Act as a technical interviewer. Ask increasingly difficult follow-up questions and evaluate reasoning.",
  },
  hint: {
    en: "Hint mode",
    ru: "Режим подсказок",
    prompt: "Give the smallest useful hint. Escalate only when the learner is stuck.",
  },
};

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
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const active = modes[mode];

  async function ask() {
    setBusy(true);
    try {
      const knowledge = effectiveKnowledge();
      const mastery = Object.fromEntries(concepts.map((concept) => [concept, masteryOf(knowledge, concept)]));
      const response = await askTutor({ mode, lessonKey, concepts, mastery, recentMistakes: lessonKey ? recentMistakes(lessonKey) : [], question });
      setAnswer(response);
      if (response) recordTutorOutcome({ lessonKey: lessonKey ?? "unknown", mode, question, concepts });
    } catch {
      setAnswer(lang === "ru" ? "AI-наставник недоступен. Проверь API-ключ." : "Tutor unavailable. Check your API key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section class="mt-5 border-t-[0.5px] border-hairline pt-4" aria-label="AI tutor modes">
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-2">
        {lang === "ru" ? "Режим AI-наставника" : "AI tutor mode"}
      </div>
      <div class="flex flex-wrap gap-2 mb-3">
        {(Object.keys(modes) as Mode[]).map((key) => (
          <button
            type="button"
            class="oa-btn oa-btn-secondary oa-btn-sm"
            aria-pressed={mode === key}
            onClick={() => setMode(key)}
          >
            {lang === "ru" ? modes[key].ru : modes[key].en}
          </button>
        ))}
      </div>
      <p class="m-0 text-sm text-muted">
        {lang === "ru" ? "Инструкция для AI: " : "AI instruction: "}{active.prompt}
      </p>
      <textarea
        class="w-full mt-3 bg-card border-[0.5px] border-hairline rounded px-2 py-2 text-sm"
        value={question}
        onInput={(e) => setQuestion((e.target as HTMLTextAreaElement).value)}
        placeholder={lang === "ru" ? "Задайте вопрос наставнику" : "Ask the tutor"}
      />
      <button type="button" class="oa-btn oa-btn-primary oa-btn-sm mt-2" disabled={busy || !question.trim()} onClick={() => void ask()}>
        {busy ? "…" : lang === "ru" ? "Спросить" : "Ask"}
      </button>
      {answer && <p class="mt-3 text-sm text-ink">{answer}</p>}
      <details class="mt-3 text-xs text-muted">
        <summary>{lang === "ru" ? "Контекст, который будет передан наставнику" : "Tutor context"}</summary>
        <div class="mt-2">
          <div>{lang === "ru" ? "Урок" : "Lesson"}: {lessonKey ?? "-"}</div>
          <div>{lang === "ru" ? "Концепты" : "Concepts"}: {concepts.length ? concepts.join(", ") : "-"}</div>
          <div>{lang === "ru" ? "Mastery" : "Mastery"}: {concepts.length ? "path knowledge" : "-"}</div>
          <div>{lang === "ru" ? "Уровень" : "Mode"}: {active.prompt}</div>
        </div>
      </details>
    </section>
  );
}
