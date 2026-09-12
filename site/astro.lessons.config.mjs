import { fileURLToPath } from "node:url";
import { defineConfig, sessionDrivers } from "astro/config";
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
  // The lesson Worker is a read-only content renderer: it never touches
  // Astro sessions or image optimization. Without these overrides
  // `@astrojs/cloudflare` defaults to a Cloudflare KV session binding
  // (`SESSION`) and the Cloudflare Images binding (`IMAGES`), which `wrangler
  // deploy` then tries to auto-provision at deploy time — failing on accounts
  // whose API token lacks `Workers KV Storage` / `Cloudflare Images` perms.
  session: {
    driver: sessionDrivers.lruCache({}),
  },
  adapter: cloudflare({
    configPath: wranglerConfig,
    imageService: "passthrough",
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
