import { useEffect, useState } from "preact/hooks";
import { fetchCoachStatus, recheckCoachStatus, type CoachStatus } from "~/lib/coach";
import { type Locale } from "~/i18n";

const COPY = {
  en: {
    active: "Coach active",
    activeSub: (remaining: number, limit: number) => `${remaining} / ${limit} managed reviews left this month`,
    unavailable: "Plus unavailable",
  },
  ru: {
    active: "Coach активен",
    activeSub: (remaining: number, limit: number) => `${remaining} / ${limit} managed-разборов осталось в этом месяце`,
    unavailable: "Plus недоступен",
  },
} as const;

export default function CoachSidecar({ lang }: { lang: Locale }) {
  const [status, setStatus] = useState<CoachStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchCoachStatus()
      .then((next) => { if (live) setStatus(next); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!status?.authenticated) return;
    let live = true;
    const refresh = () => {
      recheckCoachStatus()
        .then((next) => { if (live) setStatus(next); })
        .catch(() => {});
    };
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      window.removeEventListener("focus", refresh);
    };
  }, [status?.authenticated]);

  const t = COPY[lang];
  const coach = status?.entitlements.coach === true;
  const billingReady = Boolean(status?.billing.configured && status.billing.sponsorUrl && status.managedAi.available);
  const needsLogin = Boolean(status && billingReady && (!status.authenticated || status.billing.verification === "reauth_required"));
  const canSell = Boolean(status?.authenticated && billingReady && status.billing.verification === "verified");
  const checkoutHref = canSell ? status?.billing.sponsorUrl ?? undefined : needsLogin ? `/api/auth/login?lang=${lang}&returnTo=coach` : undefined;

  return (
    <aside class="coach-sidecar" aria-labelledby="coach-sidecar-title">
      <div class="coach-kicker">COACH VIEW</div>
      <div class="coach-title-row">
        <h2 id="coach-sidecar-title">Coach view</h2>
        <span class="coach-lang">RU</span>
      </div>
      <p class="coach-translation">Взгляд ментора</p>

      <div class="coach-rule" />

      <div class="coach-nudge">
        <strong>DEPTH: 0/7 — YOUR FASTEST WIN IS SCHOLAR</strong>
        <span>DEPTH: 0/7 — ТВОЯ БЫСТРАЯ ПОБЕДА — SCHOLAR</span>
      </div>

      <div class="coach-rule" />

      <div class="coach-preview-head">
        <span>PLUS PREVIEW</span>
        <span class="coach-lang">RU</span>
      </div>
      <p class="coach-preview-translation">Превью Plus</p>

      <div class="coach-preview" aria-hidden="true">
        <div class="coach-preview-line coach-preview-line-short" />
        <div class="coach-preview-row"><span /><i /></div>
        <div class="coach-preview-row"><span /><i /></div>
        <div class="coach-preview-row"><span /><i /></div>
        <svg class="coach-preview-chart" viewBox="0 0 120 96" fill="none">
          <path d="M60 7 105 34 92 82H28L15 34 60 7Z" />
          <path d="M60 21 88 38 80 68H40L32 38 60 21Z" />
          <path d="m60 18 20 29-7 20-24 4-17-29 28-24Z" />
          <path d="M60 7v75M15 34l77 48M105 34 28 82" />
        </svg>
        <div class="coach-preview-note" />
      </div>

      {coach && status ? (
        <div class="coach-paid" aria-live="polite">
          <strong>{t.active}</strong>
          <span>{t.activeSub(status.managedAi.remaining, status.managedAi.limit)}</span>
        </div>
      ) : checkoutHref ? (
        <a
          class="coach-upgrade"
          href={checkoutHref}
          target={canSell ? "_blank" : undefined}
          rel={canSell ? "noreferrer" : undefined}
        >
          <span class="coach-upgrade-main">Upgrade to Plus <span class="coach-lang coach-lang-dark">RU</span></span>
          <span class="coach-upgrade-translation">Поддержать Plus</span>
        </a>
      ) : (
        <div class="coach-upgrade coach-upgrade-disabled" aria-live="polite">
          <span class="coach-upgrade-main">{failed ? t.unavailable : status ? t.unavailable : "…"}</span>
          <span class="coach-upgrade-translation">{failed || status ? t.unavailable : " "}</span>
        </div>
      )}

      <p class="coach-footnote">
        Keeps the curriculum free.<br />
        <span>RU Сохраняет курс бесплатным.</span>
      </p>
    </aside>
  );
}
