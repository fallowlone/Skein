import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import preact from "@astrojs/preact";
import tailwind from "@astrojs/tailwind";

const lessonRoot = fileURLToPath(new URL("./lesson-worker/", import.meta.url));
const lessonSourceRoot = fileURLToPath(new URL("./lesson-worker/src/", import.meta.url));
const sourceRoot = fileURLToPath(new URL("./src/", import.meta.url));
const publicRoot = fileURLToPath(new URL("./public/", import.meta.url));
const outputRoot = fileURLToPath(new URL("./dist-lessons/", import.meta.url));
const wranglerConfig = fileURLToPath(new URL("./wrangler.lessons.jsonc", import.meta.url));

export default defineConfig({
  root: lessonRoot,
  site: "https://fallowlone.com",
  output: "server",
  srcDir: lessonSourceRoot,
  publicDir: publicRoot,
  outDir: outputRoot,
  adapter: cloudflare({
    configPath: wranglerConfig,
  }),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    preact({ compat: false }),
  ],
  vite: {
    ssr: { noExternal: ["gsap"] },
    resolve: {
      alias: [
        { find: "~", replacement: sourceRoot },
      ],
    },
  },
});
