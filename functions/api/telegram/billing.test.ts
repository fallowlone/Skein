import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  applyTelegramSubscriptionProviderState: vi.fn(),
  createTelegramOrder: vi.fn(),
  markTelegramOrderFailed: vi.fn(),
  markTelegramOrderInvoiceReady: vi.fn(),
  telegramSchemaReady: vi.fn(),
  approveTelegramPreCheckout: vi.fn(),
  getPaymentByProviderId: vi.fn(),
  getTelegramOrder: vi.fn(),
  getTelegramPaymentCountForOrder: vi.fn(),
  recordTelegramOneTimePayment: vi.fn(),
  recordTelegramSubscriptionPayment: vi.fn(),
  refundTelegramOneTimePayment: vi.fn(),
  refundTelegramPayment: vi.fn(),
  getTelegramSubscriptionControl: vi.fn(),
  setTelegramSubscriptionRenewalState: vi.fn(),
}));

vi.mock("../../lib/db", () => db);

import { onRequestPost as createInvoice } from "./invoice";
import { onRequestPost as updateSubscription } from "./subscription";
import { onRequestPost as telegramWebhook } from "./webhook";

const ORDER_ID = "ord_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const NOW = 1_800_000_000_000;
const EXPIRY_SECONDS = Math.floor(NOW / 1000) + 2_592_000;
const order = {
  id: ORDER_ID,
  userId: 42,
  product: "coach_monthly",
  amount: 500,
  currency: "XTR",
  billingKind: "subscription",
  subscriptionPeriodSeconds: 2_592_000,
  status: "approved",
  telegramUserId: "777",
  checkoutExpiresAt: NOW + 60_000,
  currentPeriodEnd: null,
  createdAt: NOW,
  updatedAt: NOW,
};
const supportOrder = {
  ...order,
  product: "author_support",
  amount: 1,
  billingKind: "one_time",
  subscriptionPeriodSeconds: null,
};

function env(overrides: Record<string, unknown> = {}) {
  return {
    DB: {} as D1Database,
    TELEGRAM_BOT_TOKEN: "test-bot-token",
    TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
    ...overrides,
  } as any;
}

function invoiceRequest(body: unknown = { product: "coach_monthly" }, origin = "https://skein.test") {
  return new Request("https://skein.test/api/telegram/invoice", {
    method: "POST",
    headers: { "content-type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

function webhookRequest(body: unknown, secret = "test-webhook-secret") {
  return new Request("https://skein.test/api/telegram/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function successUpdate(overrides: Record<string, unknown> = {}) {
  return {
    update_id: 1001,
    message: {
      message_id: 88,
      from: { id: 777, is_bot: false, first_name: "Buyer" },
      successful_payment: {
        currency: "XTR",
        total_amount: 500,
        invoice_payload: ORDER_ID,
        subscription_expiration_date: EXPIRY_SECONDS,
        is_recurring: true,
        is_first_recurring: true,
        telegram_payment_charge_id: "charge-1",
        provider_payment_charge_id: "",
        ...overrides,
      },
    },
  };
}

function supportSuccessUpdate(overrides: Record<string, unknown> = {}) {
  return {
    update_id: 1003,
    message: {
      message_id: 89,
      from: { id: 777, is_bot: false, first_name: "Buyer" },
      successful_payment: {
        currency: "XTR",
        total_amount: 1,
        invoice_payload: ORDER_ID,
        telegram_payment_charge_id: "support-charge-1",
        provider_payment_charge_id: "",
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  Object.values(db).forEach((mock) => mock.mockReset());
  db.telegramSchemaReady.mockResolvedValue(true);
  db.applyTelegramSubscriptionProviderState.mockResolvedValue(true);
  db.createTelegramOrder.mockResolvedValue(undefined);
  db.markTelegramOrderFailed.mockResolvedValue(undefined);
  db.markTelegramOrderInvoiceReady.mockResolvedValue(undefined);
  db.approveTelegramPreCheckout.mockResolvedValue(true);
  db.getPaymentByProviderId.mockResolvedValue(null);
  db.getTelegramOrder.mockResolvedValue(order);
  db.getTelegramPaymentCountForOrder.mockResolvedValue(0);
  db.recordTelegramOneTimePayment.mockResolvedValue(undefined);
  db.recordTelegramSubscriptionPayment.mockResolvedValue(undefined);
  db.refundTelegramOneTimePayment.mockResolvedValue(undefined);
  db.refundTelegramPayment.mockResolvedValue(undefined);
  db.getTelegramSubscriptionControl.mockResolvedValue({
    orderId: ORDER_ID,
    telegramUserId: "777",
    providerPaymentId: "charge-1",
    expiresAt: EXPIRY_SECONDS * 1000,
    status: "active",
  });
  db.setTelegramSubscriptionRenewalState.mockResolvedValue(undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("Telegram invoice creation", () => {
  it("requires an authenticated Skein user", async () => {
    const response = await createInvoice({ request: invoiceRequest(), env: env(), data: { userId: null } } as any);
    expect(response.status).toBe(401);
  });

  it("rejects cross-origin invoice creation", async () => {
    const response = await createInvoice({ request: invoiceRequest(undefined, "https://evil.test"), env: env(), data: { userId: 42 } } as any);
    expect(response.status).toBe(403);
  });

  it("rejects unknown products and missing billing configuration", async () => {
    const unknown = await createInvoice({ request: invoiceRequest({ product: "readiness_report" }), env: env(), data: { userId: 42 } } as any);
    expect(unknown.status).toBe(400);
    const unavailable = await createInvoice({ request: invoiceRequest(), env: env({ TELEGRAM_BOT_TOKEN: "" }), data: { userId: 42 } } as any);
    expect(unavailable.status).toBe(503);
  });

  it("creates an opaque server-owned recurring Stars invoice", async () => {
    const provider = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, result: "https://t.me/$invoice_slug" }), { status: 200 }));
    const response = await createInvoice({ request: invoiceRequest(), env: env(), data: { userId: 42 } } as any);
    expect(response.status).toBe(200);
    expect(db.createTelegramOrder).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: 42, product: "coach_monthly", amount: 500, currency: "XTR", billingKind: "subscription",
    }), NOW);
    const requestBody = JSON.parse(String((provider.mock.calls[0]?.[1] as RequestInit).body));
    expect(requestBody).toMatchObject({ currency: "XTR", subscription_period: 2_592_000, prices: [{ amount: 500 }] });
    expect(requestBody).not.toHaveProperty("provider_token");
    expect(requestBody.payload).toMatch(/^ord_[A-Za-z0-9_-]{32}$/);
    expect(requestBody.payload).not.toContain("42");
    expect(requestBody.payload).not.toContain("coach_monthly");
    await expect(response.json()).resolves.toMatchObject({ invoiceUrl: "https://t.me/$invoice_slug", product: { id: "coach_monthly", amount: 500 } });
  });

  it("creates a server-owned 1-Star author-support invoice without subscription semantics", async () => {
    const provider = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, result: "https://t.me/$support_slug" }), { status: 200 }));
    const response = await createInvoice({ request: invoiceRequest({ product: "author_support", amount: 999, entitlement: "coach" }), env: env(), data: { userId: 42 } } as any);
    expect(response.status).toBe(200);
    expect(db.createTelegramOrder).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: 42, product: "author_support", amount: 1, currency: "XTR", billingKind: "one_time", subscriptionPeriodSeconds: null,
    }), NOW);
    const requestBody = JSON.parse(String((provider.mock.calls[0]?.[1] as RequestInit).body));
    expect(requestBody).toMatchObject({ currency: "XTR", prices: [{ amount: 1 }] });
    expect(requestBody).not.toHaveProperty("subscription_period");
    expect(requestBody).not.toHaveProperty("provider_token");
    await expect(response.json()).resolves.toMatchObject({
      invoiceUrl: "https://t.me/$support_slug",
      product: { id: "author_support", amount: 1, billingKind: "one_time", subscriptionPeriodSeconds: null },
    });
  });

  it("fails closed on Bot API errors or malformed invoice links", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 200 }));
    const failed = await createInvoice({ request: invoiceRequest(), env: env(), data: { userId: 42 } } as any);
    expect(failed.status).toBe(502);
    expect(db.markTelegramOrderFailed).toHaveBeenCalledOnce();
  });
});

describe("Telegram webhook", () => {
  it("rejects an invalid secret and malformed JSON", async () => {
    const badSecret = await telegramWebhook({ request: webhookRequest({}, "wrong"), env: env(), data: {} } as any);
    expect(badSecret.status).toBe(401);
    const malformed = await telegramWebhook({ request: webhookRequest("{"), env: env(), data: {} } as any);
    expect(malformed.status).toBe(400);
  });

  it("validates and answers the official pre_checkout_query shape", async () => {
    const provider = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, result: true }), { status: 200 }));
    const response = await telegramWebhook({ request: webhookRequest({
      update_id: 1000,
      pre_checkout_query: { id: "pcq-1", from: { id: 777 }, currency: "XTR", total_amount: 500, invoice_payload: ORDER_ID },
    }), env: env(), data: {} } as any);
    expect(response.status).toBe(200);
    expect(db.approveTelegramPreCheckout).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      orderId: ORDER_ID, telegramUserId: "777", amount: 500, currency: "XTR", preCheckoutQueryId: "pcq-1",
    }), NOW);
    const body = JSON.parse(String((provider.mock.calls[0]?.[1] as RequestInit).body));
    expect(body).toEqual({ pre_checkout_query_id: "pcq-1", ok: true });
  });

  it.each([
    ["wrong currency", { currency: "USD" }],
    ["wrong amount", { total_amount: 499 }],
    ["missing payment id", { telegram_payment_charge_id: "" }],
    ["not recurring", { is_recurring: undefined }],
  ])("rejects %s", async (_name, override) => {
    const response = await telegramWebhook({ request: webhookRequest(successUpdate(override)), env: env(), data: {} } as any);
    expect(response.status).toBe(400);
    expect(db.recordTelegramSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("persists a successful first recurring payment and grants only server-defined Coach", async () => {
    const response = await telegramWebhook({ request: webhookRequest(successUpdate()), env: env(), data: {} } as any);
    expect(response.status).toBe(200);
    expect(db.recordTelegramSubscriptionPayment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      order,
      providerPaymentId: "charge-1",
      telegramUserId: "777",
      product: "coach_monthly",
      amount: 500,
      currency: "XTR",
      subscriptionExpiresAt: EXPIRY_SECONDS * 1000,
      isFirstRecurring: true,
      entitlements: ["coach"],
    }), NOW);
  });

  it("persists a one-time 1-Star author-support payment without granting an entitlement", async () => {
    db.getTelegramOrder.mockResolvedValue(supportOrder);
    const response = await telegramWebhook({ request: webhookRequest(supportSuccessUpdate()), env: env(), data: {} } as any);
    expect(response.status).toBe(200);
    expect(db.recordTelegramOneTimePayment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      order: supportOrder,
      providerPaymentId: "support-charge-1",
      telegramUserId: "777",
      product: "author_support",
      amount: 1,
      currency: "XTR",
    }), NOW);
    expect(db.recordTelegramSubscriptionPayment).not.toHaveBeenCalled();
  });

  it.each([
    ["recurring marker", { is_recurring: true }],
    ["first recurring marker", { is_first_recurring: true }],
    ["subscription expiration", { subscription_expiration_date: EXPIRY_SECONDS }],
  ])("rejects author support with forged %s", async (_name, override) => {
    db.getTelegramOrder.mockResolvedValue(supportOrder);
    const response = await telegramWebhook({ request: webhookRequest(supportSuccessUpdate(override)), env: env(), data: {} } as any);
    expect(response.status).toBe(400);
    expect(db.recordTelegramOneTimePayment).not.toHaveBeenCalled();
    expect(db.recordTelegramSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("does not allow a second payment for the same one-time support order", async () => {
    db.getTelegramOrder.mockResolvedValue(supportOrder);
    db.getTelegramPaymentCountForOrder.mockResolvedValue(1);
    const response = await telegramWebhook({ request: webhookRequest(supportSuccessUpdate({ telegram_payment_charge_id: "support-charge-2" })), env: env(), data: {} } as any);
    expect(response.status).toBe(409);
    expect(db.recordTelegramOneTimePayment).not.toHaveBeenCalled();
  });

  it("binds a forwarded invoice payment to the initiating Skein order owner", async () => {
    const response = await telegramWebhook({ request: webhookRequest(successUpdate()), env: env(), data: {} } as any);
    expect(response.status).toBe(200);
    const input = db.recordTelegramSubscriptionPayment.mock.calls[0][1];
    expect(input.order.userId).toBe(42);
    expect(input.telegramUserId).toBe("777");
  });

  it("deduplicates a replayed payment id without granting twice", async () => {
    db.getPaymentByProviderId.mockResolvedValueOnce({
      id: 1, userId: 42, provider: "telegram_stars", providerPaymentId: "charge-1", product: "coach_monthly",
      amount: 500, currency: "XTR", status: "completed", orderId: ORDER_ID, telegramUserId: "777",
    });
    const response = await telegramWebhook({ request: webhookRequest(successUpdate()), env: env(), data: {} } as any);
    await expect(response.json()).resolves.toEqual({ ok: true, duplicate: true });
    expect(db.recordTelegramSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("accepts a recurring renewal but rejects a second first-payment marker", async () => {
    db.getTelegramPaymentCountForOrder.mockResolvedValue(1);
    const renewal = successUpdate({ telegram_payment_charge_id: "charge-2", is_first_recurring: undefined });
    expect((await telegramWebhook({ request: webhookRequest(renewal), env: env(), data: {} } as any)).status).toBe(200);
    const invalid = successUpdate({ telegram_payment_charge_id: "charge-3", is_first_recurring: true });
    expect((await telegramWebhook({ request: webhookRequest(invalid), env: env(), data: {} } as any)).status).toBe(400);
  });

  it("processes the official refunded_payment shape idempotently", async () => {
    db.getPaymentByProviderId.mockResolvedValue({
      id: 1, userId: 42, provider: "telegram_stars", providerPaymentId: "charge-1", product: "coach_monthly",
      amount: 500, currency: "XTR", status: "completed", orderId: ORDER_ID, telegramUserId: "777",
    });
    const response = await telegramWebhook({ request: webhookRequest({ update_id: 1002, message: { refunded_payment: {
      currency: "XTR", total_amount: 500, invoice_payload: ORDER_ID,
      telegram_payment_charge_id: "charge-1", provider_payment_charge_id: "",
    } } }), env: env(), data: {} } as any);
    expect(response.status).toBe(200);
    expect(db.refundTelegramPayment).toHaveBeenCalledOnce();
  });

  it.each([
    ["canceled", "canceled"],
    ["active", "active"],
    ["failed", "failed"],
  ] as const)("records the official BotSubscriptionUpdated %s state without changing paid-through access", async (_name, state) => {
    const response = await telegramWebhook({ request: webhookRequest({
      update_id: 1005,
      subscription: {
        user: { id: 777, is_bot: false, first_name: "Buyer" },
        invoice_payload: ORDER_ID,
        state,
      },
    }), env: env(), data: {} } as any);
    expect(response.status).toBe(200);
    expect(db.applyTelegramSubscriptionProviderState).toHaveBeenCalledWith(
      expect.anything(), ORDER_ID, "777", state, NOW,
    );
    expect(db.refundTelegramPayment).not.toHaveBeenCalled();
    expect(db.recordTelegramSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("rejects a subscription-state update for a Telegram payer that is not bound to the order", async () => {
    const response = await telegramWebhook({ request: webhookRequest({
      update_id: 1006,
      subscription: {
        user: { id: 999, is_bot: false, first_name: "Other" },
        invoice_payload: ORDER_ID,
        state: "canceled",
      },
    }), env: env(), data: {} } as any);
    expect(response.status).toBe(409);
    expect(db.applyTelegramSubscriptionProviderState).not.toHaveBeenCalled();
  });

  it("refunds one-time author support without touching subscription entitlement state", async () => {
    db.getPaymentByProviderId.mockResolvedValue({
      id: 2, userId: 42, provider: "telegram_stars", providerPaymentId: "support-charge-1", product: "author_support",
      amount: 1, currency: "XTR", status: "completed", orderId: ORDER_ID, telegramUserId: "777",
    });
    db.getTelegramOrder.mockResolvedValue(supportOrder);
    const response = await telegramWebhook({ request: webhookRequest({ update_id: 1004, message: { refunded_payment: {
      currency: "XTR", total_amount: 1, invoice_payload: ORDER_ID,
      telegram_payment_charge_id: "support-charge-1", provider_payment_charge_id: "",
    } } }), env: env(), data: {} } as any);
    expect(response.status).toBe(200);
    expect(db.refundTelegramOneTimePayment).toHaveBeenCalledOnce();
    expect(db.refundTelegramPayment).not.toHaveBeenCalled();
  });

  it("returns a retryable failure when the atomic payment transition fails", async () => {
    db.recordTelegramSubscriptionPayment.mockRejectedValueOnce(new Error("db down"));
    db.getPaymentByProviderId.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const failed = await telegramWebhook({ request: webhookRequest(successUpdate()), env: env(), data: {} } as any);
    expect(failed.status).toBe(503);
    db.recordTelegramSubscriptionPayment.mockResolvedValueOnce(undefined);
    const retry = await telegramWebhook({ request: webhookRequest(successUpdate()), env: env(), data: {} } as any);
    expect(retry.status).toBe(200);
  });
});

describe("Telegram subscription control", () => {
  it("requires auth and same-origin CSRF before changing renewal", async () => {
    const request = invoiceRequest({ action: "cancel" });
    const unauth = await updateSubscription({ request, env: env(), data: { userId: null } } as any);
    expect(unauth.status).toBe(401);
    const crossOrigin = await updateSubscription({
      request: invoiceRequest({ action: "cancel" }, "https://evil.test"), env: env(), data: { userId: 42 },
    } as any);
    expect(crossOrigin.status).toBe(403);
  });

  it.each([
    ["cancel", true, "pending_cancellation"],
    ["resume", false, "active"],
  ] as const)("uses editUserStarSubscription for %s while preserving paid-through access", async (action, isCanceled, expectedStatus) => {
    const provider = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, result: true }), { status: 200 }));
    const response = await updateSubscription({
      request: invoiceRequest({ action }), env: env(), data: { userId: 42 },
    } as any);
    expect(response.status).toBe(200);
    const body = JSON.parse(String((provider.mock.calls[0]?.[1] as RequestInit).body));
    expect(body).toEqual({ user_id: 777, telegram_payment_charge_id: "charge-1", is_canceled: isCanceled });
    expect(db.setTelegramSubscriptionRenewalState).toHaveBeenCalledWith(expect.anything(), ORDER_ID, isCanceled, NOW);
    expect((await response.json() as any).renewal).toBe(action === "cancel" ? "cancelled" : "active");
    expect(expectedStatus).toBe(isCanceled ? "pending_cancellation" : "active");
  });

  it("fails closed when Telegram does not confirm the renewal change", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 200 }));
    const response = await updateSubscription({ request: invoiceRequest({ action: "cancel" }), env: env(), data: { userId: 42 } } as any);
    expect(response.status).toBe(502);
    expect(db.setTelegramSubscriptionRenewalState).not.toHaveBeenCalled();
  });
});
