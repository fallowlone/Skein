import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import { lintCurriculum } from "./src/lint";

export default defineConfig({
  output: "static",
  // Render pages in parallel during the static build. The site emits ~5k pages
  // and route generation is the dominant build cost; on Cloudflare Pages' 2-vCPU
  // builder the serial default pushed the build past the time limit. 2 overlaps
  // each page's disk write with the next page's render without risking the OOM
  // that higher values invite (Astro renders are single-threaded CPU work).
  build: { concurrency: 2 },
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
