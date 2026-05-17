// Pure, build-time glossary relation derivation. No Astro imports — unit-tested.

export type GlossEntry = {
  en: string;
  ru: string;
  defEn?: string;
  defRu?: string;
  seeAlso?: string[];
};

export type ScanEntry = {
  collection: "book" | "lessons";
  group: string; // pillar slug (book) | track slug (lessons)
  slug: string; // piece slug | lesson slug
  altitude: number; // lower = closer to zero knowledge
  body: string; // raw MDX source
};

export type ContentRef = {
  collection: "book" | "lessons";
  group: string;
  slug: string;
  altitude: number;
};

export type Relations = {
  usedIn: Record<string, ContentRef[]>;
  introducedIn: Record<string, ContentRef | null>;
  seeAlso: Record<string, string[]>;
};

const TERM_RE = /<Term\b[^>]*\bk="([^"]+)"/g;

/** Glossary keys referenced via <Term k="..."> in one MDX body, deduped. */
export function scanKeys(body: string): Set<string> {
  const keys = new Set<string>();
  for (const m of body.matchAll(TERM_RE)) keys.add(m[1]);
  return keys;
}

export function deriveRelations(
  entries: ScanEntry[],
  glossary: Record<string, GlossEntry>,
): Relations {
  const usedIn: Record<string, ContentRef[]> = {};
  const introducedIn: Record<string, ContentRef | null> = {};
  const seeAlso: Record<string, string[]> = {};

  for (const key of Object.keys(glossary)) {
    usedIn[key] = [];
    introducedIn[key] = null;
    const refs = glossary[key].seeAlso ?? [];
    for (const ref of refs) {
      if (ref === key) {
        throw new Error(`glossary "${key}": seeAlso references itself`);
      }
      if (!(ref in glossary)) {
        throw new Error(`glossary "${key}": seeAlso references unknown key "${ref}"`);
      }
    }
    seeAlso[key] = refs;
  }

  for (const entry of entries) {
    const ref: ContentRef = {
      collection: entry.collection,
      group: entry.group,
      slug: entry.slug,
      altitude: entry.altitude,
    };
    for (const key of scanKeys(entry.body)) {
      if (!(key in usedIn)) continue; // ignore <Term> keys absent from glossary.json
      usedIn[key].push(ref);
    }
  }

  for (const key of Object.keys(usedIn)) {
    usedIn[key].sort((a, b) => a.altitude - b.altitude);
    introducedIn[key] = usedIn[key][0] ?? null;
  }

  return { usedIn, introducedIn, seeAlso };
}
