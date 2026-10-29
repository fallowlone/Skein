import { describe, it, expect } from "vitest";
import { onRequestPatch } from "./nickname";
import { upsertUserFromGithub, acceptTerms } from "../../lib/db";
import { FakeD1 } from "../../test/fakes";

const TERMS = "v1";

describe("PATCH /api/account/nickname validation", () => {
  it("422s malformed JSON with its stable code", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, { id: 1, login: "octo", avatar_url: null });
    await acceptTerms(db, u.id, TERMS, 100);
    const res = await onRequestPatch({
      request: new Request("https://x/api/account/nickname", { method: "PATCH", body: "{" }),
      env: { DB: db, TERMS_VERSION: TERMS } as any,
      data: { userId: u.id },
    } as any);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "bad_json" });
  });
});
