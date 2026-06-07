// NearMiss — "within reach": the top-3 locked numeric-threshold marks closest to done.
// Block-div progress fill (never an inline-span width). Real current/target from near-miss.ts.
// The parent omits this section entirely when nearMiss(...) returns empty.
import { type Locale } from "~/i18n";
import type { NearMissMark } from "~/scripts/progression/near-miss";

const L = {
  en: { left: (m: NearMissMark) => `${m.current} / ${m.target}` },
  ru: { left: (m: NearMissMark) => `${m.current} / ${m.target}` },
} as const;

export default function NearMiss({ marks, lang }: { marks: NearMissMark[]; lang: Locale }) {
  const t = L[lang];
  return (
    <div class="panel nearmiss">
      {marks.map((m) => (
        <div key={m.id} class="nm-row">
          <span class="nm-name"><b>{m.name}</b> — {m.cond}</span>
          <div class="nm-bar"><div style={`width:${m.pct}%`} /></div>
          <span class="nm-left">{t.left(m)}</span>
        </div>
      ))}
    </div>
  );
}
