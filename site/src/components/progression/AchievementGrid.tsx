import type { Locale } from "~/i18n";
import { ACHIEVEMENTS } from "~/scripts/progression/achievements";

export default function AchievementGrid({ unlocked, lang }: { unlocked: Set<string>; lang: Locale }) {
  return (
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ACHIEVEMENTS.map((a) => {
        const on = unlocked.has(a.id);
        return (
          <div key={a.id} class={`border border-rule rounded-md p-2 flex items-center gap-2 ${on ? "" : "opacity-40"}`} title={a.desc[lang]}>
            <span class="text-[20px]" aria-hidden="true">{a.icon}</span>
            <span class="text-[12px] font-semibold">{a.label[lang]}</span>
          </div>
        );
      })}
    </div>
  );
}
