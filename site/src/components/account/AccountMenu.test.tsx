import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  activateSyncIfSignedIn: vi.fn(),
}));

vi.mock("~/scripts/account-sync", () => ({ fetchMe: mocks.fetchMe }));
vi.mock("~/scripts/user-state", () => ({ activateSyncIfSignedIn: mocks.activateSyncIfSignedIn }));

import AccountMenu from "./AccountMenu";

describe("AccountMenu sign-in return target", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    mocks.fetchMe.mockReset();
    mocks.activateSyncIfSignedIn.mockReset();
    mocks.fetchMe.mockResolvedValue(null);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
    history.replaceState({}, "", "/");
  });

  it("returns signed-out Settings users to the Coach flow", async () => {
    history.replaceState({}, "", "/en/settings");
    render(<AccountMenu lang="en" />, host);

    await vi.waitFor(() => expect(host.querySelector("a")?.getAttribute("href")).toBe("/api/auth/login?lang=en&returnTo=coach"));
  });

  it("keeps the ordinary sign-in target on non-Settings pages", async () => {
    history.replaceState({}, "", "/ru/learn/node");
    render(<AccountMenu lang="ru" />, host);

    await vi.waitFor(() => expect(host.querySelector("a")?.getAttribute("href")).toBe("/api/auth/login?lang=ru"));
  });
});
