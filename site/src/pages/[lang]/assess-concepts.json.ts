// site/src/pages/assess-concepts.json.ts
// Static JSON asset carrying the concept catalogue (id, bilingual label, track,
// band, requires) for /assess: building the concept graph, resolving scope→
// concept candidates, resolving goal targets, and labelling the report. Same
// reasoning as assess-items.json.ts — this file's import runs at build time only
// (prerendered API route); the client fetches the emitted JSON at runtime instead
// of it entering a JS bundle (Ruling 3, task-12-brief — path-io.ts's existing
// `import conceptsJson from "~/content/path/concepts.json"` bundles this same
// 1.1 MB file into every page that (transitively) imports path-io.ts; /assess
// deliberately does not import path-io.ts so as to not repeat that cost — see
// AssessFlow.tsx's loadDeps() and the Ruling 4 goal-source comment there).
import type { APIRoute } from "astro";
import concepts from "~/content/path/concepts.json";

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(concepts), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
