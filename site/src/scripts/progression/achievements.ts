import type { UserState } from "../user-state";
import type { AchievementCtx } from "./types";

export interface AchievementDef {
  id: string; icon: string; xp: number;
  label: { en: string; ru: string };
  desc: { en: string; ru: string };
  predicate: (s: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">, ctx: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-steps", icon: "🌱", xp: 10, label: { en: "First Steps", ru: "Первые шаги" }, desc: { en: "Take the placement test", ru: "Пройти placement-тест" }, predicate: (s) => !!s.pretest },
  { id: "deep-diver", icon: "🤿", xp: 40, label: { en: "Deep Diver", ru: "Глубокое погружение" }, desc: { en: "Complete the advanced round", ru: "Пройти углублённый раунд" }, predicate: (s) => !!s.pretest?.stage2 },
  { id: "perfectionist", icon: "💯", xp: 60, label: { en: "Perfectionist", ru: "Перфекционист" }, desc: { en: "Reach the top rating", ru: "Достичь максимального рейтинга" }, predicate: (s) => !!s.pretest && s.pretest.rating >= 1000 },
  { id: "scholar", icon: "📚", xp: 20, label: { en: "Scholar", ru: "Книжный червь" }, desc: { en: "Visit 10 lessons", ru: "Открыть 10 уроков" }, predicate: (s) => Object.keys(s.history ?? {}).length >= 10 },
  { id: "well-read", icon: "📖", xp: 40, label: { en: "Well-Read", ru: "Начитанный" }, desc: { en: "Visit 40 lessons", ru: "Открыть 40 уроков" }, predicate: (s) => Object.keys(s.history ?? {}).length >= 40 },
  { id: "retriever", icon: "🧠", xp: 25, label: { en: "Retriever", ru: "Вспоминатель" }, desc: { en: "Attempt 15 retrieval drawers", ru: "Сделать 15 retrieval-попыток" }, predicate: (s) => Object.keys(s.retrieval ?? {}).length >= 15 },
  { id: "drill-rookie", icon: "🎯", xp: 15, label: { en: "Drill Rookie", ru: "Новичок дрилла" }, desc: { en: "Solve 5 drills", ru: "Решить 5 задач" }, predicate: (_s, c) => c.drillsSolved >= 5 },
  { id: "drill-sergeant", icon: "🪖", xp: 50, label: { en: "Drill Sergeant", ru: "Сержант дрилла" }, desc: { en: "Solve 25 drills", ru: "Решить 25 задач" }, predicate: (_s, c) => c.drillsSolved >= 25 },
  { id: "no-hints", icon: "🧩", xp: 30, label: { en: "No Hints", ru: "Без подсказок" }, desc: { en: "Solve a drill with no hints", ru: "Решить задачу без подсказок" }, predicate: (_s, c) => c.noHintSolve },
  { id: "completionist-algo", icon: "🏁", xp: 60, label: { en: "Completionist", ru: "Завершитель" }, desc: { en: "A solve in every algorithms unit", ru: "Решение в каждом algorithms-юните" }, predicate: (_s, c) => c.drillUnitsWithSolve >= 11 },
  { id: "comeback", icon: "📈", xp: 30, label: { en: "Comeback", ru: "Камбэк" }, desc: { en: "Improve your rating on a re-climb", ru: "Поднять рейтинг переигровкой" }, predicate: (s) => (s.progression?.achievements?.["comeback"] ?? 0) > 0 },
  { id: "night-owl", icon: "🦉", xp: 10, label: { en: "Night Owl", ru: "Сова" }, desc: { en: "Study after midnight", ru: "Учиться после полуночи" }, predicate: (_s, c) => c.hourOfDay >= 0 && c.hourOfDay < 5 },
  { id: "early-bird", icon: "🐦", xp: 10, label: { en: "Early Bird", ru: "Жаворонок" }, desc: { en: "Study before 7am", ru: "Учиться до 7 утра" }, predicate: (_s, c) => c.hourOfDay >= 5 && c.hourOfDay < 7 },
  { id: "streak-7", icon: "🔥", xp: 30, label: { en: "On Fire", ru: "В ударе" }, desc: { en: "7-day streak", ru: "7 дней подряд" }, predicate: (s) => (s.progression?.streak?.best ?? 0) >= 7 },
  { id: "streak-30", icon: "🌋", xp: 100, label: { en: "Unstoppable", ru: "Неудержимый" }, desc: { en: "30-day streak", ru: "30 дней подряд" }, predicate: (s) => (s.progression?.streak?.best ?? 0) >= 30 },
  { id: "first-blood", icon: "🩸", xp: 20, label: { en: "First Blood", ru: "Первая кровь" }, desc: { en: "Pick an expert-level answer", ru: "Выбрать ответ экспертного уровня" }, predicate: (_s, c) => c.seniorAnswers >= 1 },
  { id: "sharp-shooter", icon: "🎯", xp: 40, label: { en: "Sharp Shooter", ru: "Снайпер" }, desc: { en: "Five expert-level answers", ru: "Пять ответов экспертного уровня" }, predicate: (_s, c) => c.seniorAnswers >= 5 },
  { id: "polyglot", icon: "🌐", xp: 35, label: { en: "Polyglot", ru: "Полиглот" }, desc: { en: "Study across 5 pillars", ru: "Заниматься в 5 пилларах" }, predicate: (_s, c) => c.pillarsVisited >= 5 },
  { id: "renaissance", icon: "🗺️", xp: 70, label: { en: "Renaissance", ru: "Эрудит" }, desc: { en: "Study across 10 pillars", ru: "Заниматься в 10 пилларах" }, predicate: (_s, c) => c.pillarsVisited >= 10 },
  { id: "rank-engineer", icon: "🛠️", xp: 30, label: { en: "Engineer", ru: "Инженер" }, desc: { en: "Reach the Engineer tier", ru: "Достичь тира Engineer" }, predicate: (s) => !!s.pretest && s.pretest.rating >= 450 },
  { id: "rank-senior", icon: "🧭", xp: 60, label: { en: "Made Senior", ru: "Дорос до senior" }, desc: { en: "Reach the Staff tier (senior)", ru: "Достичь тира Staff (senior)" }, predicate: (s) => !!s.pretest && s.pretest.rating >= 750 },
  { id: "rank-architect", icon: "🏛️", xp: 90, label: { en: "Architect", ru: "Архитектор" }, desc: { en: "Reach the Architect tier", ru: "Достичь тира Architect" }, predicate: (s) => !!s.pretest && s.pretest.rating >= 930 },
  { id: "distinguished", icon: "👑", xp: 150, label: { en: "Distinguished", ru: "Distinguished" }, desc: { en: "Reach the apex rank", ru: "Достичь апекс-ранга" }, predicate: (s) => !!s.pretest && s.pretest.rating >= 990 },
  { id: "sure-footed", icon: "🪨", xp: 25, label: { en: "Sure-Footed", ru: "Уверенный" }, desc: { en: "Finish with high confidence", ru: "Завершить с высокой уверенностью" }, predicate: (s) => s.pretest?.confidence === "high" },
];

export function evaluateAchievements(
  s: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">, ctx: AchievementCtx,
): string[] {
  return ACHIEVEMENTS.filter((a) => a.predicate(s, ctx)).map((a) => a.id);
}
