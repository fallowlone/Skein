import { defineConfig, devices } from "@playwright/test";

// Loading the lesson collection (4.5k content files) needs more than Node's
// default heap: a plain `bun run dev` dies with a V8 OOM abort partway through,
// which took the whole e2e run down with "Process from config.webServer exited
// early". Give the dev server the same ceiling the build uses.
const PORT = Number(process.env.E2E_PORT ?? 4321);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  // E2E_BASE_URL points the run at a server you already have open; without it
  // Playwright starts its own.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `NODE_OPTIONS=--max-old-space-size=10240 bunx astro dev --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        // Cold start reads the whole content layer; 60s was not enough once the
        // curriculum passed a few thousand lessons.
        timeout: 180_000,
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
