// SealGroups — the museum case: every category as a group of seals (earned vs locked).
// The medallion carries the real emoji icon; earned seals show the condition + the formatted
// earned date (or just "earned" when no date is stored); locked seals show the condition as
// their unlock requirement. All data from groupAchievements (real ACHIEVEMENTS + dates).
import { type Locale } from "~/i18n";
import type { ViewGroup } from "~/scripts/progression/achievement-view";

const L = {
  en: { count: (e: number, t: number) => `${e} / ${t} earned`, earned: "earned" },
  ru: { count: (e: number, t: number) => `${e} / ${t} получено`, earned: "получено" },
} as const;

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function SealGroups({ groups, lang }: { groups: ViewGroup[]; lang: Locale }) {
  const t = L[lang];
  return (
    <>
      {groups.map((g) => (
        <div key={g.category} class="ach-group">
          <div class="ach-group-head">
            <span class="agh-name">{g.label[lang]}</span>
            <span class="agh-count">{t.count(g.earned, g.total)}</span>
          </div>
          <div class="seals">
            {g.marks.map((m) => (
              <div key={m.id} class={`seal ${m.earned ? "earned" : "locked"}`}>
                <span class="medallion" aria-hidden="true">{m.icon}</span>
                <span class="s-name">{m.name}</span>
                {m.earned ? (
                  <>
                    <span class="s-cond">{m.cond}</span>
                    <span class="s-date">
                      {m.date !== null ? new Date(m.date).toLocaleDateString(lang) : t.earned}
                    </span>
                  </>
                ) : (
                  <span class="s-unlock"><LockIcon />{m.cond}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
