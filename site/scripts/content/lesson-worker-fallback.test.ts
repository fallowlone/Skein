import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, HEAD } from "../../lesson-worker/src/pages/[...path]";

afterEach(() => vi.unstubAllGlobals());

describe("lesson Worker fallback", () => {
  it("passes non-lesson learn routes through to the Pages origin", async () => {
    const request = new Request("https://fallowlone.com/en/learn/backend/");
    const originResponse = new Response("origin", { status: 200 });
    const fetchOrigin = vi.fn().mockResolvedValue(originResponse);
    vi.stubGlobal("fetch", fetchOrigin);

    await expect(GET({ request } as never)).resolves.toBe(originResponse);
    expect(fetchOrigin).toHaveBeenCalledWith(request);
    expect(HEAD).toBe(GET);
  });
});
