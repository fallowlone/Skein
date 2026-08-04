// site/src/pages/practice/[track]/[unit]/[lesson].json.ts
// One static JSON file per lesson's practice tasks, at /practice/<lessonKey>.json.
//
// AssessItem (item-pool.ts) deliberately carries no content — only lessonKey +
// taskId + metadata (Task 6). The actual question text, mcq blanks, review diff,
// debug starter, etc. live in the `practice` content collection (40 MB across
// ~1540 lesson files). /assess serves one item at a time chosen adaptively at
// RUNTIME (select.ts's nextItem), so which lesson's content is needed can't be
// known at build time and can't be pre-bundled into the page the way
// interview.astro pre-curates a small, fixed subset. This route exposes each
// lesson's already-public practice content (the same tasks a visitor already
// sees on that lesson's own page) as an individually fetchable static asset, so
// ItemView.tsx's content lookup fetches only the ~1 lesson (tens of KB) it needs
// per item, never all 1540 at once — the same "fetch on demand" shape as
// search-index.json.ts, just keyed by lesson instead of by locale.
//
// Gated with selectOther, not selectLessons: practice content isn't per-locale
// (one file serves both `en`/`ru` via BiText), so it doesn't fit selectLessons'
// `${lang}/${track}/${unit}/${lesson}` key shape. Non-lesson-route contract:
// full build emits every lesson's JSON fresh; incremental build emits none and
// the prior copy is served from cached dist — same staleness contract as
// search-index.json.ts.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { selectOther } from "~/scripts/build-incremental";

export async function getStaticPaths() {
  const entries = await getCollection("practice");
  const paths = entries.map((entry) => {
    const [track, unit, lesson] = entry.data.lessonKey.split("/");
    return { params: { track, unit, lesson }, props: { tasks: entry.data.tasks } };
  });
  return selectOther(paths);
}

export const GET: APIRoute = async ({ props }) => {
  return new Response(JSON.stringify(props.tasks), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
