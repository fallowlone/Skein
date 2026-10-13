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

  it("serves any lesson to guests and signed-in users without sequencing", async () => {
    mockLesson(later);
    expect((await onRequestGet(context())).status).toBe(200);
    const db = { prepare: vi.fn(() => { throw new Error("must not query gating state"); }) };
    const response = await onRequestGet(context(7, db));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-skein-authenticated")).toBe("1");
  });

  it("rejects malformed and missing curriculum payloads", async () => {
    mockLesson({ ...payload, graph: { navPrev: undefined as any } });
    expect((await onRequestGet(context())).status).toBe(502);
    globalThis.fetch = (async () => new Response("[]")) as any;
    expect((await onRequestGet(context())).status).toBe(404);
  });
});
