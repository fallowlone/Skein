import { describe, it, expect } from "vitest";
import { onRequestPut } from "./progress";
import { upsertUserFromGithub, acceptTerms } from "../lib/db";
import { FakeD1 } from "../test/fakes";

const TERMS = "v1";
async function user() {
  const db = new FakeD1() as any;
  const u = await upsertUserFromGithub(db, { id: 1, login: "octo", avatar_url: null });
  await acceptTerms(db, u.id, TERMS, 100);
  return { db, id: u.id };
}
const ctx = (body: string, db: unknown, id: number) => ({
  request: new Request("https://x/api/progress", { method: "PUT", body }),
  env: { DB: db, TERMS_VERSION: TERMS } as any,
  data: { userId: id },
}) as any;

describe("PUT /api/progress validation", () => {
  it("422s malformed JSON with its stable code", async () => {
    const { db, id } = await user();
    const res = await onRequestPut(ctx("not json", db, id));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "bad_json" });
  });
});
