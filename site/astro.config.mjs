import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import { lintCurriculum } from "./src/lint";

export default defineConfig({
  output: "static",
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    preact({ compat: false }),
    lintCurriculum(),
  ],
  markdown: {
    shikiConfig: { theme: "github-light", wrap: true },
  },
  vite: {
    ssr: { noExternal: ["gsap"] },
  },
});
