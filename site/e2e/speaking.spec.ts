import { test, expect } from "@playwright/test";

// Inject a deterministic fake SpeechRecognition before the page loads.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSR {
      lang = ""; interimResults = false; continuous = false;
      onstart: any; onend: any; onerror: any; onresult: any;
      start() { this.onstart?.(); }
      stop() {
        this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "yesterday i fixed the flaky test" }, length: 1 }] });
        this.onend?.();
      }
    }
    (window as any).webkitSpeechRecognition = FakeSR;
  });
});

test("shadow mode records and renders an intelligibility score", async ({ page }) => {
  await page.goto("/en/english/speaking/");
  await page.getByRole("tab", { name: "Shadow" }).click();
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText(/Intelligibility/)).toBeVisible();
});

test("speaking page ships the wasm CSP, others do not", async ({ page }) => {
  const res = await page.goto("/en/english/speaking/");
  const html = await res!.text();
  expect(html).toContain("wasm-unsafe-eval");
  const other = await page.goto("/en/settings/");
  const otherHtml = await other!.text();
  expect(otherHtml).not.toContain("wasm-unsafe-eval");
});
