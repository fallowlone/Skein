import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { recordRetrieval } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";

type Q = {
  id: string;
  q: ComponentChildren;
  answer: ComponentChildren;
  hint?: ComponentChildren;
};

type Props = {
  pieceSlug: string;
  lang: Locale;
  questions: Q[];
};

export default function RetrievalDrawer({ pieceSlug, lang, questions }: Props) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <section class="my-10 rounded-2xl border-2 border-bbg-purple bg-white p-6">
      <h3 class="font-extrabold text-bbg-ink text-lg mb-3">
        {t("retrieval.title", lang)}
      </h3>
      <ol class="space-y-6 list-none p-0">
        {questions.map((q, i) => (
          <li key={q.id}>
            <div class="flex items-start gap-3">
              <span class="font-bold text-bbg-purple">{i + 1}.</span>
              <div class="flex-1">
                <div class="font-semibold text-bbg-ink">{q.q}</div>
                <textarea
                  class="mt-2 w-full border border-gray-300 rounded p-2 text-sm font-mono"
                  rows={2}
                  placeholder={
                    lang === "en" ? "Write from memory…" : "Напишите по памяти…"
                  }
                />
                <button
                  type="button"
                  class="mt-2 text-sm font-semibold text-bbg-purple underline"
                  onClick={() => {
                    setRevealed({ ...revealed, [q.id]: true });
                    recordRetrieval(pieceSlug);
                  }}
                >
                  {t("retrieval.reveal", lang)}
                </button>
                {revealed[q.id] && (
                  <div class="mt-3 prose prose-sm max-w-none">{q.answer}</div>
                )}
              </div>
            </li>
          </li>
        ))}
      </ol>
    </section>
  );
}
