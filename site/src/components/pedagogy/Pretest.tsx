import { useState } from "preact/hooks";
import { userState, setPretest, setTier } from "~/scripts/user-state";
import { pretestQuestions, scorePretest, scoreToTier } from "~/scripts/tier-router";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };

export default function Pretest({ lang }: Props) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(userState.value.pretest !== null);

  if (done) return null;

  if (step >= pretestQuestions.length) {
    const score = scorePretest(answers);
    const tier = scoreToTier(score);
    setPretest(score, answers);
    setTier(tier, false);
    setDone(true);
    return (
      <aside class="rounded-2xl border-2 border-bbg-success bg-green-50 px-6 py-4 my-6 max-w-[760px]">
        <div class="font-bold text-bbg-ink">
          {lang === "en" ? `Default tier set to ${tier}.` : `Уровень по умолчанию: ${tier}.`}
        </div>
        <p class="text-sm text-bbg-muted mt-1">
          {lang === "en"
            ? "You can change it any time in Settings or by clicking the tier pills on each piece."
            : "Можно поменять в Настройках или нажав на пилюли уровня на любом фрагменте."}
        </p>
      </aside>
    );
  }

  const q = pretestQuestions[step];

  return (
    <aside class="rounded-2xl border-2 border-bbg-purple bg-panel-lilac px-6 py-5 my-6 max-w-[760px]">
      <div class="text-xs uppercase tracking-widest font-bold text-bbg-purple mb-1">
        {t("pretest.title", lang)} · {step + 1}/{pretestQuestions.length}
      </div>
      <h3 class="text-lg font-extrabold text-bbg-ink mb-3">{q.prompt[lang]}</h3>
      <ul class="space-y-2">
        {q.choices.map((c, i) => (
          <li>
            <button
              type="button"
              onClick={() => {
                const next = [...answers, i];
                setAnswers(next);
                setStep(step + 1);
              }}
              class="text-left w-full px-3 py-2 rounded-lg border border-gray-300 bg-white hover:border-bbg-purple transition"
            >
              {c.label[lang]}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        class="mt-3 text-xs text-bbg-muted underline"
        onClick={() => {
          setPretest(0, [0, 0, 0]);
          setTier("middle", false);
          setDone(true);
        }}
      >
        {t("pretest.skip", lang)}
      </button>
    </aside>
  );
}
