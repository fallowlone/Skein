import { describe, it, expect } from "vitest";
import { onRequestPost } from "./events";

const dbThrow = () => { throw new Error("must not touch the database"); };
const ctx = (body: string) => ({
  request: new Request("https://x/api/events", { method: "POST", body }),
  env: { DB: { prepare: dbThrow, batch: dbThrow } },
  data: {},
}) as any;

describe("POST /api/events validation", () => {
  it("maps every body failure to 422 with its stable code", async () => {
    const cases: Array<[string, string]> = [
      ["not json", "bad_json"],
      [JSON.stringify({}), "bad_shape"],
      [JSON.stringify({ clientId: "12345678", events: [] }), "bad_shape"],
      [JSON.stringify({ clientId: "12345678", events: Array(21).fill({ type: "lesson_view", lesson: "a/b/c" }) }), "too_many"],
      [JSON.stringify({ clientId: "12345678", events: [{ type: "nope", lesson: "a/b/c" }] }), "bad_event"],
    ];
    for (const [body, code] of cases) {
      const res = await onRequestPost(ctx(body));
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: code });
    }
  });

  it("keeps 413 for oversized bodies", async () => {
    const res = await onRequestPost(ctx("x".repeat(17 * 1024)));
    expect(res.status).toBe(413);
  });
});
