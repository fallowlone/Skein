import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPaymentsForUser: vi.fn(),
  telegramSchemaReady: vi.fn(),
}));

vi.mock("../../lib/db", () => mocks);

import { onRequestGet } from "./payments";

beforeEach(() => {
  mocks.listPaymentsForUser.mockReset();
  mocks.telegramSchemaReady.mockReset();
  mocks.telegramSchemaReady.mockResolvedValue(true);
  mocks.listPaymentsForUser.mockResolvedValue([]);
});

describe("customer billing history", () => {
  it("requires authentication", async () => {
    const response = await onRequestGet({ env: { DB: {} }, data: { userId: null } } as any);
    expect(response.status).toBe(401);
  });

  it("fails closed while the production billing schema is unavailable", async () => {
    mocks.telegramSchemaReady.mockResolvedValue(false);
    const response = await onRequestGet({ env: { DB: {} }, data: { userId: 42 } } as any);
    expect(response.status).toBe(503);
    expect(mocks.listPaymentsForUser).not.toHaveBeenCalled();
  });

  it("queries only the authenticated user and exposes no provider identifiers", async () => {
    mocks.listPaymentsForUser.mockResolvedValue([{ provider: "telegram_stars", product: "coach_monthly", amount: 500, currency: "XTR", status: "completed", createdAt: 1_800_000_000_000, subscriptionExpiresAt: 1_802_592_000_000 }]);
    const response = await onRequestGet({ env: { DB: {} }, data: { userId: 42 } } as any);
    expect(mocks.listPaymentsForUser).toHaveBeenCalledWith(expect.anything(), 42);
    const body = await response.json() as any;
    expect(body.payments[0]).toMatchObject({ provider: "telegram_stars", product: "coach_monthly", amount: 500, currency: "XTR", status: "completed" });
    expect(JSON.stringify(body)).not.toContain("providerPaymentId");
    expect(JSON.stringify(body)).not.toContain("telegramUserId");
  });
});
