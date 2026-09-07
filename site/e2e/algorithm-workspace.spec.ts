import { expect, test } from "@playwright/test";
import { REFERENCE_SOLUTION } from "../src/components/algo/workspace/problem-3sum";

const URL = "/en/algorithm-workspace";
test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

async function openWorkspace(page: import("@playwright/test").Page) {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".algorithm-workspace-root")).toBeVisible({ timeout: 30_000 });
}

async function dismissExpedition(page: import("@playwright/test").Page) {
  const pass = page.getByRole("complementary", { name: "Expedition Pass" });
  if (await pass.isVisible()) await page.getByRole("button", { name: /Continue without pass/ }).click();
}

test("Algorithm Workspace happy path is functional end to end", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  await openWorkspace(page);

  await expect(page.getByRole("complementary", { name: "Expedition Pass" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Telegram Stars unavailable/ })).toBeDisabled();
  await dismissExpedition(page);

  const untimed = page.getByRole("button", { name: /No timer/ });
  await untimed.click();
  await expect(untimed).toHaveAttribute("aria-pressed", "true");
  const timed = page.getByRole("button", { name: /Against the clock/ });
  await timed.click();
  await expect(timed).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /O\(n²\)/ }).click();
  await page.getByRole("button", { name: /Seal prediction & open editor/ }).click();
  await expect(page.getByText("sealed prediction")).toBeVisible();

  const editor = page.locator("textarea").first();
  await editor.fill(REFERENCE_SOLUTION);
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.getByText("3 of 3 pass")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Reveal rung 1" }).click();
  await expect(page.getByText("1 / 4 spent")).toBeVisible();
  await expect(page.getByText("spent 6")).toBeVisible();

  await page.getByRole("button", { name: "Save attempt" }).click();
  await expect(page.getByText("#01")).toBeVisible();
  await expect(page.getByText("3 of 3 passed")).toBeVisible();

  await page.getByRole("tab", { name: "Solutions" }).click();
  await expect(page.getByText("locked until you submit")).toBeVisible();

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(/8 of 8 cases passed/)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#main").getByText(/Could you reach the target sum faster than O\(n²\)/).first()).toBeVisible();

  await page.getByRole("button", { name: "Workspace" }).click();
  await page.getByRole("tab", { name: "Solutions" }).click();
  await expect(
    page.locator("#solve-rail-panel-solutions").getByText("Sort + two pointers", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Debrief" }).click();
  await page.getByRole("tab", { name: "Your code vs reference" }).click();
  await expect(page.getByText("Your submission vs the reference idiom")).toBeVisible();
  await page.getByRole("tab", { name: "What to do next" }).click();
  await expect(page.getByText("Next in your queue")).toBeVisible();

  await page.getByRole("button", { name: "Metrics" }).click();
  await expect(page.getByText("measured in this browser")).toBeVisible();
  await page.getByRole("tab", { name: "Habits" }).click();
  await expect(page.getByText("Recent attempts")).toBeVisible();
  await page.getByRole("tab", { name: "Pace" }).click();
  await expect(page.getByText(/measured attempts/)).toBeVisible();

  await page.getByRole("button", { name: "Problem bank" }).click();
  const otherProblem = page.getByRole("link").filter({ has: page.getByText("Binary Search", { exact: true }) });
  await expect(otherProblem).toHaveAttribute("href", "/en/learn/algorithms/03-sorting-search/drill");
  await otherProblem.click();
  await expect(page).toHaveURL(/\/en\/learn\/algorithms\/03-sorting-search\/drill/);

  await openWorkspace(page);
  await dismissExpedition(page);
  await expect(page.getByText("sealed prediction")).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue(REFERENCE_SOLUTION);
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("skein.drill.v1") ?? "{}"));
  expect(progress["3sum"]?.status).toBe("solved");

  await page.getByRole("button", { name: "Reset session" }).click();
  await expect(page.getByText("What time complexity will your solution have?")).toBeVisible();
  const afterReset = await page.evaluate(() => ({
    session: JSON.parse(localStorage.getItem("skein.algo-workspace.3sum.v1") ?? "{}"),
    history: JSON.parse(localStorage.getItem("skein.algo-workspace.3sum.history.v1") ?? "[]"),
    progress: JSON.parse(localStorage.getItem("skein.drill.v1") ?? "{}"),
  }));
  expect(afterReset.session.attempts).toEqual([]);
  expect(afterReset.history.length).toBeGreaterThan(0);
  expect(afterReset.progress["3sum"]?.status).toBe("solved");
});

test("Expedition route uses the live bank and desktop layouts stay inside the viewport", async ({ page }) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 900 },
    { width: 1280, height: 900 },
    { width: 1440, height: 900 },
    { width: 1512, height: 982 },
  ]) {
    await page.setViewportSize(viewport);
    await openWorkspace(page);
    await expect(page.getByText("3 problems in the live bank")).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: /Open problems: BINARY SEARCH/ }).click();
    await expect(page.getByRole("heading", { name: "Problems", exact: true })).toBeVisible();
    await expect(page.getByRole("link").filter({ has: page.getByText("Binary Search", { exact: true }) })).toBeVisible();
    await expect(page.getByRole("link", { name: /Valid Palindrome/ })).toHaveCount(0);

    const bankOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(bankOverflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Workspace" }).click();
    await page.getByRole("button", { name: "Reset session" }).click();
    await page.getByRole("button", { name: /O\(n²\)/ }).click();
    await page.getByRole("button", { name: /Seal prediction & open editor/ }).click();
    const editor = page.locator("textarea").first();
    await expect(editor).toBeVisible();
    const editorBox = await editor.boundingBox();
    expect(editorBox?.width ?? 0, `${viewport.width}px editor width`).toBeGreaterThanOrEqual(320);
    const editorOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(editorOverflow).toBeLessThanOrEqual(1);
  }
});

test("Problem Bank and Metrics stay inside a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  await dismissExpedition(page);

  await expect(page.locator("#solve-rail-panel-hints")).toHaveCount(1);
  await expect(page.locator("#solve-rail-panel-attempts")).toHaveCount(1);
  await expect(page.locator("#solve-rail-panel-solutions")).toHaveCount(1);
  await page.getByRole("button", { name: /O\(n²\)/ }).click();
  await page.getByRole("button", { name: /Seal prediction & open editor/ }).click();
  await page.getByRole("button", { name: "Save attempt" }).click();

  await page.getByRole("button", { name: "Problem bank" }).click();
  await expect(page.getByRole("heading", { name: "Problems", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Metrics" }).click();
  await expect(page.getByText("measured in this browser")).toBeVisible();
  await expect(page.locator("#metrics-panel-patterns")).toHaveCount(1);
  await expect(page.locator("#metrics-panel-habits")).toHaveCount(1);
  await expect(page.locator("#metrics-panel-pace")).toHaveCount(1);
  await page.getByRole("tab", { name: "Habits" }).click();
  await expect(page.getByText("Recent attempts")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole("tab", { name: "Pace" }).click();
  await expect(page.getByText("1 measured attempts")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
