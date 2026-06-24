// src/components/progression/ReadinessDashboard.tsx
// "Am I ready?" — one island that surfaces every measurement the adaptive engine takes of the
// learner: live rank (high-water), the senior-by-date forecast, weak spots, and interview
// readiness. Pure presentation over currentReadiness(); reuses the tested selectors verbatim.
import { useEffect } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { currentReadiness, content } from "~/scripts/path/path-io";
import { ratingToRank } from "~/scripts/progression/ranks";
import unitsJson from "~/content/units.json";

type UnitMeta = { track: string; slug: string; firstLesson?: string };
const UNIT_META = new Map<string, UnitMeta>(
  (unitsJson as Array<{ id: string; slug: string; track: string; lessons: string[] }>).map((u) => [
    u.id,
    { track: u.track, slug: u.slug, firstLesson: u.lessons?.[0] },
  ]),
);
function startHref(lang: Locale, unitId: string): string {
  const m = UNIT_META.get(unitId);
  return m?.firstLesson ? `/${lang}/learn/${m.track}/${m.slug}/${m.firstLesson}` : `/${lang}/`;
}

function fmtDate(ms: number, lang: Locale): string {
  return new Date(ms).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReadinessDashboard({ lang }: { lang: Locale }) {
  useEffect(() => {
    document.getElementById("readiness-fallback")?.remove();
  }, []);

  const r = currentReadiness();
  const rank = ratingToRank(r.displayRating);
  const barLabel = ratingToRank(r.barRating).label[lang];

  // What the rank MEANS: the market gloss on anchor ranks (e.g. "≈ junior baseline"), else the
  // tier band so every rank reads as junior / middle / senior. Plus the 0–1000 scale + goal target.
  const tierBand: Record<string, { en: string; ru: string }> = {
    junior: { en: "junior level", ru: "джуниор-уровень" },
    middle: { en: "middle level", ru: "миддл-уровень" },
    senior: { en: "senior level", ru: "сеньор-уровень" },
  };
  const meaning = rank.market?.[lang] ?? tierBand[rank.contentTier]?.[lang] ?? "";
  const scaleHint = lang === "ru" ? `шкала 0–1000 · цель ${r.barRating}` : `0–1000 scale · goal ${r.barRating}`;

  const deltaText = (d: number) =>
    d > 0
      ? t("readiness.behind", lang).replace("{d}", String(d))
      : d < 0
        ? t("readiness.ahead", lang).replace("{d}", String(-d))
        : t("readiness.onTime", lang);

  const weak = r.weakSpots.map((w) => ({
    key: w.unitId,
    href: startHref(lang, w.unitId),
    title: content.unitTitleById.get(w.unitId)?.[lang] ?? w.unitId,
  }));

  const recal = r.recalibration;
  const recalMsg =
    recal.reason === "gain"
      ? t("readiness.recalibrateGain", lang).replace("{n}", String(Math.round(recal.studyGain)))
      : recal.reason === "age"
        ? t("readiness.recalibrateAge", lang).replace("{d}", String(recal.daysSinceCalibration))
        : "";

  return (
    <>
      {recal.stale && (
        <aside class="rd-recal" role="note">
          <span class="rd-head">{t("readiness.recalibrate", lang)}</span>
          <p>{recalMsg}</p>
          <a class="rd-recal-cta" href={`/${lang}/calibrate/`}>{t("readiness.recalibrateCta", lang)}</a>
        </aside>
      )}
      <div class="rd-grid">
      <section class="rd-card rd-rank" style={`--rk:${rank.color}`}>
        <span class="rd-head">{t("readiness.rank", lang)}</span>
        <strong class="rd-rank-label">
          <span class="rd-ico" aria-hidden="true">{rank.icon}</span> {rank.label[lang]}
        </strong>
        <span class="rd-rating">{r.displayRating}</span>
        <span class="rd-meaning">{meaning ? `${meaning} · ${scaleHint}` : scaleHint}</span>
        {r.movedUp && (
          <span class="rd-moved">
            {t("readiness.placedNow", lang)
              .replace("{p}", String(r.placedRating))
              .replace("{n}", String(r.displayRating))}
          </span>
        )}
        {r.evidence && !r.evidence.met && (
          <span class="rd-evidence" title={t("readiness.evidenceHint", lang)}>
            {t("readiness.evidence", lang)
              .replace("{p}", String(r.evidence.proven))
              .replace("{n}", String(r.evidence.needed))}
          </span>
        )}
      </section>

      <section class="rd-card rd-forecast">
        <span class="rd-head">{t("readiness.forecast", lang)}</span>
        {r.forecast == null ? (
          <p class="rd-muted">{t("readiness.forecastNoData", lang)}</p>
        ) : r.forecast.reached ? (
          <p class="rd-strong">{t("readiness.forecastReached", lang).replace("{bar}", barLabel)}</p>
        ) : r.forecast.projectedMs != null ? (
          <p>
            {t("readiness.forecastBy", lang)
              .replace("{bar}", barLabel)
              .replace("{date}", fmtDate(r.forecast.projectedMs, lang))
              .replace("{delta}", deltaText(r.forecast.daysAheadBehind))}
          </p>
        ) : r.forecast.plan && r.deadlineMs != null ? (
          // Deadline set but no study history yet → answer from the plan feasibility (the same
          // verdict the deadline tool shows) instead of the misleading "set a deadline" copy.
          <p class={r.forecast.plan.fits ? "rd-strong" : undefined}>
            {t(r.forecast.plan.fits ? "readiness.forecastPlanFits" : "readiness.forecastPlanOver", lang)
              .replace("{bar}", barLabel)
              .replace("{date}", fmtDate(r.deadlineMs, lang))
              .replace("{h}", String(Math.max(0, Math.round(r.forecast.plan.deltaMin / 60))))}
          </p>
        ) : (
          <p class="rd-muted">{t("readiness.forecastNoData", lang)}</p>
        )}
      </section>

      <section class="rd-card rd-weak">
        <span class="rd-head">{t("readiness.weak", lang)}</span>
        {weak.length === 0 ? (
          <p class="rd-muted">{t("readiness.weakNone", lang)}</p>
        ) : (
          <ul class="rd-list">
            {weak.map((w) => (
              <li key={w.key}>
                <a href={w.href}>{w.title}</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section class="rd-card rd-interview">
        <span class="rd-head">{t("readiness.interview", lang)}</span>
        {r.interviewReadiness == null ? (
          <p class="rd-muted">
            {t("readiness.interviewNone", lang)}{" "}
            <a href={`/${lang}/interview/`}>{t("readiness.interviewCta", lang)}</a>
          </p>
        ) : (
          <div class="rd-iv">
            <strong class="rd-iv-score">{r.interviewReadiness}%</strong>
            <div class="rd-iv-bar" role="presentation">
              <span style={`width:${r.interviewReadiness}%`} />
            </div>
            <a class="rd-iv-cta" href={`/${lang}/interview/`}>
              {t("readiness.interviewCta", lang)}
            </a>
          </div>
        )}
      </section>
      </div>
    </>
  );
}
