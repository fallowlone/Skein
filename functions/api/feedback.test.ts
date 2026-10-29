import { describe, it, expect } from "vitest";
import { onRequestPost } from "./feedback";

const dbThrow = () => { throw new Error("must not touch the database"); };
const ctx = (body: string) => ({
  request: new Request("https://x/api/feedback", { method: "POST", body }),
  env: { DB: { prepare: dbThrow } },
  data: {},
}) as any;

describe("POST /api/feedback validation", () => {
  it("maps every body failure to 422 with its stable code", async () => {
    const cases: Array<[string, string]> = [
      ["not json", "bad_json"],
      [JSON.stringify({}), "bad_shape"],
      [JSON.stringify({ clientId: "12345678", lesson: "a/b/c", text: "   " }), "bad_shape"],
    ];
    for (const [body, code] of cases) {
      const res = await onRequestPost(ctx(body));
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: code });
    }
  });

  it("keeps 413 for oversized bodies", async () => {
    const res = await onRequestPost(ctx("x".repeat(9 * 1024)));
    expect(res.status).toBe(413);
  });
});
