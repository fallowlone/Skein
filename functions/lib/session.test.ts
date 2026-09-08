// functions/lib/session.test.ts
import { describe, it, expect } from "vitest";
import { createSession, resolveSession, resolveSessionRecord, destroySession, destroyAllSessions } from "./session";
import { FakeKV } from "../test/fakes";

describe("session", () => {
  it("creates then resolves a session to the userId", async () => {
    const kv = new FakeKV() as any;
    const sid = await createSession(kv, 42);
    expect(typeof sid).toBe("string");
    expect(await resolveSession(kv, sid)).toBe(42);
  });

  it("keeps the OAuth token server-side in the session record", async () => {
    const kv = new FakeKV() as any;
    const sid = await createSession(kv, 42, "oauth-token");
    expect(await resolveSessionRecord(kv, sid)).toMatchObject({ userId: 42, githubAccessToken: "oauth-token" });
  });

  it("encrypts the OAuth token in KV when a session secret is supplied", async () => {
    const kv = new FakeKV() as any;
    const sid = await createSession(kv, 42, "oauth-token", "session-secret");
    expect(await kv.get(`session:${sid}`)).not.toContain("oauth-token");
    await expect(resolveSessionRecord(kv, sid, "session-secret")).resolves.toMatchObject({ githubAccessToken: "oauth-token" });
  });

  it("returns null for an unknown session", async () => {
    const kv = new FakeKV() as any;
    expect(await resolveSession(kv, "nope")).toBeNull();
  });

  it("returns null after expiry", async () => {
    const kv = new FakeKV();
    const sid = await createSession(kv as any, 7);
    kv._expire(`session:${sid}`);
    expect(await resolveSession(kv as any, sid)).toBeNull();
  });

  it("destroySession removes it", async () => {
    const kv = new FakeKV() as any;
    const sid = await createSession(kv, 1);
    await destroySession(kv, sid);
    expect(await resolveSession(kv, sid)).toBeNull();
  });

  it("destroyAllSessions kills every session for a user", async () => {
    const kv = new FakeKV() as any;
    const a = await createSession(kv, 5);
    const b = await createSession(kv, 5);
    await destroyAllSessions(kv, 5);
    expect(await resolveSession(kv, a)).toBeNull();
    expect(await resolveSession(kv, b)).toBeNull();
  });
});
