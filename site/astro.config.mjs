import { fileURLToPath } from "node:url";
import { createLogger } from "vite";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import remarkRetrievalLessonKey from "./src/lib/remark-retrieval-lessonkey.mjs";
import lessonIndex from "./src/content/path/lesson-index.json" with { type: "json" };
// Build-log noise filter: direct-eval warnings fire only inside node_modules
// WASM loaders (pglite, onnxruntime) and are unactionable from our source.
// vite 8 offers no onwarn passthrough, so filter at the logger: skip a warning
// only when it names BOTH eval and a node_modules path — any eval in our own
// code still prints.
const baseLogger = createLogger();
const filteredLogger = {
  ...baseLogger,
  warn(msg, options) {
    if (typeof msg === "string" && msg.includes("eval") && msg.includes("node_modules")) return;
    baseLogger.warn(msg, options);
  },
  warnOnce(msg, options) {
    if (typeof msg === "string" && msg.includes("eval") && msg.includes("node_modules")) return;
    baseLogger.warnOnce(msg, options);
  },
};
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
    mdx(),
    // Generated NGSL vocab data (>500KB each) carries no JSX, so keep it out
    // of the preset's Babel pass — otherwise @babel/generator prints a
    // "deoptimised styling" note per file on every build. esbuild still
    // handles the TS syntax; output is unchanged.
    // onnxruntime-web ships prebuilt minified dist (also >500KB): no JSX in
    // it either, same note, same treatment.
    preact({ compat: true, exclude: [/english\/data\/vocab-b[12]\.ts/, /node_modules\/onnxruntime-web\/dist\//] }),
    sitemap({
      filter: (page) => !page.includes("/admin"),
      customPages: Object.values(lessonIndex).map(
        (lesson) => `https://fallowlone.com/${lesson.lang}/learn/${lesson.track}/${lesson.unit}/${lesson.slug}/`,
      ),
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
    build: {
      // The >500KB chunks are route-scoped by design (grammar topic ~4.6MB
      // behind client:visible, WASM loaders), never in the initial bundle —
      // the default limit only adds noise. Sizes are tracked in dist/_astro.
      chunkSizeWarningLimit: 5000,
    },
    customLogger: filteredLogger,
    ssr: { noExternal: ["gsap"] },
    // Dev only: the dep optimizer rewrites quickjs-emscripten into .vite/deps but does
    // not copy its sibling emscripten-module.wasm, so every sandbox run 404s with
    // "both async and sync fetching of the wasm failed". Serving the package unbundled
    // keeps its own asset URLs intact. Production builds never run the optimizer.
    optimizeDeps: { exclude: ["quickjs-emscripten"] },
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
