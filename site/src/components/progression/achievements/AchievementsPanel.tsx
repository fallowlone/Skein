import { type Locale } from "~/i18n";

// Placeholder island — the subagent (Task 7) replaces this with the sectioned shell
// composing SummaryBar / NearMiss / TitlesEquip / SealGroups.
export default function AchievementsPanel({ lang }: { lang: Locale }) {
  return <p class="meta">{lang === "ru" ? "Достижения…" : "Achievements…"}</p>;
}
