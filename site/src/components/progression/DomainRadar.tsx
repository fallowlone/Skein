// src/components/progression/DomainRadar.tsx
// Signature instrument — per-domain competence radar. Real data only: domainRatings()
// over the live path-engine knowledge signal + committed concepts. The single global
// engine rating hides per-domain strength, so this plots mastery-derived competence
// (0..100) per domain family — labelled honestly as competence, NOT a per-domain Elo.
// The polygon/axes are SVG; the side bars use block-div fills (never inline-span width).
import type { Locale } from "~/i18n";
import { effectiveKnowledge, config, content } from "~/scripts/path/path-io";
import { domainRatings } from "~/scripts/progression/domain-ratings";

const L = {
  en: {
    label: "Competence by domain", title: "Where you're strong — and where you're not",
    unit: "% mastered",
    sig: "Signature. One rating hides the truth. This plots competence per domain — mastery-derived, not a separate Elo — so a strong backend sits visibly next to a real distributed-systems gap.",
    aria: "Per-domain competence radar",
    empty: "No concepts surveyed yet — take the placement or run a calibration to plot the radar.",
  },
  ru: {
    label: "Компетентность по доменам", title: "Где ты силён — и где нет",
    unit: "% освоено",
    sig: "Подпись. Один рейтинг скрывает правду. Здесь — компетентность по доменам, выведенная из освоения, а не отдельный Elo — так что сильный бэкенд виден рядом с реальным пробелом в распределённых системах.",
    aria: "Радар компетентности по доменам",
    empty: "Пока ничего не размечено — пройди placement или калибровку, чтобы построить радар.",
  },
} as const;

export default function DomainRadar({ lang }: { lang: Locale }) {
  const t = L[lang];
  const state = effectiveKnowledge();            // subscribe
  const threshold = config.value.weights.masteryThreshold; // subscribe
  const domains = domainRatings(state, content.concepts, threshold);

  if (domains.length === 0) {
    return (
      <div class="panel"><p class="radar-empty">{t.empty}</p></div>
    );
  }

  const cx = 150, cy = 150, R = 104, N = domains.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const pt = (i: number, rad: number): [number, number] => [
    cx + rad * Math.cos(ang(i)),
    cy + rad * Math.sin(ang(i)),
  ];
  const ringPath = (f: number) => {
    let d = "";
    for (let i = 0; i < N; i++) {
      const [x, y] = pt(i, R * f);
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
    }
    return d + "Z";
  };
  let polyD = "";
  domains.forEach((dm, i) => {
    const [x, y] = pt(i, R * (dm.score / 100));
    polyD += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  });
  polyD += "Z";

  const ariaLabel = `${t.aria}: ${domains.map((d) => `${d.label[lang]} ${d.score}%`).join(", ")}`;
  const sorted = [...domains].sort((a, b) => b.score - a.score);

  return (
    <div>
      <div class="panel">
        <div class="panel-head">
          <span class="ph-label">{t.label}</span>
          <span class="ph-note">{t.title}</span>
        </div>
        <div class={`radar-wrap${N < 3 ? " bars-only" : ""}`}>
          {N >= 3 && (
          <div class="radar">
            <svg viewBox="0 0 300 300" role="img" aria-label={ariaLabel}>
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <path key={f} class="grid-ring" d={ringPath(f)} />
              ))}
              {domains.flatMap((dm, i) => {
                const [x, y] = pt(i, R);
                const [lx, ly] = pt(i, R + 22);
                const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
                // flatMap + per-element keys (Preact drops keys on a <>…</> Fragment).
                return [
                  <line key={`ax-${dm.key}`} class="axis" x1={cx} y1={cy} x2={x} y2={y} />,
                  <text
                    key={`lb-${dm.key}`} class="albl"
                    x={lx.toFixed(1)} y={ly.toFixed(1)}
                    text-anchor={anchor} dominant-baseline="middle"
                  >{dm.label[lang]}</text>,
                ];
              })}
              <path class="poly" d={polyD} />
              {domains.map((dm, i) => {
                const [x, y] = pt(i, R * (dm.score / 100));
                return <circle key={`v-${dm.key}`} class="vert" cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.6" />;
              })}
            </svg>
          </div>
          )}
          <div class="dom-bars">
            {sorted.map((dm) => (
              <div key={dm.key} class="dom-bar" style={`--d:var(${dm.hue})`}>
                <div class="db-name">{dm.label[lang]}</div>
                <div class="db-track"><div style={`width:${dm.score}%`} /></div>
                <div class="db-val">{dm.score}<small>%</small></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p class="fig-caption"><b>{t.sig.split(".")[0]}.</b>{t.sig.slice(t.sig.indexOf(".") + 1)}</p>
    </div>
  );
}
