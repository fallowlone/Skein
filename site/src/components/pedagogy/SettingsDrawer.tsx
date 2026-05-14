import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { userState, setTier, setMotion, resetAll, setPretest } from "~/scripts/user-state";
import { type Locale } from "~/i18n";
import type { Tier } from "~/types";

type Props = { lang: Locale };

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
      localStorage.setItem("awesome.theme", next);
    } catch {}
    window.dispatchEvent(new CustomEvent("toast", { detail: { msg: `theme: ${next}`, kind: "info" } }));
  }

  function applyDensity(next: "compact" | "regular" | "spacious") {
    setDensity(next);
    document.documentElement.setAttribute("data-density", next);
    try {
      localStorage.setItem("awesome.density", next);
    } catch {}
    window.dispatchEvent(new CustomEvent("toast", { detail: { msg: `density: ${next}`, kind: "info" } }));
  }

  const segClass = "tier-seg";
  const segBtn = (active: boolean) =>
    `font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border-r border-rule last:border-r-0 cursor-pointer transition-colors ${active ? "bg-ink text-paper" : "bg-transparent text-muted hover:text-ink"}`;

  return (
    <section class="max-w-[640px] mx-auto py-8">
      <div class="meta mb-2">{l.section}</div>
      <h2 class="font-display text-[28px] font-bold tracking-[-0.015em] m-0 text-ink mb-6">{l.title}</h2>

      <div class="hr-top">
        <Row label={l.tier}>
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

        <Row label={l.theme}>
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

        <Row label={l.density}>
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

        <Row label={l.motion}>
          <select
            class="bg-card border border-rule-strong rounded-[1px] px-2 py-1.5 text-[12px] font-mono text-ink"
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

      <div class="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          class="btn ghost text-[12px]"
          onClick={() => {
            setPretest(0, []);
            location.href = `/${lang}/?retake=1`;
          }}
        >
          {l.retake}
        </button>
        <button
          type="button"
          class="btn text-[12px]"
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
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="flex items-center justify-between gap-6 py-4 hr-bot">
      <div class="font-display text-[14px] font-semibold text-ink">{label}</div>
      <div class="shrink-0">{children}</div>
    </div>
  );
}
