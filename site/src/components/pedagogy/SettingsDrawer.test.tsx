import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchCoachStatus: vi.fn(),
  recheckCoachStatus: vi.fn(),
  createTelegramAuthorSupportInvoice: vi.fn(),
  createTelegramCoachInvoice: vi.fn(),
  fetchBillingPayments: vi.fn(),
  setTelegramCoachRenewal: vi.fn(),
}));

vi.mock("~/lib/coach", () => ({
  fetchCoachStatus: mocks.fetchCoachStatus,
  recheckCoachStatus: mocks.recheckCoachStatus,
}));
vi.mock("~/lib/telegram-stars", () => ({
  createTelegramAuthorSupportInvoice: mocks.createTelegramAuthorSupportInvoice,
  createTelegramCoachInvoice: mocks.createTelegramCoachInvoice,
  fetchBillingPayments: mocks.fetchBillingPayments,
  setTelegramCoachRenewal: mocks.setTelegramCoachRenewal,
}));

import SettingsDrawer from "./SettingsDrawer";
import type { CoachStatus } from "~/lib/coach";

const base: CoachStatus = {
  authenticated: true,
  entitlements: { coach: false },
  billing: { configured: true, sponsorUrl: "https://github.com/sponsors/skein-owner", provider: "github-sponsors", verification: "verified" },
  managedAi: { available: true, limit: 30, used: 0, remaining: 30, period: "2026-09", resetsAt: "2026-10-01T00:00:00.000Z" },
};

let host: HTMLDivElement;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  mocks.fetchCoachStatus.mockReset();
  mocks.recheckCoachStatus.mockReset();
  mocks.createTelegramAuthorSupportInvoice.mockReset();
  mocks.createTelegramCoachInvoice.mockReset();
  mocks.fetchBillingPayments.mockReset();
  mocks.setTelegramCoachRenewal.mockReset();
  mocks.fetchCoachStatus.mockResolvedValue(base);
  mocks.fetchBillingPayments.mockResolvedValue([]);
  mocks.setTelegramCoachRenewal.mockResolvedValue({ renewal: "cancelled", accessExpiresAt: "2026-10-14T20:00:00.000Z" });
});

afterEach(() => {
  render(null, host);
  host.remove();
  vi.restoreAllMocks();
});

function mount(status = base, lang: "en" | "ru" = "en") {
  mocks.fetchCoachStatus.mockResolvedValue(status);
  render(<SettingsDrawer lang={lang} />, host);
}

describe("Settings Coach billing states", () => {
  it("creates Telegram checkout through the backend and does not treat invoice creation as payment", async () => {
    const stars: CoachStatus = {
      ...base,
      billing: {
        ...base.billing,
        telegramStars: {
          configured: true,
          product: { id: "coach_monthly", amount: 500, currency: "XTR", billingKind: "subscription", subscriptionPeriodSeconds: 2_592_000 },
          supportProduct: { id: "author_support", amount: 1, currency: "XTR", billingKind: "one_time", subscriptionPeriodSeconds: null },
        },
      },
    };
    mocks.createTelegramCoachInvoice.mockResolvedValue({
      invoiceUrl: "https://t.me/$invoice_slug",
      orderId: "ord_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      product: stars.billing.telegramStars!.product,
    });
    mount(stars);
    await vi.waitFor(() => expect(host.textContent).toContain("Create Telegram Stars checkout"));
    (Array.from(host.querySelectorAll("button")).find((node) => node.textContent?.includes("Create Telegram")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.querySelector('a[href="https://t.me/$invoice_slug"]')).not.toBeNull());
    expect(host.textContent).toContain("Payment is pending until Skein receives Telegram's signed webhook confirmation");
    expect(host.textContent).not.toContain("Stars payment recognized by Skein");
  });

  it("renders server-confirmed Telegram entitlement and paid-through date", async () => {
    mount({
      ...base,
      entitlements: { coach: true },
      billing: {
        ...base.billing,
        accessProvider: "telegram-stars",
        accessExpiresAt: "2026-10-14T20:00:00.000Z",
        accessRenewalStatus: "active",
        telegramStars: { configured: true, product: { id: "coach_monthly", amount: 500, currency: "XTR", billingKind: "subscription", subscriptionPeriodSeconds: 2_592_000 }, supportProduct: { id: "author_support", amount: 1, currency: "XTR", billingKind: "one_time", subscriptionPeriodSeconds: null } },
      },
    });
    await vi.waitFor(() => expect(host.textContent).toContain("Stars payment recognized by Skein"));
    expect(host.textContent).toContain("Coach active");
    expect(host.textContent).toContain("Cancel Stars renewal");
    expect(host.textContent).not.toContain("Refresh sponsorship status");
  });

  it("keeps paid-through Coach visible after Telegram reports a renewal payment failure", async () => {
    mount({
      ...base,
      entitlements: { coach: true },
      billing: {
        ...base.billing,
        accessProvider: "telegram-stars",
        accessExpiresAt: "2026-10-14T20:00:00.000Z",
        accessRenewalStatus: "payment_failed",
        telegramStars: { configured: true, product: { id: "coach_monthly", amount: 500, currency: "XTR", billingKind: "subscription", subscriptionPeriodSeconds: 2_592_000 }, supportProduct: { id: "author_support", amount: 1, currency: "XTR", billingKind: "one_time", subscriptionPeriodSeconds: null } },
      },
    });
    await vi.waitFor(() => expect(host.textContent).toContain("renewal payment failure"));
    expect(host.textContent).toContain("Coach active");
    expect(host.textContent).not.toContain("Cancel Stars renewal");
    expect(host.textContent).not.toContain("Resume Stars renewal");
  });

  it("shows refunded Stars history without restoring entitlement", async () => {
    mocks.fetchBillingPayments.mockResolvedValue([{ provider: "telegram_stars", product: "coach_monthly", amount: 500, currency: "XTR", status: "refunded", createdAt: "2026-09-14T20:00:00.000Z", subscriptionExpiresAt: "2026-10-14T20:00:00.000Z" }]);
    mount({
      ...base,
      billing: { ...base.billing, telegramStars: { configured: true, product: { id: "coach_monthly", amount: 500, currency: "XTR", billingKind: "subscription", subscriptionPeriodSeconds: 2_592_000 }, supportProduct: { id: "author_support", amount: 1, currency: "XTR", billingKind: "one_time", subscriptionPeriodSeconds: null } } },
    });
    await vi.waitFor(() => expect(host.textContent).toContain("Latest Stars payment was refunded"));
    expect(host.textContent).not.toContain("Stars payment recognized by Skein");
  });

  it("offers a one-time 1-Star author-support checkout that never claims Coach access", async () => {
    const stars: CoachStatus = {
      ...base,
      billing: {
        ...base.billing,
        telegramStars: {
          configured: true,
          product: { id: "coach_monthly", amount: 500, currency: "XTR", billingKind: "subscription", subscriptionPeriodSeconds: 2_592_000 },
          supportProduct: { id: "author_support", amount: 1, currency: "XTR", billingKind: "one_time", subscriptionPeriodSeconds: null },
        },
      },
    };
    mocks.createTelegramAuthorSupportInvoice.mockResolvedValue({
      invoiceUrl: "https://t.me/$support_slug",
      orderId: "ord_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      product: stars.billing.telegramStars!.supportProduct,
    });
    mount(stars);
    await vi.waitFor(() => expect(host.textContent).toContain("Support the author"));
    expect(host.textContent).toContain("1 Star, one-time");
    expect(host.textContent).toContain("does not unlock Coach");
    (Array.from(host.querySelectorAll("button")).find((node) => node.textContent?.includes("Support with 1 Star")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.querySelector('a[href="https://t.me/$support_slug"]')).not.toBeNull());
    expect(mocks.createTelegramAuthorSupportInvoice).toHaveBeenCalledOnce();
    expect(host.textContent).not.toContain("Coach active");
  });

  it("uses the fixed coach return target for signed-out users", async () => {
    mount({ ...base, authenticated: false, billing: { ...base.billing, verification: "not_checked" } });
    await vi.waitFor(() => expect(host.querySelector('a[href="/api/auth/login?lang=en&returnTo=coach"]')).not.toBeNull());
    expect((host.querySelector('a[href="/api/auth/login?lang=en&returnTo=coach"]') as HTMLAnchorElement)?.textContent).toContain("Sign in with GitHub");
  });

  it("shows the real sponsor offer for an authenticated non-sponsor", async () => {
    mount();
    await vi.waitFor(() => expect(host.textContent).toContain("Unlock Coach"));
    expect(host.textContent).toContain("Unlock Coach");
    expect(host.querySelector('a[href="https://github.com/sponsors/skein-owner"]')).not.toBeNull();
    expect(host.textContent).not.toContain("public recurring");
  });

  it("shows active Coach without an upsell", async () => {
    mount({ ...base, entitlements: { coach: true } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    expect(host.textContent).toContain("Coach active");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
    expect(host.textContent).not.toContain("Unlock Coach");
  });

  it("does not show checkout when billing is unconfigured", async () => {
    mount({ ...base, billing: { configured: false, sponsorUrl: null, provider: null, verification: "not_checked" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach checkout unavailable"));
    expect(host.textContent).toContain("Coach checkout unavailable");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it("shows a truthful temporary verification failure without upsell", async () => {
    mount({ ...base, billing: { ...base.billing, verification: "unavailable" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Sponsorship status unavailable"));
    expect(host.textContent).toContain("Sponsorship status unavailable");
    expect(host.textContent).toContain("Your Coach status was not changed");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it("routes reauth_required to the fixed sign-in action", async () => {
    mount({ ...base, billing: { ...base.billing, verification: "reauth_required" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Sign in again to verify Coach"));
    expect(host.textContent).toContain("Sign in again to verify Coach");
    expect(host.querySelector('a[href="/api/auth/login?lang=en&returnTo=coach"]')).not.toBeNull();
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it("shows pending and then active after a successful recheck", async () => {
    let resolve!: (value: typeof base) => void;
    mocks.recheckCoachStatus.mockReturnValue(new Promise((r) => { resolve = r; }));
    mount();
    await vi.waitFor(() => expect(host.textContent).toContain("Unlock Coach"));
    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("sponsorship")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.textContent).toContain("Checking sponsorship…"));
    expect(host.textContent).toContain("Checking sponsorship…");
    resolve({ ...base, entitlements: { coach: true }, billing: { ...base.billing, verification: "verified" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    expect(host.textContent).not.toContain("Unlock Coach");
  });

  it("exposes a temporary recheck error without changing the offer", async () => {
    mocks.recheckCoachStatus.mockRejectedValue(new Error("unavailable"));
    mount();
    await vi.waitFor(() => expect(host.textContent).toContain("Unlock Coach"));
    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("sponsorship")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not verify"));
    expect(host.textContent).toContain("Sponsorship status unavailable");
    expect(host.textContent).not.toContain("Unlock Coach");
  });

  it("does not keep claiming Coach active after an active recheck fails", async () => {
    mocks.recheckCoachStatus.mockRejectedValue(new Error("unavailable"));
    mount({ ...base, entitlements: { coach: true } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Refresh sponsorship")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not verify"));
    expect(host.textContent).not.toContain("Coach active");
    expect(host.textContent).toContain("status is unknown");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it.each(["unavailable", "reauth_required"] as const)("does not claim active after an active recheck returns %s", async (verification) => {
    mocks.recheckCoachStatus.mockResolvedValue({ ...base, entitlements: { coach: true }, billing: { ...base.billing, verification } });
    mount({ ...base, entitlements: { coach: true } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Refresh sponsorship")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.textContent).not.toContain("Coach active"));
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it("keeps Russian verification copy honest", async () => {
    mount({ ...base, billing: { ...base.billing, verification: "unavailable" } }, "ru");
    await vi.waitFor(() => expect(host.textContent).toContain("Статус sponsorship недоступен"));
    expect(host.textContent).toContain("Статус Coach не изменён");
    expect(host.textContent).not.toContain("Открыть Coach");
  });

  it("ignores a stale recheck response after a newer response succeeds", async () => {
    const pending: Array<(value: typeof base) => void> = [];
    mocks.recheckCoachStatus.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    mount();
    await vi.waitFor(() => expect(host.textContent).toContain("Unlock Coach"));
    const button = Array.from(host.querySelectorAll("button")).find((node) => node.textContent?.includes("sponsorship")) as HTMLButtonElement;
    button.click();
    button.click();
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    pending[1]({ ...base, entitlements: { coach: true }, billing: { ...base.billing, verification: "verified" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    pending[0]({ ...base, entitlements: { coach: false }, billing: { ...base.billing, verification: "unavailable" } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(host.textContent).toContain("Coach active");
  });
});

describe("Settings local backup", () => {
  it("round-trips the real export/import UI without exporting credentials", async () => {
    localStorage.setItem("skein.user-state.v1", JSON.stringify({ tier: "senior", futureEvidence: { score: 7 } }));
    localStorage.setItem("atlas.practice-responses.go/01/lesson", JSON.stringify({ task: "my answer 👩🏽‍💻" }));
    localStorage.setItem("skein.english.v2", JSON.stringify({ words: {}, hoursLog: [], futureEvidence: [1, 2] }));
    localStorage.setItem("skein.admin.token", "admin-secret");
    localStorage.setItem("skein.english.byok", "api-secret");

    let downloaded: Blob | undefined;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((blob: Blob) => { downloaded = blob; return "blob:backup"; }),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    mount();

    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Export progress")) as HTMLButtonElement).click();
    expect(downloaded).toBeDefined();
    const exported = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(downloaded!);
    });
    expect(JSON.parse(exported).data["skein.admin.token"]).toBeUndefined();
    expect(JSON.parse(exported).data["skein.english.byok"]).toBeUndefined();

    localStorage.clear();
    const importedToast = new Promise<CustomEvent>((resolve) => {
      window.addEventListener("toast", (event) => resolve(event as CustomEvent), { once: true });
    });
    vi.spyOn(globalThis, "setTimeout").mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);
    const input = host.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { configurable: true, value: [new File([exported], "progress.json", { type: "application/json" })] });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const toast = await importedToast;
    expect(toast.detail.kind).toBe("ok");
    expect(JSON.parse(localStorage.getItem("skein.user-state.v1")!)).toMatchObject({ tier: "senior", futureEvidence: { score: 7 } });
    expect(JSON.parse(localStorage.getItem("atlas.practice-responses.go/01/lesson")!)).toEqual({ task: "my answer 👩🏽‍💻" });
    expect(JSON.parse(localStorage.getItem("skein.english.v2")!)).toMatchObject({ futureEvidence: [1, 2] });
    expect(localStorage.getItem("skein.admin.token")).toBeNull();
    expect(localStorage.getItem("skein.english.byok")).toBeNull();
  });
});
