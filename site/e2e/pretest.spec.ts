import { test, expect } from "@playwright/test";

test("pretest sets tier on submit", async ({ page }) => {
  // Clear state before navigating
  await page.goto("/en/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("aside:has-text('Three quick questions')");
  // Pick the last option (highest weight) in each question
  for (let i = 0; i < 3; i++) {
    const buttons = page.locator("aside ul button");
    await buttons.last().click();
  }
  const tier = await page.evaluate(() => {
    const raw = localStorage.getItem("awesome.user-state.v1");
    return raw ? JSON.parse(raw).tier : null;
  });
  expect(tier).toBe("senior");
});
