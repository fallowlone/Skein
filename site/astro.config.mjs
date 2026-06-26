import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import remarkRetrievalLessonKey from "./src/lib/remark-retrieval-lessonkey.mjs";
// NOTE: the curriculum lint runs as a SEPARATE post-build process
// (`bun scripts/lint-dist.mjs`, chained in package.json `build`), not as an
// in-process astro:build:done integration — that inherited the render's ~10GB
// heap and the lint allocations OOM-killed (SIGKILL) the CI runner mid-lint.

export default defineConfig({
  site: "https://fallowlone.com",
  output: "static",
  // Per-shard cache isolation for the parallel build. The content-layer data
  // store lives at `${cacheDir}/data-store.json` and is written atomically
  // (write `.tmp` → rename). When N shards share the default
  // `node_modules/.astro`, they race on that single file: shard A's rename
  // consumes the shared `.tmp` and shard B's rename then fails with ENOENT.
  // parallel-build.mjs sets ASTRO_CACHE_DIR per shard so each owns its store.
  // Unset (serial / incremental build) → Astro's default `node_modules/.astro`.
  cacheDir: process.env.ASTRO_CACHE_DIR || undefined,
  // Prefetch internal page HTML on link hover so lesson→lesson and sidebar
  // navigation feels instant. `hover` only fetches once the pointer lands on a
  // link (intent signal); `prefetchAll` opts every same-origin <a> in without
  // per-link attributes. Static HTML, low-priority fetch, deduped by Astro —
  // negligible cost, large perceived-nav win on a content site.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  // Render pages serially during the static build. The site emits ~4.2k pages;
  // concurrency >1 holds multiple render contexts in heap at once and pushed the
  // Cloudflare Pages 8GB builder into an OOM (heap limit) once all tracks landed.
  // Serial keeps peak memory low. (Real fix for build scale: on-demand SSR.)
  build: { concurrency: 1 },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    preact({ compat: false }),
    sitemap({
      filter: (page) => !page.includes("/admin"),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkRetrievalLessonKey],
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
