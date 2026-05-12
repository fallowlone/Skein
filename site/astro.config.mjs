import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";

export default defineConfig({
  output: "static",
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    preact({ compat: false }),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ru"],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: true },
    fallback: { ru: "en" },
  },
  markdown: {
    shikiConfig: { theme: "github-light", wrap: true },
  },
  vite: {
    ssr: { noExternal: ["gsap"] },
  },
});
