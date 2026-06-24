// site/src/scripts/account/overview.ts
//
// Pure read-model for the Personal Cabinet's progress overview. Formats the six cards
// from already-computed raw values (rank/CEFR/goal/streak/due/marks). A null value tells
// the component to show a neutral "—" (fresh account); the card still links to where you'd
// earn it. No I/O — the impure reads happen in the component.
export interface OverviewInput {
  rank?: { label: string; rating: number };
  cefr?: string;
  goal?: string;
  streak: { count: number; best: number };
  due: number;
  marks: { earned: number; total: number };
}

export interface OverviewCard {
  key: "rank" | "cefr" | "goal" | "streak" | "due" | "marks";
  label: { en: string; ru: string };
  value: string | null;
  sub: { en: string; ru: string };
  href: (lang: "en" | "ru") => string;
}

export function overviewCards(i: OverviewInput): OverviewCard[] {
  return [
    {
      key: "rank", label: { en: "Rank", ru: "Ранг" },
      value: i.rank ? `${i.rank.label} · ${i.rank.rating}` : null,
      sub: { en: "Progression →", ru: "Прогресс →" }, href: (l) => `/${l}/profile`,
    },
    {
      key: "cefr", label: { en: "English (CEFR)", ru: "Английский (CEFR)" },
      value: i.cefr ?? null,
      sub: { en: "English Hub →", ru: "Английский хаб →" }, href: (l) => `/${l}/english`,
    },
    {
      key: "goal", label: { en: "Current goal", ru: "Текущая цель" },
      value: i.goal ?? null,
      sub: { en: "Planning →", ru: "Планирование →" }, href: (l) => `/${l}/roadmap`,
    },
    {
      key: "streak", label: { en: "Streak", ru: "Серия" },
      value: String(i.streak.count),
      sub: { en: `best ${i.streak.best} →`, ru: `рекорд ${i.streak.best} →` }, href: (l) => `/${l}/profile`,
    },
    {
      key: "due", label: { en: "Due today", ru: "Сегодня к повтору" },
      value: String(i.due),
      sub: { en: "review →", ru: "повторить →" }, href: (l) => `/${l}/review`,
    },
    {
      key: "marks", label: { en: "Marks earned", ru: "Знаки получены" },
      value: `${i.marks.earned} / ${i.marks.total}`,
      sub: { en: "Achievements →", ru: "Достижения →" }, href: (l) => `/${l}/profile`,
    },
  ];
}
