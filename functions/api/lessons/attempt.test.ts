import { describe, it, expect } from "vitest";
import { onRequestPost } from "./attempt";
import { upsertUserFromGithub, acceptTerms } from "../../lib/db";
import { FakeD1 } from "../../test/fakes";

const TERMS = "v1";
async function user() {
  const db = new FakeD1() as any;
  const u = await upsertUserFromGithub(db, { id: 1, login: "octo", avatar_url: null });
  await acceptTerms(db, u.id, TERMS, 100);
  return { db, id: u.id };
}
const ctx = (body: string, db: unknown, id: number) => ({
  request: new Request("https://x/api/lessons/attempt", {
    method: "POST",
    headers: { Origin: "https://x" },
    body,
  }),
  env: { DB: db, TERMS_VERSION: TERMS } as any,
  data: { userId: id },
}) as any;

describe("POST /api/lessons/attempt validation", () => {
  it("422s malformed and shapeless attempts before touching lesson content", async () => {
    const { db, id } = await user();
    for (const [body, code] of [["", "bad_json"], ["{", "bad_json"], [`{"path":"en/a/b/c"}`, "bad_attempt"]] as Array<[string, string]>) {
      const res = await onRequestPost(ctx(body, db, id));
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: code });
    }
  });
});
