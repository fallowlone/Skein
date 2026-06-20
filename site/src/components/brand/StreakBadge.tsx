import { userState } from "~/scripts/user-state";
import Icon from "~/components/icons/Icon.tsx";

// Ambient daily-habit signal. Speaks the rail's line-icon vocabulary (a stroked
// flame + mono count) rather than a raw emoji, and renders nothing until the
// learner has a live streak. Self-styled with utilities so it reads the same in
// the rail and in the lesson topbar. In the rail, the `.rail-streak` slot holds a
// constant height so this hydrating-in client island never reflows the cluster.
export default function StreakBadge() {
  const { count } = userState.value.progression.streak;
  if (!count) return null;
  const label = userState.value.lang === "ru" ? `Серия: ${count} дн.` : `${count}-day streak`;
  return (
    <span
      class="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs leading-none text-ink-2"
      title={label}
      aria-label={label}
    >
      <Icon name="flame" class="h-4 w-4 shrink-0 text-accent" />
      <span class="tabular-nums tracking-wide">{count}</span>
    </span>
  );
}
