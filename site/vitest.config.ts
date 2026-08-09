import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.mjs", "scripts/**/*.test.ts"],
    globals: false,
    testTimeout: 120_000,
    coverage: { provider: "v8", reporter: ["text", "json"] },
  },
  resolve: {
    alias: { "~": new URL("./src", import.meta.url).pathname },
  },
});
