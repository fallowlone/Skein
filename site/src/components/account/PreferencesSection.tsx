// src/components/account/PreferencesSection.tsx
// 05 · PREFERENCES — local-only settings, reusing the exact setter behaviour from
// SettingsDrawer / user-state:
//   Theme    → data-theme attr + localStorage["awesome.theme"]
//   Density  → data-density attr + localStorage["awesome.density"]
//   Motion   → setMotion(v)              (userState.motion: on | off | auto)
//   Depth    → setTier(tier, true)       (userState.tier)
//   Language → link to the same route under the other locale
// Segmented controls carry aria-pressed; no new localStorage keys beyond the two above.
import { useEffect, useState } from "preact/hooks";
import { userState, setTier, setMotion } from "~/scripts/user-state";
import { type Locale } from "~/i18n";
import type { Tier } from "~/types";

type Theme = "light" | "dark";
type Density = "compact" | "regular" | "spacious";
type Motion = "on" | "off" | "auto";

const L = {
  en: {
    secNote: "Saved locally",
    themeName: "Theme", themeDesc: "Paper (light) or ink-cool (dark).",
    motionName: "Motion", motionDesc: "Reveal animations and counters. Auto follows your system setting.",
    depthName: "Reading depth", depthDesc: "Default depth for lesson readers and the path engine.",
    densityName: "Density", densityDesc: "Spacing of the interface. Affects readers and dashboards.",
    langName: "Interface language", langDesc: "UI chrome. Lesson content language is set per track.",
    light: "Light", dark: "Dark",
    on: "On", off: "Off", auto: "Auto",
    junior: "Junior", middle: "Middle", senior: "Senior",
    compact: "Compact", regular: "Regular", spacious: "Spacious",
  },
  ru: {
    secNote: "Сохраняется локально",
    themeName: "Тема", themeDesc: "Бумага (светлая) или ink-cool (тёмная).",
    motionName: "Анимация", motionDesc: "Анимации появления и счётчики. Авто следует системной настройке.",
    depthName: "Глубина чтения", depthDesc: "Глубина по умолчанию для уроков и движка пути.",
    densityName: "Плотность", densityDesc: "Отступы интерфейса. Влияет на читалки и дашборды.",
    langName: "Язык интерфейса", langDesc: "Оболочка интерфейса. Язык контента уроков задаётся в треке.",
    light: "Светлая", dark: "Тёмная",
    on: "Вкл", off: "Выкл", auto: "Авто",
    junior: "Junior", middle: "Middle", senior: "Senior",
    compact: "Компактно", regular: "Обычно", spacious: "Просторно",
  },
} as const;

export default function PreferencesSection({ lang }: { lang: Locale }) {
  const l = L[lang];
  const s = userState.value; // subscribe (tier + motion)
  const [theme, setThemeState] = useState<Theme>("light");
  const [density, setDensityState] = useState<Density>("regular");
  const other: Locale = lang === "en" ? "ru" : "en";

  useEffect(() => {
    const tt = (document.documentElement.getAttribute("data-theme") as Theme) ?? "light";
    const dd = (document.documentElement.getAttribute("data-density") as Density) ?? "regular";
    setThemeState(tt);
    setDensityState(dd);
  }, []);

  function applyTheme(next: Theme) {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("awesome.theme", next); } catch {}
  }
  function applyDensity(next: Density) {
    setDensityState(next);
    document.documentElement.setAttribute("data-density", next);
    try { localStorage.setItem("awesome.density", next); } catch {}
  }

  // Same route under the other locale (swap the leading /{lang}/ segment).
  function otherLocaleHref(): string {
    if (typeof window === "undefined") return `/${other}/account`;
    const p = window.location.pathname;
    const swapped = p.replace(new RegExp(`^/(en|ru)(?=/|$)`), `/${other}`);
    return swapped === p ? `/${other}/account` : swapped + window.location.search;
  }

  return (
    <div class="panel">
      <div class="set-list">
        {/* Theme */}
        <div class="set-row">
          <div class="set-info"><span class="set-name">{l.themeName}</span><span class="set-desc">{l.themeDesc}</span></div>
          <div class="set-control">
            <div class="seg" role="group" aria-label={l.themeName}>
              {(["light", "dark"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={theme === v} onClick={() => applyTheme(v)}>
                  {v === "light" ? l.light : l.dark}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Motion */}
        <div class="set-row">
          <div class="set-info"><span class="set-name">{l.motionName}</span><span class="set-desc">{l.motionDesc}</span></div>
          <div class="set-control">
            <div class="seg" role="group" aria-label={l.motionName}>
              {(["on", "off", "auto"] as const).map((v: Motion) => (
                <button key={v} type="button" aria-pressed={s.motion === v} onClick={() => setMotion(v)}>
                  {v === "on" ? l.on : v === "off" ? l.off : l.auto}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reading depth */}
        <div class="set-row">
          <div class="set-info"><span class="set-name">{l.depthName}</span><span class="set-desc">{l.depthDesc}</span></div>
          <div class="set-control">
            <div class="seg depth" role="group" aria-label={l.depthName}>
              {(["junior", "middle", "senior"] as Tier[]).map((v) => (
                <button key={v} type="button" aria-pressed={s.tier === v} onClick={() => setTier(v, true)}>
                  {v === "junior" ? l.junior : v === "middle" ? l.middle : l.senior}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Density */}
        <div class="set-row">
          <div class="set-info"><span class="set-name">{l.densityName}</span><span class="set-desc">{l.densityDesc}</span></div>
          <div class="set-control">
            <div class="seg" role="group" aria-label={l.densityName}>
              {(["compact", "regular", "spacious"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={density === v} onClick={() => applyDensity(v)}>
                  {v === "compact" ? l.compact : v === "regular" ? l.regular : l.spacious}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interface language — links to the same route under the other locale */}
        <div class="set-row">
          <div class="set-info"><span class="set-name">{l.langName}</span><span class="set-desc">{l.langDesc}</span></div>
          <div class="set-control">
            <div class="seg" role="group" aria-label={l.langName}>
              <a class="seg-link" aria-current={lang === "en" ? "true" : undefined} href={lang === "en" ? undefined : otherLocaleHref()}>EN</a>
              <a class="seg-link" aria-current={lang === "ru" ? "true" : undefined} href={lang === "ru" ? undefined : otherLocaleHref()}>RU</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
