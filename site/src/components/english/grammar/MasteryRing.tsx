// Calm mastery primitives shared across the grammar surfaces.
// MasteryRing renders the 0–100 strength as a thin arc (no number shouting);
// state drives the centre dot. CefrBadges + LockGlyph are tiny stateless marks.
import type { Cefr } from "~/english/grammar-types";
import type { MasteryState } from "./ui";
import { cefrRange } from "./ui";

type RingProps = {
  state: MasteryState;
  strength: number;
  hue: string;
  size?: number;
  stroke?: number;
};

export function MasteryRing({ state, strength, hue, size = 22, stroke = 2.5 }: RingProps) {
  const r = (size - stroke * 2) / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, strength)) / 100;
  const cx = size / 2;
  return (
    <span class={`mastery is-${state}`} style={{ width: size, height: size, "--fam": hue }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle class="m-track" cx={cx} cy={cx} r={r} fill="none" stroke-width={stroke} />
        {state !== "new" && (
          <circle
            class="m-val"
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke-width={stroke}
            stroke-dasharray={c}
            stroke-dashoffset={c * (1 - pct)}
          />
        )}
      </svg>
    </span>
  );
}

type BadgeProps = { cefr: Cefr; levels: Cefr[]; hue: string };

export function CefrBadges({ cefr, levels, hue }: BadgeProps) {
  const range = cefrRange(levels);
  return (
    <>
      <span class="cefr-badge" style={{ "--fam": hue }}>{cefr}</span>
      {levels.length > 1 && <span class="cefr-range">{range}</span>}
    </>
  );
}

export function LockGlyph() {
  return (
    <span class="lock-glyph" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
        <rect x="5" y="10.5" width="14" height="9" rx="1.5" />
        <path d="M8 10.5V7a4 4 0 018 0v3.5" />
      </svg>
    </span>
  );
}
