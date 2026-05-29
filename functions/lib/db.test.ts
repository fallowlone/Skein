// functions/lib/db.test.ts
import { describe, it, expect } from "vitest";
import {
  upsertUserFromGithub, getUserById, setNickname, acceptTerms,
  deleteUser, getProgress, putProgress, validateNickname,
} from "./db";
import { FakeD1 } from "../test/fakes";

const gh = { id: 999, login: "octocat", avatar_url: "https://x/y.png" };

describe("db", () => {
  it("first sign-in inserts with nickname=login; return preserves chosen nickname", async () => {
    const db = new FakeD1() as any;
    const u1 = await upsertUserFromGithub(db, gh);
    expect(u1.nickname).toBe("octocat");
    await setNickname(db, u1.id, "Cat Master");
    const u2 = await upsertUserFromGithub(db, { ...gh, login: "octocat-renamed", avatar_url: "https://x/z.png" });
    expect(u2.id).toBe(u1.id);
    expect(u2.nickname).toBe("Cat Master");     // preserved
    expect(u2.login).toBe("octocat-renamed");   // refreshed
    expect(u2.avatar_url).toBe("https://x/z.png");
  });

  it("acceptTerms records version + timestamp", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    await acceptTerms(db, u.id, "2026-05-29", 1000);
    const fresh = await getUserById(db, u.id);
    expect(fresh!.terms_version).toBe("2026-05-29");
    expect(fresh!.terms_accepted_at).toBe(1000);
  });

  it("progress round-trips and deleteUser cascades", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    await putProgress(db, u.id, '{"tier":"senior"}', 5);
    expect(await getProgress(db, u.id)).toBe('{"tier":"senior"}');
    await deleteUser(db, u.id);
    expect(await getUserById(db, u.id)).toBeNull();
    expect(await getProgress(db, u.id)).toBeNull();
  });

  it("validateNickname accepts/rejects", () => {
    expect(validateNickname("ab").ok).toBe(true);
    expect(validateNickname("Cat Master_1.2-3").ok).toBe(true);
    expect(validateNickname("a").ok).toBe(false);          // too short
    expect(validateNickname("x".repeat(33)).ok).toBe(false); // too long
    expect(validateNickname("bad<script>").ok).toBe(false);  // bad chars
    expect(validateNickname("  ab  ").value).toBe("ab");     // trimmed
  });
});
