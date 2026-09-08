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

import SettingsDrawer from "./SettingsDrawer";
import type { CoachStatus } from "~/lib/coach";

const base: CoachStatus = {
  authenticated: true,
  entitlements: { coach: false },
  billing: { configured: true, sponsorUrl: "https://github.com/sponsors/skein-owner", provider: "github-sponsors", verification: "verified" },
  managedAi: { available: true, limit: 30, used: 0, remaining: 30, period: "2026-09", resetsAt: "2026-10-01T00:00:00.000Z" },
};

let host: HTMLDivElement;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  mocks.fetchCoachStatus.mockReset();
  mocks.recheckCoachStatus.mockReset();
  mocks.fetchCoachStatus.mockResolvedValue(base);
});

afterEach(() => {
  render(null, host);
  host.remove();
  vi.restoreAllMocks();
});

function mount(status = base, lang: "en" | "ru" = "en") {
  mocks.fetchCoachStatus.mockResolvedValue(status);
  render(<SettingsDrawer lang={lang} />, host);
}

describe("Settings Coach billing states", () => {
  it("uses the fixed coach return target for signed-out users", async () => {
    mount({ ...base, authenticated: false, billing: { ...base.billing, verification: "not_checked" } });
    await vi.waitFor(() => expect(host.querySelector('a[href="/api/auth/login?lang=en&returnTo=coach"]')).not.toBeNull());
    expect((host.querySelector('a[href="/api/auth/login?lang=en&returnTo=coach"]') as HTMLAnchorElement)?.textContent).toContain("Sign in with GitHub");
  });

  it("shows the real sponsor offer for an authenticated non-sponsor", async () => {
    mount();
    await vi.waitFor(() => expect(host.textContent).toContain("Unlock Coach"));
    expect(host.textContent).toContain("Unlock Coach");
    expect(host.querySelector('a[href="https://github.com/sponsors/skein-owner"]')).not.toBeNull();
    expect(host.textContent).not.toContain("public recurring");
  });

  it("shows active Coach without an upsell", async () => {
    mount({ ...base, entitlements: { coach: true } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    expect(host.textContent).toContain("Coach active");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
    expect(host.textContent).not.toContain("Unlock Coach");
  });

  it("does not show checkout when billing is unconfigured", async () => {
    mount({ ...base, billing: { configured: false, sponsorUrl: null, provider: null, verification: "not_checked" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach checkout unavailable"));
    expect(host.textContent).toContain("Coach checkout unavailable");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it("shows a truthful temporary verification failure without upsell", async () => {
    mount({ ...base, billing: { ...base.billing, verification: "unavailable" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Sponsorship status unavailable"));
    expect(host.textContent).toContain("Sponsorship status unavailable");
    expect(host.textContent).toContain("Your Coach status was not changed");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it("routes reauth_required to the fixed sign-in action", async () => {
    mount({ ...base, billing: { ...base.billing, verification: "reauth_required" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Sign in again to verify Coach"));
    expect(host.textContent).toContain("Sign in again to verify Coach");
    expect(host.querySelector('a[href="/api/auth/login?lang=en&returnTo=coach"]')).not.toBeNull();
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it("shows pending and then active after a successful recheck", async () => {
    let resolve!: (value: typeof base) => void;
    mocks.recheckCoachStatus.mockReturnValue(new Promise((r) => { resolve = r; }));
    mount();
    await vi.waitFor(() => expect(host.textContent).toContain("Unlock Coach"));
    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("sponsorship")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.textContent).toContain("Checking sponsorship…"));
    expect(host.textContent).toContain("Checking sponsorship…");
    resolve({ ...base, entitlements: { coach: true }, billing: { ...base.billing, verification: "verified" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    expect(host.textContent).not.toContain("Unlock Coach");
  });

  it("exposes a temporary recheck error without changing the offer", async () => {
    mocks.recheckCoachStatus.mockRejectedValue(new Error("unavailable"));
    mount();
    await vi.waitFor(() => expect(host.textContent).toContain("Unlock Coach"));
    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("sponsorship")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not verify"));
    expect(host.textContent).toContain("Sponsorship status unavailable");
    expect(host.textContent).not.toContain("Unlock Coach");
  });

  it("does not keep claiming Coach active after an active recheck fails", async () => {
    mocks.recheckCoachStatus.mockRejectedValue(new Error("unavailable"));
    mount({ ...base, entitlements: { coach: true } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Refresh sponsorship")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not verify"));
    expect(host.textContent).not.toContain("Coach active");
    expect(host.textContent).toContain("status is unknown");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it.each(["unavailable", "reauth_required"] as const)("does not claim active after an active recheck returns %s", async (verification) => {
    mocks.recheckCoachStatus.mockResolvedValue({ ...base, entitlements: { coach: true }, billing: { ...base.billing, verification } });
    mount({ ...base, entitlements: { coach: true } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Refresh sponsorship")) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(host.textContent).not.toContain("Coach active"));
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
  });

  it("keeps Russian verification copy honest", async () => {
    mount({ ...base, billing: { ...base.billing, verification: "unavailable" } }, "ru");
    await vi.waitFor(() => expect(host.textContent).toContain("Статус sponsorship недоступен"));
    expect(host.textContent).toContain("Статус Coach не изменён");
    expect(host.textContent).not.toContain("Открыть Coach");
  });

  it("ignores a stale recheck response after a newer response succeeds", async () => {
    const pending: Array<(value: typeof base) => void> = [];
    mocks.recheckCoachStatus.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    mount();
    await vi.waitFor(() => expect(host.textContent).toContain("Unlock Coach"));
    const button = Array.from(host.querySelectorAll("button")).find((node) => node.textContent?.includes("sponsorship")) as HTMLButtonElement;
    button.click();
    button.click();
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    pending[1]({ ...base, entitlements: { coach: true }, billing: { ...base.billing, verification: "verified" } });
    await vi.waitFor(() => expect(host.textContent).toContain("Coach active"));
    pending[0]({ ...base, entitlements: { coach: false }, billing: { ...base.billing, verification: "unavailable" } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(host.textContent).toContain("Coach active");
  });
});

describe("Settings local backup", () => {
  it("round-trips the real export/import UI without exporting credentials", async () => {
    localStorage.setItem("skein.user-state.v1", JSON.stringify({ tier: "senior", futureEvidence: { score: 7 } }));
    localStorage.setItem("atlas.practice-responses.go/01/lesson", JSON.stringify({ task: "my answer 👩🏽‍💻" }));
    localStorage.setItem("skein.english.v2", JSON.stringify({ words: {}, hoursLog: [], futureEvidence: [1, 2] }));
    localStorage.setItem("skein.admin.token", "admin-secret");
    localStorage.setItem("skein.english.byok", "api-secret");

    let downloaded: Blob | undefined;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((blob: Blob) => { downloaded = blob; return "blob:backup"; }),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    mount();

    (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Export progress")) as HTMLButtonElement).click();
    expect(downloaded).toBeDefined();
    const exported = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(downloaded!);
    });
    expect(JSON.parse(exported).data["skein.admin.token"]).toBeUndefined();
    expect(JSON.parse(exported).data["skein.english.byok"]).toBeUndefined();

    localStorage.clear();
    const importedToast = new Promise<CustomEvent>((resolve) => {
      window.addEventListener("toast", (event) => resolve(event as CustomEvent), { once: true });
    });
    vi.spyOn(globalThis, "setTimeout").mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);
    const input = host.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { configurable: true, value: [new File([exported], "progress.json", { type: "application/json" })] });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const toast = await importedToast;
    expect(toast.detail.kind).toBe("ok");
    expect(JSON.parse(localStorage.getItem("skein.user-state.v1")!)).toMatchObject({ tier: "senior", futureEvidence: { score: 7 } });
    expect(JSON.parse(localStorage.getItem("atlas.practice-responses.go/01/lesson")!)).toEqual({ task: "my answer 👩🏽‍💻" });
    expect(JSON.parse(localStorage.getItem("skein.english.v2")!)).toMatchObject({ futureEvidence: [1, 2] });
    expect(localStorage.getItem("skein.admin.token")).toBeNull();
    expect(localStorage.getItem("skein.english.byok")).toBeNull();
  });
});
