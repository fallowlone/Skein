// src/components/path/PlacementResult.tsx
// Stage 4 of probabilistic placement: the rich result report. Renders per-domain mean-posterior
// bars (drill-down to a sorted concept list, each tagged known/shaky/unknown via collapse) plus
// top-5 strengths and gaps. Pure presentation over the final priors Map — no I/O, no client:
// directive (it is a child of the CalibrationFlow island, not its own island).
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content } from "~/scripts/path/path-io";
import { collapse } from "~/scripts/path/bayes";
import { DOMAIN_FAMILIES, FAMILY_OF } from "~/scripts/path/mastery-field";

const L = {
  en: { title: "Your placement", domains: "By area", strengths: "Strongest", gaps: "Biggest gaps", toPath: "See my path", known: "known" },
  ru: { title: "Твой уровень", domains: "По областям", strengths: "Сильнее всего", gaps: "Главные пробелы", toPath: "К моему пути", known: "знаю" },
} as const;

export default function PlacementResult({ lang, priors }: { lang: Locale; priors: Map<string, number> }) {
  const t = L[lang];
  const roadmap = `/${lang}/roadmap`;
  const [open, setOpen] = useState<string | null>(null);

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

  return (
    <div class="cal-flow">
      <h1 class="cf-title">{t.title}</h1>
      <h2 class="pr-h">{t.domains}</h2>
      <ul class="pr-domains">
        {rows.map((r) => (
          <li key={r.key} class="pr-dom">
            <button type="button" class="pr-dom-head" aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? null : r.key)}>
              <span class="pr-dom-label">{r.label}</span>
              <span class="pr-bar" style={`--p:${Math.round(r.mean * 100)}%;--hue:var(${r.hue})`} />
              <span class="pr-pct">{Math.round(r.mean * 100)}% {t.known}</span>
            </button>
            {open === r.key && (
              <ul class="pr-drill">
                {r.nodes.slice().sort((a, b) => b.p - a.p).map((n) => {
                  const c = collapse(n.p);
                  const cls = c.shaky ? "shaky" : c.confidence >= 0.6 ? "known" : "unknown";
                  return <li key={n.id} class={`pr-node ${cls}`}>
                    {content.conceptById.get(n.id)?.label[lang] ?? n.id} · {Math.round(n.p * 100)}%
                  </li>;
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div class="pr-cols">
        <div><h3 class="pr-h">{t.strengths}</h3><ul>{strengths.map((s) => <li key={s.id}>{s.label} · {Math.round(s.p * 100)}%</li>)}</ul></div>
        <div><h3 class="pr-h">{t.gaps}</h3><ul>{gaps.map((s) => <li key={s.id}>{s.label} · {Math.round(s.p * 100)}%</li>)}</ul></div>
      </div>
      <a class="btn btn-primary cf-self" href={roadmap}>{t.toPath}</a>
    </div>
  );
}
