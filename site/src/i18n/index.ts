import uiStrings from "./ui.json";

export type Locale = "en" | "ru";
const LOCALES: Locale[] = ["en", "ru"];

export function isLocale(s: string): s is Locale {
  return (LOCALES as readonly string[]).includes(s);
}

export function t(key: string, lang: Locale): string {
  const fromLang = (uiStrings as Record<Locale, Record<string, string>>)[lang]?.[key];
  if (fromLang) return fromLang;
  const fromEn = (uiStrings as Record<Locale, Record<string, string>>).en?.[key];
  return fromEn ?? key;
}

export function swapLocale(path: string, target: Locale): string {
  return path.replace(/^\/(en|ru)(?=\/|$)/, `/${target}`);
}

export function localeFromPath(path: string): Locale {
  const m = path.match(/^\/(en|ru)(?:\/|$)/);
  return (m?.[1] as Locale) ?? "en";
}
