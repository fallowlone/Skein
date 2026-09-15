const TELEGRAM_API_TIMEOUT_MS = 8_000;
export const TELEGRAM_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

type TelegramApiResponse<T> = { ok?: unknown; result?: unknown };

export function newTelegramOrderId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return `ord_${btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

export function parseTelegramOrderPayload(value: unknown): string | null {
  return typeof value === "string" && /^ord_[A-Za-z0-9_-]{32}$/.test(value) ? value : null;
}

export function telegramUserId(value: unknown): string | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? String(value) : null;
}

export function telegramPaymentId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 256 ? value : null;
}

export function normalizeTelegramInvoiceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.hostname.toLowerCase() !== "t.me" || url.port ||
      url.username || url.password || url.search || url.hash ||
      !/^\/(?:invoice\/[^/]+|\$[^/]+)$/.test(url.pathname)
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function callTelegramApi<T>(token: string, method: string, body: Record<string, unknown>): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_API_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const payload = await response.json<TelegramApiResponse<T>>().catch(() => null);
    return payload?.ok === true ? payload.result as T : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function answerTelegramPreCheckout(
  token: string,
  queryId: string,
  ok: boolean,
  errorMessage?: string,
): Promise<boolean> {
  const result = await callTelegramApi<boolean>(token, "answerPreCheckoutQuery", {
    pre_checkout_query_id: queryId,
    ok,
    ...(ok ? {} : { error_message: errorMessage ?? "This Skein checkout is no longer available." }),
  });
  return result === true;
}

export function telegramSecretMatches(header: string | null, expected: string): boolean {
  if (!header || !expected || header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
