import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.test.mjs"],
    globals: false,
    coverage: { provider: "v8", reporter: ["text", "json"] },
  },
  resolve: {
    alias: { "~": new URL("./src", import.meta.url).pathname },
  },
});
