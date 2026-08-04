import { test, expect } from "@playwright/test";

// I5 (task-12-report.md fix round 1): the brief's original selector
// (`getByRole("button", { name: /Выбрать тему|databases/i })`) only worked
// because ScopePicker rendered the raw English track slug as its RU-page label
// — the product deformed to fit the test. Track buttons are now properly
// localized (~/content/tracks.json), so this targets the stable `data-track`
// attribute instead, which exists regardless of locale.
const DATABASES_TRACK = '[data-track="databases"]';

test("an audit block runs, records an answer, and ends with a partial verdict", async ({ page }) => {
  test.slow();
  await page.goto("/ru/assess");

  // Scope: pick one track and start.
  await page.locator(DATABASES_TRACK).click();
  await page.getByRole("button", { name: /Начать/ }).click();

  const item = page.locator(".assess-item");
  await expect(item).toBeVisible();

  // "I don't know" is a first-class answer and must be reachable without guessing.
  await expect(page.getByRole("button", { name: /Не знаю/ })).toBeVisible();
  await page.getByRole("button", { name: /Не знаю/ }).click();

  // I1: assert the answered COUNT specifically, not a substring of the whole
  // progress paragraph — "block 1" also contains the digit "1", so a bare
  // `toContainText("1")` against the paragraph would pass even if the count
  // itself never incremented.
  await expect(page.locator(".assess-progress-count")).toHaveText("1");

  // Progress is visible and the session survives a reload (resumable, spec §7).
  await page.reload();
  await expect(page.locator(".assess-item, .assess-block-verdict")).toBeVisible();
});

test("stopping mid-session reports untested concepts as untested, not as gaps", async ({ page }) => {
  test.slow();
  await page.goto("/ru/assess");
  await page.locator(DATABASES_TRACK).click();
  await page.getByRole("button", { name: /Начать/ }).click();
  await page.getByRole("button", { name: /Не знаю/ }).click();
  await page.getByRole("button", { name: /Завершить/ }).click();

  const report = page.locator(".assess-report");
  await expect(report).toBeVisible();

  // I1: `.ar-untested-list` is always rendered (even empty), so visibility
  // alone proves nothing about the invariant it exists to demonstrate — assert
  // it actually holds real entries.
  const untestedItems = report.locator(".ar-untested-list li");
  await expect(untestedItems).not.toHaveCount(0);

  // Cross-check against the real concept catalogue: find a "databases" concept
  // that was never measured this session, and confirm it specifically appears
  // among the untested concepts and nowhere in the measured sections (rows /
  // topGaps / hiddenStrengths). A single dont_know answers only the handful of
  // concepts its item is attributed to, so with 284 "databases" concepts total
  // this is never vacuous.
  const concepts: { id: string; track: string; label: { ru: string } }[] =
    await (await page.request.get("/ru/assess-concepts.json")).json();
  const dbLabels = concepts.filter((c) => c.track === "databases").map((c) => c.label.ru);

  const measuredBlob = (await report.locator(".ar-section:not(.ar-untested)").allInnerTexts()).join(" | ");
  const untestedBlob = (await untestedItems.allInnerTexts()).join(" | ");

  const neverAsked = dbLabels.find((label) => !measuredBlob.includes(label));
  expect(neverAsked, "expected at least one 'databases' concept never measured this session").toBeTruthy();
  expect(untestedBlob).toContain(neverAsked);
  expect(measuredBlob).not.toContain(neverAsked as string);
});
