import { describe, expect, it, vi } from "vitest";
import { createTelegramAuthorSupportInvoice, createTelegramCoachInvoice, fetchBillingPayments, setTelegramCoachRenewal } from "./telegram-stars";

describe("Telegram Stars client", () => {
  it("creates only the fixed Coach product through the same-origin backend", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      invoiceUrl: "https://t.me/$invoice_slug",
      orderId: "ord_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      product: { id: "coach_monthly", amount: 500, currency: "XTR", billingKind: "subscription", subscriptionPeriodSeconds: 2_592_000 },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await createTelegramCoachInvoice(fetcher as any);
    expect(fetcher).toHaveBeenCalledWith("/api/telegram/invoice", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ product: "coach_monthly" }),
    }));
    expect(result.product.id).toBe("coach_monthly");
  });

  it("creates the fixed one-time 1-Star author-support product through the same backend", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      invoiceUrl: "https://t.me/$support_slug",
      orderId: "ord_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      product: { id: "author_support", amount: 1, currency: "XTR", billingKind: "one_time", subscriptionPeriodSeconds: null },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await createTelegramAuthorSupportInvoice(fetcher as any);
    expect(fetcher).toHaveBeenCalledWith("/api/telegram/invoice", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ product: "author_support" }),
    }));
    expect(result.product).toMatchObject({ id: "author_support", amount: 1, billingKind: "one_time", subscriptionPeriodSeconds: null });
  });

  it("reads customer payment history only through the authenticated backend", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ payments: [{
      provider: "telegram_stars", product: "coach_monthly", amount: 500, currency: "XTR",
      status: "completed", createdAt: "2026-09-14T20:00:00.000Z", subscriptionExpiresAt: "2026-10-14T20:00:00.000Z",
    }] }), { status: 200 }));
    const payments = await fetchBillingPayments(fetcher as any);
    expect(fetcher).toHaveBeenCalledWith("/api/billing/payments", { credentials: "same-origin" });
    expect(payments).toHaveLength(1);
  });

  it("surfaces backend billing errors instead of inventing paid state", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "billing_unavailable" }), { status: 503 }));
    await expect(createTelegramCoachInvoice(fetcher as any)).rejects.toThrow("billing_unavailable");
  });

  it("changes recurring renewal only through the authenticated subscription endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      renewal: "cancelled", accessExpiresAt: "2026-10-14T20:00:00.000Z",
    }), { status: 200 }));
    await setTelegramCoachRenewal("cancel", fetcher as any);
    expect(fetcher).toHaveBeenCalledWith("/api/telegram/subscription", expect.objectContaining({
      method: "POST", credentials: "same-origin", body: JSON.stringify({ action: "cancel" }),
    }));
  });
});
