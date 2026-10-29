import { describe, it, expect } from "vitest";
import { onRequestGet } from "./access";

const ctx = (url: string) => ({
  request: new Request(url),
  env: { DB: { prepare: () => { throw new Error("must not query for an unknown track"); } } } as any,
  data: { userId: 7 },
}) as any;

describe("GET /api/courses/access validation", () => {
  it("422s an unknown track without touching the database", async () => {
    for (const url of [
      "https://x/api/courses/access",
      "https://x/api/courses/access?track=nope",
    ]) {
      const res = await onRequestGet(ctx(url));
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: "invalid_track" });
    }
  });
});
