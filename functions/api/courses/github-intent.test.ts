import { describe, it, expect } from "vitest";
import { onRequestPost } from "./github-intent";
import { upsertUserFromGithub, acceptTerms } from "../../lib/db";
import { FakeD1 } from "../../test/fakes";

const TERMS = "v1";
async function user() {
  const db = new FakeD1() as any;
  const u = await upsertUserFromGithub(db, { id: 1, login: "octo", avatar_url: null });
  await acceptTerms(db, u.id, TERMS, 100);
  return { db, id: u.id };
}
const env = (db: unknown) => ({
  DB: db,
  TERMS_VERSION: TERMS,
  GITHUB_SPONSORS_URL: "https://github.com/sponsors/app",
  GITHUB_SPONSORS_WEBHOOK_SECRET: "s3cret",
  GITHUB_SPONSORS_COURSE_TIER_ID: "TIER_COURSE",
}) as any;
const ctx = (body: string, db: unknown, id: number) => ({
  request: new Request("https://x/api/courses/github-intent", {
    method: "POST",
    headers: { Origin: "https://x" },
    body,
  }),
  env: env(db),
  data: { userId: id },
}) as any;

describe("POST /api/courses/github-intent validation", () => {
  it("422s malformed JSON and unknown tracks", async () => {
    const { db, id } = await user();
    const bad = await onRequestPost(ctx("{", db, id));
    expect(bad.status).toBe(422);
    expect(await bad.json()).toEqual({ error: "bad_json" });
    const track = await onRequestPost(ctx(`{"track":"nope"}`, db, id));
    expect(track.status).toBe(422);
    expect(await track.json()).toEqual({ error: "invalid_track" });
  });
});
