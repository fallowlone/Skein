// functions/lib/github.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { exchangeCodeForUser, mapGithubUser } from "./github";

afterEach(() => vi.restoreAllMocks());

describe("github", () => {
  it("maps a /user payload to {id, login, avatar_url}", () => {
    const mapped = mapGithubUser({ id: 5, login: "octo", avatar_url: "a", email: "drop@me" } as any);
    expect(mapped).toEqual({ id: 5, login: "octo", avatar_url: "a" });
  });

  it("exchangeCodeForUser posts the code then fetches the user", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "tok" }), { headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 9, login: "u", avatar_url: "av" }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const user = await exchangeCodeForUser("the-code", { clientId: "cid", clientSecret: "sec" });
    expect(user).toEqual({ id: 9, login: "u", avatar_url: "av" });
    // first call is the token endpoint with the code in the body
    expect(fetchMock.mock.calls[0][0]).toContain("github.com/login/oauth/access_token");
    expect(JSON.stringify(fetchMock.mock.calls[0][1].body)).toContain("the-code");
    // second call carries the bearer token
    expect((fetchMock.mock.calls[1][1].headers as any).Authorization).toBe("Bearer tok");
  });

  it("throws when github returns no access_token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad_verification_code" }), { headers: { "content-type": "application/json" } }),
    ));
    await expect(exchangeCodeForUser("x", { clientId: "c", clientSecret: "s" })).rejects.toThrow();
  });
});
