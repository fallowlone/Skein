import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { userState, setTier, setMotion, resetAll, setPretest } from "~/scripts/user-state";
import { todayISO } from "~/scripts/progression/streak";
import { exportModel, importModel } from "~/scripts/model-backup";
import { type Locale } from "~/i18n";
import type { Tier } from "~/types";
import { fetchCoachStatus, recheckCoachStatus, type CoachStatus } from "~/lib/coach";

type Props = { lang: Locale };

const ruHints = {
  tier: "Уровень по умолчанию",
  theme: "Тема",
  density: "Плотность",
  motion: "Движение",
  yourData: "Ваши данные",
  yourDataHint: "Ваш прогресс хранится в этом браузере. Сохраняйте резервную копию.",
  exportBtn: "Экспорт прогресса",
  importBtn: "Импорт",
  retake: "Пройти пре-тест заново",
  reset: "Сбросить весь прогресс",
};

const labels = {
  en: {
    title: "Settings",
    tier: "Default tier",
    motion: "Motion",
    motionAuto: "auto (respect OS)",
    motionOn: "always on",
    motionOff: "off",
    theme: "Theme",
    light: "light",
    dark: "dark",
    density: "Density",
    compact: "compact",
    regular: "regular",
    spacious: "spacious",
    retake: "Retake pretest",
    reset: "Reset all progress",
    resetConfirm: "Reset all progress?",
    section: "settings",
    yourData: "Your data",
    yourDataHint: "Your progress lives in this browser. Keep a backup.",
    exportBtn: "Export progress",
    importBtn: "Import",
    importedMsg: (n: number) => `Restored ${n} keys. Reloading…`,
    importErrMsg: "Invalid backup file",
  },
  ru: {
    title: "Настройки",
    tier: "Уровень по умолчанию",
    motion: "Анимация",
    motionAuto: "авто (по системе)",
    motionOn: "всегда вкл",
    motionOff: "выкл",
    theme: "Тема",
    light: "light",
    dark: "dark",
    density: "Плотность",
    compact: "compact",
    regular: "regular",
    spacious: "spacious",
    retake: "Пересдать pretest",
    reset: "Сбросить весь прогресс",
    resetConfirm: "Сбросить весь прогресс?",
    section: "настройки",
    yourData: "Твои данные",
    yourDataHint: "Прогресс хранится в этом браузере. Сохрани резервную копию.",
    exportBtn: "Экспорт прогресса",
    importBtn: "Импорт",
    importedMsg: (n: number) => `Восстановлено ключей: ${n}. Перезагрузка…`,
    importErrMsg: "Неверный файл резервной копии",
  },
};

export default function SettingsDrawer({ lang }: Props) {
  const s = userState.value;
  const l = labels[lang];
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [density, setDensity] = useState<"compact" | "regular" | "spacious">("regular");

  useEffect(() => {
    const t = (document.documentElement.getAttribute("data-theme") as "light" | "dark") ?? "light";
    const d = (document.documentElement.getAttribute("data-density") as typeof density) ?? "regular";
    setTheme(t);
    setDensity(d);
  }, []);

  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("skein.theme", next);
    } catch {}
    window.dispatchEvent(new CustomEvent("toast", { detail: { msg: `theme: ${next}`, kind: "info" } }));
  }

  function applyDensity(next: "compact" | "regular" | "spacious") {
    setDensity(next);
    document.documentElement.setAttribute("data-density", next);
    try {
      localStorage.setItem("skein.density", next);
    } catch {}
    window.dispatchEvent(new CustomEvent("toast", { detail: { msg: `density: ${next}`, kind: "info" } }));
  }

  const handleExport = () => {
    const json = exportModel(localStorage);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skein-progress-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { restored } = importModel(localStorage, String(reader.result));
        window.dispatchEvent(new CustomEvent("toast", { detail: { msg: l.importedMsg(restored), kind: "ok" } }));
        setTimeout(() => location.reload(), 600);
      } catch {
        window.dispatchEvent(new CustomEvent("toast", { detail: { msg: l.importErrMsg, kind: "err" } }));
      }
    };
    reader.readAsText(file);
  };

  const segClass = "tier-seg";
  const segBtn = (active: boolean) =>
    `font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border-r border-rule last:border-r-0 cursor-pointer transition-colors ${active ? "bg-ink text-paper" : "bg-transparent text-muted hover:text-ink"}`;

  return (
    <section class="max-w-[860px] mx-auto py-8">
      <div class="meta mb-2">{l.section}</div>
      <h2 class="font-display text-[28px] font-bold tracking-[-0.015em] m-0 text-ink mb-4">{l.title}</h2>

      <CoachPlanCard lang={lang} />

      <div class="hr-top mt-5">
        <Row label={l.tier} hint={lang === "en" ? ruHints.tier : undefined}>
          <div class={segClass}>
            {(["junior", "middle", "senior"] as Tier[]).map((tt) => (
              <button
                key={tt}
                type="button"
                class={segBtn(s.tier === tt)}
                onClick={() => {
                  setTier(tt, true);
                  window.dispatchEvent(new CustomEvent("toast", { detail: { msg: `tier: ${tt}`, kind: "info" } }));
                }}
              >
                {tt}
              </button>
            ))}
          </div>
        </Row>

        <Row label={l.theme} hint={lang === "en" ? ruHints.theme : undefined}>
          <div class={segClass}>
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                class={segBtn(theme === t)}
                onClick={() => applyTheme(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>

        <Row label={l.density} hint={lang === "en" ? ruHints.density : undefined}>
          <div class={segClass}>
            {(["compact", "regular", "spacious"] as const).map((d) => (
              <button
                key={d}
                type="button"
                class={segBtn(density === d)}
                onClick={() => applyDensity(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </Row>

        <Row label={l.motion} hint={lang === "en" ? ruHints.motion : undefined}>
          <select
            class="bg-card border border-rule-strong rounded-[1px] px-2 py-1.5 text-[12px] font-mono text-ink"
            aria-label={l.motion}
            value={s.motion}
            onChange={(e) =>
              setMotion((e.target as HTMLSelectElement).value as "on" | "off" | "auto")
            }
          >
            <option value="auto">{l.motionAuto}</option>
            <option value="on">{l.motionOn}</option>
            <option value="off">{l.motionOff}</option>
          </select>
        </Row>
      </div>

      <div class="mt-5 pt-0">
        <div class="font-display text-[14px] font-semibold text-ink mb-1">
          {l.yourData}
          {lang === "en" && <RuHint text={ruHints.yourData} />}
        </div>
        <p class="text-[12px] text-muted mb-4 leading-[1.45]">
          {l.yourDataHint}
          {lang === "en" && <span class="block"><RuHint text={ruHints.yourDataHint} flush /></span>}
        </p>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]"
              onClick={handleExport}
            >
              {l.exportBtn}
            </button>
            {lang === "en" && <RuHint text={ruHints.exportBtn} flush />}
          </div>
          <div class="flex items-center gap-2">
            <label class="oa-btn oa-btn-secondary oa-btn-sm text-[12px] cursor-pointer">
              {l.importBtn}
              <input type="file" accept="application/json" class="sr-only" onChange={handleImport} />
            </label>
            {lang === "en" && <RuHint text={ruHints.importBtn} flush />}
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]"
            onClick={() => {
              setPretest(0, []);
              location.href = `/${lang}/?retake=1`;
            }}
          >
            {l.retake}
          </button>
          {lang === "en" && <RuHint text={ruHints.retake} flush />}
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="oa-btn oa-btn-primary oa-btn-sm text-[12px]"
            style="background: var(--danger); border-color: var(--danger); color: var(--paper);"
            onClick={() => {
              const ok = confirm(l.resetConfirm);
              if (ok) {
                resetAll();
                window.dispatchEvent(new CustomEvent("toast", { detail: { msg: "progress reset", kind: "danger" } }));
              }
            }}
          >
            {l.reset}
          </button>
          {lang === "en" && <RuHint text={ruHints.reset} flush />}
        </div>
      </div>
    </section>
  );
}

function CoachPlanCard({ lang }: { lang: Locale }) {
  const [status, setStatus] = useState<CoachStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckError, setRecheckError] = useState(false);
  const [verificationUnknown, setVerificationUnknown] = useState(false);
  const recheckSequence = useRef(0);

  useEffect(() => {
    let live = true;
    fetchCoachStatus()
      .then((next) => { if (live) setStatus(next); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const tt = (en: string, ru: string) => lang === "en" ? en : ru;
  const coach = status?.entitlements.coach === true;
  const verification = status?.billing.verification;

  async function recheck() {
    const sequence = ++recheckSequence.current;
    setRechecking(true);
    setRecheckError(false);
    setVerificationUnknown(true);
    try {
      const next = await recheckCoachStatus();
      if (sequence === recheckSequence.current) {
        setStatus(next);
        setVerificationUnknown(false);
      }
    } catch {
      if (sequence === recheckSequence.current) setRecheckError(true);
    } finally {
      if (sequence === recheckSequence.current) setRechecking(false);
    }
  }

  return (
    <section class="rounded-[7px] border border-rule-strong px-5 py-[18px]">
      <div class="grid grid-cols-1 gap-5 min-[760px]:grid-cols-[1.25fr_1fr]">
        <div>
          <div class="meta mb-2">{tt("Free stays free", "Бесплатное остаётся бесплатным")}</div>
          <div class="font-display text-[20px] font-semibold text-ink mb-2">Skein Coach</div>
          <p class="m-0 text-[13px] leading-[1.55] text-muted">
            {tt(
              "Every lesson, exercise, algorithm workspace, adaptive path, spaced repetition, readiness view and BYOK AI stays available without paying.",
              "Все уроки, упражнения, Algorithm Workspace, адаптивный path, spaced repetition, readiness и BYOK AI остаются доступными без оплаты.",
            )}
          </p>
          <p class="m-0 mt-3 text-[13px] leading-[1.55] text-ink">
            {tt(
              "Coach pays for managed AI: senior-style critique without requiring your own Anthropic key. Only the current practice task, grading rubric/model context, and answer you explicitly submit are sent; your progress history is not.",
              "Coach оплачивает managed AI: senior-разбор без собственного Anthropic API-ключа. Отправляются только текущее задание, контекст рубрики/model answer и ответ, который вы явно отправили; история прогресса не отправляется.",
            )}
          </p>
        </div>

        <div class="border-t border-rule pt-4 min-[760px]:border-l min-[760px]:border-t-0 min-[760px]:pl-5 min-[760px]:pt-0" aria-live="polite">
          {failed ? (
            <p class="m-0 text-[12px] text-muted">{tt("Coach status is unavailable right now.", "Статус Coach сейчас недоступен.")}</p>
          ) : !status ? (
            <p class="m-0 text-[12px] text-muted">{tt("Loading Coach status…", "Загружаю статус Coach…")}</p>
          ) : verificationUnknown ? (
            <>
              <div class="font-display text-[17px] font-semibold text-ink">{tt("Sponsorship status unavailable", "Статус sponsorship недоступен")}</div>
              <p class="mt-2 mb-3 text-[12px] text-muted" role="status">{rechecking ? tt("Checking your sponsorship status…", "Проверяю статус sponsorship…") : tt("We could not verify your sponsorship right now. Your Coach status is unknown.", "Сейчас не удалось проверить sponsorship. Статус Coach неизвестен.")}</p>
              {recheckError && <p class="mt-2 mb-3 text-[12px] text-warn" role="alert">{tt("We could not verify your sponsorship. Try again later.", "Не удалось проверить sponsorship. Попробуйте позже.")}</p>}
              <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm" onClick={recheck} disabled={rechecking} aria-busy={rechecking}>
                {rechecking ? tt("Checking sponsorship…", "Проверяю sponsorship…") : tt("Check sponsorship", "Проверить sponsorship")}
              </button>
            </>
          ) : coach && verification !== "unavailable" && verification !== "reauth_required" ? (
            <>
              <div class="font-display text-[17px] font-semibold text-ink">{tt("Coach active", "Coach активен")}</div>
              <div class="mt-2 text-[12px] text-muted">
                {tt(
                  `${status.managedAi.remaining} of ${status.managedAi.limit} managed AI reviews left this month.`,
                  `Осталось ${status.managedAi.remaining} из ${status.managedAi.limit} managed AI-разборов в этом месяце.`,
                )}
              </div>
              {!status.managedAi.available && (
                <div class="mt-2 text-[12px] text-warn">{tt("Managed AI is temporarily unavailable; BYOK still works.", "Managed AI временно недоступен; BYOK продолжает работать.")}</div>
              )}
              <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm mt-3" onClick={recheck} disabled={rechecking} aria-busy={rechecking}>
                {rechecking ? tt("Checking sponsorship…", "Проверяю sponsorship…") : tt("Refresh sponsorship status", "Обновить статус sponsorship")}
              </button>
            </>
          ) : !status.managedAi.available ? (
            <>
              <div class="font-display text-[17px] font-semibold text-ink">{tt("Coach signup paused", "Подключение Coach приостановлено")}</div>
              <p class="mt-2 mb-0 text-[12px] leading-[1.5] text-muted">{tt("Managed AI is unavailable, so new Coach signups are paused. BYOK AI remains free.", "Managed AI недоступен, поэтому новые подключения Coach приостановлены. BYOK AI остаётся бесплатным.")}</p>
            </>
          ) : !status.authenticated ? (
            <>
              <div class="font-display text-[17px] font-semibold text-ink">{tt("Coach requires a Skein account", "Для Coach нужен аккаунт Skein")}</div>
              <p class="mt-2 mb-3 text-[12px] leading-[1.5] text-muted">{tt("Sign in with GitHub first so a sponsorship can be matched to your Skein account.", "Сначала войдите через GitHub, чтобы sponsorship можно было связать с аккаунтом Skein.")}</p>
              <a class="oa-btn oa-btn-primary oa-btn-sm" href={`/api/auth/login?lang=${lang}&returnTo=coach`}>{tt("Sign in with GitHub", "Войти через GitHub")}</a>
            </>
          ) : status.billing.verification === "reauth_required" ? (
            <>
              <div class="font-display text-[17px] font-semibold text-ink">{tt("Sign in again to verify Coach", "Войдите снова, чтобы проверить Coach")}</div>
              <p class="mt-2 mb-3 text-[12px] leading-[1.5] text-muted">{tt("Your GitHub session needs to be refreshed before sponsorship can be checked.", "Сессию GitHub нужно обновить, прежде чем проверять sponsorship.")}</p>
              <a class="oa-btn oa-btn-primary oa-btn-sm" href={`/api/auth/login?lang=${lang}&returnTo=coach`}>{tt("Sign in with GitHub", "Войти через GitHub")}</a>
            </>
          ) : status.billing.verification === "unavailable" ? (
            <>
              <div class="font-display text-[17px] font-semibold text-ink">{tt("Sponsorship status unavailable", "Статус sponsorship недоступен")}</div>
              <p class="mt-2 mb-3 text-[12px] leading-[1.5] text-muted" role="status">{tt("We could not verify your sponsorship right now. Your Coach status was not changed.", "Сейчас не удалось проверить sponsorship. Статус Coach не изменён.")}</p>
              <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm" onClick={recheck} disabled={rechecking} aria-busy={rechecking}>
                {rechecking ? tt("Checking sponsorship…", "Проверяю sponsorship…") : tt("Check sponsorship", "Проверить sponsorship")}
              </button>
            </>
          ) : status.billing.configured && status.billing.sponsorUrl && status.managedAi.available ? (
            <>
              <div class="font-display text-[17px] font-semibold text-ink">{tt("Unlock Coach", "Открыть Coach")}</div>
              <p class="mt-2 mb-3 text-[12px] leading-[1.5] text-muted">
                {tt(
                  `${status.managedAi.limit} managed AI reviews per month. Automatic unlock checks for an active recurring sponsorship from this same personal GitHub account.`,
                  `${status.managedAi.limit} managed AI-разборов в месяц. Для автоматического доступа проверяется активный recurring sponsorship с этого же личного GitHub-аккаунта.`,
                )}
              </p>
              <p class="mt-2 mb-3 text-[12px] leading-[1.5] text-muted">{tt("After sponsoring, return here and check your sponsorship status.", "После sponsorship вернитесь сюда и проверьте его статус.")}</p>
              {recheckError && <p class="mt-2 mb-3 text-[12px] text-warn" role="alert">{tt("We could not verify your sponsorship. Try again later.", "Не удалось проверить sponsorship. Попробуйте позже.")}</p>}
              <a class="oa-btn oa-btn-primary oa-btn-sm" href={status.billing.sponsorUrl} target="_blank" rel="noreferrer">{tt("Continue on GitHub Sponsors", "Перейти в GitHub Sponsors")}</a>
              <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm mt-2" onClick={recheck} disabled={rechecking} aria-busy={rechecking}>
                {rechecking ? tt("Checking sponsorship…", "Проверяю sponsorship…") : tt("Check sponsorship", "Проверить sponsorship")}
              </button>
            </>
          ) : (
            <>
              <div class="font-display text-[17px] font-semibold text-ink">{tt("Coach checkout unavailable", "Оплата Coach недоступна")}</div>
              <p class="mt-2 mb-0 text-[12px] leading-[1.5] text-muted">{tt("Billing is not configured, so there is no checkout button. BYOK AI remains free.", "Платёжный backend не настроен, поэтому кнопки оплаты нет. BYOK AI остаётся бесплатным.")}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function RuHint({ text, flush = false, block = false }: { text: string; flush?: boolean; block?: boolean }) {
  return (
    <span class={`${block ? "block mt-1" : "inline-block"} ${flush ? "" : "ml-2"} font-sans text-[10px] font-normal leading-[1.3] text-muted`}>
      <span class="not-italic">RU</span> <span class="italic">{text}</span>
    </span>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <div class="flex items-center justify-between gap-6 py-4 hr-bot">
      <div class="font-display text-[14px] font-semibold text-ink">
        {label}
        {hint && <RuHint text={hint} />}
      </div>
      <div class="shrink-0">{children}</div>
    </div>
  );
}
