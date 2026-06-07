// site/src/scripts/progression/missions.ts
//
// Honest missions derived from real signals (weakest-domain gap, streak milestone).
// No fabricated rating rewards or a quest economy the engine doesn't have. Pure.
import type { DomainRating } from "./domain-ratings";
import { weakestDomain } from "./domain-ratings";

export interface Mission {
  id: string;
  title: { en: string; ru: string };
  done: number;
  total: number;
  rewardLabel: { en: string; ru: string };
}

const MILESTONES = [7, 14, 30, 60, 100, 200, 365];

export function deriveMissions(input: { domains: DomainRating[]; streakCount: number }): Mission[] {
  const out: Mission[] = [];

  const weak = weakestDomain(input.domains);
  if (weak) {
    out.push({
      id: `gap-${weak.key}`,
      title: { en: `Close the ${weak.label.en} gap`, ru: `Закрой пробел: ${weak.label.ru}` },
      done: weak.known, total: weak.total,
      rewardLabel: { en: `Completes the ${weak.label.en} domain`, ru: `Завершает домен ${weak.label.ru}` },
    });
  }

  const next = MILESTONES.find((m) => input.streakCount < m);
  if (next) {
    out.push({
      id: `streak-${next}`,
      title: { en: `${next}-day consistency`, ru: `${next} дней подряд` },
      done: input.streakCount, total: next,
      rewardLabel: { en: `A ${next}-day streak`, ru: `Серия из ${next} дней` },
    });
  }

  return out.slice(0, 3);
}
