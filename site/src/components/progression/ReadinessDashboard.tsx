// src/components/progression/ReadinessDashboard.tsx
// "Am I ready?" — one island that surfaces every measurement the adaptive engine takes of the
// learner: live rank (high-water), the senior-by-date forecast, weak spots, and interview
// readiness. Pure presentation over currentReadiness(); reuses the tested selectors verbatim.
import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { currentReadiness, content, config } from "~/scripts/path/path-io";
import { ratingToRank } from "~/scripts/progression/ranks";
import { barRatingForGoal } from "~/scripts/progression/effective-rating";
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

export default function ReadinessDashboard({ lang }: { lang: Locale }) {
  useEffect(() => {
    document.getElementById("readiness-fallback")?.remove();
  }, []);

  const r = currentReadiness();
  const rank = ratingToRank(r.displayRating);

  // What the rank MEANS: the market gloss on anchor ranks (e.g. "≈ junior baseline"), else the
  // tier band so every rank reads as junior / middle / senior. Plus the 0–1000 scale + goal target.
  const tierBand: Record<string, { en: string; ru: string }> = {
    junior: { en: "junior level", ru: "джуниор-уровень" },
    middle: { en: "middle level", ru: "миддл-уровень" },
    senior: { en: "senior level", ru: "сеньор-уровень" },
  };
  const meaning = rank.market?.[lang] ?? tierBand[rank.contentTier]?.[lang] ?? "";
  const scaleHint = lang === "ru" ? `шкала 0–1000 · цель ${r.barRating}` : `0–1000 scale · goal ${r.barRating}`;

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

      {/* Forecast Builder — the forecast placeholder becomes an interactive
          mini-builder (target + deadline) that previews a locked projection
          timeline; the full forecast + weekly plan is the Pro unlock. */}
      <ForecastBuilderCard lang={lang} displayRating={r.displayRating} />

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

// ── Forecast Builder ──────────────────────────────────────────────────────────
// Interactive mini-builder: target goal + deadline feed a locked projection
// timeline (six monthly ticks). The full forecast + weekly plan stays behind
// the Pro CTA — the chart is a teaser, not the instrument. Real signals seed
// it: the active goal, a stored deadline, and the live display rating.
function ForecastBuilderCard({ lang, displayRating }: { lang: Locale; displayRating: number }) {
  const cfg = config.value; // subscribe — prefills the builder from the real plan
  const [target, setTarget] = useState(cfg.goals[0]?.id ?? "senior-fullstack");
  const [deadline, setDeadline] = useState(
    cfg.deadline?.targetDateMs ? new Date(cfg.deadline.targetDateMs).toISOString().slice(0, 10) : "",
  );

  const goalRating = Math.max(1, barRatingForGoal(target));
  const curPct = Math.min(100, Math.max(0, (displayRating / goalRating) * 100));

  // Six monthly ticks from the current month (the locked preview window).
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() + i, 1));
  const monthLabel = (d: Date) =>
    d.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { month: "short" }).replace(".", "");
  const today = new Date().toISOString().slice(0, 10);

  // Deadline position on the timeline, clamped into the preview window.
  let dlIdx = -1;
  if (deadline) {
    const d = new Date(`${deadline}T00:00:00`);
    const m = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
    dlIdx = Math.min(5, Math.max(1, m));
  }

  // Projected readiness at each tick: a linear climb from the current level to
  // the goal bar. Deliberately simple — the honest curve is the Pro unlock.
  const vals = months.map((_, i) => curPct + ((100 - curPct) * i) / 5);
  const W = 340, H = 150, padL = 42, padR = 10, padT = 12, padB = 20;
  const x = (i: number) => padL + (i * (W - padL - padR)) / 5;
  const y = (pct: number) => padT + (1 - pct / 100) * (H - padT - padB);
  const solid = vals.slice(0, 2).map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const dashed = vals.slice(1).map((v, i) => `${x(i + 1)},${y(v)}`).join(" ");
  const midPct = Math.round(vals[dlIdx >= 0 ? dlIdx : 2]);

  return (
    <section class="rd-card rd-forecast">
      <span class="rd-head-row">
        <span class="rd-head">{t("readiness.forecast", lang)}</span>
        <span class="rd-pro">PRO</span>
      </span>
      <p class="rd-fb-hint">{t("readiness.forecastNoData", lang)}</p>
      <div class="rd-fb-form">
        <label class="rd-fb-field">
          <span class="rd-fb-label">{t("readiness.forecastTarget", lang)}</span>
          <select value={target} onChange={(e) => setTarget(e.currentTarget.value)}>
            {content.goals.map((g) => (
              <option key={g.id} value={g.id}>{g.label[lang]}</option>
            ))}
          </select>
        </label>
        <label class="rd-fb-field">
          <span class="rd-fb-label">{t("readiness.forecastDeadline", lang)}</span>
          <input type="date" value={deadline} min={today} onChange={(e) => setDeadline(e.currentTarget.value)} />
        </label>
      </div>
      <span class="rd-head-row rd-fb-chart-head">
        <span class="rd-fb-label">{t("readiness.forecastProjected", lang)}</span>
        <span class="rd-pro">PRO</span>
      </span>
      <svg class="rd-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("readiness.forecastProjected", lang)}>
        <text x={padL - 6} y={y(0) + 3} class="rd-chart-y" text-anchor="end">0%</text>
        <text x={padL - 6} y={y(midPct) + 3} class="rd-chart-y" text-anchor="end">{midPct}%</text>
        <text x={padL - 6} y={y(100) + 3} class="rd-chart-y" text-anchor="end">100%</text>
        <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} class="rd-chart-axis" />
        {dlIdx >= 0 && <line x1={x(dlIdx)} y1={padT} x2={x(dlIdx)} y2={y(0)} class="rd-chart-deadline" />}
        <polyline points={solid} class="rd-chart-solid" />
        <polyline points={dashed} class="rd-chart-dashed" />
        {vals.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={2.6} class="rd-chart-dot" />
        ))}
        {months.map((d, i) => (
          <text key={i} x={x(i)} y={H - 4} class="rd-chart-x" text-anchor="middle">{monthLabel(d)}</text>
        ))}
      </svg>
      <p class="rd-fb-unlock">{t("readiness.forecastUnlock", lang)}</p>
      <a class="rd-fb-primary" href={`/${lang}/account`}>
        {t("readiness.forecastBuildCta", lang)} <span class="rd-pro-chip">PRO</span>
      </a>
      <a class="rd-fb-secondary" href={`/${lang}/interview/`}>{t("readiness.forecastMockCta", lang)}</a>
    </section>
  );
}
