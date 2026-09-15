export interface TelegramInvoiceResult {
  invoiceUrl: string;
  orderId: string;
  product: {
    id: string;
    amount: number;
    currency: "XTR";
    billingKind: "subscription" | "one_time";
    subscriptionPeriodSeconds: number | null;
  };
}

export interface BillingPayment {
  provider: string;
  product: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  subscriptionExpiresAt: string | null;
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => ({})) as { error?: unknown };
  return new Error(typeof body.error === "string" ? body.error : fallback);
}

export async function createTelegramCoachInvoice(fetcher: typeof fetch = fetch): Promise<TelegramInvoiceResult> {
  return createTelegramInvoice("coach_monthly", fetcher);
}

export async function createTelegramAuthorSupportInvoice(fetcher: typeof fetch = fetch): Promise<TelegramInvoiceResult> {
  return createTelegramInvoice("author_support", fetcher);
}

async function createTelegramInvoice(product: "coach_monthly" | "author_support", fetcher: typeof fetch): Promise<TelegramInvoiceResult> {
  const response = await fetcher("/api/telegram/invoice", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product }),
  });
  if (!response.ok) throw await responseError(response, "telegram_invoice_failed");
  return await response.json() as TelegramInvoiceResult;
}

export async function fetchBillingPayments(fetcher: typeof fetch = fetch): Promise<BillingPayment[]> {
  const response = await fetcher("/api/billing/payments", { credentials: "same-origin" });
  if (!response.ok) throw await responseError(response, "payment_history_failed");
  const body = await response.json() as { payments?: BillingPayment[] };
  return Array.isArray(body.payments) ? body.payments : [];
}

export async function setTelegramCoachRenewal(
  action: "cancel" | "resume",
  fetcher: typeof fetch = fetch,
): Promise<{ renewal: "cancelled" | "active"; accessExpiresAt: string }> {
  const response = await fetcher("/api/telegram/subscription", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) throw await responseError(response, "subscription_update_failed");
  return await response.json() as { renewal: "cancelled" | "active"; accessExpiresAt: string };
}
