import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
// NOTE: the curriculum lint runs as a SEPARATE post-build process
// (`bun scripts/lint-dist.mjs`, chained in package.json `build`), not as an
// in-process astro:build:done integration — that inherited the render's ~10GB
// heap and the lint allocations OOM-killed (SIGKILL) the CI runner mid-lint.

export default defineConfig({
  output: "static",
  // Render pages serially during the static build. The site emits ~4.2k pages;
  // concurrency >1 holds multiple render contexts in heap at once and pushed the
  // Cloudflare Pages 8GB builder into an OOM (heap limit) once all tracks landed.
  // Serial keeps peak memory low. (Real fix for build scale: on-demand SSR.)
  build: { concurrency: 1 },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    preact({ compat: false }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
      defaultColor: false,
    },
  },
  vite: {
    ssr: { noExternal: ["gsap"] },
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
