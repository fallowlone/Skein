import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./practice-grade";
import { acceptTerms, getAiUsage, setEntitlement, upsertUserFromGithub } from "../../lib/db";
import { FakeD1 } from "../../test/fakes";

const input = {
  lang: "en",
  task: "Design a limiter",
  constraints: "10k rps",
  rubric: ["bounds bursts"],
  modelAnswer: "Token bucket",
  response: "Use a fixed window",
};

async function setup({ coach = true, apiKey = "sk-server", limit = "2" } = {}) {
  const db = new FakeD1();
  const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
  await acceptTerms(db as any, user.id, "v1", 1);
  await setEntitlement(db as any, user.id, "coach", coach, "test", "S_1", 1, Date.now());
  const env = { DB: db, TERMS_VERSION: "v1", ANTHROPIC_API_KEY: apiKey, COACH_AI_MONTHLY_REQUESTS: limit,
    GITHUB_SPONSORS_URL: "https://github.com/sponsors/skein-owner",
    GITHUB_SPONSORS_WEBHOOK_SECRET: "secret", GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any;
  return { db, user, env, token: "token" };
}

function request() {
  return new Request("https://skein.test/api/coach/practice-grade", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

function rawRequest(body: BodyInit) {
  return new Request("https://skein.test/api/coach/practice-grade", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function critique() {
  return {
    verdict: "partial",
    rubricChecks: [{ item: "bounds bursts", met: false, note: "fixed windows burst at boundaries" }],
    seniorAdditions: ["consider clock skew"],
    missed: { kind: "tradeoff", what: "accuracy vs state" },
    summary: "The choice is simple but does not bound boundary bursts.",
  };
}

afterEach(() => vi.restoreAllMocks());

describe("managed Coach grading", () => {
  it("blocks non-entitled users before any provider call", async () => {
    const { env, user, token } = await setup({ coach: false });
    const provider = vi.spyOn(globalThis, "fetch");
    const r = await onRequestPost({ request: request(), env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(r.status).toBe(403);
    await expect(r.json()).resolves.toEqual({ error: "coach_required" });
    expect(provider).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied entitlement in the grading body", async () => {
    const { env, user } = await setup({ coach: false });
    const r = await onRequestPost({
      request: new Request("https://skein.test/api/coach/practice-grade", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, coach: true }),
      }),
      env, data: { userId: user.id },
    } as any);
    expect(r.status).toBe(403);
    await expect(r.json()).resolves.toEqual({ error: "coach_required" });
  });

  it("returns 503 without a managed provider key and never fakes a result", async () => {
    const { env, user, token } = await setup({ apiKey: "" });
    const provider = vi.spyOn(globalThis, "fetch");
    const r = await onRequestPost({ request: request(), env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(r.status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });

  it("rejects null and oversized streaming JSON before any provider call", async () => {
    const { env, user, token } = await setup();
    const provider = vi.spyOn(globalThis, "fetch");
    const nullResponse = await onRequestPost({ request: rawRequest("null"), env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(nullResponse.status).toBe(400);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(25 * 1024)));
        controller.close();
      },
    });
    const oversized = new Request("https://skein.test/api/coach/practice-grade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    const oversizedResponse = await onRequestPost({ request: oversized, env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(oversizedResponse.status).toBe(413);
    expect(provider).not.toHaveBeenCalled();
  });

  it("enforces the monthly hard limit before making another provider request", async () => {
    const { env, user, token } = await setup({ limit: "1" });
    const provider = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(critique()) }],
    }), { status: 200 }));
    const first = await onRequestPost({ request: request(), env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(first.status).toBe(200);
    const second = await onRequestPost({ request: request(), env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(second.status).toBe(429);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("refunds a credit when the provider rejects the request", async () => {
    const { db, env, user, token } = await setup({ limit: "1" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("busy", { status: 503 }));
    const r = await onRequestPost({ request: request(), env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(r.status).toBe(502);
    const period = new Date().toISOString().slice(0, 7);
    expect(await getAiUsage(db as any, user.id, "practice-grade", period)).toBe(0);
  });

  it("keeps the credit when a successful provider response is unusable, preserving the cost ceiling", async () => {
    const { db, env, user, token } = await setup({ limit: "1" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: "not-json" }] }), { status: 200 }));
    const r = await onRequestPost({ request: request(), env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(r.status).toBe(502);
    const period = new Date().toISOString().slice(0, 7);
    expect(await getAiUsage(db as any, user.id, "practice-grade", period)).toBe(1);
  });

  it("keeps the credit when the provider outcome is ambiguous after dispatch", async () => {
    const { db, env, user, token } = await setup({ limit: "1" });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("aborted", "AbortError"));
    const r = await onRequestPost({ request: request(), env, data: { userId: user.id, githubAccessToken: token } } as any);
    expect(r.status).toBe(502);
    const period = new Date().toISOString().slice(0, 7);
    expect(await getAiUsage(db as any, user.id, "practice-grade", period)).toBe(1);
  });
});
