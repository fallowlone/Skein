// src/components/path/planning/ConceptMasteryMap.tsx
// Signature instrument #1 — the concept-mastery map. A survey of every concept
// grouped into 8 domain families, each node tagged known/shaky/unknown. All data
// is real: masteryField over the live knowledge signal + committed concepts.
import type { Locale } from "~/i18n";
import { knowledge, config, content } from "~/scripts/path/path-io";
import { masteryField, topShaky, topGaps } from "~/scripts/path/mastery-field";

const NODE_CAP = 80; // render budget per family; overflow shown as +N count

const L = {
  en: {
    label: "Knowledge field · by domain",
    title: (n: number) => `${n} concepts mapped across 29 tracks`,
    known: "known", shaky: "shaky", unknown: "unknown",
    countSuffix: (k: number, total: number, s: number) => `${k} / ${total} known · ${s} shaky`,
    shakyCall: "Shaky", gapCall: "Gap",
    empty: "No concepts surveyed yet — run a calibration to populate the field.",
    sig: "Signature. Not a progress bar — a survey of which concepts you hold, which are shaky, and which are blank, clustered by domain so the gaps are legible at a glance.",
  },
  ru: {
    label: "Поле знаний · по доменам",
    title: (n: number) => `${n} концептов размечено по 29 трекам`,
    known: "освоено", shaky: "шатко", unknown: "пробел",
    countSuffix: (k: number, total: number, s: number) => `${k} / ${total} освоено · ${s} шатко`,
    shakyCall: "Шатко", gapCall: "Пробел",
    empty: "Пока ничего не размечено — пройди калибровку, чтобы заполнить поле.",
    sig: "Подпись. Не полоска прогресса — а карта того, какие концепты ты держишь, какие шатки и какие пусты, сгруппированная по доменам, чтобы пробелы были видны сразу.",
  },
} as const;

export default function ConceptMasteryMap({ lang }: { lang: Locale }) {
  const t = L[lang];
  const state = knowledge.value; // subscribe
  const threshold = config.value.weights.masteryThreshold; // subscribe
  const field = masteryField(state, content.concepts, threshold, lang);

  const totalKnown = field.reduce((a, f) => a + f.known, 0);
  const totalShaky = field.reduce((a, f) => a + f.shaky, 0);
  const totalUnknown = field.reduce((a, f) => a + f.unknown, 0);
  const total = totalKnown + totalShaky + totalUnknown;

  const shakyCall = topShaky(field, lang, 3);
  const gapCall = topGaps(field, lang, 3);

  return (
    <div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <span class="ph-label">{t.label}</span>
            <div class="ph-title" style="margin-top:4px">{t.title(total)}</div>
          </div>
          <div class="km-legend">
            <span><i class="kd known" />{t.known} {totalKnown}</span>
            <span><i class="kd shaky" />{t.shaky} {totalShaky}</span>
            <span><i class="kd unknown" />{t.unknown} {totalUnknown}</span>
          </div>
        </div>

        {field.length === 0 ? (
          <p class="cmap-empty">{t.empty}</p>
        ) : (
          <div class="cmap">
            {field.map((f) => {
              const pct = f.total ? Math.round((f.known / f.total) * 100) : 0;
              const shown = f.nodes.slice(0, NODE_CAP);
              const overflow = f.nodes.length - shown.length;
              return (
                <div key={f.key} class="cmap-cluster" style={`--d:var(${f.hue})`}>
                  <div class="cmap-label">
                    <div class="cl-name"><span class="sq" />{f.label[lang]}</div>
                    <div class="cl-count">{t.countSuffix(f.known, f.total, f.shaky)}</div>
                    <div class="cl-bar"><div style={`width:${pct}%`} /></div>
                  </div>
                  <div class="cmap-nodes">
                    {shown.map((n) => (
                      <div
                        key={n.id}
                        class={`cnode ${n.state === "unknown" ? "" : n.state}`}
                        title={`${n.label} · ${t[n.state]}`}
                      />
                    ))}
                    {overflow > 0 && <span class="cnode-more">+{overflow}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(shakyCall.length > 0 || gapCall.length > 0) && (
          <div class="cmap-foot">
            <div class="cmap-calls">
              {shakyCall.length > 0 && (
                <span class="cmap-call"><i class="kd shaky" />{t.shakyCall}: {shakyCall.join(", ")}</span>
              )}
              {gapCall.length > 0 && (
                <span class="cmap-call"><i class="kd unknown" />{t.gapCall}: {gapCall.join(", ")}</span>
              )}
            </div>
          </div>
        )}
      </div>
      <p class="fig-caption"><b>{t.sig.split(".")[0]}.</b>{t.sig.slice(t.sig.indexOf(".") + 1)}</p>
    </div>
  );
}
