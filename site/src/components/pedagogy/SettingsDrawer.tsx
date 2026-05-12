import { userState, setTier, setMotion, resetAll, setPretest } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";
import type { Tier } from "~/types";

type Props = { lang: Locale };

export default function SettingsDrawer({ lang }: Props) {
  const s = userState.value;
  return (
    <section class="max-w-md space-y-6">
      <div>
        <label class="font-bold text-bbg-ink">{lang === "en" ? "Tier" : "Уровень"}</label>
        <select
          class="block mt-1 border rounded px-2 py-1"
          value={s.tier}
          onChange={(e) => setTier((e.target as HTMLSelectElement).value as Tier, true)}
        >
          <option value="junior">{t("tier.junior", lang)}</option>
          <option value="middle">{t("tier.middle", lang)}</option>
          <option value="senior">{t("tier.senior", lang)}</option>
        </select>
      </div>
      <div>
        <label class="font-bold text-bbg-ink">{lang === "en" ? "Motion" : "Анимация"}</label>
        <select
          class="block mt-1 border rounded px-2 py-1"
          value={s.motion}
          onChange={(e) =>
            setMotion((e.target as HTMLSelectElement).value as "on" | "off" | "auto")
          }
        >
          <option value="auto">{lang === "en" ? "auto (respect OS)" : "авто (по системе)"}</option>
          <option value="on">{lang === "en" ? "always on" : "всегда вкл"}</option>
          <option value="off">{lang === "en" ? "off" : "выкл"}</option>
        </select>
      </div>
      <div>
        <button
          type="button"
          class="px-3 py-1 rounded border"
          onClick={() => {
            setPretest(0, []);
            location.href = `/${lang}/?retake=1`;
          }}
        >
          {lang === "en" ? "Retake pretest" : "Пересдать pretest"}
        </button>
      </div>
      <div>
        <button
          type="button"
          class="px-3 py-1 rounded bg-red-600 text-white text-sm"
          onClick={() => {
            const ok = confirm(
              lang === "en" ? "Reset all progress?" : "Сбросить весь прогресс?"
            );
            if (ok) resetAll();
          }}
        >
          {lang === "en" ? "Reset all progress" : "Сбросить весь прогресс"}
        </button>
      </div>
    </section>
  );
}
