import { test, expect } from "@playwright/test";

test("an audit block runs, records an answer, and ends with a partial verdict", async ({ page }) => {
  test.slow();
  await page.goto("/ru/assess");

  // Scope: pick one track and start.
  await page.getByRole("button", { name: /Выбрать тему|databases/i }).first().click();
  await page.getByRole("button", { name: /Начать/ }).click();

  const item = page.locator(".assess-item");
  await expect(item).toBeVisible();

  // "I don't know" is a first-class answer and must be reachable without guessing.
  await expect(page.getByRole("button", { name: /Не знаю/ })).toBeVisible();
  await page.getByRole("button", { name: /Не знаю/ }).click();

  // Progress is visible and the session survives a reload (resumable, spec §7).
  await expect(page.locator(".assess-progress")).toContainText("1");
  await page.reload();
  await expect(page.locator(".assess-item, .assess-block-verdict")).toBeVisible();
});

test("stopping mid-session reports untested concepts as untested, not as gaps", async ({ page }) => {
  test.slow();
  await page.goto("/ru/assess");
  await page.getByRole("button", { name: /Выбрать тему|databases/i }).first().click();
  await page.getByRole("button", { name: /Начать/ }).click();
  await page.getByRole("button", { name: /Не знаю/ }).click();
  await page.getByRole("button", { name: /Завершить/ }).click();

  const report = page.locator(".assess-report");
  await expect(report).toBeVisible();
  await expect(report.locator(".ar-untested")).toBeVisible();
});
