// Hub bar — kicker + title + sub-lead, the register toggle (same engine, two registers), a CEFR
// chip (band from placement, within-band progress derived from live coverage), and the streak chip.
// Plain Preact, rendered inside HubLanding (NOT its own island). Reads the signals it depends on in
// the render body so it re-renders on change. Bilingual via an inline L object.
import { register, setRegister, type Register } from "~/english/register";
import { liveCoverage } from "~/english/coverage";
import { englishState, getPlacement } from "~/english/state";
import { userState } from "~/scripts/user-state";
import type { Band } from "~/english/types";
import { type Locale } from "~/i18n";

const NEXT_BAND: Record<Band, string> = { A2: "B1", B1: "B2", B2: "C1" };

export default function HubBar({ lang }: { lang: Locale }) {
  // subscribe
  const reg = register.value;
  englishState.value;
  const streak = userState.value.progression.streak;

  const band = (getPlacement()?.band ?? "A2") as Band;
  const cov = liveCoverage(reg);
  // within-band progress = how much of the current band's corpus the learner already knows.
  const bandPct = cov.bands.find((b) => b.band === band)?.pct ?? 0;

  const L =
    lang === "en"
      ? {
          kicker: "English for Engineers · the hub",
          title: "English Hub",
          subA: "One personalized path across what we ",
          build: "build",
          subB: ", what we ",
          delegate: "delegate",
          subC: " to your AI, and what we ",
          curate: "curate",
          subD: ".",
          regLabel: "Register",
          same: "same engine",
          engineering: "Engineering",
          everyday: "Everyday",
          level: "level",
          cefrTitle: "Common European Framework level",
          regGroup: "Register",
          streakTitle: "Days practiced in a row",
          days: streak.count === 1 ? "day" : "days",
        }
      : {
          kicker: "Английский для инженеров · хаб",
          title: "Английский Hub",
          subA: "Один персональный путь через то, что мы ",
          build: "создаём",
          subB: ", что мы ",
          delegate: "поручаем",
          subC: " твоему ИИ, и что мы ",
          curate: "отбираем",
          subD: ".",
          regLabel: "Регистр",
          same: "тот же движок",
          engineering: "Инженерный",
          everyday: "Повседневный",
          level: "уровень",
          cefrTitle: "Уровень по общеевропейской шкале",
          regGroup: "Регистр",
          streakTitle: "Дней подряд с практикой",
          days: "дней",
        };

  return (
    <section class="hub-bar">
      <div class="hb-lede">
        <div class="kicker">{L.kicker}</div>
        <h1 class="hb-title">{L.title}</h1>
        <p class="hb-sub">
          {L.subA}
          <em>{L.build}</em>
          {L.subB}
          <em>{L.delegate}</em>
          {L.subC}
          <em>{L.curate}</em>
          {L.subD}
        </p>
      </div>
      <div class="hub-controls">
        <div class="register">
          <span class="reg-label">
            {L.regLabel} <span class="swap" aria-hidden="true">⇄</span> {L.same}
          </span>
          <div class="seg" id="register-seg" role="group" aria-label={L.regGroup}>
            {(["engineering", "everyday"] as Register[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reg === r}
                onClick={() => setRegister(r)}
              >
                {r === "engineering" ? L.engineering : L.everyday}
              </button>
            ))}
          </div>
        </div>

        <div class="cefr" title={L.cefrTitle}>
          <span class="cefr-now">{band}</span>
          <span class="cefr-track">
            <span class="cefr-meta">
              <span>{L.level}</span>
              <span>→ {NEXT_BAND[band]}</span>
            </span>
            <span class="progress" style="--d:var(--accent)">
              <i style={`width:${bandPct}%`}></i>
            </span>
          </span>
        </div>

        <div class="streak-chip" title={L.streakTitle}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="color:var(--warn)">
            <path d="M12 2c1 3-1 4-1 6a3 3 0 006 0c0-1 2 2 2 6a7 7 0 11-14 0c0-3 2-5 3-7 1 2 3 1 4-5z" />
          </svg>
          <span class="s-num">{streak.count}</span> <span>{L.days}</span>
        </div>
      </div>
    </section>
  );
}
