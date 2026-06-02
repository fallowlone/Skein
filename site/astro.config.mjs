import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import { lintCurriculum } from "./src/lint";

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
    lintCurriculum(),
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
