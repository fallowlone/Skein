import { describe, expect, test } from "vitest";
import { normalizeTelegramStarsUrl } from "./telegram-stars";

describe("normalizeTelegramStarsUrl", () => {
  test("keeps support unavailable when no endpoint is configured", () => {
    expect(normalizeTelegramStarsUrl(undefined)).toBeNull();
    expect(normalizeTelegramStarsUrl("   ")).toBeNull();
  });

  test("accepts only documented Telegram invoice-link shapes", () => {
    expect(normalizeTelegramStarsUrl("https://t.me/$invoice_slug")).toBe("https://t.me/$invoice_slug");
    expect(normalizeTelegramStarsUrl("https://t.me/invoice/invoice_slug")).toBe("https://t.me/invoice/invoice_slug");
  });

  test.each([
    "https://stripe.com/pay/example",
    "https://paypal.com/donate/example",
    "https://patreon.com/example",
    "https://ko-fi.com/example",
    "http://t.me/example",
    "https://t.me/example",
    "https://telegram.me/$invoice_slug",
    "https://t.me/invoice/",
    "https://t.me/$invoice_slug?start=other",
    "https://t.me:8443/$invoice_slug",
    "https://user:pass@t.me/$invoice_slug",
  ])("rejects non-Telegram or insecure payment destinations: %s", (url) => {
    expect(normalizeTelegramStarsUrl(url)).toBeNull();
  });
});
