// site/src/pages/[lang]/assess-items.json.ts
// Static JSON asset for the /assess item index. Mirrors [lang]/search-index.json.ts
// (Ruling 3, task-12-brief): the 4.6 MB item index must never enter a JS bundle —
// not even as a code-split `import()`, which Vite still wraps as a parsed JS module.
// Importing the content JSON here happens at BUILD time only (this file runs as a
// prerendered Astro API route, `output: "static"`), so nothing below ships to the
// client. The client fetches this at runtime as a plain, separately-cacheable
// static asset — see AssessFlow.tsx's loadItemDeps().
//
// Under `[lang]` (content itself is not locale-specific — the same JSON is
// served at both /en/ and /ru/) purely to get real getStaticPaths/selectOther
// gating: a non-dynamic top-level route (no [param] segment) has no
// getStaticPaths hook Astro will call, so it always regenerates on every build,
// full or incremental — see git history for the earlier non-dynamic version.
// That was a real bug (fix round 1, task-12-report.md, "build-mode skew"): this
// route was ungated while practice/[track]/[unit]/[lesson].json.ts (the item
// CONTENT lookup) is selectOther-gated, so an incremental build could emit a
// fresh item index referencing a lessonKey/taskId whose practice JSON was never
// regenerated (still the stale cached copy, possibly missing that task
// entirely) → a 404 → an item the learner cannot answer. Both routes now share
// the exact same non-lesson-route contract: full build emits fresh, incremental
// build serves the prior cached copy — so an item index built in the same pass
// always agrees with the practice content it references.
import type { APIRoute } from "astro";
import assessItems from "~/content/path/assess-items.json";
import { isLocale, type Locale } from "~/i18n";
import { selectOther } from "~/scripts/build-incremental";

export function getStaticPaths() {
  return selectOther([{ params: { lang: "en" } }, { params: { lang: "ru" } }]);
}

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Locale;
  if (!isLocale(lang)) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(assessItems), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
