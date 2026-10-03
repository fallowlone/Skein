import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestGet, parseLessonPath } from "./[[path]]";

const path = ["en", "networking", "03-tcp", "01-handshake"];
const payload = {
  lesson: {
    key: "networking/03-tcp/01-handshake", lang: "en", track: "networking",
    body: { format: "lesson-render-tree-v1", root: [
      { type: "element", name: "Quiz", props: { id: "q1", choices: [{ correct: true }, {}] } },
    ] },
  },
  graph: { navPrev: null as string | null },
};
const later = { ...payload, graph: { navPrev: "networking/03-tcp/00-intro" } };

function mockLesson(lesson: typeof payload) {
  globalThis.fetch = (async () => new Response(JSON.stringify([{ payload: lesson, version: "v1" }]))) as any;
}
function context(userId: number | null = null, db?: unknown) {
  return {
    request: new Request(`https://x/api/lessons/${path.join("/")}`),
    params: { path }, data: { userId },
    env: { DB: db, SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "secret" },
  } as any;
}
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe("parseLessonPath", () => {
  it("accepts bilingual paths and rejects malformed ones", () => {
    expect(parseLessonPath(path)?.lang).toBe("en");
    expect(parseLessonPath("ru/networking/03-tcp/01-handshake")?.lang).toBe("ru");
    expect(parseLessonPath("en/networking/../01-handshake")).toBeNull();
    expect(parseLessonPath("en/networking/03-tcp/01-handshake/extra")).toBeNull();
  });
});

describe("GET /api/lessons/:path", () => {
  it("lets guests read the first lesson without shared caching", async () => {
    mockLesson(payload);
    const response = await onRequestGet(context());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-skein-authenticated")).toBe("0");
  });

  it("blocks direct URLs until previous completion", async () => {
    mockLesson(later);
    expect((await onRequestGet(context())).status).toBe(401);
    const db = { prepare: vi.fn(() => ({ bind: () => ({ first: async () => null }) })) };
    expect((await onRequestGet(context(7, db))).status).toBe(403);
  });

  it("allows prior completion or a permanent course grant", async () => {
    mockLesson(later);
    const completedDb = { prepare: vi.fn((sql: string) => ({ bind: () => ({ first: async () => sql.includes("lesson_completions") ? { done: 1 } : null }) })) };
    const paidDb = { prepare: vi.fn((sql: string) => ({ bind: () => ({ first: async () => sql.includes("course_access_grants") ? { allowed: 1 } : null }) })) };
    expect((await onRequestGet(context(7, completedDb))).status).toBe(200);
    expect((await onRequestGet(context(7, paidDb))).status).toBe(200);
  });

  it("rejects malformed and missing curriculum payloads", async () => {
    mockLesson({ ...payload, graph: { navPrev: undefined as any } });
    expect((await onRequestGet(context())).status).toBe(502);
    globalThis.fetch = (async () => new Response("[]")) as any;
    expect((await onRequestGet(context())).status).toBe(404);
  });
});
