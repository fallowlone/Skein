// src/components/progression/XpStreakInstruments.tsx
// XP/level dial + current/best streak, read like instruments. Real data only:
// currentXp() + levelFromXp() for the into-level fill (block-div), and the live
// progression.streak.{count,best}. No fabricated XP-this-week or streak date range.
import type { Locale } from "~/i18n";
import { currentXp } from "~/scripts/progression/current";
import { levelFromXp } from "~/scripts/progression/xp";
import { userState } from "~/scripts/user-state";

const L = {
  en: {
    level: "Level", xp: "XP", toNext: (n: number, lvl: number) => `${n} XP to level ${lvl}`,
    current: "Current streak", best: "Best streak", days: "days",
  },
  ru: {
    level: "Уровень", xp: "XP", toNext: (n: number, lvl: number) => `${n} XP до уровня ${lvl}`,
    current: "Текущая серия", best: "Лучшая серия", days: "дн.",
  },
} as const;

export default function XpStreakInstruments({ lang }: { lang: Locale }) {
  const t = L[lang];
  const s = userState.value; // subscribe
  const xp = currentXp();    // subscribes to knowledge/config/userState internally
  const lvl = levelFromXp(xp);
  const intoPct = lvl.intoLevel + lvl.toNext > 0
    ? Math.round((lvl.intoLevel / (lvl.intoLevel + lvl.toNext)) * 100)
    : 100;
  const streak = s.progression.streak;

  return (
    <div class="inst-row">
      <div class="panel xp-inst">
        <div class="xp-meta">
          <span>{t.level} {lvl.level}</span>
          <span>{xp} {t.xp}</span>
        </div>
        <div class="progress"><div style={`width:${intoPct}%`} /></div>
        <div class="xp-meta faint">
          <span>{intoPct}%</span>
          <span>{t.toNext(lvl.toNext, lvl.level + 1)}</span>
        </div>
      </div>
      <div class="panel streak-inst">
        <span class="si-label">{t.current}</span>
        <span class="si-val">{streak.count} <small>{t.days}</small></span>
      </div>
      <div class="panel streak-inst">
        <span class="si-label">{t.best}</span>
        <span class="si-val">{streak.best} <small>{t.days}</small></span>
      </div>
    </div>
  );
}
