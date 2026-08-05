// site/src/scripts/assess/report.ts
// Cells → the report model the UI renders and the writes the rest of the app consumes.
import type { Source } from "~/scripts/path/types";
import { expectedLevel, type BandLabel } from "./ordinal";
import { detectPatterns, type PatternId } from "./patterns";
import { conceptVerdict, type ConceptVerdict } from "./verdict";
import { FACETS, LEVELS, cellKey, type Cell, type CellKey, type Evidence } from "./types";

export interface ReportRow {
  conceptId: string;
  verdict: ConceptVerdict;
  patterns: PatternId[];
  evidence: Evidence[];
}

export interface AssessReportModel {
  rows: ReportRow[];
  untested: string[];
  topGaps: ReportRow[];
  hiddenStrengths: ReportRow[];
}

export interface ReportOpts {
  scopeConcepts: string[];
  /** Concepts the active goal needs — used to rank gaps by impact, not alphabetically. */
  goalConcepts: string[];
}

const evidenceOf = (cells: ReadonlyMap<CellKey, Cell>, conceptId: string): Evidence[] =>
  FACETS.flatMap((f) => cells.get(cellKey(conceptId, f))?.evidence ?? []);

// Both cutoffs are integer LEVELS.indexOf(...) values (0=gap .. 3=senior), the SAME discrete
// statistic conceptVerdict uses to choose the band (Ruling 1) — not expectedLevel's continuous
// mean. Kept as the exact behaviour the original numeric thresholds (GAP_LEVEL=1.0,
// STRONG_LEVEL=2.2) produced against integer indices: <=1.0 only ever admits indices 0-1,
// >=2.2 only ever admits index 3 (indices are integers, so nothing between 2 and 3 exists to
// admit "middle").
const GAP_LEVEL_INDEX = 1;    // "gap" or "junior" — a level worth acting on
const STRONG_LEVEL_INDEX = 3; // "senior" only

/**
 * Narrows a row's (possibly null) band to a concrete {band, levelIndex} pair, or null.
 * conceptVerdict never actually returns status "measured" with a null band, but the type
 * doesn't encode that as a discriminated union, so this is real narrowing, not a `!` on faith.
 */
function measuredBand(row: ReportRow): { band: BandLabel; levelIndex: number } | null {
  const { band } = row.verdict;
  if (!band) return null;
  return { band, levelIndex: LEVELS.indexOf(band.level) };
}

/**
 * Ruling 4 (task-13): never degrade silently. True when this session has at
 * least one `explain` answer that did NOT get an independent LLM check (no
 * key, a locked key, a failed/unparsable call, or legacy pre-Task-13 evidence
 * that predates the `llmGraded` field entirely — `e.llmGraded !== true`
 * catches `false` AND `undefined` alike, deliberately conservative: absence
 * of proof it was graded is treated the same as proof it was not).
 * ItemView.tsx's gradeExplainAnswer always sets `llmGraded` explicitly on new
 * explain evidence, but this function does not assume that — it is exported
 * and unit-tested (report.test.ts) precisely so a future refactor of
 * Cell/Evidence/AssessReport cannot silently break the one learner-facing
 * claim this whole ruling exists to keep honest.
 *
 * Computed from the same `cells` the rest of the report reads, not from a
 * session-level "was a key configured" flag — so it stays honest even in the
 * rarer case where a key WAS configured but one particular grading call
 * failed.
 */
export function explainUngraded(cells: ReadonlyMap<CellKey, Cell>): boolean {
  for (const cell of cells.values()) {
    if (cell.evidence.some((e) => e.kind === "explain" && e.llmGraded !== true)) return true;
  }
  return false;
}

export function buildReport(cells: ReadonlyMap<CellKey, Cell>, opts: ReportOpts): AssessReportModel {
  const rows: ReportRow[] = [];
  const untested: string[] = [];

  for (const conceptId of opts.scopeConcepts) {
    const verdict = conceptVerdict(cells, conceptId);
    if (verdict.status === "untested") { untested.push(conceptId); continue; }
    rows.push({ conceptId, verdict, patterns: detectPatterns(verdict), evidence: evidenceOf(cells, conceptId) });
  }

  const onGoal = new Set(opts.goalConcepts);
  const impact = (r: ReportRow): number => {
    const m = measuredBand(r);
    return (onGoal.has(r.conceptId) ? 1 : 0) * 10 + (m ? m.band.confidence : 0);
  };

  const topGaps = rows
    .filter((r) => { const m = measuredBand(r); return m !== null && m.levelIndex <= GAP_LEVEL_INDEX; })
    .sort((a, b) => impact(b) - impact(a));

  const hiddenStrengths = rows.filter((r) => {
    const m = measuredBand(r);
    return m !== null && m.levelIndex >= STRONG_LEVEL_INDEX;
  });

  return { rows, untested, topGaps, hiddenStrengths };
}

export interface KnowledgeWrite {
  conceptId: string;
  confidence: number;
  source: Source;
  lastAt: number;
}

/**
 * One statistic decides both the band and the confidence (Ruling 1). conceptVerdict already
 * picked the governing (weakest, by LEVELS.indexOf with expectedLevel tie-break) facet for the
 * band; find that SAME facet by reference — conceptVerdict literally copies
 * `facets[worst].band` onto `verdict.band`, so identity comparison recovers which facet won
 * without re-deriving a second, possibly-disagreeing minimum. The confidence written is that
 * governing facet's own expectedLevel, normalised to 0..1 — a continuous number is fine (and
 * preferable to the coarse band index) as long as it comes from the facet the band came from.
 *
 * Only measured concepts are written — an untested concept must leave KnowledgeState alone.
 */
export function toKnowledgeWrites(cells: ReadonlyMap<CellKey, Cell>, atMs: number): KnowledgeWrite[] {
  const conceptIds = new Set<string>();
  for (const cell of cells.values()) conceptIds.add(cell.conceptId);

  const writes: KnowledgeWrite[] = [];
  for (const conceptId of conceptIds) {
    const verdict = conceptVerdict(cells, conceptId);
    if (verdict.status === "untested" || !verdict.band) continue;

    const governingFacet = FACETS.find((f) => verdict.facets[f].band === verdict.band);
    const governingCell = governingFacet ? cells.get(cellKey(conceptId, governingFacet)) : undefined;
    if (!governingCell) continue; // unreachable when status is "measured", but narrow rather than assert

    writes.push({
      conceptId,
      confidence: expectedLevel(governingCell.posterior) / (LEVELS.length - 1),
      source: "assess",
      lastAt: atMs,
    });
  }
  return writes.sort((a, b) => a.conceptId.localeCompare(b.conceptId));
}
