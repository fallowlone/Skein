import { useState } from "preact/hooks";
import { userState, setPretest, setTier } from "~/scripts/user-state";
import { pretestQuestions, scorePretest, scoreToTier } from "~/scripts/tier-router";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };

type Phase = "untaken" | "in-progress" | "done";

const wrapClass =
  "my-8 max-w-[760px] bg-card border border-rule-strong rounded-[2px] overflow-hidden";
const headerClass =
  "flex items-center justify-between px-4 py-2.5 bg-card-2 border-b border-rule";

export default function Pretest({ lang }: Props) {
  const alreadyTaken = userState.value.pretest !== null;
  const [phase, setPhase] = useState<Phase>(alreadyTaken ? "done" : "untaken");
  const [answers, setAnswers] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [resolvedTier, setResolvedTier] = useState<"junior" | "middle" | "senior">(
    () => (alreadyTaken ? userState.value.tier : "middle"),
  );

  const total = pretestQuestions.length;

  if (phase === "untaken") {
    return (
      <aside class={wrapClass}>
        <div class={headerClass}>
          <span class="meta">{t("pretest.title", lang)}</span>
          <span class="badge muted">
            {lang === "en" ? `${total} questions · ~3 min` : `${total} вопросов · ~3 мин`}
          </span>
        </div>
        <div class="px-6 pt-5 pb-6">
          <h3 class="font-display text-[22px] font-bold leading-[1.15] m-0 text-ink">
            {lang === "en" ? "Where should you start?" : "С чего тебе начинать?"}
          </h3>
          <p class="text-[14px] text-ink-2 leading-relaxed mt-2 mb-4">
            {lang === "en"
              ? "A handful of real-world scenarios. We pin your tier and propose a path — no manual picking."
              : "Несколько реальных сценариев. Мы определим уровень и предложим путь — без выбора руками."}
          </p>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="btn"
              onClick={() => setPhase("in-progress")}
            >
              {lang === "en" ? "Begin diagnostic" : "Начать диагностику"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
            <button
              type="button"
              class="btn link text-muted text-[12px]"
              onClick={() => {
                setPretest(0, []);
                setTier("middle", false);
                setResolvedTier("middle");
                setPhase("done");
              }}
            >
              {t("pretest.skip", lang)}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (phase === "in-progress") {
    const q = pretestQuestions[step];
    return (
      <aside class={wrapClass}>
        <div class={headerClass}>
          <span class="meta">
            {t("pretest.title", lang)} · {step + 1}/{total}
          </span>
          <button
            type="button"
            class="btn link text-muted text-[11px]"
            onClick={() => setPhase("untaken")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            {lang === "en" ? "close" : "закрыть"}
          </button>
        </div>
        <div class="h-[2px] bg-rule relative">
          <div
            class="absolute inset-0 bg-ink"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
        <div class="px-6 pt-5 pb-6">
          <div class="font-mono text-[11px] text-muted mb-2">
            Q{step + 1} · pretest
          </div>
          <h3 class="font-display text-[19px] font-semibold leading-[1.25] m-0 text-ink mb-4 tracking-[-0.01em]">
            {q.prompt[lang]}
          </h3>
          <ul class="flex flex-col gap-2">
            {q.choices.map((c, i) => (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...answers, i];
                    if (step + 1 >= total) {
                      const score = scorePretest(next);
                      const tier = scoreToTier(score);
                      setPretest(score, next);
                      setTier(tier, false);
                      setResolvedTier(tier);
                      setPhase("done");
                    } else {
                      setAnswers(next);
                      setStep(step + 1);
                    }
                  }}
                  class="flex items-start gap-3 w-full text-left bg-transparent border border-rule-strong rounded-[1px] px-3 py-2.5 text-[13px] text-ink hover:border-ink hover:bg-card-2 transition-colors"
                >
                  <span class="font-mono text-[11px] text-muted mt-[2px] w-4 shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{c.label[lang]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  // done
  return (
    <aside class={wrapClass}>
      <div class={headerClass}>
        <span class="meta">{lang === "en" ? "pretest · complete" : "pretest · готово"}</span>
        <span class="badge ok">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
          done
        </span>
      </div>
      <div class="px-6 pt-5 pb-6">
        <div class="font-mono text-[11px] text-muted mb-1">
          {lang === "en" ? "your default tier" : "твой уровень"}
        </div>
        <h3 class="font-display text-[26px] font-bold leading-[1.1] tracking-[-0.02em] m-0 text-ink">
          {resolvedTier}<em class="italic font-medium" style="color: var(--p-sky);">.</em>
        </h3>
        <p class="text-[13.5px] text-ink-2 leading-relaxed mt-2.5">
          {lang === "en"
            ? "Applied across every piece. Override on any page via the tier toggle."
            : "Применён ко всем пьесам. На каждой странице можно переключить тиром."}
        </p>
        <div class="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            class="btn ghost text-[12px]"
            onClick={() => {
              setAnswers([]);
              setStep(0);
              setPhase("untaken");
            }}
          >
            {lang === "en" ? "Retake" : "Пройти заново"}
          </button>
        </div>
      </div>
    </aside>
  );
}
