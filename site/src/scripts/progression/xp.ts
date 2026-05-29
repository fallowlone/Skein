import type { UserState } from "../user-state";

const XP = { pretest: 50, stage2: 100, lesson: 10, retrieval: 15, achievement: 25, drill: 8 };

export function xpFromState(
  state: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">,
  drillsSolved: number,
): number {
  let xp = 0;
  if (state.pretest) xp += XP.pretest;
  if (state.pretest?.stage2) xp += XP.stage2;
  xp += Object.keys(state.history ?? {}).length * XP.lesson;
  xp += Object.keys(state.retrieval ?? {}).length * XP.retrieval;
  xp += Object.keys(state.progression?.achievements ?? {}).length * XP.achievement;
  xp += Math.max(0, drillsSolved) * XP.drill;
  return xp;
}

export function levelFromXp(xp: number): { level: number; intoLevel: number; toNext: number } {
  const lvl = Math.floor((Math.max(0, xp) / 100) ** 0.7) + 1;
  const xpForLevel = (l: number) => Math.ceil(((l - 1) ** (1 / 0.7)) * 100);
  const cur = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  return { level: lvl, intoLevel: xp - cur, toNext: Math.max(0, next - xp) };
}
