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

// Altitude: lessons sorted by trackOrder*1e6 + unitOrder*1e3 + lessonOrder
function lessonAltitude(trackOrder: number, unitOrder: number, order: number): number {
  return trackOrder * 1_000_000 + unitOrder * 1_000 + order;
}

/** Derive relations once. Scans the EN entries only — <Term k> keys are
 *  language-independent, so one language is enough and avoids double counting. */
async function buildRelations(): Promise<Relations> {
  const tracks = await getCollection("tracks");
  const units = await getCollection("units");
  const trackOrder = new Map(tracks.map((t) => [t.data.slug, t.data.order]));
  const unitOrder = new Map(units.map((u) => [u.data.slug, u.data.order]));

  const lessons = await getCollection("lessons", (e) => e.data.lang === "en");

  const scan: ScanEntry[] = [];
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

  const lessons = await getCollection("lessons", (e) => e.data.lang === lang);
  const tracks = await getCollection("tracks");
  const trackTitle = new Map(tracks.map((t) => [t.data.slug, t.data.title[lang]]));

  // key: `${collection}:${group}:${slug}` → entry title for `lang`
  const titleByKey = new Map<string, string>();
  for (const e of lessons) titleByKey.set(`lessons:${e.data.track}:${e.data.slug}`, e.data.title);

  function resolveRef(ref: ContentRef): ResolvedRef {
    const k = `${ref.collection}:${ref.group}:${ref.slug}`;
    const title = titleByKey.get(k) ?? ref.slug;
    return {
      title,
      href: `/${lang}/learn/${ref.group}/${ref.slug}/`,
      group: trackTitle.get(ref.group) ?? ref.group,
    };
  }

  return { relations, resolveRef };
}
