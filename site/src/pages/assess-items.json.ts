// site/src/pages/assess-items.json.ts
// Static JSON asset for the /assess item index. Mirrors [lang]/search-index.json.ts
// (Ruling 3, task-12-brief): the 4.6 MB item index must never enter a JS bundle —
// not even as a code-split `import()`, which Vite still wraps as a parsed JS module.
// Importing the content JSON here happens at BUILD time only (this file runs as a
// prerendered Astro API route, `output: "static"`), so nothing below ships to the
// client. The client fetches this at runtime as a plain, separately-cacheable
// static asset — see AssessFlow.tsx's loadDeps().
import type { APIRoute } from "astro";
import assessItems from "~/content/path/assess-items.json";

// Not a dynamic route (no [param] segment), so there is no getStaticPaths to gate
// via selectOther — Astro always prerenders a fixed-path route. This file is
// small and content rarely changes, so always-regenerate (full or incremental
// build) is an acceptable cost, unlike the per-lesson HTML pages selectOther/
// selectLessons exist to protect.
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(assessItems), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
