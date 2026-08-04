// site/src/components/assess/HintLadder.tsx
// Up to two hints. Presentational only: `onHint` dispatches session.ts's "hint"
// action, which is what actually bumps `state.hintsUsed` (and — via likelihood.ts
// — discounts a subsequent "correct" toward "fragile"). This component never
// tracks its own copy of hintsUsed; it only renders what the session already has.
import { t, type Locale } from "~/i18n";

type Props = {
  lang: Locale;
  /** Already-localized hint strings, in reveal order. May be shorter than 2. */
  hints: readonly string[];
  hintsUsed: 0 | 1 | 2;
  onHint: () => void;
};

const MAX_HINTS = 2;

export default function HintLadder({ lang, hints, hintsUsed, onHint }: Props) {
  if (hints.length === 0) return null;
  const cap = Math.min(MAX_HINTS, hints.length);
  const revealed = hints.slice(0, hintsUsed);

  return (
    <div class="assess-hints">
      {hintsUsed < cap && (
        <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm" onClick={onHint}>
          {t("assess.item.hint", lang)} ({hintsUsed}/{cap})
        </button>
      )}
      {revealed.length > 0 && (
        <ul class="assess-hint-list">
          {revealed.map((h, i) => (
            <li key={i}>💡 {h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
