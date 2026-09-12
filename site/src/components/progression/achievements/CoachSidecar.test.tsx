import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchCoachStatus: vi.fn(),
  recheckCoachStatus: vi.fn(),
}));

vi.mock("~/lib/coach", () => ({
  fetchCoachStatus: mocks.fetchCoachStatus,
  recheckCoachStatus: mocks.recheckCoachStatus,
}));

import CoachSidecar from "./CoachSidecar";
import type { CoachStatus } from "~/lib/coach";

const free: CoachStatus = {
  authenticated: true,
  entitlements: { coach: false },
  billing: { configured: true, sponsorUrl: "https://github.com/sponsors/skein-owner", provider: "github-sponsors", verification: "verified" },
  managedAi: { available: true, limit: 30, used: 0, remaining: 30, period: "2026-09", resetsAt: "2026-10-01T00:00:00.000Z" },
};

let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  mocks.fetchCoachStatus.mockReset();
  mocks.recheckCoachStatus.mockReset();
  mocks.fetchCoachStatus.mockResolvedValue(free);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe("CoachSidecar billing", () => {
  it("uses the real Sponsors checkout for a verified free user", async () => {
    render(<CoachSidecar lang="en" />, host);
    await vi.waitFor(() => expect(host.querySelector('a[href="https://github.com/sponsors/skein-owner"]')).not.toBeNull());
  });

  it("routes signed-out and reauth-required users through GitHub login", async () => {
    mocks.fetchCoachStatus.mockResolvedValue({ ...free, authenticated: false, billing: { ...free.billing, verification: "not_checked" } });
    render(<CoachSidecar lang="en" />, host);
    await vi.waitFor(() => expect(host.querySelector('a[href="/api/auth/login?lang=en&returnTo=coach"]')).not.toBeNull());
  });

  it("rechecks on return and replaces checkout with active quota", async () => {
    mocks.recheckCoachStatus.mockResolvedValue({ ...free, entitlements: { coach: true }, managedAi: { ...free.managedAi, used: 7, remaining: 23 } });
    render(<CoachSidecar lang="en" />, host);
    await vi.waitFor(() => expect(host.querySelector('a[href="https://github.com/sponsors/skein-owner"]')).not.toBeNull());
    window.dispatchEvent(new Event("focus"));
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    expect(host.textContent).toContain("23 / 30 managed reviews left this month");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });
});
