// Illustrative sample screen: shows what a fuller session-history analytics view
// would look like once the site tracks per-attempt history across problems (today
// it only tracks per-problem status — see ~/components/algo/drill-state.ts). Every
// number here is fixed demo data, not measured — the kicker says so on screen.
import type { Locale } from "~/i18n";
import type { Labels } from "./labels";
import { monoLabel, monoLabelInk, tabStyle } from "./style-helpers";

type MetricsView = "patterns" | "habits" | "pace";
type Props = { lang: Locale; labels: Labels; view: MetricsView; onView: (v: MetricsView) => void };

const MATRIX = [
  { name: "arrays-hashing", cells: [92, 84, 41], solved: "14 / 18", due: false },
  { name: "two-pointers", cells: [88, 71, 22], solved: "9 / 12", due: false },
  { name: "sliding-window", cells: [76, 58, 0], solved: "6 / 10", due: true },
  { name: "trees", cells: [81, 49, 14], solved: "8 / 15", due: false },
  { name: "graphs", cells: [54, 31, 0], solved: "4 / 13", due: true },
  { name: "1d-dp", cells: [62, 28, 0], solved: "5 / 11", due: false },
  { name: "2d-dp", cells: [24, 9, 0], solved: "2 / 9", due: false },
  { name: "heaps", cells: [47, 18, 0], solved: "3 / 8", due: true },
];

const FAILURES_EN = ["Missing base case", "Off-by-one", "Wrong data structure", "Timed out", "Misread the problem"];
const FAILURES_RU = ["Пропущен базовый случай", "Ошибка на единицу", "Не та структура данных", "Не уложился по времени", "Неверно понял условие"];
const FAILURES_DATA = [
  { n: 14, pct: "34%", alpha: 62 }, { n: 9, pct: "22%", alpha: 40 }, { n: 7, pct: "17%", alpha: 26 },
  { n: 6, pct: "15%", alpha: 16 }, { n: 5, pct: "12%", alpha: 9 },
];

const VIEWS: MetricsView[] = ["patterns", "habits", "pace"];

export default function MetricsScreen({ lang, labels, view, onView }: Props) {
  const l = labels.metrics;
  const failureLabels = lang === "en" ? FAILURES_EN : FAILURES_RU;

  return (
    <div style="max-width:1180px;margin:0 auto;padding:40px 32px 64px">
      <span style={monoLabel}>{l.sampleNote}</span>
      <h1 style="font-family:var(--font-display);font-size:48px;font-weight:470;letter-spacing:-0.034em;line-height:1.02;margin:16px 0 0;max-width:22ch;text-wrap:pretty">{l.headline}</h1>

      <div style="display:flex;gap:2px;margin-top:28px;border-bottom:0.5px solid var(--rule-strong)">
        {VIEWS.map((v) => (
          <button key={v} type="button" onClick={() => onView(v)} style={tabStyle(view === v)}>{l.views[v]}</button>
        ))}
      </div>

      {view === "patterns" && (
        <div style="padding-top:32px">
          <div style="display:grid;grid-template-columns:180px repeat(3,86px) minmax(0,1fr) 96px;gap:0;align-items:end;padding-bottom:8px;border-bottom:0.5px solid var(--rule-strong)">
            <span style={monoLabelInk}>{l.pattern}</span>
            <span style={`${monoLabel};text-align:center`}>{l.easy}</span>
            <span style={`${monoLabel};text-align:center`}>{l.medium}</span>
            <span style={`${monoLabel};text-align:center`}>{l.hard}</span>
            <span />
            <span style={`${monoLabel};text-align:right`}>{l.solved}</span>
          </div>
          {MATRIX.map((row) => (
            <div key={row.name} style="display:grid;grid-template-columns:180px repeat(3,86px) minmax(0,1fr) 96px;gap:0;align-items:center;border-bottom:0.5px solid var(--hairline)">
              <span style="font-size:13.5px;color:var(--ink);padding:0 12px 0 0">{row.name}</span>
              {row.cells.map((v, i) => (
                <span key={i} style={`height:42px;display:grid;place-items:center;border-left:0.5px solid var(--hairline);background:color-mix(in srgb, var(--accent) ${v}%, transparent)`}>
                  <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--ink);font-variant-numeric:tabular-nums;background:var(--card);border:0.5px solid var(--rule);border-radius:1px;padding:2px 6px">{v === 0 ? "—" : v}</span>
                </span>
              ))}
              <span style={`padding-left:16px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:${row.due ? "var(--warn)" : "var(--muted)"}`}>
                {row.due ? labels.bank.status.due : ""}
              </span>
              <span style="font-family:var(--font-mono);font-size:12px;color:var(--ink-2);text-align:right;font-variant-numeric:tabular-nums">{row.solved}</span>
            </div>
          ))}
          <div style="display:flex;align-items:center;gap:16px;margin-top:20px">
            <span style={monoLabel}>{labels.rail.mastery}</span>
            <span style="display:flex;align-items:center;gap:0;border:0.5px solid var(--rule)">
              {[8, 26, 48, 70, 92].map((pct) => (
                <span key={pct} style={`width:34px;height:16px;background:color-mix(in srgb, var(--accent) ${pct}%, transparent)`} />
              ))}
            </span>
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted)">{l.masteryScaleNote}</span>
            <span style="flex:1" />
            <span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:var(--warn)">{l.due}</span>
          </div>
        </div>
      )}

      {view === "habits" && (
        <div style="padding-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
          <div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)">
              <span style={monoLabelInk}>{l.hintDependence}</span>
              <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--ok)">{l.falling}</span>
            </div>
            <p style="margin:14px 0 18px;font-size:14px;line-height:1.6;color:var(--muted);text-wrap:pretty">{l.hintDependenceBody}</p>
            <svg viewBox="0 0 420 190" style="width:100%;height:auto;display:block;overflow:visible" role="img" aria-label="Hint dependence falling from 2.8 to 0.9 rungs per problem over eleven weeks">
              <line x1="34" y1="10" x2="34" y2="150" stroke="var(--rule)" stroke-width="0.5" />
              <line x1="34" y1="150" x2="415" y2="150" stroke="var(--rule-strong)" stroke-width="0.5" />
              <line x1="34" y1="110" x2="415" y2="110" stroke="var(--hairline)" stroke-width="0.5" />
              <line x1="34" y1="70" x2="415" y2="70" stroke="var(--hairline)" stroke-width="0.5" />
              <line x1="34" y1="30" x2="415" y2="30" stroke="var(--hairline)" stroke-width="0.5" />
              <text x="26" y="153" text-anchor="end" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">0</text>
              <text x="26" y="113" text-anchor="end" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">1</text>
              <text x="26" y="73" text-anchor="end" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">2</text>
              <text x="26" y="33" text-anchor="end" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">3</text>
              <polyline points="46,38 80,46 114,42 148,62 182,58 216,78 250,86 284,74 318,98 352,106 386,114" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
              <circle cx="46" cy="38" r="2" fill="var(--accent)" />
              <circle cx="386" cy="114" r="3" fill="var(--accent)" />
              <text x="386" y="132" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--ink)">0.9</text>
              <text x="46" y="28" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--muted)">2.8</text>
              <text x="46" y="166" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">wk 1</text>
              <text x="386" y="166" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">wk 11</text>
            </svg>
          </div>

          <div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)">
              <span style={monoLabelInk}>{l.whyFailed}</span>
              <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted);font-variant-numeric:tabular-nums">{l.failuresCount(41)}</span>
            </div>
            <p style="margin:14px 0 18px;font-size:14px;line-height:1.6;color:var(--muted);text-wrap:pretty">{l.whyFailedBody}</p>
            <div style="display:flex;height:26px;border:0.5px solid var(--rule)">
              {FAILURES_DATA.map((f, i) => (
                <span key={i} style={`width:${f.pct};background:color-mix(in srgb, var(--danger) ${f.alpha}%, transparent)`} />
              ))}
            </div>
            <div style="margin-top:18px">
              {FAILURES_DATA.map((f, i) => (
                <div key={i} style="display:grid;grid-template-columns:14px minmax(0,1fr) 52px 44px;gap:12px;align-items:center;padding:9px 0;border-bottom:0.5px solid var(--hairline)">
                  <span style={`width:14px;height:14px;border-radius:1px;background:color-mix(in srgb, var(--danger) ${f.alpha}%, transparent);border:0.5px solid var(--rule)`} />
                  <span style="font-size:13.5px;color:var(--ink-2)">{failureLabels[i]}</span>
                  <span style="font-family:var(--font-mono);font-size:12px;color:var(--ink);text-align:right;font-variant-numeric:tabular-nums">{f.n}</span>
                  <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums">{f.pct}</span>
                </div>
              ))}
            </div>
            <p style="margin:16px 0 0;font-size:13.5px;line-height:1.6;color:var(--ink-2);text-wrap:pretty">{l.whyFailedFoot}</p>
          </div>
        </div>
      )}

      {view === "pace" && (
        <div style="padding-top:32px">
          <div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid var(--rule-strong)">
            <span style={monoLabelInk}>{l.timeVsTarget}</span>
            <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--muted)">{l.timeVsTargetNote}</span>
          </div>
          <svg viewBox="0 0 1116 240" style="width:100%;height:auto;display:block;margin-top:24px;overflow:visible" role="img" aria-label="Time to solve per problem against target, most bars near or under target in recent weeks">
            <line x1="30" y1="200" x2="1110" y2="200" stroke="var(--rule-strong)" stroke-width="0.5" />
            <line x1="30" y1="20" x2="30" y2="200" stroke="var(--rule)" stroke-width="0.5" />
            <text x="22" y="204" text-anchor="end" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">0</text>
            <text x="22" y="124" text-anchor="end" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">15</text>
            <text x="22" y="44" text-anchor="end" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">30</text>
            <line x1="30" y1="120" x2="1110" y2="120" stroke="var(--rule)" stroke-width="0.5" stroke-dasharray="4 4" />
            <g fill="color-mix(in srgb, var(--accent) 45%, transparent)">
              {[58, 72, 46, 96, 84, 110, 68, 126, 102, 140, 116, 92, 132, 148, 124, 106, 152, 138, 160, 130, 146].map((y, i) => (
                <rect key={i} x={42 + i * 48} y={y} width="30" height={200 - y} />
              ))}
            </g>
            <rect x="1050" y="102" width="30" height="98" fill="color-mix(in srgb, var(--accent) 92%, transparent)" />
            <text x="1065" y="94" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--ink)">3Sum</text>
            <text x="1114" y="118" font-family="var(--font-mono)" font-size="9" fill="var(--muted)">target</text>
          </svg>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:32px;border-top:0.5px solid var(--rule-strong);border-bottom:0.5px solid var(--rule-strong)">
            <div style="padding:18px 20px 18px 0;border-right:0.5px solid var(--rule)">
              <div style="font-family:var(--font-mono);font-size:30px;letter-spacing:-0.03em;color:var(--ink);font-variant-numeric:tabular-nums">14:06</div>
              <div style={`${monoLabel};margin-top:6px`}>{l.medianSolve}</div>
            </div>
            <div style="padding:18px 20px;border-right:0.5px solid var(--rule)">
              <div style="font-family:var(--font-mono);font-size:30px;letter-spacing:-0.03em;color:var(--ink);font-variant-numeric:tabular-nums">15 / 22</div>
              <div style={`${monoLabel};margin-top:6px`}>{l.underTarget}</div>
            </div>
            <div style="padding:18px 20px;border-right:0.5px solid var(--rule)">
              <div style="font-family:var(--font-mono);font-size:30px;letter-spacing:-0.03em;color:var(--ok);font-variant-numeric:tabular-nums">−31%</div>
              <div style={`${monoLabel};margin-top:6px`}>{l.vsFirstWeeks}</div>
            </div>
            <div style="padding:18px 0 18px 20px">
              <div style="font-family:var(--font-mono);font-size:30px;letter-spacing:-0.03em;color:var(--ink);font-variant-numeric:tabular-nums">9</div>
              <div style={`${monoLabel};margin-top:6px`}>{l.unaidedRow}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
