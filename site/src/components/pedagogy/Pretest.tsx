import { useState, useEffect } from "preact/hooks";
import { userState, setPretestResult, recordActiveDay } from "~/scripts/user-state";
import { pretestQuestions, advancedQuestions, type PretestQuestion } from "~/scripts/pretest-questions";
import { scoreStage, maxScore, qualifiesForStage2, computeRating, confidenceOf } from "~/scripts/progression/rating";
import { ratingToRank } from "~/scripts/progression/ranks";
import RankUpReveal from "~/components/progression/RankUpReveal";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };
type Phase = "untaken" | "stage1" | "gate" | "stage2" | "done";

const wrapClass = "my-8 max-w-[760px] bg-card border border-rule-strong rounded-[2px] overflow-hidden";
const headerClass = "flex items-center justify-between px-4 py-2.5 bg-card-2 border-b border-rule";

export default function Pretest({ lang }: Props) {
  const existing = userState.value.pretest;
  const [phase, setPhase] = useState<Phase>(existing ? "done" : "untaken");
  const [stage, setStage] = useState<1 | 2>(1);
  const [step, setStep] = useState(0);
  const [a1, setA1] = useState<number[]>([]);
  const [a2, setA2] = useState<number[]>([]);

  const bank: PretestQuestion[] = stage === 1 ? pretestQuestions : advancedQuestions;

  useEffect(() => { recordActiveDay(); }, []);

  function finalize(s1: number, ans1: number[], s2?: number, ans2?: number[]) {
    const rating = computeRating(s1, s2);
    const prev = userState.value.pretest;
    const improved = !!prev && rating > prev.rating;
    const weights1 = ans1.map((c, i) => pretestQuestions[i]?.choices[c]?.weight ?? 0);
    const weights2 = (ans2 ?? []).map((c, i) => advancedQuestions[i]?.choices[c]?.weight ?? 0);
    setPretestResult({
      takenAt: Date.now(),
      stage1: { score: scoreStage(ans1, pretestQuestions), answers: ans1 },
      stage2: s2 !== undefined ? { score: scoreStage(ans2 ?? [], advancedQuestions), answers: ans2 ?? [] } : undefined,
      rating,
      rank: ratingToRank(rating).id,
      confidence: confidenceOf([weights1, weights2]),
    });
    if (improved) {
      const p = userState.value.progression;
      userState.value = { ...userState.value, progression: { ...p, achievements: { ...p.achievements, comeback: Date.now() } } };
    }
    setPhase("done");
  }

  function answer(choiceIdx: number) {
    if (stage === 1) {
      const next = [...a1, choiceIdx];
      if (step + 1 >= pretestQuestions.length) {
        const s1 = scoreStage(next, pretestQuestions) / maxScore(pretestQuestions);
        setA1(next);
        if (qualifiesForStage2(s1)) setPhase("gate");
        else finalize(s1, next);
      } else { setA1(next); setStep(step + 1); }
    } else {
      const next = [...a2, choiceIdx];
      if (step + 1 >= advancedQuestions.length) {
        const s1 = scoreStage(a1, pretestQuestions) / maxScore(pretestQuestions);
        const s2 = scoreStage(next, advancedQuestions) / maxScore(advancedQuestions);
        finalize(s1, a1, s2, next);
      } else { setA2(next); setStep(step + 1); }
    }
  }

  function restart() { setStage(1); setStep(0); setA1([]); setA2([]); setPhase("untaken"); }

  if (phase === "untaken") {
    return (
      <aside class={wrapClass}>
        <div class={headerClass}><span class="meta">{t("pretest.title", lang)}</span>
          <span class="badge muted">{lang === "en" ? `2 rounds · ~5 min` : `2 раунда · ~5 мин`}</span></div>
        <div class="px-6 pt-5 pb-6">
          <h3 class="font-display text-[22px] font-bold leading-[1.15] m-0 text-ink">
            {lang === "en" ? "What's your level?" : "Какой у тебя уровень?"}</h3>
          <p class="text-[14px] text-ink-2 leading-relaxed mt-2 mb-4">
            {lang === "en" ? "A standard round places you. Top scorers unlock a deeper round to earn the upper ranks."
              : "Стандартный раунд определяет уровень. Лучшие открывают углублённый раунд и зарабатывают верхние ранги."}</p>
          <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => { setStage(1); setStep(0); setA1([]); setA2([]); setPhase("stage1"); }}>
            {lang === "en" ? "Begin" : "Начать"}
          </button>
        </div>
      </aside>
    );
  }

  if (phase === "gate") {
    return (
      <aside class={wrapClass}>
        <div class={headerClass}><span class="meta">{lang === "en" ? "top band unlocked" : "топ-уровень открыт"}</span></div>
        <div class="px-6 pt-5 pb-6 flex flex-col gap-3">
          <h3 class="font-display text-[20px] font-bold m-0 text-ink">{lang === "en" ? "You're in the top band." : "Ты в топе."}</h3>
          <p class="text-[13.5px] text-ink-2">{lang === "en"
            ? "Take the advanced round to resolve your exact rank — Staff and above can only be earned here."
            : "Пройди углублённый раунд, чтобы определить точный ранг — Staff и выше зарабатываются только здесь."}</p>
          <div class="flex gap-2.5">
            <button type="button" class="oa-btn oa-btn-primary oa-btn-sm" onClick={() => { setStage(2); setStep(0); setPhase("stage2"); }}>
              {lang === "en" ? "Advanced round" : "Углублённый раунд"}</button>
            <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]" onClick={() => {
              const s1 = scoreStage(a1, pretestQuestions) / maxScore(pretestQuestions); finalize(s1, a1);
            }}>{lang === "en" ? "Skip (cap at middle)" : "Пропустить (потолок — middle)"}</button>
          </div>
        </div>
      </aside>
    );
  }

  if (phase === "stage1" || phase === "stage2") {
    const q = bank[step];
    return (
      <aside class={wrapClass}>
        <div class={headerClass}>
          <span class="meta">{stage === 1 ? (lang === "en" ? "standard" : "стандарт") : (lang === "en" ? "advanced" : "углублённый")} · {step + 1}/{bank.length}</span>
          <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm text-muted text-[11px]" onClick={restart}>{lang === "en" ? "restart" : "заново"}</button>
        </div>
        <div class="h-[2px] bg-rule relative"><div class="absolute inset-0 bg-ink" style={`width:${((step + 1) / bank.length) * 100}%`} /></div>
        <div class="px-6 pt-5 pb-6">
          <h3 class="font-display text-[19px] font-semibold leading-[1.25] m-0 text-ink mb-4">{q.prompt[lang]}</h3>
          <ul class="flex flex-col gap-2">
            {q.choices.map((c, i) => (
              <li><button type="button" onClick={() => answer(i)}
                class="flex items-start gap-3 w-full text-left bg-transparent border border-rule-strong rounded-[1px] px-3 py-2.5 text-[13px] text-ink hover:border-ink hover:bg-card-2 transition-colors">
                <span class="font-mono text-[11px] text-muted mt-[2px] w-4 shrink-0">{String.fromCharCode(65 + i)}</span>
                <span>{c.label[lang]}</span></button></li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  // done
  const result = userState.value.pretest!;
  return (
    <aside class={wrapClass}>
      <div class={headerClass}><span class="meta">{lang === "en" ? "placement · complete" : "placement · готово"}</span></div>
      <div class="px-6 pt-5 pb-6">
        <RankUpReveal rating={result.rating} rankId={result.rank} confidence={result.confidence} lang={lang} />
        <div class="flex items-center gap-2.5 mt-4">
          <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]" onClick={restart}>{lang === "en" ? "Re-climb" : "Переиграть"}</button>
          <a class="oa-btn oa-btn-ghost oa-btn-sm text-[12px]" href={`/${lang}/profile`}>{lang === "en" ? "View profile" : "Профиль"}</a>
        </div>
      </div>
    </aside>
  );
}
