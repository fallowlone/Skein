// site/src/scripts/progression/achievement-view.ts
//
// Pure view-model for the Achievements screen: groups the existing ACHIEVEMENTS into the
// six editorial categories, marks each earned/locked with its earned date. No I/O.
import { ACHIEVEMENTS } from "./achievements";

export const CATEGORIES = ["consistency", "depth", "breadth", "drills", "english", "mastery"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, { en: string; ru: string }> = {
  consistency: { en: "Consistency", ru: "Постоянство" },
  depth: { en: "Depth", ru: "Глубина" },
  breadth: { en: "Breadth", ru: "Широта" },
  drills: { en: "Drills", ru: "Тренировки" },
  english: { en: "English", ru: "Английский" },
  mastery: { en: "Mastery", ru: "Мастерство" },
};

// Deterministic id → category over all achievements (exhaustiveness asserted in the test).
export const CATEGORY_OF: Record<string, Category> = {
  // consistency
  "night-owl": "consistency", "early-bird": "consistency", "streak-7": "consistency", "streak-30": "consistency",
  // depth
  "deep-diver": "depth", "scholar": "depth", "well-read": "depth", "retriever": "depth",
  "first-blood": "depth", "sharp-shooter": "depth", "sure-footed": "depth",
  // breadth
  "polyglot": "breadth", "renaissance": "breadth",
  // drills
  "drill-rookie": "drills", "drill-sergeant": "drills", "no-hints": "drills", "completionist-algo": "drills",
  // english
  "en-words-500": "english", "en-words-2000": "english", "en-words-5000": "english",
  "en-band-b1": "english", "en-band-b2": "english", "en-first-graded": "english",
  "en-reader-10": "english", "en-reader-40": "english", "en-grammar-5": "english",
  // mastery
  "first-steps": "mastery", "perfectionist": "mastery", "comeback": "mastery",
  "rank-engineer": "mastery", "rank-senior": "mastery", "rank-architect": "mastery", "distinguished": "mastery",
};

export interface ViewMark { id: string; name: string; cond: string; icon: string; earned: boolean; date: number | null; }
export interface ViewGroup { category: Category; label: { en: string; ru: string }; earned: number; total: number; marks: ViewMark[]; }

export function tally(earnedSet: Set<string>): { earned: number; total: number } {
  return { earned: [...earnedSet].filter((id) => id in CATEGORY_OF).length, total: ACHIEVEMENTS.length };
}

export function groupAchievements(
  earnedSet: Set<string>, dates: Record<string, number>, lang: "en" | "ru",
): ViewGroup[] {
  const byCat = new Map<Category, ViewMark[]>();
  for (const a of ACHIEVEMENTS) {
    const cat = CATEGORY_OF[a.id];
    if (!cat) continue;
    const earned = earnedSet.has(a.id);
    const mark: ViewMark = {
      id: a.id, name: a.label[lang], cond: a.desc[lang], icon: a.icon,
      earned, date: earned && dates[a.id] ? dates[a.id] : null,
    };
    const arr = byCat.get(cat) ?? [];
    arr.push(mark); byCat.set(cat, arr);
  }
  return CATEGORIES
    .map((category) => {
      const marks = byCat.get(category) ?? [];
      marks.sort((x, y) => (Number(y.earned) - Number(x.earned)) || ((y.date ?? 0) - (x.date ?? 0)));
      return { category, label: CATEGORY_LABEL[category], earned: marks.filter((m) => m.earned).length, total: marks.length, marks };
    })
    .filter((g) => g.total > 0);
}
