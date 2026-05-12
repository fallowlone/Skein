import { userState } from "~/scripts/user-state";
import type { JSX } from "preact";

type Props = { slugs: string[]; variant?: "ring" | "bar"; size?: number };

export function ProgressMeter({ slugs, variant = "ring", size = 56 }: Props): JSX.Element {
  const done = slugs.filter((s) => userState.value.history[s]).length;
  const pct = slugs.length === 0 ? 0 : done / slugs.length;
  if (variant === "ring") {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} aria-label={`${done} of ${slugs.length} pieces visited`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" stroke-width="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1FBFA8"
          stroke-width="4"
          stroke-dasharray={`${pct * c} ${c}`}
          stroke-linecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-size="11" font-weight="700" fill="#1F2937">
          {done}/{slugs.length}
        </text>
      </svg>
    );
  }
  return (
    <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
      <div class="h-full bg-bbg-teal" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export default ProgressMeter;
