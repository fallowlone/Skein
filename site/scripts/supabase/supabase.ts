/**
  * Shared Supabase plumbing for the content mirror CLIs
 * (site/scripts/supabase/sync-content.ts, verify-parity.ts).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { CorpusKind } from "./corpus";

export const CURRICULUM_SCHEMA = "curriculum";

export interface TableMeta {
  /** PostgREST on_conflict column list (upsert). */
  conflict: string;
  /** Columns fetched for parity comparisons. */
  select: string;
}

export const TABLE_COLUMNS: Record<CorpusKind, TableMeta> = {
  tracks: { conflict: "slug", select: "slug,content_hash" },
  units: { conflict: "track,slug", select: "track,slug,content_hash" },
  lessons: { conflict: "lang,track,unit,slug", select: "lang,track,unit,slug,content_hash" },
  practice: { conflict: "lesson_key", select: "lesson_key,content_hash" },
  projects: { conflict: "slug", select: "slug,content_hash" },
  drill: { conflict: "track,unit", select: "track,unit,content_hash" },
  lab: { conflict: "track,tier", select: "track,tier,content_hash" },
};

export type ContentClient = ReturnType<typeof createClient>;

export function makeClient(url: string, key: string): ContentClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A Postgrest table handle whose columns are opaque to us (we select/insert by
 * exact column names we control). The supabase-js types narrow `.schema()` to a
 * static schema map, but our `curriculum` schema + runtime table names aren't
 * modelled there — so we project the chain to opaque-row shapes and cast
 * through `as unknown as`.
 */
export interface TableResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

/** A `.select()` chain: awaitable directly, or paged with `.range()`. */
export interface SelectChain {
  range: (from: number, to: number) => Promise<TableResult>;
  then: (r: (res: TableResult) => unknown) => Promise<unknown>;
}

export interface AnyTable {
  select: (cols: string) => SelectChain;
  upsert: (rows: unknown[], opts: { onConflict: string }) => Promise<TableResult>;
  delete: () => AnyTable;
  eq: (col: string, val: unknown) => AnyTable;
  /** Resolves to the table result; used to await a `delete().eq()...` chain. */
  then: (r: (res: TableResult) => unknown) => Promise<unknown>;
}

export function schemaTable(client: ContentClient, schema: string, table: string): AnyTable {
  // supabase-js types `.schema()` against a static schema map, so a runtime
  // schema name is `never` to it. Cast the ARGUMENT: detaching the method
  // (`const f = client.schema`) would drop its receiver and throw at runtime.
  const scoped = client.schema(schema as never) as unknown as {
    from: (t: string) => AnyTable;
  };
  return scoped.from(table);
}

export interface EnvSecrets {
  url: string | null;
  key: string | null;
}

/**
 * Prefer real env; fall back to site/.env.local (gitignored).
 *
 * Supabase renamed the write credential: the `service_role` JWT is now the
 * "secret key" (`sb_secret_...`). Both env names are accepted — new first — so
 * an existing setup keeps working. The publishable key (`sb_publishable_...`,
 * formerly `anon`) is NOT a substitute: it is read-only under RLS.
 */
export function loadEnv(
  processEnv: NodeJS.ProcessEnv,
  local: Record<string, string>,
): EnvSecrets {
  return {
    url: processEnv.SUPABASE_URL ?? local.SUPABASE_URL ?? null,
    key:
      processEnv.SUPABASE_SECRET_KEY ??
      processEnv.SUPABASE_SERVICE_ROLE_KEY ??
      local.SUPABASE_SECRET_KEY ??
      local.SUPABASE_SERVICE_ROLE_KEY ??
      null,
  };
}

/** Read site/.env.local as a KEY=VALUE map (quotes stripped). */
export async function readEnvLocal(siteRoot: string): Promise<Record<string, string>> {
  try {
    const txt = await readFile(join(siteRoot, ".env.local"), "utf8");
    const out: Record<string, string> = {};
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Supabase caps a single PostgREST response at `max_rows` (1000 by default), so
 * an unpaginated `.select()` over a table this size returns a silently short
 * result — a truncated ledger re-pushes the whole corpus, and a truncated parity
 * fetch reports thousands of phantom "missing" rows.
 *
 * `makeTable` must mint a FRESH query builder per call (supabase-js builders are
 * single-use). Paging advances by rows actually returned, so a project whose
 * `max_rows` is below `pageSize` still reads to the end.
 */
export const PAGE_SIZE = 1000;

export async function selectAll(
  makeTable: () => AnyTable,
  cols: string,
  pageSize: number = PAGE_SIZE,
): Promise<unknown[]> {
  const out: unknown[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await makeTable().select(cols).range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    if (page.length === 0) return out;
    out.push(...page);
    from += page.length;
  }
}

export function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
