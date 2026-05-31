import { userState } from "~/scripts/user-state";

type Props = { prereqs: string[]; lang: "en" | "ru" };

export default function PrereqBadge({ prereqs, lang }: Props) {
  const history = userState.value.history;
  const done = prereqs.filter((p) => history[p]).length;
  const all = prereqs.length;
  if (all === 0) return null;
  const ok = done === all;
  return (
    <span
      class={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--r-sm)] text-xs font-mono ${
        ok ? "bg-accent-ghost text-accent" : "bg-card border-[0.5px] border-hairline-2 text-muted"
      }`}
      title={prereqs.join(", ")}
    >
      {ok ? "✓" : "•"} {done}/{all} {lang === "en" ? "prereqs" : "пререквизитов"}
    </span>
  );
}
