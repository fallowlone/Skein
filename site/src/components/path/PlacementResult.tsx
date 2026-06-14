// src/components/path/PlacementResult.tsx
// Stage 4 of probabilistic placement (Open Atlas design): the result report. Per-area mean-posterior
// bars as disclosure accordions (drill-down to a sorted concept list, each tagged known/shaky/unknown
// via collapse — colour + glyph + label, never colour alone), plus strongest/biggest-gap rankings.
// Pure presentation over the final priors Map — no I/O, no client: directive (child of the
// CalibrationFlow island, not its own island).
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content } from "~/scripts/path/path-io";
import { collapse } from "~/scripts/path/bayes";
import { DOMAIN_FAMILIES, FAMILY_OF } from "~/scripts/path/mastery-field";

const L = {
  en: {
    byArea: "By area", confident: "What we're confident you know",
    known: "known", shaky: "shaky", unknown: "unknown",
    strengths: "Strongest", gaps: "Biggest gaps", toPath: "See my path",
  },
  ru: {
    byArea: "По областям", confident: "В чём мы уверены, что ты знаешь",
    known: "знаю", shaky: "шатко", unknown: "не знаю",
    strengths: "Сильнее всего", gaps: "Главные пробелы", toPath: "К моему пути",
  },
} as const;

type Conf = "known" | "shaky" | "unknown";
const confOf = (p: number): Conf => {
  const c = collapse(p);
  return c.shaky ? "shaky" : c.confidence >= 0.6 ? "known" : "unknown";
};

const Glyph = ({ kind }: { kind: Conf }) => {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" } as const;
  if (kind === "known") return <svg {...common} stroke-width="2.2"><path d="M20 6L9 17l-5-5" /></svg>;
  if (kind === "shaky") return <svg {...common} stroke-width="2"><path d="M3 12c2.5-4 4.5-4 7 0s4.5 4 7 0" /></svg>;
  return <svg {...common} stroke-width="2"><path d="M6 12h12" /></svg>;
};

export default function PlacementResult({ lang, priors }: { lang: Locale; priors: Map<string, number> }) {
  const t = L[lang];
  const roadmap = `/${lang}/roadmap`;

  const agg = new Map<string, { sum: number; n: number; nodes: { id: string; p: number }[] }>();
  for (const [id, p] of priors) {
    const track = content.conceptById.get(id)?.track;
    const key = track ? (FAMILY_OF.get(track)?.key ?? "") : "";
    if (!key) continue;
    const a = agg.get(key) ?? { sum: 0, n: 0, nodes: [] };
    a.sum += p; a.n += 1; a.nodes.push({ id, p });
    agg.set(key, a);
  }

  const rows = DOMAIN_FAMILIES.map((f) => {
    const a = agg.get(f.key);
    return a && a.n ? { key: f.key, label: f.label[lang], hue: f.hue, mean: a.sum / a.n, nodes: a.nodes } : null;
  }).filter(Boolean) as { key: string; label: string; hue: string; mean: number; nodes: { id: string; p: number }[] }[];

  const all = [...priors.entries()].map(([id, p]) => ({ id, p, label: content.conceptById.get(id)?.label[lang] ?? id }));
  const strengths = [...all].sort((x, y) => y.p - x.p).slice(0, 5);
  const gaps = [...all].sort((x, y) => x.p - y.p).slice(0, 5);

  const [open, setOpen] = useState<string | null>(rows[0]?.key ?? null);

  const rank = (list: typeof strengths, kind: "strong" | "gaps") => (
    <div class={`res-col ${kind}`}>
      <div class="res-col-head">
        {kind === "strong"
          ? <svg class="ch-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V11M9 19V5M14 19v-6M19 19V8" /></svg>
          : <svg class="ch-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v8M12 14v.5M5 21h14a1 1 0 00.9-1.45l-7-13a1 1 0 00-1.8 0l-7 13A1 1 0 005 21z" /></svg>}
        <span>{kind === "strong" ? t.strengths : t.gaps}</span>
      </div>
      <div class="res-rank">
        {list.map((s, i) => (
          <div key={s.id} class="res-rank-row">
            <span class="rr-n">{i + 1}</span>
            <span class="rr-spark">
              <span class="rrs-bar"><i style={`width:${Math.round(s.p * 100)}%`} /></span>
              <span class="rr-name">{s.label}</span>
            </span>
            <span class="rr-pct">{Math.round(s.p * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div class="cal-flow" data-pt>
      <div class="pt-panel pt-rise">
        <div class="pt-panel-head">
          <span class="pph-kick">{t.byArea}</span>
          <h3>{t.confident}</h3>
          <span class="km-legend" style="margin-left:auto">
            <span><span class="kd known" />{t.known}</span>
            <span><span class="kd shaky" />{t.shaky}</span>
            <span><span class="kd unknown" />{t.unknown}</span>
          </span>
        </div>

        <div class="res-areas">
          {rows.map((r) => {
            const isOpen = open === r.key;
            const pct = Math.round(r.mean * 100);
            return (
              <div key={r.key} class="res-area" style={`--d:var(${r.hue})`}>
                <button
                  class="res-summary"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`ra-${r.key}`}
                  onClick={() => setOpen(isOpen ? null : r.key)}
                >
                  <span class="res-area-name"><span class="sq" /><span>{r.label}</span></span>
                  <span class="res-bar"><i style={`width:${pct}%`} /></span>
                  <span class="res-pct"><b>{pct}%</b><span class="rp-lbl">{t.known}</span></span>
                  <svg class="res-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
                <div class="res-topics" id={`ra-${r.key}`} hidden={!isOpen}>
                  {r.nodes.slice().sort((a, b) => b.p - a.p).map((n) => {
                    const kind = confOf(n.p);
                    return (
                      <div key={n.id} class="res-topic">
                        <span class="rt-name">{content.conceptById.get(n.id)?.label[lang] ?? n.id}</span>
                        <span class={`conf-tag ${kind}`}><Glyph kind={kind} /><span>{t[kind]}</span></span>
                        <span class="rt-pct">{Math.round(n.p * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div class="res-cols">
          {rank(strengths, "strong")}
          {rank(gaps, "gaps")}
        </div>

        <div class="res-cta">
          <a class="btn btn-primary" href={roadmap}><span>{t.toPath}</span><span class="arrow">→</span></a>
        </div>
      </div>
    </div>
  );
}
