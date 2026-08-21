// Per-locale lesson search index, emitted as a static JSON asset at
// /<lang>/search-index.json. Previously this payload was inlined into EVERY
// page's HTML by GlobalSearch.astro (~208 KiB, ~90% of the document weight),
// which inflated parse time, FCP, and LCP site-wide. The client now fetches
// this once, on demand, the first time search is opened.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { isLocale, type Locale } from "~/i18n";
import { selectOther } from "~/scripts/build-incremental";

// Gate like every other non-lesson route: full build emits both locales;
// incremental build emits none and the prior JSON is served from the cached
// dist (same staleness contract the inline index had).
export function getStaticPaths() {
  return selectOther([{ params: { lang: "en" } }, { params: { lang: "ru" } }]);
}

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Locale;
  if (!isLocale(lang)) return new Response("Not found", { status: 404 });

  const tracks = await getCollection("tracks");
  const trackColorBySlug: Record<string, string> = {};
  for (const tr of tracks) trackColorBySlug[tr.data.slug] = tr.data.color;

  const lessons = await getCollection(
    "lessons",
    (e) => e.data.lang === lang && e.data.status === "ready",
  );
  const index = lessons.map((e) => ({
    slug: e.data.slug,
    pillar: e.data.track,
    pillarColor: trackColorBySlug[e.data.track] ?? "lilac",
    title: e.data.title,
    href: `/${lang}/learn/${e.data.track}/${e.data.unit}/${e.data.slug}/`,
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
