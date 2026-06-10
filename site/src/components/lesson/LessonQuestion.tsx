import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";

const ID_KEY = "awesome.metrics.id";
const MAX_CHARS = 2000;

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

function clientId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

type SendState = "idle" | "busy" | "sent" | "failed";

/** "What was unclear here?" — reader question box at the bottom of every lesson. */
export default function LessonQuestion({ lang, lessonKey }: { lang: Locale; lessonKey: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<SendState>("idle");

  const send = async () => {
    const q = text.trim();
    if (!q || state === "busy") return;
    setState("busy");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: clientId(), lesson: lessonKey, lang, text: q }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
      setText("");
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") {
    return (
      <section data-lesson-question class="my-10 rounded-[var(--r-md)] border-[0.5px] border-hairline-2 bg-card p-5">
        <p class="text-sm text-ok m-0">
          {tt(lang, "✓ Question sent. It will be used to improve this lesson — thank you.", "✓ Вопрос отправлен. Он поможет улучшить этот урок — спасибо.")}
        </p>
      </section>
    );
  }

  return (
    <section data-lesson-question class="my-10 rounded-[var(--r-md)] border-[0.5px] border-hairline-2 bg-card p-5">
      <h2 class="font-display font-[520] text-ink text-lg mb-1">
        {tt(lang, "Something unclear?", "Что-то непонятно?")}
      </h2>
      <p class="text-sm text-muted mb-3">
        {tt(lang,
          "Ask a question about this lesson. Questions are anonymous and go straight to the author to make the lesson better.",
          "Задай вопрос по этому уроку. Вопросы анонимны и попадают напрямую автору — урок станет лучше.")}
      </p>
      <textarea
        class="w-full text-sm p-3 rounded-[var(--r-sm)] border border-hairline-2 bg-card-2 text-ink min-h-[80px]"
        maxLength={MAX_CHARS}
        placeholder={tt(lang, "What confused you here?", "Что здесь запутало?")}
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
      />
      <div class="flex items-center gap-3 mt-2">
        <button type="button" class="oa-btn oa-btn-primary oa-btn-sm disabled:opacity-50"
          disabled={state === "busy" || text.trim().length === 0} onClick={send}>
          {state === "busy" ? tt(lang, "Sending…", "Отправляю…") : tt(lang, "Send question", "Отправить вопрос")}
        </button>
        {state === "failed" && (
          <span class="text-sm text-danger">
            {tt(lang, "Couldn't send — try again later.", "Не удалось отправить — попробуй позже.")}
          </span>
        )}
      </div>
    </section>
  );
}
