import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { userState, setTier, setMotion, resetAll, setPretest } from "~/scripts/user-state";
import { todayISO } from "~/scripts/progression/streak";
import { exportModel, importModel } from "~/scripts/model-backup";
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

  const handleExport = () => {
    const json = exportModel(localStorage);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `awesome-progress-${todayISO()}.json`;
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

      <div class="mt-8 border-t border-rule pt-6">
        <div class="font-display text-[14px] font-semibold text-ink mb-1">{l.yourData}</div>
        <p class="text-[12px] text-muted mb-4">{l.yourDataHint}</p>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="oa-btn oa-btn-secondary oa-btn-sm text-[12px]"
            onClick={handleExport}
          >
            {l.exportBtn}
          </button>
          <label class="oa-btn oa-btn-secondary oa-btn-sm text-[12px] cursor-pointer">
            {l.importBtn}
            <input type="file" accept="application/json" class="sr-only" onChange={handleImport} />
          </label>
        </div>
      </div>

      <div class="mt-8 flex flex-wrap gap-3">
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
