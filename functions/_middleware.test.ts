import { describe, it, expect, vi } from "vitest";
import { onRequest } from "./_middleware";
import { FakeD1, FakeKV } from "./test/fakes";
import { onRequestGet as entitlements } from "./api/entitlements";
import { setEntitlement, upsertUserFromGithub } from "./lib/db";
import { createSession, destroySession } from "./lib/session";
import { signValue } from "./lib/cookies";

function ctx(over: Partial<Record<string, unknown>> = {}) {
  return {
    request: new Request("https://example.com/api/events", { method: "POST" }),
    env: { SESSIONS: new FakeKV(), SESSION_SECRET: "s" },
    data: {},
    next: async () => new Response("ok"),
    ...over,
  } as any;
}

describe("middleware error boundary", () => {
  it("passes through a healthy request with security headers", async () => {
    const res = await onRequest(ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("turns an endpoint throw (e.g. D1 outage) into a generic 500", async () => {
    const res = await onRequest(ctx({
      next: async () => { throw new Error("D1_ERROR: no such table: events"); },
    }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "internal" });
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("turns a KV outage during rate limiting into a generic 500, not a stack trace", async () => {
    const kv = new FakeKV();
    kv.get = async () => { throw new Error("KV unreachable"); };
    const res = await onRequest(ctx({ env: { SESSIONS: kv, SESSION_SECRET: "s" } }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal" });
  });

  it("keeps invalid, expired, and deleted sessions anonymous at entitlements", async () => {
    const provider = vi.spyOn(globalThis, "fetch");
    const db = new FakeD1();
    const kv = new FakeKV();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await setEntitlement(db as any, user.id, "coach", true, "github-sponsors", "S_1", 1, Date.now());
    const valid = async () => {
      const sid = await createSession(kv as any, user.id, "oauth-token", "s");
      return signValue(sid, "s");
    };
    const cases: string[] = ["bad.signature"];
    const expired = await valid();
    kv._expire(`session:${(await kv.get("usess:" + user.id, "json"))[0]}`);
    cases.push(expired);
    const deletedSid = await createSession(kv as any, user.id, "oauth-token", "s");
    cases.push(await signValue(deletedSid, "s"));
    await destroySession(kv as any, deletedSid);

    for (const cookie of cases) {
      const request = new Request("https://example.com/api/entitlements", { headers: { Cookie: `session=${cookie}` } });
      const routeCtx: any = { request, env: { DB: db, SESSIONS: kv, SESSION_SECRET: "s", GITHUB_SPONSORS_URL: "https://github.com/sponsors/owner", GITHUB_SPONSORS_WEBHOOK_SECRET: "secret", GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" }, data: {} };
      routeCtx.next = async () => entitlements(routeCtx);
      const response = await onRequest(routeCtx);
      const body = await response.json() as any;
      expect(body.authenticated).toBe(false);
      expect(body.entitlements.coach).toBe(false);
    }
    expect(provider).not.toHaveBeenCalled();
    provider.mockRestore();
  });
});
