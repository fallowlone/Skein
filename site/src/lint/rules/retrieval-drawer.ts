import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";

/**
 * RetrievalDrawer prop-contract guard (source-level, runs over src/).
 *
 * Background: the SRS refactor (050caa7b) renamed the component's slug prop from
 * the MDX-authored `id` to `pieceSlug` without migrating ~2550 call sites. The
 * mismatch never failed the build — RetrievalDrawer is a runtime island, so MDX
 * props are untyped at build time — and every drawer silently shipped with an
 * undefined slug (broken retrieval/SRS bookkeeping) and an empty answer body.
 *
 * The component is now a tolerant reader (accepts `id`|`pieceSlug` and `a`|`answer`),
 * and RetrievalDrawer.test.tsx pins that render behaviour. This rule adds the
 * cheap, unambiguous static half: every `<RetrievalDrawer>` MUST carry a slug
 * prop. Without one the drawer cannot record retrieval or seed review cards, so a
 * missing slug is always an authoring bug — and an attribute presence check has
 * zero false positives against the prose-heavy question/answer bodies (unlike
 * counting `q:`/`a:` keys, which would trip over answer text).
 */
const TAG_RE = /<RetrievalDrawer\b[\s\S]*?\/>/g;
const SLUG_RE = /\b(?:id|pieceSlug)\s*=/;

async function lessonMdxFiles(lessonsRoot: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    let items;
    try {
      items = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const it of items) {
      const p = join(dir, it.name);
      if (it.isDirectory()) await walk(p);
      else if (it.name === "index.mdx" || extname(it.name) === ".mdx") out.push(p);
    }
  }
  await walk(lessonsRoot);
  return out;
}

export function checkRetrievalDrawerSource(src: string, file: string): string[] {
  const errs: string[] = [];
  const blocks = src.match(TAG_RE);
  if (!blocks) return errs;
  for (const block of blocks) {
    if (!SLUG_RE.test(block)) {
      errs.push(`${file}: <RetrievalDrawer> is missing a slug prop (id="…" or pieceSlug="…"); without it retrieval/SRS bookkeeping is a no-op`);
    }
  }
  return errs;
}

export async function checkRetrievalDrawer(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const lessonsRoot = join(siteSrc, "content", "lessons");
  const files = await lessonMdxFiles(lessonsRoot);
  for (const file of files) {
    let src: string;
    try {
      src = await readFile(file, "utf8");
    } catch {
      continue;
    }
    errs.push(...checkRetrievalDrawerSource(src, file));
  }
  return errs;
}
