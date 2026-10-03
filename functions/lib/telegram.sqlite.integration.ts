// Executed with Bun so the billing SQL is exercised against a real SQLite engine.
// @ts-nocheck
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { onRequestPost as githubCourseWebhook } from "../api/billing/github-sponsors";
import { onRequestPost as lessonAttempt } from "../api/lessons/attempt";
import { lessonAccessible } from "./lesson-access";
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
  "0009_course_access.sql",
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

const courseOrderId = "ord_EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
await createTelegramOrder(db, {
  id: courseOrderId, userId: 42, product: "course:algorithms", amount: 300, currency: "XTR",
  billingKind: "one_time", subscriptionPeriodSeconds: null, checkoutExpiresAt: 99_999,
}, 90);
assert.equal(await approveTelegramPreCheckout(db, {
  orderId: courseOrderId, product: "course:algorithms", amount: 300, currency: "XTR", telegramUserId: "888",
  preCheckoutQueryId: "pcq-course",
}, 91), true);
await recordTelegramOneTimePayment(db, {
  order: {
    id: courseOrderId, userId: 42, product: "course:algorithms", amount: 300, currency: "XTR",
    billingKind: "one_time", subscriptionPeriodSeconds: null, status: "approved", telegramUserId: "888",
    checkoutExpiresAt: 99_999, currentPeriodEnd: null, createdAt: 90, updatedAt: 91,
  },
  providerPaymentId: "course-charge-1", telegramUserId: "888", product: "course:algorithms",
  amount: 300, currency: "XTR",
}, 92);
assert.deepEqual(sqlite.prepare(
  "SELECT user_id, track, expires_at, revoked_at FROM course_access_grants WHERE provider_ref = ?",
).get("course-charge-1"), { user_id: 42, track: "algorithms", expires_at: null, revoked_at: null });
const coursePayment = await getPaymentByProviderId(db, "telegram_stars", "course-charge-1");
assert.ok(coursePayment);
await refundTelegramOneTimePayment(db, coursePayment!, 93);
assert.deepEqual(sqlite.prepare(
  "SELECT revoked_at FROM course_access_grants WHERE provider_ref = ?",
).get("course-charge-1"), { revoked_at: 93 });
console.log("telegram.sqlite.integration: PASS 300-Star course grant is permanent until its payment is refunded");

sqlite.prepare(
  "INSERT INTO course_purchase_intents (user_id, track, expires_at) VALUES (?, ?, ?)",
).run(42, "js-engine", Date.now() + 60_000);
const sponsorship = {
  action: "created",
  sponsorship: {
    node_id: "S_COURSE_1", sponsor: { id: 4200, type: "User", login: "buyer" },
    sponsorable: { login: "skein-owner" }, privacy_level: "PUBLIC",
    tier: { node_id: "TIER_COURSE", name: "Skein course", monthly_price_in_cents: 999, is_one_time: true },
  },
};
const signedCourseRequest = async (body: unknown, delivery: string) => {
  const raw = JSON.stringify(body);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request("https://skein.test/api/billing/github-sponsors", {
    method: "POST", headers: {
      "X-GitHub-Event": "sponsorship", "X-GitHub-Delivery": delivery,
      "X-Hub-Signature-256": `sha256=${signature}`,
    }, body: raw,
  });
};
const ghEnv = {
  DB: db, GITHUB_SPONSORS_URL: "https://github.com/sponsors/skein-owner",
  GITHUB_SPONSORS_WEBHOOK_SECRET: "secret", GITHUB_SPONSORS_COURSE_TIER_ID: "TIER_COURSE",
};
assert.equal((await githubCourseWebhook({ request: await signedCourseRequest(sponsorship, "course-delivery-1"), env: ghEnv, data: {} } as any)).status, 200);
assert.deepEqual(sqlite.prepare(
  "SELECT user_id, track, expires_at FROM course_access_grants WHERE provider_ref = 'S_COURSE_1'",
).get(), { user_id: 42, track: "js-engine", expires_at: null });
assert.equal((await githubCourseWebhook({ request: await signedCourseRequest(sponsorship, "course-delivery-1"), env: ghEnv, data: {} } as any)).status, 200);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM course_access_grants WHERE provider_ref = 'S_COURSE_1'").get().count, 1);
console.log("telegram.sqlite.integration: PASS signed 9.99 USD GitHub sponsorship consumes one track intent exactly once");

sqlite.prepare("UPDATE users SET terms_version = 'v1', terms_accepted_at = 1 WHERE id = 42").run();
const originalFetch = globalThis.fetch;
const firstKey = "algorithms/01-foundations/01-start";
const firstPayload = {
  lesson: { key: firstKey, lang: "en", track: "algorithms", body: { format: "lesson-render-tree-v1", root: [
    { type: "element", name: "Quiz", props: { id: "q1", choices: [{ label: "wrong" }, { label: "right", correct: true }] } },
    { type: "element", name: "DragOrder", props: { id: "d1", items: ["first", "second"] } },
  ] } }, graph: { navPrev: null },
};
globalThis.fetch = async () => new Response(JSON.stringify([{ payload: firstPayload, version: "v1" }]));
const submit = async (userId: number | null, exerciseId: string, answer: unknown) => lessonAttempt({
  request: new Request("https://skein.test/api/lessons/attempt", {
    method: "POST", headers: { Origin: "https://skein.test", "content-type": "application/json" },
    body: JSON.stringify({ path: ["en", "algorithms", "01-foundations", "01-start"], exerciseId, answer }),
  }),
  env: { DB: db, TERMS_VERSION: "v1", SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "secret" },
  data: { userId },
} as any);
assert.equal((await submit(null, "q1", 1)).status, 401);
assert.equal((await submit(42, "q1", 0)).status, 200);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM lesson_exercise_passes WHERE user_id = 42").get().count, 0);
sqlite.prepare("INSERT INTO lesson_exercise_passes (user_id, lesson_key, exercise_id, passed_at) VALUES (?, ?, ?, ?)")
  .run(42, firstKey, "retired-question", Date.now());
assert.deepEqual(await (await submit(42, "q1", 1)).json(), { passed: true, lessonCompleted: false });
assert.deepEqual(await (await submit(42, "d1", [0, 1])).json(), { passed: true, lessonCompleted: true });
assert.equal(await lessonAccessible(db, 42, { ...firstPayload, graph: { navPrev: firstKey }, lesson: { ...firstPayload.lesson, key: "algorithms/01-foundations/02-next" } } as any), true);
assert.equal(await lessonAccessible(db, 43, { ...firstPayload, graph: { navPrev: firstKey }, lesson: { ...firstPayload.lesson, key: "algorithms/01-foundations/02-next" } } as any), false);
globalThis.fetch = originalFetch;
console.log("telegram.sqlite.integration: PASS signed-in Quiz and DragOrder unlock the next lesson only after both pass");
