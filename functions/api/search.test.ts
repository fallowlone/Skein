import { describe, it, expect } from "vitest";
import { validateSearchParams, onRequestGet } from "./search";
import { FakeKV } from "../test/fakes";

const env = (over: Record<string, unknown> = {}) => ({
  SESSIONS: new FakeKV() as any,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  ...over,
}) as any;

const ctx = (url: string, e = env()) => ({
  request: new Request(url, { headers: { "CF-Connecting-IP": "1.2.3.4" } }),
  env: e,
  data: { userId: null },
}) as any;

describe("validateSearchParams", () => {
  it("accepts a normal query", () => {
    expect(validateSearchParams("tcp", "en")).toEqual({ ok: true, q: "tcp", lang: "en" });
  });
  it("trims before measuring length", () => {
    expect(validateSearchParams("  tcp  ", "en")).toEqual({ ok: true, q: "tcp", lang: "en" });
  });
  it("rejects a query shorter than 2 chars", () => {
    expect(validateSearchParams("a", "en").ok).toBe(false);
  });
  it("rejects a missing query", () => {
    expect(validateSearchParams(null, "en").ok).toBe(false);
  });
  it("rejects a query longer than 128 chars", () => {
    expect(validateSearchParams("x".repeat(129), "en").ok).toBe(false);
  });
  it("rejects an unknown locale", () => {
    expect(validateSearchParams("tcp", "de").ok).toBe(false);
    expect(validateSearchParams("tcp", null).ok).toBe(false);
  });
  it("accepts Cyrillic queries", () => {
    expect(validateSearchParams("рукопожатие", "ru").ok).toBe(true);
  });
});

describe("GET /api/search", () => {
  it("400s on a bad query without calling the database", async () => {
    let called = false;
    globalThis.fetch = (async () => { called = true; return new Response("[]"); }) as any;
    const res = await onRequestGet(ctx("https://x/api/search?q=a&lang=en"));
    expect(res.status).toBe(400);
    expect(called).toBe(false);
  });

  it("maps rows to hits with a built href", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify([
      { slug: "01-the-three-way-handshake", track: "networking", unit: "03-tcp-handshake",
        title: "The three-way handshake", summary: "s", snippet: "a <mark>SYN</mark> packet", rank: 0.9 },
    ]), { status: 200 })) as any;
    const res = await onRequestGet(ctx("https://x/api/search?q=handshake&lang=en"));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.results).toHaveLength(1);
    expect(body.results[0].href).toBe("/en/learn/networking/03-tcp-handshake/01-the-three-way-handshake/");
    expect(body.results[0].snippet).toBe("a <mark>SYN</mark> packet");
  });

  it("returns an empty result set when the database errors — search degrades, never breaks", async () => {
    globalThis.fetch = (async () => new Response("boom", { status: 500 })) as any;
    const res = await onRequestGet(ctx("https://x/api/search?q=handshake&lang=en"));
    expect(res.status).toBe(200);
    expect((await res.json() as any).results).toEqual([]);
  });

  it("returns an empty result set when the database returns 200 with a non-array body", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "unexpected shape" }), { status: 200 })) as any;
    const res = await onRequestGet(ctx("https://x/api/search?q=handshake&lang=en"));
    expect(res.status).toBe(200);
    expect((await res.json() as any).results).toEqual([]);
  });

  it("returns an empty result set when the mirror is not configured", async () => {
    const res = await onRequestGet(ctx("https://x/api/search?q=handshake&lang=en",
      env({ SUPABASE_URL: undefined, SUPABASE_SECRET_KEY: undefined })));
    expect(res.status).toBe(200);
    expect((await res.json() as any).results).toEqual([]);
  });

  it("429s once the per-IP limit is exhausted", async () => {
    globalThis.fetch = (async () => new Response("[]", { status: 200 })) as any;
    const e = env();
    const c = () => ctx("https://x/api/search?q=handshake&lang=en", e);
    for (let i = 0; i < 30; i++) await onRequestGet(c());
    const res = await onRequestGet(c());
    expect(res.status).toBe(429);
  });
});
