// TitlesEquip — equip one earned pillar title (single-select, shown beside your name).
// Earned titles render as <button aria-pressed>; clicking equips (toggles off if already
// equipped) via the local equipped-title signal. Locked titles are non-interactive <span>
// carrying their unlock condition ("3 lessons in <pillar>"). Real TITLES + titlesFromState.
import { type Locale } from "~/i18n";
import { TITLES, titlesFromState } from "~/scripts/progression/titles";
import { equippedTitle, setEquippedTitle } from "~/scripts/progression/equipped-title";
import { userState } from "~/scripts/user-state";

const L = {
  en: {
    equipped: "equipped",
    earned: "earned",
    locked: (pillar: string) => `3 lessons in ${pillar}`,
  },
  ru: {
    equipped: "надет",
    earned: "получен",
    locked: (pillar: string) => `3 урока в ${pillar}`,
  },
} as const;

export default function TitlesEquip({ lang }: { lang: Locale }) {
  const t = L[lang];
  const s = userState.value;
  const earned = new Set(titlesFromState(s));
  const equipped = equippedTitle.value;

  return (
    <div class="titles">
      {TITLES.map((tt) => {
        if (!earned.has(tt.id)) {
          return (
            <span key={tt.id} class="title-pill locked">
              <span class="tp-tag">{t.locked(tt.pillar)}</span>
              {tt.label[lang]}
            </span>
          );
        }
        const on = equipped === tt.id;
        return (
          <button
            key={tt.id}
            type="button"
            class="title-pill"
            aria-pressed={on}
            onClick={() => setEquippedTitle(on ? null : tt.id)}
          >
            <span class="tp-tag">{on ? t.equipped : t.earned}</span>
            {tt.label[lang]}
          </button>
        );
      })}
    </div>
  );
}
