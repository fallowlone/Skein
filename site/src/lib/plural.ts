import type { Locale } from "~/i18n";

/** Full hour unit with Russian declension (час/часа/часов). */
export function hourWord(n: number, lang: Locale): string {
  if (lang === "en") return n === 1 ? "hour" : "hours";
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "час";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "часа";
  return "часов";
}
