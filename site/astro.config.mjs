import { fileURLToPath } from "node:url";
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
