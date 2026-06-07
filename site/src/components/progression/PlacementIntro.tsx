// src/components/progression/PlacementIntro.tsx
// First-run placement intro (re-skin of the mockup's two-stage explainer). Pure copy —
// the actual placement runs in the existing <Pretest> the parent mounts directly below.
import type { Locale } from "~/i18n";

const L = {
  en: {
    lead: "Before any rating shows, take the two-stage adaptive placement. It calibrates your starting rank honestly — no inflated welcome score.",
    s1n: "Stage 1", s1t: "A broad sweep across all domains to find your level.",
    s2n: "Stage 2", s2t: "Top scorers unlock a deeper round to set the exact rating and earn the upper ranks.",
    cite: "~5 min · re-take anytime",
  },
  ru: {
    lead: "Прежде чем появится рейтинг, пройди двухэтапный адаптивный placement. Он честно калибрует стартовый ранг — без раздутой приветственной оценки.",
    s1n: "Этап 1", s1t: "Широкий охват по всем доменам, чтобы найти твой уровень.",
    s2n: "Этап 2", s2t: "Лучшие открывают углублённый раунд, который задаёт точный рейтинг и верхние ранги.",
    cite: "~5 мин · можно переиграть в любой момент",
  },
} as const;

export default function PlacementIntro({ lang }: { lang: Locale }) {
  const t = L[lang];
  return (
    <div class="placement">
      <div>
        <p class="pl-lead">{t.lead}</p>
        <div class="pl-stages">
          <div class="pl-stage"><span class="ps-n">{t.s1n}</span><span class="ps-t">{t.s1t}</span></div>
          <div class="pl-stage"><span class="ps-n">{t.s2n}</span><span class="ps-t">{t.s2t}</span></div>
        </div>
      </div>
      <span class="cite pl-cite">{t.cite}</span>
    </div>
  );
}
