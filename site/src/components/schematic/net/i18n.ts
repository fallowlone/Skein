/** UI chrome shared by the generic networking figures. Lesson copy stays in the MDX props. */
export type Lang = "en" | "ru";

export const UI = {
  en: {
    prev: "Previous", next: "Next", overview: "All at once", stepwise: "Step by step",
    step: (n: number, t: number) => `STEP ${n} OF ${t}`, viewK: "View",
    linear: "Linear scale", log: "Log scale", scaleK: "Scale",
    back: "back to", loopK: "Loop",
  },
  ru: {
    prev: "Назад", next: "Дальше", overview: "Всё сразу", stepwise: "По шагам",
    step: (n: number, t: number) => `ШАГ ${n} ИЗ ${t}`, viewK: "Вид",
    linear: "Линейная шкала", log: "Логарифмическая шкала", scaleK: "Шкала",
    back: "обратно к", loopK: "Цикл",
  },
} as const;

export const stepCount = (lang: string) => (n: number, t: number): string => UI[lang === "ru" ? "ru" : "en"].step(n, t);
