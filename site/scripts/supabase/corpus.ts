/**
 * Pure content-corpus logic for the Supabase mirror (Phase 1 of the content-DB
 * migration — docs/2026-08-20-supabase-content-migration.md).
 *
 * This module performs NO network I/O and NO side effects on purpose: every
 * function takes its inputs explicitly so the sync/verify CLIs
 * (sync-content.ts, verify-parity.ts) stay thin wrappers and vitest can
 * exercise the whole corpus contract offline.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parse as parseYaml } from "yaml";

export type CorpusKind =
  | "tracks"
  | "units"
  | "lessons"
  | "practice"
  | "projects"
  | "drill"
  | "lab";

export const KINDS: readonly CorpusKind[] = [
  "tracks",
  "units",
  "lessons",
  "practice",
  "projects",
  "drill",
  "lab",
];

export interface CorpusFile {
  /** Repo-relative path from the site root, POSIX separators. */
  rel: string;
  kind: CorpusKind;
  /** sha256 hex of the raw file bytes. */
  hash: string;
}

export interface CourseRow {
  kind: CorpusKind;
  /**
   * Stable key recorded in the sync ledger; equals the table's primary key for
   * single-entry files and "<kind>#<pk>" for multi-entry JSON files
   * (tracks/units).
   */
  ledgerKey: string;
  /** The hash the row's source of truth was computed from. */
  hash: string;
  /** Row object for the curriculum.<kind> table. */
  row: Record<string, unknown>;
}

export type Ledger = Map<string, string>; // ledgerKey -> content_hash

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

const MDX_RE = /\.(?:md|mdx)$/;

/** Map a repo-relative content path to its corpus kind (null = not corpus). */
export function classify(rel: string): CorpusKind | null {
  if (rel === "src/content/tracks.json") return "tracks";
  if (rel === "src/content/units.json") return "units";
  if (rel.startsWith("src/content/lessons/") && MDX_RE.test(rel)) return "lessons";
  if (rel.startsWith("src/content/practice/") && rel.endsWith(".json")) return "practice";
  if (rel.startsWith("src/content/projects/") && rel.endsWith(".json")) return "projects";
  if (rel.startsWith("src/content/drill/") && rel.endsWith(".json")) return "drill";
  if (rel.startsWith("src/content/lab/") && rel.endsWith(".json")) return "lab";
  return null;
}

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc; // missing dir (e.g. no lab/ yet) is not an error
  }
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

/** Discover every corpus file under siteRoot/src/content (hashes included). */
export async function walkCorpus(siteRoot: string): Promise<CorpusFile[]> {
  const files = await walk(join(siteRoot, "src", "content"));
  const out: CorpusFile[] = [];
  for (const p of files) {
    const rel = relative(siteRoot, p).split("\\").join("/");
    const kind = classify(rel);
    if (!kind) continue;
    out.push({ rel, kind, hash: sha256(await readFile(p)) });
  }
  return out;
}

// ── Frontmatter ────────────────────────────────────────────────────────────

/** Split an MDX/MD file into its YAML frontmatter block and the body after it. */
export function splitFrontmatter(raw: string): { fm: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!m) return { fm: "", body: raw };
  return { fm: m[1], body: m[2] };
}

/** Parse YAML frontmatter (full-YAML analogue of src/scripts/incremental-hash.ts). */
export function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const { fm, body } = splitFrontmatter(raw);
  if (!fm) return { data: {}, body };
  let data: unknown;
  try {
    data = parseYaml(fm);
  } catch (err) {
    throw new Error(
      `frontmatter parse failed (${err instanceof Error ? err.message : String(err)})`,
    );
  }
  return {
    data:
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {},
    body,
  };
}

// ── MDX → prose (search indexing) ───────────────────────────────────────────

const FENCED_CODE = /```[\s\S]*?```/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const IMPORT_EXPORT = /^[ \t]*(?:import|export)\s[^\n]*$/gm;
const MD_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const MD_LINK = /\[([^\]]*)\]\([^)]*\)/g;
const JSX_TAG = /<\/?[A-Za-z][\w.]*(?:\s[^>]*?)?\/?>/g;
const JSX_EXPR = /\{[^{}]*\}/g;
const INLINE_CODE = /`([^`]+)`/g;
const MD_HEADING = /^[ \t]*#{1,6}[ \t]+/gm;
const BLOCKQUOTE = /^[ \t]*>[ \t]?/gm;
const MD_STAR_TILDE = /[*~]{1,3}/g;
// Underscore emphasis only at a non-word boundary, so snake_case identifiers survive.
const MD_UNDERSCORE = /(?<!\w)_{1,3}(?=\S)|(?<=\S)_{1,3}(?!\w)/g;

/**
 * Reduce an MDX body to plain prose for full-text indexing.
 *
 * Deliberately lossy and approximate: the output is only ever tokenized by
 * Postgres, never displayed. Order matters — fenced code goes first so its
 * contents cannot be re-matched by the inline-code or JSX rules, and images
 * precede links because `![]()` is a superset of `[]()`.
 *
 * Whole code BLOCKS are dropped (tokenizing them floods the index with
 * language keywords) while INLINE code is kept (identifiers like `SYN` are
 * exactly what an engineer searches for).
 */
export function mdxToProse(body: string): string {
  return body
    .replace(FENCED_CODE, " ")
    .replace(HTML_COMMENT, " ")
    .replace(IMPORT_EXPORT, " ")
    .replace(MD_IMAGE, " ")
    .replace(MD_LINK, "$1")
    .replace(JSX_TAG, " ")
    .replace(JSX_EXPR, " ")
    .replace(INLINE_CODE, "$1")
    .replace(MD_HEADING, " ")
    .replace(BLOCKQUOTE, " ")
    .replace(MD_STAR_TILDE, "")
    .replace(MD_UNDERSCORE, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Row builders ────────────────────────────────────────────────────────────

const LESSON_META_FIELDS = [
  "prereqs",
  "deepensInto",
  "spiral",
  "mathPrereqs",
  "concepts",
  "sources",
] as const;

/** curriculum.lessons row from one lesson MDX/MD file. */
export function lessonRow(raw: string, rel: string, hash: string): CourseRow {
  const { data, body } = parseFrontmatter(raw);
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const lang = str(data.lang);
  const track = str(data.track);
  const unit = str(data.unit);
  const slug = str(data.slug);
  if (!lang || !track || !unit || !slug) {
    throw new Error(`lesson missing lang/track/unit/slug: ${rel}`);
  }
  const meta: Record<string, unknown> = {};
  for (const field of LESSON_META_FIELDS) {
    if (field in data) meta[field] = data[field];
  }
  const row: Record<string, unknown> = {
    lang,
    track,
    unit,
    slug,
    order_no: typeof data.order === "number" ? data.order : null,
    title: str(data.title),
    summary: str(data.summary),
    est_min: typeof data.estMin === "number" ? data.estMin : null,
    status: typeof data.status === "string" ? data.status : "stub",
    lesson_type: typeof data.lessonType === "string" ? data.lessonType : null,
    level: typeof data.level === "string" ? data.level : null,
    meta,
    body,
    body_hash: sha256(body),
    content_hash: hash,
  };
    return {
    kind: "lessons",
    ledgerKey: `lessons#${lang}/${track}/${unit}/${slug}`,
    hash,
    row,
  };
}

/** curriculum.tracks rows from site/src/content/tracks.json (one per entry). */
export function tracksRows(raw: string, rel: string): CourseRow[] {
  const arr = JSON.parse(raw) as Array<Record<string, unknown>>;
  if (!Array.isArray(arr)) throw new Error(`${rel}: expected a top-level JSON array`);
  return arr.map((entry) => {
    const slug = typeof entry.slug === "string" ? entry.slug : "";
    const hash = sha256(JSON.stringify(entry));
    return {
      kind: "tracks",
      ledgerKey: `tracks#${slug}`,
      hash,
      row: { slug, data: entry, content_hash: hash },
    };
  });
}

/** curriculum.units rows from site/src/content/units.json (one per entry). */
export function unitsRows(raw: string, rel: string): CourseRow[] {
  const arr = JSON.parse(raw) as Array<Record<string, unknown>>;
  if (!Array.isArray(arr)) throw new Error(`${rel}: expected a top-level JSON array`);
  return arr.map((entry) => {
    const track = typeof entry.track === "string" ? entry.track : "";
    const slug = typeof entry.slug === "string" ? entry.slug : "";
    const hash = sha256(JSON.stringify(entry));
    return {
      kind: "units",
      ledgerKey: `units#${track}/${slug}`,
      hash,
      row: { track, slug, data: entry, content_hash: hash },
    };
  });
}

/** curriculum.practice row from one practice JSON file. */
export function practiceRow(raw: string, rel: string, hash: string): CourseRow {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const lessonKey = typeof data.lessonKey === "string" ? data.lessonKey : "";
  const track = typeof data.track === "string" ? data.track : "";
  if (!lessonKey || !track) throw new Error(`practice missing lessonKey/track: ${rel}`);
    return {
    kind: "practice",
    ledgerKey: `practice#${lessonKey}`,
    hash,
    row: { lesson_key: lessonKey, track, data, content_hash: hash },
  };
}

/** curriculum.projects row from one project JSON file. */
export function projectRow(raw: string, rel: string, hash: string): CourseRow {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const slug = typeof data.slug === "string" ? data.slug : "";
  if (!slug) throw new Error(`project missing slug: ${rel}`);
    return { kind: "projects", ledgerKey: `projects#${slug}`, hash, row: { slug, data, content_hash: hash } };
}

/** curriculum.drill row from one drill JSON file. */
export function drillRow(raw: string, rel: string, hash: string): CourseRow {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const track = typeof data.track === "string" ? data.track : "";
  const unit = typeof data.unit === "string" ? data.unit : "";
  if (!track || !unit) throw new Error(`drill missing track/unit: ${rel}`);
    return {
    kind: "drill",
    ledgerKey: `drill#${track}/${unit}`,
    hash,
    row: { track, unit, data, content_hash: hash },
  };
}

/** curriculum.lab row from one lab JSON file. */
export function labRow(raw: string, rel: string, hash: string): CourseRow {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const track = typeof data.track === "string" ? data.track : "";
  const tier = typeof data.tier === "string" ? data.tier : "";
  if (!track || !tier) throw new Error(`lab missing track/tier: ${rel}`);
  return {
    kind: "lab",
    ledgerKey: `lab#${track}/${tier}`,
    hash,
    row: { track, tier, data, content_hash: hash },
  };
}

/** Build every row a corpus file maps to (1 row/file, except tracks/units). */
export function rowFor(file: CorpusFile, raw: string): CourseRow[] {
  switch (file.kind) {
    case "tracks":
      return tracksRows(raw, file.rel);
    case "units":
      return unitsRows(raw, file.rel);
    case "lessons":
      return [lessonRow(raw, file.rel, file.hash)];
    case "practice":
      return [practiceRow(raw, file.rel, file.hash)];
    case "projects":
      return [projectRow(raw, file.rel, file.hash)];
    case "drill":
      return [drillRow(raw, file.rel, file.hash)];
    case "lab":
      return [labRow(raw, file.rel, file.hash)];
  }
}

/** Materialize the whole corpus (files → table rows). ~150 MB of text in RAM. */
export async function materialize(siteRoot: string): Promise<CourseRow[]> {
  const files = await walkCorpus(siteRoot);
  const rows: CourseRow[] = [];
  for (const file of files) {
    const raw = await readFile(join(siteRoot, file.rel), "utf8");
    try {
      rows.push(...rowFor(file, raw));
    } catch (err) {
      throw new Error(`${file.rel}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return rows;
}

// ── Diffing ─────────────────────────────────────────────────────────────────

export interface RemovedRow {
  ledgerKey: string;
  /** Table the row lives in, recovered from the key namespace (null = unknown). */
  kind: CorpusKind | null;
}

export interface DiffResult {
  changed: CourseRow[];
  /** Ledger entries with no matching local row (only acted on when pruning). */
  removed: RemovedRow[];
  unchanged: number;
}

/**
 * Rows whose ledger hash differs from the local hash (or missing/forced).
 *
 * `opts.kinds` scopes the deletion half of the diff. It MUST be passed whenever
 * `rows` is a subset of the corpus (e.g. `--only lessons`): the ledger covers
 * every table, so an unscoped diff reports every out-of-scope entry as deleted
 * and a subsequent `--prune` would wipe those tables.
 */
export function diffRows(
  rows: readonly CourseRow[],
  ledger: Ledger,
  opts: { force?: boolean; kinds?: readonly CorpusKind[] } = {},
): DiffResult {
  const seen = new Set<string>();
  const changed: CourseRow[] = [];
  let unchanged = 0;
  for (const row of rows) {
    if (seen.has(row.ledgerKey)) continue; // defensive: no duplicate rows
    seen.add(row.ledgerKey);
    if (opts.force || ledger.get(row.ledgerKey) !== row.hash) changed.push(row);
    else unchanged += 1;
  }
  const scope = opts.kinds ? new Set<string>(opts.kinds) : null;
  const removed: RemovedRow[] = [];
  for (const [key] of ledger) {
    if (seen.has(key)) continue;
    const kind = ledgerKeyKind(key);
    if (scope && !(kind && scope.has(kind))) continue; // out of scope: not ours to delete
    removed.push({ ledgerKey: key, kind });
  }
  return { changed, removed, unchanged };
}

/** Recover a ledger key's table from its `"<kind>#<pk>"` namespace. */
export function ledgerKeyKind(ledgerKey: string): CorpusKind | null {
  const i = ledgerKey.indexOf("#");
  if (i < 0) return null;
  const kind = ledgerKey.slice(0, i);
  return (KINDS as readonly string[]).includes(kind) ? (kind as CorpusKind) : null;
}

/**
 * Split rows into batches bounded by serialized payload size AND row count.
 * Lesson/practice rows carry whole file bodies (~17-26 KB each), so a fixed
 * row-count batch alone can build multi-megabyte PostgREST requests.
 * An oversized single row still gets its own batch — never silently dropped.
 */
export function chunkByBytes<T>(
  rows: readonly T[],
  maxBytes: number,
  maxRows: number,
): T[][] {
  const out: T[][] = [];
  let batch: T[] = [];
  let bytes = 0;
  for (const row of rows) {
    const size = JSON.stringify(row)?.length ?? 0;
    if (batch.length > 0 && (batch.length >= maxRows || bytes + size > maxBytes)) {
      out.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(row);
    bytes += size;
  }
  if (batch.length) out.push(batch);
  return out;
}

/** Decompose a namespaced ledger key back into the table's primary-key columns. */
export function ledgerKeyToPk(kind: CorpusKind, ledgerKey: string): Record<string, string> {
  const key = ledgerKey.slice(ledgerKey.indexOf("#") + 1); // strip "<kind>#"
  switch (kind) {
    case "tracks":
      return { slug: key };
    case "units": {
      const [track, slug] = key.split("/");
      return { track, slug };
    }
    case "lessons": {
      const [lang, track, unit, slug] = key.split("/");
      return { lang, track, unit, slug };
    }
    case "practice":
      return { lesson_key: key };
    case "projects":
      return { slug: key };
    case "drill": {
      const [track, unit] = key.split("/");
      return { track, unit };
    }
    case "lab": {
      const [track, tier] = key.split("/");
      return { track, tier };
    }
  }
}

/** Re-derive a row's ledger key from its identity columns (used by verify-parity). */
export function pkToLedgerKey(kind: CorpusKind, cols: Record<string, unknown>): string {
  switch (kind) {
    case "tracks":
      return `tracks#${cols.slug}`;
    case "units":
      return `units#${cols.track}/${cols.slug}`;
    case "lessons":
      return `lessons#${cols.lang}/${cols.track}/${cols.unit}/${cols.slug}`;
    case "practice":
      return `practice#${cols.lesson_key}`;
    case "projects":
      return `projects#${cols.slug}`;
    case "drill":
      return `drill#${cols.track}/${cols.unit}`;
    case "lab":
      return `lab#${cols.track}/${cols.tier}`;
  }
}
