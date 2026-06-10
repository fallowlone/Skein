import { describe, it, expect } from "vitest";
import { onRequest } from "./_middleware";
import { FakeKV } from "./test/fakes";

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
});
