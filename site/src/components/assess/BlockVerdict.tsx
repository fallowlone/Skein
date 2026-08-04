// site/src/components/assess/BlockVerdict.tsx
// Shown when session.ts's reduce() moves phase to "block-verdict" (BLOCK_MAX_ITEMS
// or BLOCK_MAX_MIN reached). `state.cells` is cumulative for the whole session —
// the pure core does not track a per-block delta — so this shows the running
// snapshot of everything measured so far, not a block-only slice; the label below
// says so rather than implying an isolated per-block figure.
import { t, type Locale } from "~/i18n";
import type { AssessState } from "~/scripts/assess/session";
import { conceptVerdict } from "~/scripts/assess/verdict";
import { detectPatterns, PATTERN_LABELS } from "~/scripts/assess/patterns";
import { tt } from "./item-bodies";
import { levelLabel } from "./labels";

type Props = {
  lang: Locale;
  state: AssessState;
  labelOf: (conceptId: string) => { en: string; ru: string };
  onContinue: () => void;
  onStop: () => void;
};

export default function BlockVerdict({ lang, state, labelOf, onContinue, onStop }: Props) {
  const conceptIds = [...new Set([...state.cells.values()].map((c) => c.conceptId))].sort();
  const rows = conceptIds.map((id) => {
    const verdict = conceptVerdict(state.cells, id);
    return { id, verdict, patterns: detectPatterns(verdict) };
  });

  return (
    <section class="assess-block-verdict">
      <h2 class="ab-title">{t("assess.block.title", lang)}</h2>
      <p class="ab-summary">{t("assess.block.summary", lang)}</p>
      {rows.length === 0 && <p class="ab-empty">{t("assess.block.noEvidence", lang)}</p>}
      <ul class="ab-list">
        {rows.map(({ id, verdict, patterns }) => {
          const label = labelOf(id);
          return (
            <li key={id} class="ab-row">
              <span class="ab-concept">{tt(lang, label.en, label.ru)}</span>
              {verdict.band ? (
                <span class={`ab-band ab-band-${verdict.band.level}`}>
                  {levelLabel(verdict.band.level, lang)}{verdict.band.qualifier}
                </span>
              ) : (
                <span class="ab-band ab-band-untested">{t("assess.level.untested", lang)}</span>
              )}
              {patterns.length > 0 && (
                <span class="ab-patterns">
                  {patterns.map((p) => tt(lang, PATTERN_LABELS[p].en, PATTERN_LABELS[p].ru)).join(" · ")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div class="assess-item-controls">
        <button type="button" class="oa-btn oa-btn-primary" onClick={onContinue}>
          {t("assess.block.continue", lang)}
        </button>
        <button type="button" class="oa-btn oa-btn-ghost" onClick={onStop}>
          {t("assess.item.finish", lang)}
        </button>
      </div>
    </section>
  );
}
