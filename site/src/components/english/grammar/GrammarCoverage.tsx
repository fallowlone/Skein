// GrammarCoverage — reference/overview of how much of the English Grammar
// Profile the corpus covers, band by band. Data-as-design: a calm gauge + a
// stacked bar per CEFR band, drillable into the topics that cover it.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { Bi } from "~/english/types";
import type { Cefr, GrammarFamily } from "~/english/grammar-types";
import type { GrammarCoverage as Coverage, BandCoverage } from "~/english/grammar-coverage";
import { coverageSegments, familyHue } from "./ui";
import { gt } from "./strings";

export type CoverageTopic = { id: string; title: Bi; family: GrammarFamily };

type Props = {
  lang: Locale;
  coverage: Coverage;
  topicsByBand: Record<string, CoverageTopic[]>;
};

const isLocked = (cefr: Cefr) => cefr === "C1" || cefr === "C2";

function Gauge({ value }: { value: number }) {
  const R = 84, cx = 100, cy = 100;
  const len = Math.PI * R;
  const d = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  return (
    <svg viewBox="0 0 200 116" width="100%" role="img" aria-label={`${value}%`}>
      <path d={d} fill="none" stroke="color-mix(in srgb, var(--ink) 11%, transparent)" stroke-width="13" stroke-linecap="round" />
      <path d={d} fill="none" stroke="var(--ok)" stroke-width="13" stroke-linecap="round"
        stroke-dasharray={len} stroke-dashoffset={len * (1 - value / 100)} />
    </svg>
  );
}

export default function GrammarCoverage({ lang, coverage, topicsByBand }: Props) {
  const [open, setOpen] = useState<Cefr | null>(null);

  return (
    <div class="gsurface">
      <div class="coverage-page">
        <div class="cov-head">
          <div class="gcrumb">
            <a href={`/${lang}/english/grammar`}>{gt("crumb_grammar", lang)}</a>
            <span class="sep">/</span>
            <span>{gt("cov_title", lang)}</span>
          </div>
          <h1 class="atlas-title">{gt("cov_title", lang)}</h1>
          <p class="atlas-lede">{gt("cov_lede", lang)}</p>
        </div>

        <div class="cov-summary">
          <div class="contour-field" />
          <div class="cov-gauge">
            <Gauge value={coverage.overallPct} />
            <div class="cg-readout">
              <div class="cg-num">{coverage.overallPct}<sup>%</sup></div>
              <div class="cg-lbl">{gt("cov_overall", lang)}</div>
            </div>
          </div>
          <div class="cov-legend">
            <div class="cl-row"><span class="k" style={{ background: "var(--ok)" }} /><span class="cl-text"><b>{gt("cov_covered", lang)}</b> — {gt("cov_covered_def", lang)}</span></div>
            <div class="cl-row"><span class="k" style={{ background: "var(--accent)" }} /><span class="cl-text"><b>{gt("cov_partial", lang)}</b> — {gt("cov_partial_def", lang)}</span></div>
            <div class="cl-row"><span class="k" style={{ background: "color-mix(in srgb, var(--ink) 16%, transparent)" }} /><span class="cl-text"><b>{gt("cov_waived", lang)}</b> — {gt("cov_waived_def", lang)}</span></div>
            <span class="cite">{gt("cov_cite", lang)} · {coverage.bands.reduce((s, b) => s + b.total, 0)} {gt("cov_egp", lang)}</span>
          </div>
        </div>

        <div class="cov-bands">
          {coverage.bands.map((b) => (
            <CovBand
              key={b.cefr}
              band={b}
              lang={lang}
              expanded={open === b.cefr}
              topics={topicsByBand[b.cefr] ?? []}
              onToggle={() => setOpen(open === b.cefr ? null : b.cefr)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CovBand(
  { band, lang, expanded, topics, onToggle }:
  { band: BandCoverage; lang: Locale; expanded: boolean; topics: CoverageTopic[]; onToggle: () => void },
) {
  const seg = coverageSegments(band);
  const locked = isLocked(band.cefr);
  return (
    <>
      <button type="button" class={"cov-band" + (locked ? " locked" : "")} disabled={locked} onClick={onToggle}>
        <span class="cb-label">{band.cefr}</span>
        <div class="cb-meter">
          <div class="cbm-bar">
            <span class="seg-cov" style={{ width: seg.covered + "%" }} />
            <span class="seg-part" style={{ width: seg.notYet + "%" }} />
            <span class="seg-waive" style={{ width: seg.waived + "%" }} />
          </div>
          <div class="cbm-meta">
            <span>{band.total} {gt("cov_egp", lang)}</span>
            <span>· {seg.covered}% {gt("cov_covered", lang)}</span>
            {seg.notYet > 0 && <span>· {seg.notYet}% {gt("cov_partial", lang)}</span>}
            {locked && <span>· {gt("placement_required", lang)}</span>}
          </div>
        </div>
        <span class="cb-pct">{seg.covered}%</span>
        {!locked && (
          <span class="cb-drill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform var(--dur-1) var(--ease)" }}><path d="M9 6l6 6-6 6" /></svg>
          </span>
        )}
      </button>
      {expanded && !locked && (
        <div class="cov-drill">
          <div class="cd-head">
            <span class="cd-title">{band.cefr} · {gt("cov_drill", lang)}</span>
            <span class="cd-egp">{band.total} {gt("cov_egp", lang)} · {band.covered} {gt("cov_covered", lang)}</span>
          </div>
          <div class="cd-topics">
            {topics.map((t) => (
              <a class="cd-topic" key={t.id} style={{ "--fam": familyHue(t.family) }} href={`/${lang}/english/grammar/${t.id}`}>
                <span class="sq" />
                <span class="cd-name">{t.title[lang]}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
