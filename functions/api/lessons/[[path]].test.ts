import { describe, expect, it } from "vitest";
import { onRequestGet, parseLessonPath } from "./[[path]]";

const env = (over: Record<string, unknown> = {}) => ({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  ...over,
}) as any;

const ctx = (
  path: string | string[],
  headers: HeadersInit = {},
  e = env(),
) => ({
  request: new Request("https://x/api/lessons/en/networking/03-tcp/01-handshake", { headers }),
  params: { path },
  env: e,
  data: { userId: null },
}) as any;

const payload = {
  version: "abc123",
  lesson: { lang: "en", track: "networking", unit: "03-tcp", slug: "01-handshake" },
  graph: {
    concepts: ["tcp"], prereqConcepts: ["ip"], prereqLessons: ["networking/02-ip/01-ip"],
    prev: "networking/02-ip/01-ip", next: "networking/03-tcp/02-state", related: ["backend/01-http/01-overview"],
  },
  concepts: { tcp: { id: "tcp" }, ip: { id: "ip" } },
  practice: { lessonKey: "networking/03-tcp/01-handshake", tasks: [{ id: "p1", concepts: ["tcp"] }] },
  unit: { slug: "03-tcp" },
  track: { slug: "networking" },
};

describe("parseLessonPath", () => {
  it("accepts EN/RU lesson paths", () => {
    expect(parseLessonPath(["en", "networking", "03-tcp", "01-handshake"])).toEqual({
      lang: "en", track: "networking", unit: "03-tcp", lesson: "01-handshake",
    });
    expect(parseLessonPath("ru/networking/03-tcp/01-handshake")?.lang).toBe("ru");
  });

  it("rejects unknown locales, extra segments, and unsafe slugs", () => {
    expect(parseLessonPath("de/networking/03-tcp/01-handshake")).toBeNull();
    expect(parseLessonPath("en/networking/03-tcp/01-handshake/extra")).toBeNull();
    expect(parseLessonPath("en/networking/../01-handshake")).toBeNull();
  });
});

describe("GET /api/lessons/:lang/:track/:unit/:lesson", () => {
  it("returns the lesson payload with graph, concepts, practice, and cache headers", async () => {
    let requestBody: any;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify([{ payload, version: "abc123" }]), { status: 200 });
    }) as any;

    const res = await onRequestGet(ctx(["en", "networking", "03-tcp", "01-handshake"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe('"abc123"');
    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate");
    expect(requestBody).toEqual({
      lang_code: "en", track_code: "networking", unit_code: "03-tcp", lesson_slug: "01-handshake",
    });
    expect(await res.json()).toEqual(payload);
  });

  it("resolves RU independently", async () => {
    let requestBody: any;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify([{ payload: { ...payload, lesson: { ...payload.lesson, lang: "ru" } }, version: "ru1" }]), { status: 200 });
    }) as any;
    const res = await onRequestGet(ctx(["ru", "networking", "03-tcp", "01-handshake"]));
    expect(res.status).toBe(200);
    expect(requestBody.lang_code).toBe("ru");
    expect((await res.json() as any).lesson.lang).toBe("ru");
  });

  it("returns 404 when the RPC returns no lesson", async () => {
    globalThis.fetch = (async () => new Response("[]", { status: 200 })) as any;
    const res = await onRequestGet(ctx(["en", "networking", "03-tcp", "99-missing"]));
    expect(res.status).toBe(404);
  });

  it("honors If-None-Match with 304", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify([{ payload, version: "abc123" }]), { status: 200 })) as any;
    const res = await onRequestGet(ctx(
      ["en", "networking", "03-tcp", "01-handshake"],
      { "if-none-match": 'W/"other", "abc123"' },
    ));
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe('"abc123"');
  });

  it("fails visibly when the backend errors or is unconfigured", async () => {
    globalThis.fetch = (async () => new Response("boom", { status: 500 })) as any;
    expect((await onRequestGet(ctx(["en", "networking", "03-tcp", "01-handshake"]))).status).toBe(502);
    expect((await onRequestGet(ctx(
      ["en", "networking", "03-tcp", "01-handshake"], {},
      env({ SUPABASE_URL: undefined, SUPABASE_SECRET_KEY: undefined }),
    ))).status).toBe(503);
  });
});
