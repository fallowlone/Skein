/**
 * Central configuration gate for optional Telegram Stars support.
 * Telegram's documented invoice deep links are t.me/invoice/<slug> and t.me/$<slug>.
 * No production endpoint is invented: anything else stays unavailable in the UI.
 */
export function normalizeTelegramStarsUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const invoicePath = /^\/(?:invoice\/[^/]+|\$[^/]+)$/;
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "t.me" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      !invoicePath.test(url.pathname)
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const TELEGRAM_STARS_URL = normalizeTelegramStarsUrl(import.meta.env.PUBLIC_TELEGRAM_STARS_URL);
