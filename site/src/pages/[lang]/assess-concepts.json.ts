// site/src/pages/[lang]/assess-concepts.json.ts
// Static JSON asset carrying the concept catalogue (id, bilingual label, track,
// band, requires) for /assess: building the concept graph, resolving scope→
// concept candidates, resolving goal targets, and labelling the report. Same
// reasoning as assess-items.json.ts — this file's import runs at build time only
// (prerendered API route); the client fetches the emitted JSON at runtime instead
// of it entering a JS bundle (Ruling 3, task-12-brief — path-io.ts's existing
// `import conceptsJson from "~/content/path/concepts.json"` bundles this same
// 1.1 MB file into every page that (transitively) imports path-io.ts; /assess
// deliberately does not import path-io.ts so as to not repeat that cost — see
// AssessFlow.tsx's loadScopeDeps() and the Ruling 4 goal-source comment there).
//
// Under `[lang]` alongside assess-items.json.ts for the same reason (real
// getStaticPaths/selectOther gating requires a dynamic route) and for
// consistency between the two — see that file's comment for the fuller story.
import type { APIRoute } from "astro";
import concepts from "~/content/path/concepts.json";
import { isLocale, type Locale } from "~/i18n";
import { selectOther } from "~/scripts/build-incremental";

export function getStaticPaths() {
  return selectOther([{ params: { lang: "en" } }, { params: { lang: "ru" } }]);
}

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Locale;
  if (!isLocale(lang)) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(concepts), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
