import { expect, test, type Page } from "@playwright/test";

type CoachStatus = {
  authenticated: boolean;
  entitlements: { coach: boolean };
  billing: { configured: boolean; sponsorUrl: string | null; provider: "github-sponsors" | null; verification: "verified" | "unavailable" | "reauth_required" | "not_checked" };
  managedAi: {
    available: boolean;
    limit: number;
    used: number;
    remaining: number;
    period: string;
    resetsAt: string;
  };
};

const freeStatus: CoachStatus = {
  authenticated: true,
  entitlements: { coach: false },
    billing: { configured: false, sponsorUrl: null, provider: null, verification: "not_checked" },
  managedAi: {
    available: true,
    limit: 30,
    used: 0,
    remaining: 30,
    period: "2026-09",
    resetsAt: "2026-10-01T00:00:00.000Z",
  },
};

async function mockStatus(page: Page, status: CoachStatus) {
  await page.route("**/api/entitlements", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(status),
  }));
}

test("Free Coach surface stays usable on mobile, exposes no fake checkout, and survives reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockStatus(page, freeStatus);

  await page.goto("/en/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Free stays free")).toBeVisible();
  await expect(page.getByText("Coach checkout unavailable")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue on GitHub Sponsors" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Coach checkout unavailable")).toBeVisible();
});

test("Configured Free user gets one real GitHub Sponsors upgrade path", async ({ page }) => {
  await mockStatus(page, {
    ...freeStatus,
    billing: {
      configured: true,
      sponsorUrl: "https://github.com/sponsors/skein-owner",
      provider: "github-sponsors",
      verification: "verified",
    },
  });

  await page.goto("/en/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Unlock Coach", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue on GitHub Sponsors" }))
    .toHaveAttribute("href", "https://github.com/sponsors/skein-owner");
});

test("Configured billing never sells Coach while managed AI is unavailable", async ({ page }) => {
  await mockStatus(page, {
    ...freeStatus,
    authenticated: false,
    billing: {
      configured: true,
      sponsorUrl: "https://github.com/sponsors/skein-owner",
      provider: "github-sponsors",
      verification: "not_checked",
    },
    managedAi: { ...freeStatus.managedAi, available: false },
  });

  await page.goto("/en/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Coach signup paused")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in with GitHub" })).toHaveAttribute("href", "/api/auth/login?lang=en&returnTo=coach");
  await expect(page.getByRole("link", { name: "Continue on GitHub Sponsors" })).toHaveCount(0);
});

test("Paid entitlement renders active managed-AI quota instead of an upgrade CTA", async ({ page }) => {
  await mockStatus(page, {
    ...freeStatus,
    entitlements: { coach: true },
    billing: {
      configured: true,
      sponsorUrl: "https://github.com/sponsors/skein-owner",
      provider: "github-sponsors",
      verification: "verified",
    },
    managedAi: { ...freeStatus.managedAi, used: 7, remaining: 23 },
  });

  await page.goto("/en/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Coach active")).toBeVisible();
  await expect(page.getByText("23 of 30 managed AI reviews left this month.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue on GitHub Sponsors" })).toHaveCount(0);
});
