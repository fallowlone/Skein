// site/src/pages/data/path/[name].json.ts
// Per-path static JSON assets at /data/path/<name>.json.
//
// The per-lesson task index (~0.5MB) and the lesson concept graph (~5.7MB)
// used to be pulled into the client bundle through dynamic imports in
// TodayFocus.tsx: Vite/Rollup must parse, treeshake, and emit every imported
// JSON as a hashed chunk, which dominated the client build (~69s) and shipped
// a 5.4MB parsed chunk to every path-page visitor. Served here as prerendered
// static assets instead — fetched on demand at runtime, never bundled.
// Same non-lesson-route contract as search-index.json.ts and the practice
// JSON routes: full build emits fresh; incremental build emits none and the
// prior copy is served from cached dist.
import type { APIRoute } from "astro";
import { selectOther } from "~/scripts/build-incremental";
import lessonGraph from "~/content/path/lesson-graph.json";
import lessonTasks from "~/content/path/lesson-tasks.json";

const PAYLOADS: Record<string, unknown> = {
  "lesson-graph": lessonGraph,
  "lesson-tasks": lessonTasks,
};

export function getStaticPaths() {
  return selectOther(Object.keys(PAYLOADS).map((name) => ({ params: { name } })));
}

export const GET: APIRoute = async ({ params }) => {
  const payload = PAYLOADS[params.name ?? ""];
  if (!payload) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
