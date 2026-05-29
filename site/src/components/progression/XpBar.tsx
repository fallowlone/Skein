import type { Locale } from "~/i18n";
import { levelFromXp } from "~/scripts/progression/xp";

export default function XpBar({ xp, lang }: { xp: number; lang: Locale }) {
  const { level, intoLevel, toNext } = levelFromXp(xp);
  const pct = intoLevel + toNext > 0 ? Math.round((intoLevel / (intoLevel + toNext)) * 100) : 100;
  return (
    <div class="flex flex-col gap-1">
      <div class="flex justify-between text-[12px] font-mono"><span>LVL {level}</span><span class="text-muted">{xp} XP</span></div>
      <div class="h-[8px] bg-rule rounded-full overflow-hidden"><div class="h-full bg-ink" style={`width:${pct}%`} /></div>
      <div class="text-[11px] text-muted font-mono">{toNext} {lang === "ru" ? "до LVL" : "to LVL"} {level + 1}</div>
    </div>
  );
}
