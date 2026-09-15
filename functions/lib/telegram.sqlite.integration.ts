// Executed with Bun so the billing SQL is exercised against a real SQLite engine.
// @ts-nocheck
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  applyTelegramSubscriptionProviderState,
  approveTelegramPreCheckout,
  createTelegramOrder,
  getActiveTelegramEntitlement,
  getPaymentByProviderId,
  getTelegramSubscriptionControl,
  listPaymentsForUser,
  recordTelegramOneTimePayment,
  recordTelegramSubscriptionPayment,
  refundTelegramOneTimePayment,
  refundTelegramPayment,
  telegramSchemaReady,
} from "./db";

type NativeStatement = {
  get: (...args: unknown[]) => any;
  run: (...args: unknown[]) => { changes: number | bigint; lastInsertRowid?: number | bigint };
  all: (...args: unknown[]) => any[];
};

class BoundStatement {
  constructor(private readonly statement: NativeStatement, private readonly args: unknown[]) {}
  async first<T>() { return (this.statement.get(...this.args) ?? null) as T | null; }
  async run() { return this.runSync(); }
  async all<T>() { return { success: true, results: this.statement.all(...this.args) as T[], meta: {} }; }
  runSync() {
    const result = this.statement.run(...this.args);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid ?? 0) } };
  }
}

class SqliteD1 {
  constructor(private readonly sqlite: any) {}
  prepare(sql: string) {
    const statement = this.sqlite.prepare(sql);
    const unbound = new BoundStatement(statement, []);
    return {
      bind: (...args: unknown[]) => new BoundStatement(statement, args),
      first: <T>() => unbound.first<T>(),
      run: () => unbound.run(),
      all: <T>() => unbound.all<T>(),
    };
  }
  async batch(statements: BoundStatement[]) {
    const transaction = this.sqlite.transaction((items: BoundStatement[]) => items.map((statement) => statement.runSync()));
    return transaction(statements);
  }
}

function migration(name: string): string {
  return readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
}

const { Database } = await import("bun:sqlite");
const sqlite = new Database(":memory:");
for (const name of [
  "0001_init.sql",
  "0003_coach_entitlements.sql",
  "0004_coach_verification.sql",
  "0005_telegram_payments.sql",
  "0006_telegram_payment_hardening.sql",
  "0007_telegram_orders_subscriptions.sql",
  "0008_telegram_precheckout_lock.sql",
]) sqlite.exec(migration(name));
sqlite.exec("INSERT INTO users (id, github_id, login, nickname, created_at) VALUES (42, 4200, 'buyer', 'buyer', 1)");
sqlite.exec("INSERT INTO users (id, github_id, login, nickname, created_at) VALUES (43, 4300, 'other', 'other', 1)");
const db = new SqliteD1(sqlite) as any;
assert.equal(await telegramSchemaReady(db), true);
sqlite.exec("DROP INDEX idx_telegram_orders_pre_checkout_query");
assert.equal(await telegramSchemaReady(db), false);
sqlite.exec("CREATE INDEX idx_telegram_orders_pre_checkout_query ON telegram_orders(pre_checkout_query_id)");
assert.equal(await telegramSchemaReady(db), false);
sqlite.exec("DROP INDEX idx_telegram_orders_pre_checkout_query");
sqlite.exec(
  "CREATE UNIQUE INDEX idx_telegram_orders_pre_checkout_query ON telegram_orders(pre_checkout_query_id) WHERE pre_checkout_query_id IS NOT NULL",
);
assert.equal(await telegramSchemaReady(db), true);

const makeOrder = async (id: string, userId = 42) => {
  await createTelegramOrder(db, {
    id,
    userId,
    product: "coach_monthly",
    amount: 500,
    currency: "XTR",
    billingKind: "subscription",
    subscriptionPeriodSeconds: 2_592_000,
    checkoutExpiresAt: 99_999,
  }, 10);
  assert.equal(await approveTelegramPreCheckout(db, {
    orderId: id, product: "coach_monthly", amount: 500, currency: "XTR", telegramUserId: "777",
    preCheckoutQueryId: `pcq-${id}`,
  }, 11), true);
};

await makeOrder("ord_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
const firstOrder = {
  id: "ord_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", userId: 42, product: "coach_monthly", amount: 500, currency: "XTR",
  billingKind: "subscription", subscriptionPeriodSeconds: 2_592_000, status: "approved", telegramUserId: "777",
  checkoutExpiresAt: 99_999, currentPeriodEnd: null, createdAt: 10, updatedAt: 11,
};
await recordTelegramSubscriptionPayment(db, {
  order: firstOrder,
  providerPaymentId: "charge-1",
  telegramUserId: "777",
  product: "coach_monthly",
  amount: 500,
  currency: "XTR",
  subscriptionExpiresAt: 10_000,
  isFirstRecurring: true,
  entitlements: ["coach"],
}, 20);
assert.deepEqual(await getActiveTelegramEntitlement(db, 42, "coach", 100), {
  orderId: firstOrder.id,
  expiresAt: 10_000,
  renewalStatus: "active",
});
assert.equal(await applyTelegramSubscriptionProviderState(db, firstOrder.id, "777", "canceled", 21), true);
assert.equal((await getActiveTelegramEntitlement(db, 42, "coach", 100))?.renewalStatus, "pending_cancellation");
assert.equal(await applyTelegramSubscriptionProviderState(db, firstOrder.id, "777", "active", 22), true);
assert.equal((await getActiveTelegramEntitlement(db, 42, "coach", 100))?.renewalStatus, "active");
assert.equal(await applyTelegramSubscriptionProviderState(db, firstOrder.id, "777", "failed", 23), true);
assert.equal((await getActiveTelegramEntitlement(db, 42, "coach", 100))?.renewalStatus, "payment_failed");
assert.equal(await applyTelegramSubscriptionProviderState(db, firstOrder.id, "999", "active", 24), false);
assert.equal((await getActiveTelegramEntitlement(db, 42, "coach", 100))?.renewalStatus, "payment_failed");

await recordTelegramSubscriptionPayment(db, {
  order: { ...firstOrder, status: "active", currentPeriodEnd: 10_000 },
  providerPaymentId: "charge-2",
  telegramUserId: "777",
  product: "coach_monthly",
  amount: 500,
  currency: "XTR",
  subscriptionExpiresAt: 20_000,
  isFirstRecurring: false,
  entitlements: ["coach"],
}, 30);
assert.equal((await getTelegramSubscriptionControl(db, 42, 100))?.providerPaymentId, "charge-1");
const oldPayment = await getPaymentByProviderId(db, "telegram_stars", "charge-1");
assert.ok(oldPayment);
await refundTelegramPayment(db, oldPayment!, 40);
assert.equal((await getActiveTelegramEntitlement(db, 42, "coach", 100))?.expiresAt, 20_000);
assert.equal((await getPaymentByProviderId(db, "telegram_stars", "charge-1"))?.status, "refunded");
assert.equal((await getTelegramSubscriptionControl(db, 42, 100))?.providerPaymentId, "charge-1");
console.log("telegram.sqlite.integration: PASS old refund preserves newer paid-through access");

const renewal = await getPaymentByProviderId(db, "telegram_stars", "charge-2");
assert.ok(renewal);
await refundTelegramPayment(db, renewal!, 50);
assert.equal(await getActiveTelegramEntitlement(db, 42, "coach", 100), null);
console.log("telegram.sqlite.integration: PASS refund of final paid period revokes only its order entitlement");

await makeOrder("ord_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");
const expiringOrder = {
  ...firstOrder,
  id: "ord_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
};
await recordTelegramSubscriptionPayment(db, {
  order: expiringOrder,
  providerPaymentId: "charge-expiring",
  telegramUserId: "777",
  product: "coach_monthly",
  amount: 500,
  currency: "XTR",
  subscriptionExpiresAt: 500,
  isFirstRecurring: true,
  entitlements: ["coach"],
}, 60);
assert.equal(await getActiveTelegramEntitlement(db, 42, "coach", 501), null);
assert.deepEqual(sqlite.prepare("SELECT active FROM telegram_entitlements WHERE order_id = ?").get(expiringOrder.id), { active: 0 });
console.log("telegram.sqlite.integration: PASS paid-through expiration fails closed and is persisted");

await makeOrder("ord_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC", 43);
const rollbackOrder = { ...firstOrder, id: "ord_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC", userId: 43 };
sqlite.exec("CREATE TRIGGER fail_telegram_entitlement BEFORE INSERT ON telegram_entitlements BEGIN SELECT RAISE(ABORT, 'forced entitlement failure'); END");
let failed = false;
try {
  await recordTelegramSubscriptionPayment(db, {
    order: rollbackOrder,
    providerPaymentId: "charge-rollback",
    telegramUserId: "777",
    product: "coach_monthly",
    amount: 500,
    currency: "XTR",
    subscriptionExpiresAt: 30_000,
    isFirstRecurring: true,
    entitlements: ["coach"],
  }, 70);
} catch { failed = true; }
assert.equal(failed, true);
assert.equal(await getPaymentByProviderId(db, "telegram_stars", "charge-rollback"), null);
assert.deepEqual(sqlite.prepare("SELECT status, current_period_end FROM telegram_orders WHERE id = ?").get(rollbackOrder.id), {
  status: "approved", current_period_end: null,
});
sqlite.exec("DROP TRIGGER fail_telegram_entitlement");
await recordTelegramSubscriptionPayment(db, {
  order: rollbackOrder,
  providerPaymentId: "charge-rollback",
  telegramUserId: "777",
  product: "coach_monthly",
  amount: 500,
  currency: "XTR",
  subscriptionExpiresAt: 30_000,
  isFirstRecurring: true,
  entitlements: ["coach"],
}, 71);
assert.ok(await getPaymentByProviderId(db, "telegram_stars", "charge-rollback"));
console.log("telegram.sqlite.integration: PASS payment + entitlement transition rolls back atomically and retries cleanly");

const ownHistory = await listPaymentsForUser(db, 42);
const otherHistory = await listPaymentsForUser(db, 43);
assert.equal(ownHistory.some((payment) => payment.provider === "telegram_stars" && payment.createdAt === 71), false);
assert.equal(otherHistory.some((payment) => payment.createdAt === 71), true);
console.log("telegram.sqlite.integration: PASS payment history is scoped by authenticated user id");

const supportOrderId = "ord_DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
await createTelegramOrder(db, {
  id: supportOrderId,
  userId: 42,
  product: "author_support",
  amount: 1,
  currency: "XTR",
  billingKind: "one_time",
  subscriptionPeriodSeconds: null,
  checkoutExpiresAt: 99_999,
}, 80);
assert.equal(await approveTelegramPreCheckout(db, {
  orderId: supportOrderId, product: "author_support", amount: 1, currency: "XTR", telegramUserId: "888",
  preCheckoutQueryId: "pcq-support",
}, 81), true);
assert.equal(await approveTelegramPreCheckout(db, {
  orderId: supportOrderId, product: "author_support", amount: 1, currency: "XTR", telegramUserId: "888",
  preCheckoutQueryId: "pcq-support",
}, 81), true);
assert.equal(await approveTelegramPreCheckout(db, {
  orderId: supportOrderId, product: "author_support", amount: 1, currency: "XTR", telegramUserId: "888",
  preCheckoutQueryId: "pcq-support-reuse",
}, 81), false);
console.log("telegram.sqlite.integration: PASS order locks to the first pre-checkout query and rejects invoice-link reuse");
const supportOrder = {
  id: supportOrderId, userId: 42, product: "author_support", amount: 1, currency: "XTR",
  billingKind: "one_time", subscriptionPeriodSeconds: null, status: "approved", telegramUserId: "888",
  checkoutExpiresAt: 99_999, currentPeriodEnd: null, createdAt: 80, updatedAt: 81,
};
await recordTelegramOneTimePayment(db, {
  order: supportOrder,
  providerPaymentId: "support-charge-1",
  telegramUserId: "888",
  product: "author_support",
  amount: 1,
  currency: "XTR",
}, 82);
const supportPayment = await getPaymentByProviderId(db, "telegram_stars", "support-charge-1");
assert.ok(supportPayment);
assert.equal(supportPayment!.isRecurring, false);
assert.equal(supportPayment!.subscriptionExpiresAt, null);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM telegram_entitlements WHERE order_id = ?").get(supportOrderId).count, 0);
assert.deepEqual(sqlite.prepare("SELECT status FROM telegram_orders WHERE id = ?").get(supportOrderId), { status: "completed" });
console.log("telegram.sqlite.integration: PASS one-time 1-Star support persists without entitlement");

let duplicateSupportFailed = false;
try {
  await recordTelegramOneTimePayment(db, {
    order: supportOrder,
    providerPaymentId: "support-charge-2",
    telegramUserId: "888",
    product: "author_support",
    amount: 1,
    currency: "XTR",
  }, 83);
} catch { duplicateSupportFailed = true; }
assert.equal(duplicateSupportFailed, true);
assert.equal(await getPaymentByProviderId(db, "telegram_stars", "support-charge-2"), null);
console.log("telegram.sqlite.integration: PASS one-time support order cannot be paid twice");

await refundTelegramOneTimePayment(db, supportPayment!, 84);
assert.equal((await getPaymentByProviderId(db, "telegram_stars", "support-charge-1"))?.status, "refunded");
assert.deepEqual(sqlite.prepare("SELECT status FROM telegram_orders WHERE id = ?").get(supportOrderId), { status: "refunded" });
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM telegram_entitlements WHERE order_id = ?").get(supportOrderId).count, 0);
console.log("telegram.sqlite.integration: PASS one-time support refund never touches entitlements");
