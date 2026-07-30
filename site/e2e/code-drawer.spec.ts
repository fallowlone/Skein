import { test, expect } from "@playwright/test";

// A sandbox task on a real lesson: open the docked editor, type, run, read the output.
// Guards two things that broke silently before: the editor chunk (CodeMirror) loading at
// all, and QuickJS resolving its wasm — a 404 there turns every "Run" into an
// "Aborted(...)" message that still looks like output.
const LESSON = "/ru/learn/databases/07-sharding/01-why-sharding-exists";
const SANDBOX_TASK = /Посчитай, когда один primary/;

test("the code drawer opens on a sandbox task and runs the learner's code", async ({ page }) => {
  test.slow(); // hydration + lazy editor + wasm boot
  await page.goto(LESSON);

  const card = page.getByRole("button", { name: SANDBOX_TASK }).first();
  await card.scrollIntoViewIfNeeded();
  // Clicking SSR markup before hydration does nothing, so wait for the island.
  await page.waitForFunction(
    () => [...document.querySelectorAll("astro-island")].some((i) => i.hasAttribute("client-render-time")),
  );
  // The practice list hydrates as one island but each card mounts its body lazily, so
  // the first click can still land early — retry until the task body is on screen.
  const launcher = page.getByRole("button", { name: /Написать код/ }).first();
  await expect(async () => {
    await card.click();
    await expect(launcher).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });

  await launcher.click();
  const drawer = page.locator(".code-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.locator(".cm-editor")).toBeVisible();

  await drawer.locator(".cm-content").click();
  await page.keyboard.type('console.log("shards", Math.ceil(41000 / 30000));');
  await drawer.getByRole("button", { name: /^Запустить$/ }).click();

  await expect(drawer.locator(".cd-std")).toHaveText(/shards 2/, { timeout: 60_000 });

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
});
