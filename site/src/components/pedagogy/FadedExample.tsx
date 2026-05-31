import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { markFaded } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";

export type Blank = { id: string; expected: string | RegExp; placeholder?: string };

type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  title: string;
  steps: {
    solved: ComponentChildren;
    semi: { prompt: ComponentChildren; blanks: Blank[] };
    blank: { prompt: ComponentChildren; reveal: ComponentChildren };
  };
  misconceptions?: Record<string, ComponentChildren>;
};

function check(expected: string | RegExp, actual: string): boolean {
  const trimmed = actual.trim();
  if (typeof expected === "string") return expected.trim().toLowerCase() === trimmed.toLowerCase();
  return expected.test(trimmed);
}

export default function FadedExample({
  id,
  pieceSlug,
  lang,
  title,
  steps,
  misconceptions,
}: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);

  const submitSemi = () => {
    const fb: Record<string, string> = {};
    let allOk = true;
    steps.semi.blanks.forEach((b) => {
      const v = values[b.id] ?? "";
      if (!check(b.expected, v)) {
        allOk = false;
        const key = `${b.id}:${v.trim()}`;
        fb[b.id] = misconceptions?.[key]
          ? "" // rendered separately below
          : lang === "en"
            ? "Not quite — try again."
            : "Не совсем — ещё раз.";
      }
    });
    setFeedback(fb);
    if (allOk) setStep(2);
  };

  return (
    <section id={id} class="my-8 rounded-[var(--r-lg)] border-[0.5px] border-ok bg-card p-6">
      <header class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-ink">{title}</h3>
        <span class="text-xs font-mono text-muted">{step + 1}/3</span>
      </header>
      {step === 0 && (
        <>
          <div class="prose max-w-none">{steps.solved}</div>
          <button
            type="button"
            class="mt-4 oa-btn oa-btn-primary oa-btn-sm"
            onClick={() => setStep(1)}
          >
            {t("fade.next", lang)}
          </button>
        </>
      )}
      {step === 1 && (
        <>
          <div class="prose max-w-none">{steps.semi.prompt}</div>
          <ul class="mt-4 space-y-3">
            {steps.semi.blanks.map((b) => {
              const v = values[b.id] ?? "";
              const miscKey = `${b.id}:${v.trim()}`;
              return (
                <li key={b.id}>
                  <input
                    class="font-mono w-full max-w-md px-3 py-1.5 bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-sm)] text-ink"
                    placeholder={b.placeholder ?? ""}
                    value={v}
                    onInput={(e) =>
                      setValues({ ...values, [b.id]: (e.target as HTMLInputElement).value })
                    }
                  />
                  {feedback[b.id] && (
                    <div class="text-sm text-danger mt-1">{feedback[b.id]}</div>
                  )}
                  {misconceptions?.[miscKey] && (
                    <div class="text-sm text-danger mt-1">{misconceptions[miscKey]}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="oa-btn oa-btn-primary oa-btn-sm"
              onClick={submitSemi}
            >
              {t("fade.next", lang)}
            </button>
            <button
              type="button"
              class="oa-btn oa-btn-ghost oa-btn-sm"
              onClick={() => setStep(0)}
            >
              {t("fade.prev", lang)}
            </button>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <div class="prose max-w-none">{steps.blank.prompt}</div>
          {!revealed ? (
            <button
              type="button"
              class="mt-4 oa-btn oa-btn-ghost oa-btn-sm"
              onClick={() => {
                setRevealed(true);
                markFaded(pieceSlug, id);
              }}
            >
              {t("fade.reveal", lang)}
            </button>
          ) : (
            <div class="mt-4 prose max-w-none">{steps.blank.reveal}</div>
          )}
        </>
      )}
    </section>
  );
}
