import { describe, expect, it } from "vitest";
import { fetchLessonPayload, validLessonParams } from "../../lesson-worker/src/lib/lesson-payload";

const payload = {
  version: "v1",
  lesson: {
    key: "backend/01-request/01-overview",
    lang: "en",
    track: "backend",
    unit: "01-request",
    slug: "01-overview",
    order: 1,
    title: "Overview",
    summary: "Summary",
    estMin: 10,
    status: "ready",
    sources: [],
    prereqs: [],
    mathPrereqs: [],
    concepts: ["request-lifecycle"],
    body: { format: "lesson-render-tree-v1", root: [{ type: "text", value: "Hello" }] },
  },
  graph: {},
  practice: null,
  drill: null,
  unit: null,
  track: null,
  concepts: {},
  lessonMeta: {},
  projects: [],
};

describe("lesson Worker payload client", () => {
  it("accepts only EN/RU lesson route segments", () => {
    expect(validLessonParams("en", "backend", "01-request", "01-overview")).toBe(true);
    expect(validLessonParams("ru", "backend", "01-request", "01-overview")).toBe(true);
    expect(validLessonParams("de", "backend", "01-request", "01-overview")).toBe(false);
    expect(validLessonParams("en", "../backend", "01-request", "01-overview")).toBe(false);
  });

  it("returns a prepared render-tree payload from the Pages API", async () => {
    let requested = "";
    const fetchImpl = async (input: RequestInfo | URL) => {
      requested = String(input);
      return Response.json(payload);
    };
    const result = await fetchLessonPayload(
      "https://fallowlone.com",
      { lang: "en", track: "backend", unit: "01-request", lesson: "01-overview" },
      fetchImpl,
    );
    expect(result).toEqual({ ok: true, payload });
    expect(requested).toBe(
      "https://fallowlone.com/api/lessons/en/backend/01-request/01-overview",
    );
  });

  it("preserves missing, backend, and invalid-payload failures", async () => {
    const path = { lang: "en" as const, track: "backend", unit: "01-request", lesson: "missing" };
    await expect(fetchLessonPayload("https://fallowlone.com", path, async () => new Response(null, { status: 404 })))
      .resolves.toEqual({ ok: false, status: 404, code: "lesson_not_found" });
    await expect(fetchLessonPayload("https://fallowlone.com", path, async () => { throw new Error("offline"); }))
      .resolves.toEqual({ ok: false, status: 502, code: "lesson_backend_unavailable" });
    await expect(fetchLessonPayload("https://fallowlone.com", path, async () => Response.json({ lesson: { body: { format: "mdx" } } })))
      .resolves.toEqual({ ok: false, status: 502, code: "invalid_lesson_payload" });
  });
});
