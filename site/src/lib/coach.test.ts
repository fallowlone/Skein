import { describe, expect, it, vi } from "vitest";
import type { PracticeTaskData } from "~/content.config";
import { fetchCoachStatus, gradePracticeManaged, recheckCoachStatus } from "./coach";

const task = {
  id: "d1", type: "design", difficulty: "apply", estMin: 8,
  title: { en: "T", ru: "Т" },
  prompt: { en: "Design a limiter", ru: "Спроектируй limiter" },
  constraints: { en: "10k rps", ru: "10k rps" },
  rubric: [{ en: "bounds bursts", ru: "ограничивает всплески" }],
  model: { en: "Token bucket", ru: "Token bucket" },
} as PracticeTaskData;

describe("coach client", () => {
  it("reads central entitlement state", async () => {
    const payload = {
      authenticated: true,
      entitlements: { coach: true },
      billing: { configured: true, sponsorUrl: "https://github.com/sponsors/example", provider: "github-sponsors" },
      managedAi: { available: true, limit: 30, used: 2, remaining: 28, period: "2026-09", resetsAt: "2026-10-01T00:00:00.000Z" },
    };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })) as any;
    await expect(fetchCoachStatus(fetcher)).resolves.toEqual(payload);
    expect(fetcher).toHaveBeenCalledWith("/api/entitlements", { credentials: "same-origin" });
  });

  it("sends only the bounded grading context and learner response to managed AI", async () => {
    let sent: any;
    const response = {
      critique: {
        verdict: "partial", rubricChecks: [{ item: "bounds bursts", met: false, note: "missing" }],
        seniorAdditions: [], missed: { kind: "tradeoff", what: "burst tolerance" }, summary: "Partial.",
      },
      usage: { used: 1, limit: 30, remaining: 29, period: "2026-09" },
    };
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify(response), { status: 200 });
    }) as any;
    await expect(gradePracticeManaged(task, "en", "my answer", fetcher)).resolves.toEqual(response);
    expect(sent).toEqual({
      lang: "en",
      task: "Design a limiter",
      constraints: "10k rps",
      rubric: ["bounds bursts"],
      modelAnswer: "Token bucket",
      response: "my answer",
    });
    expect(JSON.stringify(sent)).not.toContain("apiKey");
  });

  it("rechecks entitlement through the POST contract", async () => {
    const payload = { ...({ authenticated: true, entitlements: { coach: true }, billing: { configured: true, sponsorUrl: "https://github.com/sponsors/example", provider: "github-sponsors" } as const }), managedAi: { available: true, limit: 30, used: 0, remaining: 30, period: "2026-09", resetsAt: "2026-10-01T00:00:00.000Z" } };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })) as any;
    await expect(recheckCoachStatus(fetcher)).resolves.toEqual(payload);
    expect(fetcher).toHaveBeenCalledWith("/api/entitlements", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
    });
  });

  it("propagates server feature-gate errors without inventing a checkout", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "coach_required" }), { status: 403 })) as any;
    await expect(gradePracticeManaged(task, "en", "answer", fetcher)).rejects.toThrow("coach_required");
  });
});
