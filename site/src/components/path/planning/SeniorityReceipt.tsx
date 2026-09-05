// src/components/path/planning/SeniorityReceipt.tsx
// Seniority Receipt — the diagnostic readout shown right after calibration (planned
// but no steps completed yet). Reframes calibration as a high-signal assessment:
// real per-domain strong/partial/missing rows from the knowledge field, then Plus
// as the weekly closure plan for those gaps.
import type { Locale } from "~/i18n";
import { effectiveKnowledge, config, content } from "~/scripts/path/path-io";
import { masteryField, type FamilyField } from "~/scripts/path/mastery-field";

type Level = "strong" | "partial" | "missing";

const L = {
  en: {
    title: "Your Seniority Receipt",
    note: "We'll turn these gaps into a weekly route with drills, reviews, and projects.",
    plusHead: "Close the gaps with Plus",
    feat1: "Weekly drills",
    feat2: "Interview loops",
    cta: "Start Plus",
    strong: "strong", partial: "partial", missing: "missing",
  },
  ru: {
    title: "Чек твоего уровня",
    note: "Превратим эти пробелы в недельный маршрут: дрели, повторения и проекты.",
    plusHead: "Закрой пробелы с Plus",
    feat1: "Недельные дрели",
    feat2: "Интервью-практики",
    cta: "Подключить Plus",
    strong: "уверенно", partial: "частично", missing: "пробел",
  },
} as const;

// Weighted mastery score per family (shaky counts half) → strong / partial / missing.
function levelOf(f: FamilyField, threshold: number): Level {
  const score = f.total ? (f.known + 0.5 * f.shaky) / f.total : 0;
  if (score >= Math.max(0.6, threshold)) return "strong";
  if (score >= 0.1 || f.shaky > 0) return "partial";
  return "missing";
}

export default function SeniorityReceipt({ lang }: { lang: Locale }) {
  const t = L[lang];
  const state = effectiveKnowledge(); // subscribe
  const threshold = config.value.weights.masteryThreshold; // subscribe
  const field = masteryField(state, content.concepts, threshold, lang);
  if (field.length === 0) return null;

  // Receipt rows: the one strongest family closes the list; the three weakest gaps
  // lead it. Real survey data — statuses come straight from the knowledge field.
  const ranked = [...field].sort(
    (a, b) => (b.known + b.shaky) / b.total - (a.known + a.shaky) / a.total,
  );
  const rows = [...ranked.slice(-3).reverse(), ranked[0]]
    .filter((f, i, arr) => arr.findIndex((x) => x.key === f.key) === i)
    .map((f) => ({ key: f.key, label: f.label[lang], level: levelOf(f, threshold) }));

  return (
    <section class="receipt" aria-labelledby="receipt-h">
      <h2 id="receipt-h" class="receipt-title">{t.title}</h2>
      <ul class="receipt-rows">
        {rows.map((r) => (
          <li key={r.key} class="receipt-row">
            <span class="receipt-box" aria-hidden="true" />
            <span class="receipt-label">{r.label}:</span>
            <span class={`receipt-status is-${r.level}`}>{t[r.level]}</span>
          </li>
        ))}
      </ul>
      <p class="receipt-note">{t.note}</p>
      <div class="receipt-plus">
        <h3 class="rp-head">{t.plusHead}</h3>
        <div class="rp-feats">
          <span class="rp-feat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {t.feat1}
          </span>
          <span class="rp-feat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            {t.feat2}
          </span>
        </div>
        <div class="rp-actions">
          <a class="btn btn-primary btn-sm" href={`/${lang}/account`}>
            <span>{t.cta}</span><span class="arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
