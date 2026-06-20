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
  const isRu = userState.value.lang === "ru";
  const word = isRu ? "дн. подряд" : "day streak";
  const label = isRu ? `Серия: ${count} дн.` : `${count}-day streak`;
  return (
    <span class="streak-badge" title={label} aria-label={label}>
      <Icon name="flame" size={14} class="sb-flame" />
      <span class="sb-num">{count}</span>
      <span class="sb-word">{word}</span>
    </span>
  );
}
