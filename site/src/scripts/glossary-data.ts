// Astro-side glue for the glossary. Bridges content collections into the pure
// deriveRelations() and resolves ContentRefs to per-language titles + URLs.

import { getCollection } from "astro:content";
import glossaryJson from "../i18n/glossary.json";
import type { Locale } from "../i18n";
import {
  deriveRelations,
  type ContentRef,
  type GlossEntry,
  type Relations,
  type ScanEntry,
} from "./glossary-index";

export const glossary = glossaryJson as Record<string, GlossEntry>;

export type ResolvedRef = { title: string; href: string; group: string };

// Altitude: foundations lessons rank below all book pieces.
// lessons:  trackOrder*1e6 + unitOrder*1e3 + lessonOrder
// book:     1e9 + pillarOrder*1e3 + pieceOrder
function lessonAltitude(trackOrder: number, unitOrder: number, order: number): number {
  return trackOrder * 1_000_000 + unitOrder * 1_000 + order;
}
function bookAltitude(pillarOrder: number, order: number): number {
  return 1_000_000_000 + pillarOrder * 1_000 + order;
}

/** Derive relations once. Scans the EN entries only — <Term k> keys are
 *  language-independent, so one language is enough and avoids double counting. */
async function buildRelations(): Promise<Relations> {
  const pillars = await getCollection("pillars");
  const tracks = await getCollection("tracks");
  const units = await getCollection("units");
  const pillarOrder = new Map(pillars.map((p) => [p.data.slug, p.data.order]));
  const trackOrder = new Map(tracks.map((t) => [t.data.slug, t.data.order]));
  const unitOrder = new Map(units.map((u) => [u.data.slug, u.data.order]));

  const book = await getCollection("book", (e) => e.data.lang === "en");
  const lessons = await getCollection("lessons", (e) => e.data.lang === "en");

  const scan: ScanEntry[] = [];
  for (const e of book) {
    scan.push({
      collection: "book",
      group: e.data.pillar,
      slug: e.data.slug,
      altitude: bookAltitude(pillarOrder.get(e.data.pillar) ?? 999, e.data.order),
      body: e.body ?? "",
    });
  }
  for (const e of lessons) {
    scan.push({
      collection: "lessons",
      group: e.data.track,
      slug: e.data.slug,
      altitude: lessonAltitude(
        trackOrder.get(e.data.track) ?? 999,
        unitOrder.get(e.data.unit) ?? 999,
        e.data.order,
      ),
      body: e.body ?? "",
    });
  }

  return deriveRelations(scan, glossary);
}

/** Relations + a resolver that turns a ContentRef into a title + URL for `lang`. */
export async function loadGlossary(lang: Locale): Promise<{
  relations: Relations;
  resolveRef: (ref: ContentRef) => ResolvedRef;
}> {
  const relations = await buildRelations();

  const book = await getCollection("book", (e) => e.data.lang === lang);
  const lessons = await getCollection("lessons", (e) => e.data.lang === lang);
  const pillars = await getCollection("pillars");
  const tracks = await getCollection("tracks");
  const pillarTitle = new Map(pillars.map((p) => [p.data.slug, p.data.title[lang]]));
  const trackTitle = new Map(tracks.map((t) => [t.data.slug, t.data.title[lang]]));

  // key: `${collection}:${group}:${slug}` → entry title for `lang`
  const titleByKey = new Map<string, string>();
  for (const e of book) titleByKey.set(`book:${e.data.pillar}:${e.data.slug}`, e.data.title);
  for (const e of lessons) titleByKey.set(`lessons:${e.data.track}:${e.data.slug}`, e.data.title);

  function resolveRef(ref: ContentRef): ResolvedRef {
    const k = `${ref.collection}:${ref.group}:${ref.slug}`;
    const title = titleByKey.get(k) ?? ref.slug;
    if (ref.collection === "book") {
      return {
        title,
        href: `/${lang}/${ref.group}/${ref.slug}/`,
        group: pillarTitle.get(ref.group) ?? ref.group,
      };
    }
    return {
      title,
      href: `/${lang}/learn/${ref.group}/${ref.slug}/`,
      group: trackTitle.get(ref.group) ?? ref.group,
    };
  }

  return { relations, resolveRef };
}
