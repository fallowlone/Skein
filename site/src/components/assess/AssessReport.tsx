// site/src/components/assess/AssessReport.tsx
// The four sections of AssessReportModel (Task 11's report.ts): measured rows,
// top gaps, hidden strengths, and — inside `.ar-untested` — concepts that were
// never asked about. That last section is the engine's core invariant made
// visible: untested never silently becomes a gap (Ruling 6) — it gets its own,
// always-rendered section, not folded into "gaps" or hidden when empty.
import { useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import type { AssessReportModel, ReportRow } from "~/scripts/assess/report";
import { toKnowledgeWrites } from "~/scripts/assess/report";
import { toRetestCards } from "~/scripts/assess/retest";
import type { Cell, CellKey } from "~/scripts/assess/types";
import { PATTERN_LABELS } from "~/scripts/assess/patterns";
import { addCard } from "~/scripts/review-state";
import { applyKnowledgeWrites } from "~/scripts/assess-apply-knowledge";
import { tt, levelLabel } from "./labels";

type Props = {
  lang: Locale;
  model: AssessReportModel;
  cells: ReadonlyMap<CellKey, Cell>;
  labelOf: (conceptId: string) => { en: string; ru: string };
  onRestart: () => void;
};

// An "everything" scope is ~5035 concepts; after a couple of answers nearly all
// of them are untested, so rendering the full list would mean ~5000 <li> chips.
// 300 bounds that worst case while staying well above any single-track scope's
// concept count except the largest few (e.g. networking, 513) — a capped list
// still shows the count truncated (below), so nothing is silently hidden.
const UNTESTED_RENDER_CAP = 300;

function ConceptRow({ lang, row, labelOf }: { lang: Locale; row: ReportRow; labelOf: Props["labelOf"] }) {
  const label = labelOf(row.conceptId);
  const band = row.verdict.band;
  return (
    <li class="ar-row">
      <span class="ar-concept">{tt(lang, label.en, label.ru)}</span>
      {band && (
        <span class={`ar-band ar-band-${band.level}`}>
          {levelLabel(band.level, lang)}{band.qualifier}
        </span>
      )}
      {row.patterns.length > 0 && (
        <span class="ar-patterns">
          {row.patterns.map((p) => tt(lang, PATTERN_LABELS[p].en, PATTERN_LABELS[p].ru)).join(" · ")}
        </span>
      )}
      {band && <span class="ar-confidence">{Math.round(band.confidence * 100)}% {t("assess.report.confidence", lang)}</span>}
      <span class="ar-evidence-count">{t("assess.report.evidenceCount", lang).replace("{n}", String(row.evidence.length))}</span>
    </li>
  );
}

function ConceptList({ lang, rows, labelOf, emptyKey }: {
  lang: Locale; rows: ReportRow[]; labelOf: Props["labelOf"]; emptyKey: string;
}) {
  if (rows.length === 0) return <p class="ar-empty">{t(emptyKey, lang)}</p>;
  return (
    <ul class="ar-list">
      {rows.map((r) => <ConceptRow key={r.conceptId} lang={lang} row={r} labelOf={labelOf} />)}
    </ul>
  );
}

export default function AssessReport({ lang, model, cells, labelOf, onRestart }: Props) {
  const [applied, setApplied] = useState<{ n: number; m: number } | null>(null);

  // Exactly the concept set this report was built over (rows ∪ untested — every
  // scope concept lands in precisely one of the two, per buildReport's loop).
  // Passed to applyKnowledgeWrites so a concept the learner never saw in these
  // results can never be silently rewritten behind the Save button (C1/C2
  // rule 1, task-12-report.md).
  const scopeConcepts = [...model.rows.map((r) => r.conceptId), ...model.untested];

  // "Apply" writes the assess result into the durable stores the rest of the app
  // reads (KnowledgeState, retest cards) — see assess-apply-knowledge.ts for why
  // that does NOT go through path-io.ts directly, and for the overwrite
  // precedence rule. `promptFor` has no real item text to draw on (Evidence
  // keeps itemId/lessonKey, not the question itself), so the retrieval cue
  // falls back to "concept label (facet)" — an honest cue, not a reconstruction
  // of the original question.
  const apply = () => {
    const now = Date.now();
    const writes = toKnowledgeWrites(cells, now);
    const n = applyKnowledgeWrites(writes, cells, scopeConcepts);
    const cards = toRetestCards(cells, lang, now, (conceptId, cell) => {
      const label = labelOf(conceptId);
      return `${tt(lang, label.en, label.ru)} (${cell.facet})`;
    });
    for (const card of cards) addCard(card);
    setApplied({ n, m: cards.length });
  };

  return (
    <section class="assess-report">
      <h2 class="ar-title">{t("assess.report.title", lang)}</h2>

      <section class="ar-section">
        <h3>{t("assess.report.topGaps", lang)}</h3>
        <ConceptList lang={lang} rows={model.topGaps} labelOf={labelOf} emptyKey="assess.report.noGaps" />
      </section>

      <section class="ar-section">
        <h3>{t("assess.report.hiddenStrengths", lang)}</h3>
        <ConceptList lang={lang} rows={model.hiddenStrengths} labelOf={labelOf} emptyKey="assess.report.noStrengths" />
      </section>

      <section class="ar-section">
        <h3>{t("assess.report.rows", lang)}</h3>
        <ConceptList lang={lang} rows={model.rows} labelOf={labelOf} emptyKey="assess.block.noEvidence" />
      </section>

      {/* Always rendered — even with zero entries — so "untested" stays a visible,
          named category rather than disappearing (which would read as "no
          untested concepts exist" instead of "nothing was measured about them"). */}
      <section class="ar-section ar-untested">
        <h3>{t("assess.report.untested", lang)}</h3>
        <p class="ar-untested-note">{t("assess.report.untestedNote", lang)}</p>
        <ul class="ar-untested-list">
          {model.untested.slice(0, UNTESTED_RENDER_CAP).map((id) => {
            const label = labelOf(id);
            return <li key={id}>{tt(lang, label.en, label.ru)}</li>;
          })}
        </ul>
        {model.untested.length > UNTESTED_RENDER_CAP && (
          <p class="ar-untested-more">
            {t("assess.report.untestedMore", lang).replace("{n}", String(model.untested.length - UNTESTED_RENDER_CAP))}
          </p>
        )}
      </section>

      <div class="assess-item-controls">
        <button type="button" class="oa-btn oa-btn-primary" onClick={apply} disabled={!!applied} aria-disabled={!!applied}>
          {t("assess.report.apply", lang)}
        </button>
        {applied && (
          <p class="ar-applied">
            {t("assess.report.applied", lang).replace("{n}", String(applied.n)).replace("{m}", String(applied.m))}
          </p>
        )}
        <button type="button" class="oa-btn oa-btn-ghost" onClick={onRestart}>
          {t("assess.report.restart", lang)}
        </button>
      </div>
    </section>
  );
}
