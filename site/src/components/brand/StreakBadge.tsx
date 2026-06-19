import { userState } from "~/scripts/user-state";

// Ambient daily-habit signal in the title bar. Renders nothing until the learner
// has a live streak, so first-time visitors see no empty state.
export default function StreakBadge() {
  const { count } = userState.value.progression.streak;
  if (!count) return null;
  const label = userState.value.lang === "ru" ? `Серия ${count} дн.` : `${count}-day streak`;
  return (
    <span
      class="flex items-center gap-1 text-[12px] font-mono text-ink shrink-0"
      title={label}
      aria-label={label}
    >
      <span aria-hidden="true">🔥</span>
      {count}
    </span>
  );
}
