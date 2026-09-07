import { describe, expect, it } from "vitest";
import { onRequestPost } from "./github-sponsors";
import { getEntitlement, setEntitlement, upsertUserFromGithub } from "../../lib/db";
import { FakeD1 } from "../../test/fakes";

async function signedRequest(payload: unknown, delivery = "delivery-1", secret = "secret") {
  const body = JSON.stringify(payload);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const signature = `sha256=${Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  return new Request("https://skein.test/api/billing/github-sponsors", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-GitHub-Event": "sponsorship",
      "X-GitHub-Delivery": delivery,
      "X-Hub-Signature-256": signature,
    },
    body,
  });
}

function payload(action: string, sponsor: any = { id: 999, login: "octocat", type: "User" }) {
  return {
    action,
    sponsorship: {
      node_id: "S_123",
      sponsor,
      sponsorable: { login: "skein-owner" },
      privacy_level: sponsor ? "PUBLIC" : "PRIVATE",
      tier: {
        node_id: "TIER_COACH",
        name: "Coach",
        monthly_price_in_cents: 900,
        is_one_time: false,
      },
    },
  };
}

function env(db: FakeD1) {
  return {
    DB: db,
    GITHUB_SPONSORS_URL: "https://github.com/sponsors/skein-owner",
    GITHUB_SPONSORS_WEBHOOK_SECRET: "secret",
    GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH",
  } as any;
}

describe("GitHub Sponsors webhook", () => {
  it("grants Coach to the matching durable GitHub user, dedupes, and revokes only when cancelled", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const created = await onRequestPost({ request: await signedRequest(payload("created")), env: env(db), data: {} } as any);
    expect(created.status).toBe(200);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);

    const duplicate = await onRequestPost({ request: await signedRequest(payload("created")), env: env(db), data: {} } as any);
    expect(await duplicate.json()).toEqual({ ok: true, duplicate: true });

    const pending = await onRequestPost({ request: await signedRequest(payload("pending_cancellation"), "delivery-2"), env: env(db), data: {} } as any);
    expect(pending.status).toBe(200);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);

    const cancelled = await onRequestPost({ request: await signedRequest(payload("cancelled"), "delivery-3"), env: env(db), data: {} } as any);
    expect(cancelled.status).toBe(200);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);
  });

  it("never auto-grants a private/unidentifiable sponsor", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const r = await onRequestPost({ request: await signedRequest(payload("created", null)), env: env(db), data: {} } as any);
    expect(r.status).toBe(200);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);
  });

  it("rejects a bad signature before touching entitlement state", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const request = await signedRequest(payload("created"), "delivery-x");
    request.headers.set("X-Hub-Signature-256", `sha256=${"0".repeat(64)}`);
    const r = await onRequestPost({ request, env: env(db), data: {} } as any);
    expect(r.status).toBe(401);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);
  });

  it("is honestly unavailable when payment configuration is incomplete", async () => {
    const db = new FakeD1();
    const r = await onRequestPost({
      request: await signedRequest(payload("created")),
      env: { DB: db, GITHUB_SPONSORS_URL: "https://github.com/sponsors/skein-owner" },
      data: {},
    } as any);
    expect(r.status).toBe(503);
    await expect(r.json()).resolves.toEqual({ error: "billing_unavailable" });
  });

  it("treats cancellation as terminal so stale later edits cannot resurrect Coach", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const first = await onRequestPost({ request: await signedRequest(payload("edited"), "delivery-edited-1"), env: env(db), data: {} } as any);
    expect(first.status).toBe(200);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);

    await onRequestPost({ request: await signedRequest(payload("cancelled"), "delivery-edited-2"), env: env(db), data: {} } as any);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);

    const lateEdit = { ...payload("edited"), delivery_test_marker: "late-after-cancel" };
    const retryLikeEdit = await onRequestPost({ request: await signedRequest(lateEdit, "delivery-edited-3"), env: env(db), data: {} } as any);
    expect(retryLikeEdit.status).toBe(200);
    await expect(retryLikeEdit.json()).resolves.toEqual({ ok: true, stale: true });
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);
  });

  it("deduplicates an identical signed payload even if the delivery id changes", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const body = payload("created");
    const first = await onRequestPost({ request: await signedRequest(body, "delivery-body-1"), env: env(db), data: {} } as any);
    expect(first.status).toBe(200);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);

    await setEntitlement(db as any, user.id, "coach", false, "test", "manual", 2);
    const replay = await onRequestPost({ request: await signedRequest(body, "delivery-body-2"), env: env(db), data: {} } as any);
    await expect(replay.json()).resolves.toEqual({ ok: true, duplicate: true });
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);
  });

  it("does not let an older sponsorship cancellation revoke a newer Coach grant", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const old = { ...payload("created"), sponsorship: { ...payload("created").sponsorship, node_id: "S_old" } };
    const newer = { ...payload("created"), sponsorship: { ...payload("created").sponsorship, node_id: "S_new" } };
    expect((await onRequestPost({ request: await signedRequest(old, "delivery-old-create"), env: env(db), data: {} } as any)).status).toBe(200);
    expect((await onRequestPost({ request: await signedRequest(newer, "delivery-new-create"), env: env(db), data: {} } as any)).status).toBe(200);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);

    const oldCancelled = { ...old, action: "cancelled", delivery_test_marker: "old-cancel" };
    expect((await onRequestPost({ request: await signedRequest(oldCancelled, "delivery-old-cancel"), env: env(db), data: {} } as any)).status).toBe(200);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);
  });
});
