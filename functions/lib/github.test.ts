// functions/lib/github.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { exchangeCodeForUser, exchangeCodeForUserWithToken, fetchViewerSponsorship, mapGithubUser } from "./github";

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

  it("can return the short-lived OAuth token to the callback without persisting it", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "temporary-token" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 9, login: "u", avatar_url: null }))));
    await expect(exchangeCodeForUserWithToken("the-code", { clientId: "cid", clientSecret: "sec" }))
      .resolves.toEqual({ user: { id: 9, login: "u", avatar_url: null }, accessToken: "temporary-token" });
  });

  it("verifies the viewer's own private sponsorship without repository access", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        user: {
          sponsorshipForViewerAsSponsor: {
            id: "S_PRIVATE",
            privacyLevel: "PRIVATE",
            tier: { id: "TIER_COACH", name: "Coach", monthlyPriceInCents: 900, isOneTime: false },
          },
        },
        organization: null,
      },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchViewerSponsorship("temporary-token", "skein-owner")).resolves.toEqual({
      sponsorshipId: "S_PRIVATE",
      tierId: "TIER_COACH",
      tierName: "Coach",
      monthlyPriceCents: 900,
      isOneTime: false,
      privacyLevel: "PRIVATE",
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as any).Authorization).toBe("Bearer temporary-token");
    expect(String(init.body)).toContain("sponsorshipForViewerAsSponsor");
    expect(String(init.body)).toContain("skein-owner");
  });

  it("returns null when the current viewer has no active sponsorship", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { user: { sponsorshipForViewerAsSponsor: null }, organization: null },
    }))));
    await expect(fetchViewerSponsorship("temporary-token", "skein-owner")).resolves.toBeNull();
  });

  it("throws when github returns no access_token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad_verification_code" }), { headers: { "content-type": "application/json" } }),
    ));
    await expect(exchangeCodeForUser("x", { clientId: "c", clientSecret: "s" })).rejects.toThrow();
  });

  it("throws a typed error (not a SyntaxError) on a non-OK non-JSON token response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response("<html>502 Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } }),
    ));
    await expect(exchangeCodeForUser("x", { clientId: "c", clientSecret: "s" }))
      .rejects.toThrow("github_token_exchange_failed");
  });
});
